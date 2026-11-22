#!/usr/bin/env node
/**
 * DS-ART-01: every opaque illustration contributes its own actual solid edge RGB,
 * extended over the full reveal/summary. Never infer a generic background.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(ROOT,path),'utf8');
const context=createContext({});
new Script(read('content/artwork-background.js')).runInContext(context);
const helper=context.ICMXArtworkBackground;
assert.equal(typeof helper.colorFromPixels,'function');
assert.equal(typeof helper.fromImage,'function');

function pixels(bg,mark,w=64,h=80){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const col=x>=12&&x<w-12&&y>=12&&y<h-12?mark:bg;
  const i=(y*w+x)*4;
  data[i]=col[0];data[i+1]=col[1];data[i+2]=col[2];data[i+3]=255;
 }
 return {data,w,h};
}
const p=pixels([29,32,55],[255,0,170]);
assert.equal(helper.colorFromPixels(p.data,p.w,p.h),'#1d2037','background wins over drawing');
const p2=pixels([250,16,88],[0,0,0]);
assert.equal(helper.colorFromPixels(p2.data,p2.w,p2.h),'#fa1058','bright backgrounds remain solid');
const p3=pixels([255,255,255],[34,55,66]);
assert.equal(helper.colorFromPixels(p3.data,p3.w,p3.h),'#ffffff','white remains white');
const compressed=pixels([21,23,25],[0,255,80]);
for(let y=0;y<80;y+=7){
 const i=(y*64)*4;compressed.data[i]=25;compressed.data[i+1]=24;compressed.data[i+2]=24;
}
assert.equal(helper.colorFromPixels(compressed.data,compressed.w,compressed.h),'#151719','isolated edge compression cannot change the backdrop');
const transparent=pixels([1,2,3],[4,5,6]);for(let i=3;i<transparent.data.length;i+=4)transparent.data[i]=0;
assert.equal(helper.colorFromPixels(transparent.data,transparent.w,transparent.h),null,'no fabricated color from empty pixels');

for(const path of ['index.html','qa/design-system/index.html']){
 const html=read(path);
 for(const name of ['content/artwork-background.js?v=20261122-1','content/artwork-background.css?v=20261122-1',
  'AUTO_BG_COLORS[src]||RBG[id]','resolveArtworkBackground(d,D,fullSrc)',
  "resolveArtworkBackground(d,s.querySelector('.rh'),fullSrc)",'ic-art-bg-pending']){
  assert(html.includes(name),path+' missing '+name);
 }
 assert(!html.includes('AUTO_BG_IDS.has'),path+' has old limited design list');
 assert(!html.includes('.dx.v-r{background:radial-gradient'),path+' has old gold override');
 assert(html.indexOf('artwork-background.js?v=20261122-1')<html.indexOf('/* ===== CATÁLOGO'),path+' JS helper must load first');
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
 let checked=0;
 for(const [,a,body]of scripts){
   if(/\bsrc\s*=/.test(a)||/application\/ld\+json/.test(a))continue;
   new Script(body,{filename:path+' classic inline '+(++checked)});
 }
 assert(checked>=2);
}
const css=read('content/artwork-background.css');
assert(css.includes('.disc.dx:not(.cov),.rs2 .rh.dx'));
assert(css.includes('background-color:var(--bg,#1b1826)!important'));
assert(css.includes('background-image:none!important'));
assert(css.includes('.disc.dx.ic-art-bg-pending .dx-art'));
console.log('OK · DS-ART-01: borders reflect actual image pixels, never fabricated.');
console.log('OK · ShowCard/summary and isolated LAB share one helper and one CSS contract.');
console.log('OK · JS syntax is valid and no old restricted color gate or gold gradient remains.');
