/** El ranking de jugadores usa un Top 10 global verificado, nunca registros Claude antiguos. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('index.html','utf8');
const start=html.indexOf('function board(){');
const finish=html.indexOf('function renderScores(){',start);
assert.ok(start>=0&&finish>start,'no se encontró el ranking de jugadores');
const snippet=html.slice(start,finish);
function harness(status,boards){
 const context={
  playerRanking:{state:{status,boards}},
  STORE:{docs:[{ini:'OLD',handle:'legacy_player',score:99999}]},
  S:{ini:'TST',rate:{},have:{}},uniq:()=>2,dups:()=>0,
  collectionPointsLocal:()=>20,DESIGNS:[],dState:()=>({own:false}),
  arcadeIdentity:()=>({ini:'TST',handle:'test_player',registered:false}),
  validArcadeIni:s=>/^[A-Z0-9]{3}$/.test(s),
  localStorage:{getItem:()=>null,setItem:()=>{}}
 };
 vm.createContext(context);
 vm.runInContext(snippet+'\nglobalThis.rankTest={board,scoreBoard};',context);
 return context;
}
test('La clasificación global ignora STORE y conserva solo Top 10 del RPC',()=>{
 const h=harness('ready',{cards:[{ini:'ABC',handle:'arcade_abc',score:4}],pts:[],designs:[],duplicates:[],ratings:[]});
 assert.deepEqual([...h.rankTest.board()].map(x=>x.ini),['ABC']);
 assert.deepEqual([...h.rankTest.scoreBoard('cards').rows].map(x=>x.ini),['ABC']);
 assert.equal(h.rankTest.scoreBoard('cards').origin,'available');
 assert.equal(h.rankTest.scoreBoard('pts').rows.length,0);
});
test('Una edición sin datos no inventa jugadores globales',()=>{
 const h=harness('ready',{cards:[],pts:[],designs:[],duplicates:[],ratings:[]});
 assert.equal(h.rankTest.scoreBoard('cards').rows.length,0);
 assert.equal(h.rankTest.scoreBoard('cards').origin,'available');
});
test('Un invitado sin conexión solo tiene marcador local provisional',()=>{
 const h=harness('offline',null);
 assert.equal(h.rankTest.scoreBoard('cards').origin,'session');
 assert.equal(h.rankTest.scoreBoard('cards').rows[0].score,2);
 assert.equal(h.rankTest.scoreBoard('pts').rows[0].score,20);
});
test('Un jugador registrado no fabrica un puesto ante un fallo de red',()=>{
 const h=harness('offline',null);
 h.arcadeIdentity=()=>({ini:'TST',handle:'test_player',registered:true});
 assert.equal(h.rankTest.scoreBoard('cards').rows.length,0);
 assert.equal(h.rankTest.scoreBoard('cards').origin,'empty');
});
