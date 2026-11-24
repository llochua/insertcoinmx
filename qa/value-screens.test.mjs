import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {collectionPoints,VARIANT_POINTS} from '../content/community-value.mjs';

const html=readFileSync('index.html','utf8');
const css=readFileSync('content/community-value-ui.css','utf8');
const renderer=readFileSync('content/card-renderer.js','utf8');
const runtime=readFileSync('content/card-runtime.js','utf8');
const shellGen=readFileSync('cartas/generar-shells.py','utf8');
const key=pat=>assert.ok(html.includes(pat),'Falta en index.html: '+pat);

test('Conservar High Scores arcade con cinco categorías reales',()=>{
 for(const id of ['recordDesigns','recordDuplicates','recordRatings','scoreRankColumn','scoreDataScope','arcadeBonusTitle','scoreTopTitle'])
  key('id="'+id+'"');
 for(const metric of ['cards','pts','designs','duplicates','ratings'])key('data-score-metric="'+metric+'"');
 assert.match(html,/<section class="view" id="scores">[\s\S]*?HIGH SCORES[\s\S]*?TOP 10/);
 assert.match(html,/rank-empty/);
 const section=html.slice(html.indexOf('<section class="view" id="scores">'),html.indexOf('<section class="view" id="profile"'));
 assert.doesNotMatch(section,/id="bkExp"|id="bkImp"|RESPALDO DE TU PROGRESO/);
});
test('Valor y POP sobre la imagen, con reacciones antes de la narrativa y sin fórmula duplicada',()=>{
 key('id="profileValuePoints"');
 key('id="fDesignValue"');
 key('id="icmxGlobalTitle"');
 for(const id of ['zVoting','zRate','zGoty','zLikeStatus','zNarrative'])key('id="'+id+'"');
 key('content/card-runtime.js?v=');
 key('content/card-renderer.js?v=');
 key('content/card-data-adapter.js?v=');
 const zoomStart=html.indexOf('<dialog class="zoom" id="zoom"');
 const zoom=html.slice(zoomStart,html.indexOf('</dialog>',zoomStart));
 assert.ok(zoomStart>=0&&zoom.includes('id="zRate"')&&zoom.includes('id="zNarrative"'));
 assert.ok(zoom.indexOf('id="zRate"')<zoom.indexOf('id="zNarrative"'),'Reacciones antes de la narrativa');
 assert.doesNotMatch(zoom,/zCommunityFormula|zLikeYes|zLikeNo/,'Sin fórmula ni botones de Like duplicados');
 assert.match(html,/const TN=\['GOTY','GENIAL','OK','MMM'\]/);
 assert.match(html,/previous===r\?null:r/,'Segundo toque retira la reacción');
 assert.doesNotMatch(html,/id="zVariantPoints"|id="zDesignPopularity"|class="icmx-card-value"/);
 assert.match(renderer,/field:'pop'/);
 assert.match(html,/ICMX_CARD_RUNTIME\?\.mount\(fx,card,updateCardValueUI\(card\)\)/);
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
test('El nuevo renderer elimina los parches: un solo pie SVG sobre shell sin tinta',()=>{
 assert.match(shellGen,/def vaciar_pie_inferior\(marco\):/);
 assert.match(shellGen,/x0, x1 = 39, 921/);
 assert.match(shellGen,/y0, y1 = 1226, 1299/);
 assert.match(shellGen,/quality = 91 if path.parent.name == 'cs2' else 88/);
 assert.match(renderer,/type:'footer-plate'/);
 assert.match(renderer,/data-icmx-footer-plate/);
 assert.match(renderer,/field:'collection-number'/);
 assert.match(renderer,/field:'pop'/);
 assert.match(runtime,/drawInto/);
 assert.match(runtime,/svg\.icmx-data/);
 assert.doesNotMatch(html,/content\/card-value-overlay\.js\?v=/);
 assert.doesNotMatch(html,/ICMX_CARD_VALUE\.mount\(/);
 assert.doesNotMatch(css,/\.fx>canvas\.icmx-card-face-values/);
});
