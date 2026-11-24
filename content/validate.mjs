/* Verificación estática sin dependencias externas. node content/validate.mjs */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
const data=fs.readFileSync('content/card-texts.js','utf8');
const context={window:{}};
vm.runInNewContext(data,context,{timeout:2000});
const texts=context.window.ICMX_CARD_TEXTS;
assert.ok(texts&&typeof texts==='object','No hay datos editoriales');
const match=html.match(/const DESIGNS=\[([\s\S]*?)\];/);
assert.ok(match,'No se encontró el catálogo');
const ids=[...match[1].matchAll(/\{id:'([a-z0-9]+)'/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'IDs duplicados en catálogo');
assert.deepEqual(Object.keys(texts).sort(),ids.slice().sort(),'Los IDs del archivo editorial y el catálogo difieren');
for(const id of ids){
 for(const key of ['habilidad','frase']){
  assert.ok(typeof texts[id][key]==='string'&&texts[id][key].trim().length>0, id+': falta '+key);
 }
 for(const key of ['holo','dorada']){
  assert.ok(texts[id][key]===undefined||(typeof texts[id][key]==='string'&&texts[id][key].trim().length>0),id+': '+key+' inválido');
 }
}
assert.ok(html.indexOf('src="content/card-texts.js?')!==-1,'No se carga el archivo editorial');
assert.ok(html.indexOf('src="content/card-texts.js?')<html.indexOf('<script>/* ===== CATÁLOGO'),'El archivo editorial debe cargar antes del juego');

// Narrativas obligatorias para cualquier diseño incluido en una colección jugable.
// Deuda preexistente identificada el 24/11: nunca se considera contenido completo.
// El modo estricto no admite excepciones y debe pasar antes de ampliar colecciones.
const levelContext={window:{}};
vm.runInNewContext(fs.readFileSync('content/player1-levels.js','utf8'),levelContext,{timeout:2000});
const levels=levelContext.window.ICMX_PLAYER1_LEVELS || levelContext.ICMX_PLAYER1_LEVELS;
assert.ok(levels?.levels?.length,'No se encontró la configuración de colecciones');
const missing=levels.levels.flatMap(level=>level.designs.flatMap(id=>
 ['holo','dorada'].filter(key=>typeof texts[id]?.[key]!=='string'||!texts[id][key].trim()).map(key=>id+':'+key)));
const knownDebt=new Set(["invader:holo","invader:dorada","sensei:holo","sensei:dorada","bustfiction:holo","bustfiction:dorada","docecasas:holo","docecasas:dorada","gunsncontrols:holo","gunsncontrols:dorada","keepcalm:holo","keepcalm:dorada"]);
const unexpected=missing.filter(key=>!knownDebt.has(key));
assert.equal(unexpected.length,0,'Narrativas faltantes nuevas: '+unexpected.join(', '));
if(missing.length){
 console.error('DEUDA EDITORIAL NO RESUELTA ('+missing.length+'): '+missing.join(', '));
 if(process.argv.includes('--strict-release'))throw Error('Colección no apta para liberación: '+missing.join(', '));
}

console.log('OK: '+ids.length+' cartas; catálogo sincronizado, '+missing.length+' narrativas de deuda explícita.');
