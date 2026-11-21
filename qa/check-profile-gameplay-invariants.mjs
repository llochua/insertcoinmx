/**
 * PR #91 · barrera automática contra regresiones del juego.
 *
 * Compara con el merge-base REAL de main: no usa snapshots inventados ni
 * probabilidades duplicadas en el test. Solo se ejecuta durante la PR de
 * integración del perfil. Una nueva funcionalidad del juego tendrá su propia
 * revisión de alcance, independiente de esta barrera temporal.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

function git(...args) {
  return execFileSync('git',args,{encoding:'utf8',maxBuffer:8*1024*1024}).trimEnd();
}

const target=process.env.GITHUB_BASE_REF||'main';
const base=git('merge-base','HEAD','origin/'+target).trim();
assert.match(base,/^[0-9a-f]{40}$/);
const prior=git('show',base+':index.html');
const current=readFileSync('index.html','utf8');

// Esta PR integra exclusivamente perfil/cuentas y sus pruebas. Evitar que
// cualquier cambio ajeno (SQL, pool, imágenes, guardado, Reta) pase desapercibido.
const allowed=new Set([
  'index.html',
  'qa/profile-auth-unit.test.mjs',
  'qa/profile-browsers.mjs',
  'qa/sync-two-browsers.mjs',
  'qa/release-reset.test.mjs',
  'qa/auth-public-settings.mjs',
  'supabase/sql/reset_for_public_launch_STAGED.sql',
  'content/release-reset.js',
  'content/auth-account.js',
  'qa/registro/index.html',
  'qa/perfil-main-browsers.mjs',
  'qa/check-profile-gameplay-invariants.mjs',
  '.github/workflows/validacion.yml',
  '.github/workflows/qa-sync-browsers.yml',
  'docs/PERFIL_CUENTAS_INTEGRACION_20261120.md'
]);
const changed=git('diff','--name-only',base,'HEAD').split('\n').filter(Boolean);
const outside=changed.filter(path=>!allowed.has(path));
assert.deepEqual(outside,[],
  'La integración del perfil no puede cambiar otros archivos del juego: '+outside.join(', '));

function exactSection(source,start,end,label) {
  const begin=source.indexOf(start);
  assert.ok(begin>=0,label+': no existe marcador inicial');
  assert.equal(source.indexOf(start,begin+start.length),-1,
    label+': marcador inicial ambiguo');
  const finish=source.indexOf(end,begin+start.length);
  assert.ok(finish>begin,label+': no existe marcador final');
  return source.slice(begin,finish);
}

const protectedRegions=[
  ['Catálogo de diseños y cartas','const DESIGNS=[','const VL='],
  ['Cuotas y ciclo de sobres','const PACK_INTERVAL=','const STORE='],
  ['Contabilización de cartas y sobres','function applyPack(p)','function syncIn()'],
  ['Canje de repetidas','function trade(after)','const firstPack='],
  ['Probabilidades y selección aleatoria','const SP={','const GLOW='],
  ['Emisión y apertura de sobres','function openServerPack()','/* ===== DESCUBRIMIENTO'],
  ['Álbum y progreso','/* ---------- álbum (Etapa 5:','/* ---------- tier ---------- */'],
  ['Tier Lists','/* ---------- tier ---------- */','/* ---------- reta:'],
  ['Reta','/* ---------- reta:','/* ---------- récords ---------- */'],
  ['Récords','function board()','/* ---------- respaldo:']
];
for (const [label,start,end] of protectedRegions) {
  assert.equal(
    exactSection(current,start,end,label),
    exactSection(prior,start,end,label),
    label+' cambió respecto de main. Detener integración y revisar por separado.'
  );
  console.log('✓ Sin cambios: '+label);
}
console.log('✓ Alcance permitido: '+changed.length+' archivos');
console.log('QA DE REGRESIONES DEL JUEGO APROBADA · '+protectedRegions.length+' regiones idénticas');
