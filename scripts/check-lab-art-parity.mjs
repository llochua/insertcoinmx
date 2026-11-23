#!/usr/bin/env node
/* Design-system guard: artwork rendering is owned by the existing main branch.
   Keep the lab and this PR EXACTLY aligned with main's artwork CSS and logic.
   No palette, image or background manipulation may enter the UI refactor. */
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
 for(const [target,s] of [['design-system branch',branch],['isolated LAB',lab]]){
  const actual=between(s,a,b,after);
  assert.equal(actual,baseline,name+' in '+target+' differs from current main baseline. Do not change original art during UI refactor.');
 }
 console.log('OK · main matches PR and LAB: '+name);
}
for(const [name,s] of [['PR',branch],['LAB',lab]]){
  assert(!s.includes('content/artwork-background.js'),name+' unexpectedly references the abandoned art experiment');
  assert(!s.includes('content/artwork-background.css'),name+' unexpectedly loads the abandoned art experiment');
}
assert(branch.includes('const PRUEBA=false;'),'Unlimited packs must never be enabled in production file');
assert(lab.includes('const PRUEBA=true;'),'Unlimited packs belong only to the isolated lab');
console.log('OK · art is untouched by UI changes; unlimited packs are lab-only.');
