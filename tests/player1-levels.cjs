/* Run from repository root: node tests/player1-levels.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../content/player1-levels.js');
const source = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const catalog = source.slice(source.indexOf('const DESIGNS=['),source.indexOf('/* Copia de despliegue'));
const cards = [...catalog.matchAll(/\{id:'([^']+)'[^\n]*?\}/g)].flatMap(m=>{
  const line=m[0],id=m[1],r=/r:'([^']+)'/.exec(line)?.[1],ex=/ex:'([^']+)'/.exec(line)?.[1]||'';
  const original={comun:'b',holo:'e',dorada:'r'}[r];
  const full=/\bf:\d+/.test(line);
  return api.variants.map(v=>({k:id+'_'+v,bx:/\bbx:1/.test(line),img:v==='f'?(full?'F_'+id:null):v===original?id:ex.includes(v)?id+'_'+v:null}));
});
const [l1,l2]=api.levels;
assert.deepEqual(api.validateCatalog(cards),[]);
assert.equal(new Set([...l1.designs,...l2.designs]).size,50);
const have24=Object.fromEntries(l1.designs.slice(0,24).map(id=>[id+'_f',1]));
const have25={...have24,[l1.designs[24]+'_e']:1};
assert.equal(api.eligibleDesigns({}).length,25);
assert.equal(api.progress({})[1].unlocked,false);
assert.equal(api.progress({...have24,[l1.designs[0]+'_b']:99})[1].unlocked,false);
assert.equal(api.progress(have25)[1].unlocked,true);
assert.equal(api.eligibleDesigns(have25).length,50);
assert.equal(api.eligibleDesigns(have25,l2.id).length,25);
assert.equal(api.progress(have25)[0].collected,25);
assert.equal(api.progress(have25)[0].allVariants,false);
const future=l2.designs[0]+'_f';
assert.equal(api.visibleDesigns({[future]:1,navidadgamer_b:1}).includes('navidadgamer'),true);
assert.equal(api.visibleDesigns({[future]:1}).includes(l2.designs[0]),true);
assert.equal(api.eligibleDesigns({[future]:1}).includes(l2.designs[0]),false);
assert.equal(api.progress({...have25,[future]:1})[1].discovered,1);
assert.equal(api.levelOf('navidadgamer'),null);
assert.equal(api.levelOf('sailourss'),null);
console.log('PLAYER 1: progression and catalog checks passed');

assert.equal(api.numberOf('x'),25);
assert.equal(api.numberOf(l2.designs[0]),26);
assert.equal(api.numberOf(l2.designs[24]),50);
assert.equal(api.numberOf('navidadgamer'),null);

assert.equal(api.collectionProgress(have24).designTotal,25);
assert.equal(api.collectionProgress(have24).discovered,24);
assert.equal(api.collectionProgress(have25).designTotal,50);
assert.equal(api.collectionProgress(have25).discovered,25);
assert.equal(api.collectionProgress(have25).variantTotal,200);
assert.equal(api.collectionProgress({...have25,[future]:1}).discovered,26);
assert.equal(api.collectionProgress({[future]:1}).designTotal,25);
assert.equal(api.collectionProgress({[future]:1}).discovered,0);

/* Exercise the actual offline draw implementation without loading the browser. */
const drawStart=source.indexOf('const SP={holo:17,dorada:6.6,full:2.4}');
const drawEnd=source.indexOf('const GLOW=',drawStart);
assert.ok(drawStart>=0 && drawEnd>drawStart);
const POOL={comun:[],holo:[],dorada:[],full:[]};
const names={b:'comun',e:'holo',r:'dorada',f:'full'};
for(const c of cards.filter(c=>c.img&&!c.bx)){const v=c.k.slice(-1);POOL[names[v]].push({k:c.k,d:c.k.slice(0,-2),v});}
const S={have:{}};
const makeHand=new Function('POOL','S','window',source.slice(drawStart,drawEnd)+';return makeHand;')(POOL,S,{ICMX_PLAYER1_LEVELS:api});
for(const owned of [{},have24,have25,{...have24,navidadgamer_b:1,[future]:1}]){
 S.have=owned;const allowed=new Set(api.eligibleDesigns(owned));const snapshot=JSON.stringify(owned);
 for(let i=0;i<200;i++){const hand=makeHand(i===0);assert.equal(hand.length,5);assert.ok(hand.every(c=>allowed.has(c.d)));assert.ok(hand.slice(0,3).every(c=>c.v==='b'));if(i===0)assert.equal(hand[4].v,'f');}
 assert.equal(JSON.stringify(owned),snapshot);
}
console.log('Offline draws: 800 packs, scopes, rarity structure, preserved inventory');

// Replacement slots preserve discovery credit, not duplicate credit or inventory.
const removed=["invader","sensei","bustfiction","docecasas","gunsncontrols","keepcalm"];
for(const id of removed)assert.equal(api.levelOf(id),null);
const oldFirst=Object.fromEntries(l1.designs.map(id=>[({"ochentas":"invader","blooper":"sensei","fatman":"bustfiction","zodiac":"docecasas","triforce":"gunsncontrols","poketaco":"keepcalm"}[id]||id)+'_b',1]));
assert.equal(api.progress(oldFirst)[0].discovered,25);
assert.equal(api.progress(oldFirst)[1].unlocked,true);
assert.equal(api.progress({...oldFirst,ochentas_b:1})[0].discovered,25);
assert.ok(api.visibleDesigns(oldFirst).includes('invader'));
assert.ok(!api.eligibleDesigns(oldFirst).includes('invader'));
const oldBoth=Object.fromEntries([...l1.designs,...l2.designs].map(id=>[({"ochentas":"invader","blooper":"sensei","fatman":"bustfiction","zodiac":"docecasas","triforce":"gunsncontrols","poketaco":"keepcalm"}[id]||id)+'_b',1]));
assert.equal(api.collectionProgress(oldBoth).discovered,50);
const sql=fs.readFileSync(path.join(__dirname,'../supabase/sql/player1_pack_progression_STAGED.sql'),'utf8');
for(const [i,level] of api.levels.entries()){
 const match=sql.match(new RegExp('v_level'+(i+1)+' constant text\\[\\] := ARRAY\\[([^\\]]+)\\]'));
 assert.ok(match);
 assert.deepEqual(match[1].match(/'[^']+'/g).map(x=>x.slice(1,-1)).sort(),[...level.designs].sort());
}
console.log('Replacement progress and server/client pool parity passed');
