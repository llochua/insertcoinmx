import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {collectionPoints,VARIANT_POINTS} from '../content/community-value.mjs';

const html=readFileSync('index.html','utf8');
const css=readFileSync('content/community-value-ui.css','utf8');
const key=pat=>assert.ok(html.includes(pat),'Falta en index.html: '+pat);

test('El marcador real replica el high score arcade aprobado, con sus cuatro categorías',()=>{
 for(const id of ['recordDesigns','recordDuplicates','recordRatings','scoreRankColumn','scoreDataScope','arcadeBonusTitle','scoreTopTitle'])
  key('id="'+id+'"');
 for(const metric of ['cards','designs','duplicates','ratings'])key('data-score-metric="'+metric+'"');
 assert.match(html,/<section class="view" id="scores">[\s\S]*?HIGH SCORES[\s\S]*?TOP 10/);
 assert.match(html,/rank-empty/,'Diez posiciones incluso si no hay jugadores');
 const page=html.slice(html.indexOf('<section class="view" id="scores">'),html.indexOf('<section class="view" id="profile"'));
 assert.doesNotMatch(page,/id="bkExp"|id="bkImp"|RESPALDO DE TU PROGRESO/);
 assert.doesNotMatch(page,/VISTA PREVIA/);
});
test('Perfil, ficha y detalle muestran PTS y POP sin inventar puntuaciones globales',()=>{
 for(const id of ['profileValuePoints','fDesignValue','zVariantPoints','zVariantOwned','zDesignPopularity','zGlobalPosition','icmxGlobalTitle'])key('id="'+id+'"');
 assert.match(html,/SIN RESULTADOS GLOBALES VERIFICADOS/);
 assert.match(html,/Pendiente de conectar votos globales/);
 assert.doesNotMatch(html,/738 POP|480 PTS/,'Los ejemplos simulados nunca deben aparecer en producción');
 assert.match(css,/#profile \.icmx-player-points/);
 assert.match(css,/#zoom \.icmx-card-value/);
 assert.match(css,/#scores \.icmx-global-board/);
});
test('PTS en sobres solo en primera variante; repetidas obtienen cero',()=>{
 key('c._new?(valueVariantPoints(v)===null?');
 key('"REPETIDA · 0 PTS"');
 assert.deepEqual({...VARIANT_POINTS},{b:10,e:25,r:50,f:100});
});
test('El motor se reutiliza para sumar puntos locales, no se duplica la fórmula',()=>{
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
 const elements={
  zVariantPoints:{textContent:''},zVariantOwned:{textContent:''},
  zDesignPopularity:{textContent:''},zGlobalPosition:{textContent:''}
 };
 const ctx={
  S:{have:{abuket_b:3,abuket_e:2,bonus_b:5}},
  CARDS:catalog,$:id=>elements[id]
 };
 vm.createContext(ctx);
 vm.runInContext(section+'\nglobalThis.testAPI={setEngine:(v)=>communityValueEngine=v,points:collectionPointsLocal,update:updateCardValueUI};',ctx);
 ctx.testAPI.setEngine({collectionPoints,VARIANT_POINTS});
 assert.equal(ctx.testAPI.points(),35,'Abuket Base+Especial, repetidas excluidas');
 ctx.testAPI.update({k:'abuket_b',v:'b',bx:false});
 assert.equal(elements.zVariantPoints.textContent,'10 PTS');
 assert.equal(elements.zDesignPopularity.textContent,'— POP');
 assert.equal(elements.zVariantOwned.textContent,'Descubierta en tu colección');
 ctx.S.have={arcade_f:1};
 assert.equal(ctx.testAPI.points(),100,'La Full vale 100');
 ctx.S.have={};
 assert.equal(ctx.testAPI.points(),0,'Sin cartas vale cero');
});
