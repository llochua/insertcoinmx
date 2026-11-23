#!/usr/bin/env node
/* Design-system guard: production rendering must stay byte-for-byte aligned
   with main. The LAB has ONE authorized exception: extend uniform artwork
   backgrounds to the full discovery scene, with explicit browser regression QA.
   No other artwork presentation changes are allowed. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const reference=execFileSync('git',['show','origin/main:index.html'],{encoding:'utf8'});
const branch=readFileSync('index.html','utf8');
const lab=readFileSync('qa/design-system/index.html','utf8');

function between(source,begin,end,after=''){
 const start=source.indexOf(begin,after?source.indexOf(after):0);
 assert(start>=0,'missing start '+begin.slice(0,60));
 const stop=source.indexOf(end,start);
 assert(stop>=0,'missing end '+end.slice(0,60));
 return source.slice(start,stop);
}
const regions=[
  ['Artwork placement and fade CSS','.dx-art{','.dx-top{'],
  ['Flat artwork styles','/* ESTÁNDAR GLOBAL:','/* Escritorio'],
  ['Original sampling and color lookup','const AUTO_BG_IDS=','const lum=h=>'],
  ['Revelation illustration markup',' const art=fa?',' D.className=`disc on dx'],
  ['Revelation background assignment','D.className=`disc on dx v-${v}',' D.innerHTML=`${art}'],
  ['Summary illustration and backdrop',' const art=fa?','  <section class="rs-follow"','function showSum()'],
];
for(const [name,a,b,after]of regions){
 const baseline=between(reference,a,b,after);
 // The design system and production code are never allowed to diverge.
 assert.equal(between(branch,a,b,after),baseline,name+' in main-based design system');
 const actual=between(lab,a,b,after);
 if(name==='Artwork placement and fade CSS'){
  const permitted=`/* Un mismo color ocupa todo el descubrimiento cuando el arte tiene fondo sólido.
   La ilustración conserva su encuadre original; nunca se usa cover para recortarla. */
.disc.dx:not(.cov) .dx-art,
.rh .dx-art{background:var(--bg)}
`;
  assert(actual.includes(permitted),'LAB must explicitly extend solid background to the art area');
  assert.equal(actual.replace(permitted+'\\n',''),baseline,
   'LAB artwork CSS differs beyond the approved solid-background rule');
 }else if(name==='Original sampling and color lookup'){
  const seed=`// Primer fotograma coherente: Robogodín tiene orillas blancas (#fff).
// Para el resto de fondos sólidos se detecta el color real del arte al cargar.
AUTO_BG_COLORS.robogodin='#ffffff';`;
  assert(actual.includes(seed),'LAB missing Robogodín white first-frame fallback');
  assert(actual.includes('deviations[Math.floor(deviations.length*.90)]>26'),
   'LAB must detect only uniform-color artwork');
  assert(actual.includes("D.style.setProperty('--bg',color)"),
   'LAB must match the entire discovery scene to detected artwork color');
  let normalized=actual.replace('\n'+seed,'');
  normalized=normalized.replace(
    'const dcol=id=>AUTO_BG_COLORS[id]||RBG[id]||ICOL[id]||NEU;',
    'const dcol=id=>RBG[id]||ICOL[id]||AUTO_BG_COLORS[id]||NEU;');
  const oldFunctions=between(baseline,'function bgFromArtwork(img){','const lum=h=>');
  const newFunctions=between(normalized,'function bgFromArtwork(img){','const lum=h=>');
  normalized=normalized.replace(newFunctions,oldFunctions);
  assert.equal(normalized,baseline,
   'LAB sampling differs beyond the allowed solid-background implementation');
 }else{
  assert.equal(actual,baseline,name+' differs from main');
 }
 console.log('OK · protected illustration contract: '+name);
}
for(const [name,s] of [['PR',branch],['LAB',lab]]){
  assert(!s.includes('content/artwork-background.js'),name+' unexpectedly references the abandoned art experiment');
  assert(!s.includes('content/artwork-background.css'),name+' unexpectedly loads the abandoned art experiment');
}
assert(branch.includes('const PRUEBA=false;'),'Unlimited packs must never be enabled in production file');
assert(lab.includes('const PRUEBA=true;'),'Unlimited packs belong only to the isolated lab');
console.log('OK · only authorized LAB solid-background extension; unlimited packs stay isolated.');
