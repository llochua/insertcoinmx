/**
 * Rechaza un pool de sobres que no refleje las variantes disponibles en
 * DESIGNS. Nunca incluye bonus bx. Solo lectura, no conecta a Supabase.
 */
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';

const html=readFileSync('index.html','utf8');
const sql=readFileSync('supabase/sql/server_pack_pool.sql','utf8');
const raw=html.match(/const DESIGNS=\[([\s\S]*?)\];/)?.[1];
assert.ok(raw,'No se encontró el catálogo del juego');
const designs=runInNewContext('['+raw+']',{}, {timeout:2000});
assert.ok(Array.isArray(designs)&&designs.length>0,'Catálogo vacío');
const old={comun:'b',holo:'e',dorada:'r'};
const expected=new Map();
for(const d of designs){
 if(d.bx)continue;
 assert.match(d.id,/^[a-z0-9]{1,40}$/);
 const types=new Set();
 if(d.r)types.add(old[d.r]);
 if(d.f)types.add('f');
 for(const v of d.ex||'')types.add(v);
 for(const variant of types){
  assert.ok('berf'.includes(variant),d.id+': versión desconocida');
  expected.set(d.id+'_'+variant,variant);
 }
}
const actual=new Map();
for(const m of sql.matchAll(/\('([a-z0-9]{1,40}_[berf])','([berf])'\)/g)){
 assert.equal(actual.has(m[1]),false,'Variante duplicada en SQL: '+m[1]);
 assert.equal(m[1].slice(-1),m[2],'Rareza SQL inconsistente: '+m[1]);
 actual.set(m[1],m[2]);
}
const missing=[...expected.keys()].filter(k=>!actual.has(k)).sort();
const unexpected=[...actual.keys()].filter(k=>!expected.has(k)).sort();
assert.deepEqual(missing,[],'Faltan variantes en el pool de Supabase');
assert.deepEqual(unexpected,[],'El pool incluye variantes inexistentes o bonus');
console.log('OK: '+actual.size+' variantes disponibles en juego y servidor coinciden');
