#!/usr/bin/env node
/* Keep the production renderer identical to main; only isolated LAB can
   replace background sampling with a universal pixel-derived algorithm. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const reference=execFileSync('git',['show','origin/main:index.html'],{encoding:'utf8'});
const branch=readFileSync('index.html','utf8');
const lab=readFileSync('qa/design-system/index.html','utf8');
function between(source,begin,end,after=''){
 const from=source.indexOf(begin,after?source.indexOf(after):0);
 assert(from>=0,'missing start: '+begin);
 const to=source.indexOf(end,from);
 assert(to>from,'missing end: '+end);
 return source.slice(from,to);
}
const bt=String.fromCharCode(96),dollar=String.fromCharCode(36);
const regions=[
 ['Artwork placement and fade CSS','.dx-art{','.dx-top{'],
 ['Flat artwork styles','/* ESTÁNDAR GLOBAL:','/* Escritorio'],
 ['Original sampling and color lookup','const AUTO_BG_IDS=','const lum=h=>'],
 ['Revelation illustration markup',' const art=fa?',' D.className='+bt+'disc on dx'],
 ['Revelation background assignment','D.className='+bt+'disc on dx v-'+dollar+'{v}',' D.innerHTML='+bt+dollar+'{art}'],
 ['Summary illustration and backdrop',' const art=fa?','  <section class="rs-follow"','function showSum()'],
];
for(const [label,start,end,after] of regions){
 const original=between(reference,start,end,after);
 assert.equal(between(branch,start,end,after),original,'PRODUCTION differs from main: '+label);
 const inLab=between(lab,start,end,after);
 if(label==='Original sampling and color lookup'){
  const functionStart='function bgFromArtwork(img){';
  const a=inLab.indexOf(functionStart),b=original.indexOf(functionStart);
  assert(a>0&&b>0,'Missing original/artwork sampler');
  const labConfig=inLab.slice(0,a)
   .replace(/^const ART_BG_GENERATED=.*\n/m,'')
   .replace('const dcol=id=>AUTO_BG_COLORS[id]||ART_BG_GENERATED[id]||RBG[id]||ICOL[id]||NEU;',
            'const dcol=id=>RBG[id]||ICOL[id]||AUTO_BG_COLORS[id]||NEU;')
   .replace('const hasCol=id=>!!(ART_BG_GENERATED[id]||RBG[id]||ICOL[id]||AUTO_BG_IDS.has(id));',
            'const hasCol=id=>!!(RBG[id]||ICOL[id]||AUTO_BG_IDS.has(id));')
   .replace('const dcol=id=>AUTO_BG_COLORS[id]||RBG[id]||ICOL[id]||NEU;',
            'const dcol=id=>RBG[id]||ICOL[id]||AUTO_BG_COLORS[id]||NEU;')
   .replace("/* Fondo automático y universal del arte:\n   El color nace de los píxeles del archivo, jamás de una lista de diseños.\n   Muestreo de esquinas + perímetro, clúster predominante y mediana robusta. */\n","/* Color plano de las orillas del arte original. Mismo criterio de fondo_de()\n   usado por cartas/generar.py, a tamaño reducido para no procesar una imagen grande.\n   Solo se llama para los 21 diseños nuevos que no tienen color definido. */\n");
  assert.equal(labConfig,original.slice(0,b),'LAB altered protected catalog or framing metadata');
  const universal=inLab.slice(a);
  assert(universal.includes('const corner='),'LAB must sample corners');
  assert(universal.includes('const perimeter='),'LAB must sample the perimeter');
  assert(universal.includes('const sampled=bgFromArtwork(im);'),'LAB must sample image');
  assert(universal.includes('sampled||ART_BG_GENERATED[d.id]'),'LAB must recover on canvas/CORS failure');
  assert(universal.includes("D.style.setProperty('--bg',color)"),'LAB must assign sampled backdrop');
  assert(universal.includes('D.style.backgroundColor=color'),'LAB must fill the scene');
  assert(universal.includes('D.dataset.artBgStatus='),'LAB must expose sampling status for QA');
  assert(!universal.includes('if(!hasCol(d.id))return'),'No manual color-list dependency');
  assert(!/d\.id\s*===\s*['"]/.test(universal),'No case-by-case design exceptions');
 }else{
  assert.equal(inLab,original,'LAB differs from main outside universal sampler: '+label);
 }
 console.log('OK artwork contract: '+label);
}
const embedded=lab.match(/const ART_BG_GENERATED=(\{[^\n]*\});/);
assert(embedded,'LAB must embed a generated manifest');
const checked=JSON.parse(embedded[1]);
const generated=JSON.parse(readFileSync('qa/design-system/artwork-backgrounds.generated.json','utf8'));
assert.deepEqual(checked,generated,'The inline map must match generated data');
assert(Object.keys(checked).length>=120,'Do not leave any source design without a fallback');
assert(lab.includes("D.style.removeProperty('background-color');delete D.dataset.artBgStatus;"),
 'Each LAB card must clear the previous background before sampling');
assert(lab.includes('const PRUEBA=true;'),'Infinite packs stay LAB only');
assert(branch.includes('const PRUEBA=false;'),'Production remains limited');
for(const [name,s] of [['production',branch],['lab',lab]]){
 assert(!s.includes('content/artwork-background.js'),name+' loads unused experiment');
 assert(!s.includes('content/artwork-background.css'),name+' loads unused experiment');
}
console.log('OK: one universal pixel sampler in LAB; production unchanged.');
