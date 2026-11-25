import test from 'node:test';
import assert from 'node:assert/strict';
import {
 SCORING_VERSION,VARIANT_POINTS,POPULARITY_WEIGHTS,TIER_VALUES,
 collectionPoints,awardDiscoveries,scoreDesign,rankDesigns
} from '../content/community-value.mjs';

const VALID_KEYS=['abuket_b','abuket_e','abuket_r','abuket_f','arcade_b','arcade_f'];
test('contrato de variantes: 10/25/50/100 y pesos 50/50',()=>{
 assert.equal(SCORING_VERSION,'public-2026-value-v2');
 assert.deepEqual({...VARIANT_POINTS},{b:10,e:25,r:50,f:100});
 assert.deepEqual({...POPULARITY_WEIGHTS},{tiers:.5,reta:.5});
 assert.deepEqual({...TIER_VALUES},{goty:1,genial:.75,ok:.4,mmm:0});
});
test('puntúa una vez cada variante; ignora repetidas, bonus, falsos y formatos antiguos',()=>{
 const found=['abuket_b','abuket_b','abuket_e','abuket_r','abuket_f','bonus_b','falsificado_f','F_abuket','arcade_f'];
 assert.deepEqual(collectionPoints(found,VALID_KEYS),{
  points:285,uniqueVariants:5,byVariant:{b:1,e:1,r:1,f:2}
 });
});
test('registrar nuevos descubrimientos incrementa puntos aunque el inventario se canjee',()=>{
 const a=awardDiscoveries([],['abuket_b','abuket_b','arcade_f'],VALID_KEYS);
 assert.equal(a.points,110);
 assert.deepEqual(a.newlyEarned,['abuket_b','arcade_f']);
 const b=awardDiscoveries(a.earnedKeys,['abuket_b','abuket_e'],VALID_KEYS);
 assert.equal(b.points,135);
 assert.deepEqual(b.newlyEarned,['abuket_e']);
 const c=awardDiscoveries(b.earnedKeys,[],VALID_KEYS);
 assert.equal(c.points,135);
 assert.equal(c.newlyEarned.length,0);
 assert.deepEqual(c.earnedKeys,b.earnedKeys);
});
test('no usa un valor arbitrario para diseños sin votos',()=>{
 assert.deepEqual(scoreDesign(),{
  score:null,status:'unranked',interactions:0,
  components:{tiers:null,reta:null},counts:{tiers:0,reta:0}
 });
});
test('valor neutral 500 cuando todos los canales tienen apoyo dividido',()=>{
 const result=scoreDesign({likes:{positive:10,total:20},tiers:{goty:10,mmm:10},reta:{wins:5,matches:10}});
 assert.equal(result.score,500);
 assert.equal(result.status,'ranked');
 assert.deepEqual(result.counts,{tiers:20,reta:10});
});
test('los Likes históricos no afectan POP, conteo, ni posición',()=>{
 assert.deepEqual(scoreDesign({likes:{positive:50,total:50}}),scoreDesign());
 const base={tiers:{goty:1},reta:{wins:2,matches:3}};
 assert.deepEqual(scoreDesign({...base,likes:{positive:50,total:50}}),scoreDesign(base));
 assert.deepEqual(scoreDesign({...base,likes:{positive:0,total:50}}),scoreDesign(base));
 const rank=rankDesigns([{id:'a',...base},{id:'b',...base,likes:{positive:50,total:50}},{id:'c',likes:{positive:50,total:50}}]);
 assert.deepEqual(rank.map(x=>x.position),[1,1,null]);
});
test('Tier y Reta tienen exactamente el mismo peso y conservan el prior neutro',()=>{
 assert.equal(scoreDesign({tiers:{goty:10}}).score,625);
 assert.equal(scoreDesign({reta:{wins:10,matches:10}}).score,625);
 assert.equal(scoreDesign({tiers:{goty:10},reta:{wins:10,matches:10}}).score,750);
 assert.equal(scoreDesign({tiers:{mmm:10},reta:{wins:0,matches:10}}).score,250);
});
test('Tier GOTY premia más que MMM con el mismo número de votos',()=>{
 const goty=scoreDesign({tiers:{goty:10}});
 const mmm=scoreDesign({tiers:{mmm:10}});
 assert.ok(goty.score>500);
 assert.ok(mmm.score<500);
});
test('Reta cuenta solamente encuentros definitivos agregados en la entrada',()=>{
 const a=scoreDesign({reta:{wins:8,matches:10}});
 const b=scoreDesign({reta:{wins:2,matches:10}});
 assert.ok(a.score>b.score);
 assert.equal(a.counts.reta,10);
});
test('no acepta conteos imposibles ni rankings malformados',()=>{
 assert.throws(()=>scoreDesign({reta:{wins:2,matches:1}}),RangeError);
 assert.throws(()=>scoreDesign({tiers:{goty:-1}}),RangeError);
 assert.throws(()=>collectionPoints(['a_b'],undefined),TypeError);
 assert.throws(()=>rankDesigns([{id:'a'}, {id:'a'}]),TypeError);
});
test('ranking estable, empates comparten lugar, sin votos quedan sin clasificar',()=>{
 const ranked=rankDesigns([
  {id:'sinvotos'},
  {id:'arcade',tiers:{goty:10}},
  {id:'abuket',tiers:{goty:10}},
  {id:'otro',tiers:{goty:1,mmm:9}}
 ]);
 assert.deepEqual(ranked.map(x=>x.id),['abuket','arcade','otro','sinvotos']);
 assert.deepEqual(ranked.map(x=>x.position),[1,1,3,null]);
});
