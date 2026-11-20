// Detectar activaciones accidentales de la beta en el SQL preparado.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const path='supabase/sql/prepare_public_beta_CLOSED.sql';
const sql=readFileSync(path,'utf8');
assert.match(sql,/INSERT INTO private_sync\.beta_access_gate\(key,enabled\)\s*VALUES\s*\('public_beta',false\)/);
assert.match(sql,/CHECK\(key='public_beta'\)/);
assert.match(sql,/ALTER TABLE private_sync\.beta_access_gate ENABLE ROW LEVEL SECURITY/);
assert.match(sql,/REVOKE ALL ON private_sync\.beta_access_gate FROM PUBLIC,anon,authenticated/);
assert.match(sql,/REVOKE ALL ON FUNCTION private_sync\.can_access_beta\(uuid\)\s*FROM PUBLIC,anon,authenticated/);
assert.match(sql,/REVOKE ALL ON FUNCTION public\.import_guest_collection\(jsonb\)\s*FROM PUBLIC,anon,authenticated/);
const deploymentStatements=sql.replace(/AS\s+(\$[a-z]+\$)[\s\S]*?\1\s*;/gi,'');
assert.ok(!/\b(?:INSERT\s+INTO|UPDATE)\s+public\.player_snapshots\b/i.test(deploymentStatements),
 'La migración no debe modificar colecciones directamente fuera de sus RPC');
assert.ok(!/\bUPDATE\s+private_sync\.beta_access_gate[\s\S]*?enabled\s*=\s*true/i.test(sql),
 'No habilitar la beta dentro de la preparación');
const names=['ensure_player_snapshot','issue_player_pack','exchange_duplicate_cards','sync_player_snapshot'];
for(const name of names){
 const from=sql.indexOf('CREATE OR REPLACE FUNCTION public.'+name+'(');
 assert.ok(from>=0,'Falta RPC '+name);
 const after=sql.indexOf('CREATE OR REPLACE FUNCTION public.',from+1);
 const body=sql.slice(from,after>=0?after:sql.indexOf('-- La importación de inventario',from));
 assert.match(body,/IF NOT private_sync\.can_access_beta\(v_(?:uid|user_id)\) THEN/,
  name+' debe respetar la compuerta segura');
 assert.match(body,/SECURITY DEFINER/);
 assert.match(body,/SET search_path\s*=\s*''/);
}
const protectStart=sql.indexOf('CREATE OR REPLACE FUNCTION public.sync_player_snapshot(');
const protection=sql.slice(protectStart);
assert.match(protection,/Alta inicial solo mediante ensure_player_snapshot/);
assert.match(protection,/Cartas y cuotas son controladas por el servidor/);
assert.match(sql,/enabled=false\) THEN\s*RAISE EXCEPTION/);
console.log('OK: compuerta pública apagada, cuatro RPC protegidas e importación cerrada');
