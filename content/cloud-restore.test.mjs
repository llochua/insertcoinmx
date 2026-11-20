import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {sameProgress} from './cloud-sync.mjs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function applyCloudRestore(');
const end=html.indexOf('async function saveFile(',start);
assert.ok(start>0&&end>start,'La función real debe existir en index.html');
const source=html.slice(start,end);

function scenario({normalize=x=>x,valid=()=>({ok:true}),opening=false}={}){
 const map=new Map([['icmx-album2',JSON.stringify({have:{gato_b:1},rate:{},freeCycle:100,freeUsed:1})]]);
 const localStorage={
  getItem:k=>map.has(k)?map.get(k):null,
  setItem:(k,v)=>map.set(k,String(v)),
  removeItem:k=>map.delete(k)
 };
 const S={have:{gato_b:1},rate:{},freeCycle:100,freeUsed:1};
 const context={
  JSON,Date,Object,localStorage,KEY:'icmx-album2',KEY_EXT:'icmx-album2.ext',KEY_BAK:'icmx-album2.bak',
  FORMAT:2,S,MINE:[],saveFailed:false,NOWRITE:false,opening,lastRaw:map.get('icmx-album2'),
  isObj:x=>x!==null&&typeof x==='object'&&!Array.isArray(x),
  validateBackup:valid,normalize,refresh(){},syncIn(){},setWarn(){},
  LS:{get:k=>localStorage.getItem(k)},
  restoreKeys:(main,ext)=>{
   for(const [key,value] of [['icmx-album2',main],['icmx-album2.ext',ext]]){
    if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);
   }
   return true;
  }
 };
 runInNewContext(source,context);
 return {context,map,S,localStorage,apply:b=>context.applyCloudRestore(b,sameProgress)};
}
const backup=(data,ext)=>({
 app:'insertcoinmx-album',format:2,exportedAt:'2026-11-19T23:59:00Z',
 data:{have:{gato_b:3},rate:{gato:1},freeCycle:135,freeUsed:2,
  welcomeLeft:0,fg:1,rev:9,sv:2,mv:2,pk:['abcdef12'],...data},
 ...(ext?{ext}:{})
});
test('Restauración exacta: conserva cuota, ciclo, historial y datos extendidos',()=>{
 const s=scenario(),remote=backup({reta2:{round:3}},
  {pend:{future_f:2}});
 assert.deepEqual(s.apply(remote),{ok:true});
 const restored=JSON.parse(s.localStorage.getItem('icmx-album2'));
 assert.equal(restored.freeCycle,135);
 assert.equal(restored.freeUsed,2);
 assert.equal(restored.pk[0],'abcdef12');
 assert.deepEqual(restored.reta2,{round:3});
 assert.deepEqual(JSON.parse(s.localStorage.getItem('icmx-album2.ext')),
  {pend:{future_f:2}});
 assert.equal(s.S.have.gato_b,3);
 const old=JSON.parse(s.localStorage.getItem('icmx-album2.bak'));
 assert.equal(JSON.parse(old.main).have.gato_b,1);
});
test('Si normalizar modifica un campo persistente, bloquea y recupera original',()=>{
 const s=scenario({normalize:x=>{x.freeCycle=999;return x}});
 const previous=s.localStorage.getItem('icmx-album2');
 assert.deepEqual(s.apply(backup()),{ok:false});
 assert.equal(s.localStorage.getItem('icmx-album2'),previous);
 assert.equal(s.S.have.gato_b,1);
});
test('No restaurar si hay un sobre todavía sin guardar o animación en curso',()=>{
 for(const config of [{opening:true},{}]){
  const s=scenario(config);
  if(!config.opening)s.context.saveFailed=true;
  const before=s.localStorage.getItem('icmx-album2');
  assert.deepEqual(s.apply(backup()),{ok:false});
  assert.equal(s.localStorage.getItem('icmx-album2'),before);
 }
});
test('Respaldo inválido se rechaza sin tocar el dispositivo',()=>{
 const s=scenario({valid:()=>({ok:false})});
 const before=s.localStorage.getItem('icmx-album2');
 assert.deepEqual(s.apply(backup()),{ok:false});
 assert.equal(s.localStorage.getItem('icmx-album2'),before);
});
