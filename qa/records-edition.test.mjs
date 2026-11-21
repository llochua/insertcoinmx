/** La clasificación pública comienza desde cero en la edición nueva. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('index.html','utf8');
const start=html.indexOf("const RECORDS_EDITION='public-2026-launch-v1';");
const finish=html.indexOf("/* Varias pestañas:",start);
assert.ok(start>=0&&finish>start,'no se encontró la edición de Récords');
const storeSnippet=html.slice(start,finish);
const boardStart=html.indexOf('function board(){');
const boardEnd=html.indexOf('function renderScores()',boardStart);
assert.ok(boardStart>=0&&boardEnd>boardStart,'no se encontró la clasificación');
const boardSnippet=html.slice(boardStart,boardEnd);

test('Ignorar registros de la colección anterior y otras ediciones',async()=>{
 const stored=[
  {v:6,ini:'OLD',score:300,rate:{}},
  {v:7,edition:'public-2025',ini:'OLD',score:400,rate:{}},
  {v:7,edition:'public-2026-launch-v1',ini:'NEW',score:3,rate:{}}
 ];
 let wrote=null;
 const db={
  collection(name){assert.equal(name,'tiers');return {onSnapshot(cb){cb({docs:stored.map(value=>({data:()=>value}))})}}},
  doc(path){assert.equal(path,'tiers/u-1');return {set(value){wrote=value;return Promise.resolve()}}}
 };
 const context={
  window:{claude:true},claude:{async use(name){if(name==='db')return db;if(name==='user')return {id:async()=> 'u-1'};return null}},
  S:{ini:'NEW',rate:{},champ:'',duel:{}},uniq:()=>3,refresh:()=>{}
 };
 vm.createContext(context);
 vm.runInContext(storeSnippet+'\nglobalThis.store=STORE;',context);
 await context.store.init();
 assert.equal(context.store.docs.length,1);
 assert.equal(context.store.docs[0].ini,'NEW');
 context.store.put();
 assert.equal(wrote.v,7);
 assert.equal(wrote.edition,'public-2026-launch-v1');
 assert.equal(wrote.score,3);
});
test('Una clasificación nueva no muestra récords previos ni marcadores sin iniciales',()=>{
 const context={
  STORE:{docs:[
    {ini:'???',score:15},{ini:'AA',score:20},{ini:'AAA',score:0},
    {ini:'NEW',score:3},{ini:'ABC',score:2}
  ]},
  S:{ini:''},
  uniq:()=>0
 };
 vm.createContext(context);
 vm.runInContext(boardSnippet+'\nglobalThis.boardTest=board;',context);
 assert.deepEqual([...context.boardTest()].map(x=>x.ini),['NEW','ABC']);
 context.STORE.docs=[];
 assert.equal(context.boardTest().length,0);
});
