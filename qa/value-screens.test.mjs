import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {collectionPoints,VARIANT_POINTS} from '../content/community-value.mjs';

const html=readFileSync('index.html','utf8');
const css=readFileSync('content/community-value-ui.css','utf8');
const face=readFileSync('content/card-value-overlay.js','utf8');
const key=pat=>assert.ok(html.includes(pat),'Falta en index.html: '+pat);

test('Conservar High Scores arcade con sus cuatro categorías',()=>{
 for(const id of ['recordDesigns','recordDuplicates','recordRatings','scoreRankColumn','scoreDataScope','arcadeBonusTitle','scoreTopTitle'])
  key('id="'+id+'"');
 for(const metric of ['cards','designs','duplicates','ratings'])key('data-score-metric="'+metric+'"');
 assert.match(html,/<section class="view" id="scores">[\s\S]*?HIGH SCORES[\s\S]*?TOP 10/);
 assert.match(html,/rank-empty/);
 const section=html.slice(html.indexOf('<section class="view" id="scores">'),html.indexOf('<section class="view" id="profile"'));
 assert.doesNotMatch(section,/id="bkExp"|id="bkImp"|RESPALDO DE TU PROGRESO/);
});
test('Valor de variante y POP viven sobre la imagen; solo queda la explicación debajo',()=>{
 key('id="profileValuePoints"');
 key('id="fDesignValue"');
 key('id="icmxGlobalTitle"');
 key('id="zCommunityFormula"');
 key('content/card-value-overlay.js?v=');
 assert.match(html,/POPULARIDAD: LIKES 35% · TIER 35% · RETA 30%/);
 assert.doesNotMatch(html,/id="zVariantPoints"|id="zDesignPopularity"|class="icmx-card-value"/);
 assert.match(css,/\.fx>canvas\.icmx-card-face-values/);
 assert.match(css,/#zoom \.icmx-card-value-note/);
 assert.doesNotMatch(html,/738 POP|480 PTS/);
});
test('Los sobres distinguen una primera obtención de una repetida',()=>{
 key('c._new?(valueVariantPoints(v)===null?');
 key('"REPETIDA · 0 PTS"');
 assert.deepEqual({...VARIANT_POINTS},{b:10,e:25,r:50,f:100});
});
test('El historial actual de PTS se calcula mediante el motor existente',()=>{
 const start=html.indexOf('let communityValueEngine=null;');
 const end=html.indexOf('const PRUEBA=false;',start);
 assert.ok(start>=0&&end>start);
 const section=html.slice(start,end);
 const catalog=[
  {k:'abuket_b',bx:false,img:'abuket'},
  {k:'abuket_e',bx:false,img:'abuket_e'},
  {k:'arcade_f',bx:false,img:'arcade_f'},
  {k:'bonus_b',bx:true,img:'bonus'}
 ];
 const ctx={S:{have:{abuket_b:3,abuket_e:2,bonus_b:5}},CARDS:catalog,window:{}};
 vm.createContext(ctx);
 vm.runInContext(section+'\nglobalThis.testAPI={setEngine:(v)=>communityValueEngine=v,points:collectionPointsLocal,update:updateCardValueUI};',ctx);
 ctx.testAPI.setEngine({collectionPoints,VARIANT_POINTS});
 assert.equal(ctx.testAPI.points(),35);
 assert.equal(ctx.testAPI.update({k:'abuket_b',v:'b',bx:false}).points,10);
 assert.equal(ctx.testAPI.update({k:'abuket_e',v:'e',bx:false}).points,25);
 assert.equal(ctx.testAPI.update({k:'arcade_f',v:'f',bx:false}).points,100);
 assert.equal(ctx.testAPI.update({k:'bonus_b',v:'b',bx:true}).points,null);
 assert.equal(ctx.testAPI.update({k:'abuket_b',v:'b',bx:false}).pop,null);
 ctx.S.have={arcade_f:1};assert.equal(ctx.testAPI.points(),100);
 ctx.S.have={};assert.equal(ctx.testAPI.points(),0);
});
test('La capa sobre imágenes cubre las cifras impresas sin afectar la ilustración',()=>{
 assert.match(face,/x1:570,x2:904,y1:142,y2:217/);
 assert.match(face,/x1:777,x2:916,y1:1245,y2:1285/);
 assert.match(face,/ctx\.clearRect\(0,0,W,H\)/);
 assert.match(face,/isPop\(pop\)\?String\(pop\):'—'/);
 assert.match(face,/img\.insertAdjacentElement\('afterend',canvas\)/);
 assert.match(face,/ctx\.fillRect\(632,868,300,137\)/,'Full usa mate dentro del velo, sin tapar la escena');
 assert.doesNotMatch(face,/img\.src\s*=/,'no reemplaza ni reescribe el arte original');
});
