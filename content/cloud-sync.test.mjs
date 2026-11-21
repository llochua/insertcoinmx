import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertBackup,progressSignature,sameProgress,hasGameProgress,decideSync,reconcileMetadata,archiveConflict} from './cloud-sync.mjs';

const backup=(have={},extra={})=>({
 app:'insertcoinmx-album',format:2,exportedAt:new Date().toISOString(),
 data:{have,rate:{},welcomeLeft:5,freeUsed:0,rev:0,sv:2,mv:2,...extra}
});
const base=(b,revision=1)=>({backup:b,revision,userId:'demo'});

test('Diferencias en exportación o revisión local no duplican progreso',()=>{
 const a=backup({gato_b:3},{rev:12});
 const b=backup({gato_b:3},{rev:1});
 assert.equal(sameProgress(a,b),true);
 assert.equal(progressSignature(a),progressSignature(b));
 assert.equal(decideSync({local:a,remote:b,base:null,remoteRevision:1}),'matched');
});
test('Navegador recién creado recibe las cartas de la cuenta sin mezclar',()=>{
 assert.equal(decideSync({local:backup(),remote:backup({gato_b:5}),base:null,remoteRevision:1}),'download');
});
test('Cuenta con respaldo y otra colección local diferente: conflicto seguro',()=>{
 const a=backup({gato_b:4}),b=backup({gato_b:2});
 assert.equal(decideSync({local:a,remote:b,base:null,remoteRevision:1}),'conflict');
});
test('Primer envío requiere paso de respaldo inicial; nunca se escribe solo',()=>{
 assert.equal(decideSync({local:backup({gato_b:1}),remote:null,base:null,remoteRevision:0}),'first-upload-required');
 assert.equal(decideSync({local:backup(),remote:null,base:null,remoteRevision:0}),'empty');
});
test('Cambio local únicamente: upload con revisión conocida',()=>{
 const old=backup({gato_b:1}),newLocal=backup({gato_b:2});
 assert.equal(decideSync({local:newLocal,remote:old,base:base(old),remoteRevision:1}),'upload');
});
test('Cambio remoto únicamente: download con copia local sin modificar',()=>{
 const old=backup({gato_b:1}),newRemote=backup({gato_b:3});
 assert.equal(decideSync({local:old,remote:newRemote,base:base(old),remoteRevision:2}),'download');
});
test('Cambios simultáneos no se suman ni pierden: conflicto',()=>{
 const old=backup({gato_b:1}),newLocal=backup({gato_b:3}),newRemote=backup({gato_b:2});
 const original=JSON.stringify([newLocal,newRemote]);
 assert.equal(decideSync({local:newLocal,remote:newRemote,base:base(old),remoteRevision:2}),'conflict');
 assert.equal(JSON.stringify([newLocal,newRemote]),original);
});
test('Reintento con respuesta perdida: dos estados iguales, sin segundo envío',()=>{
 const old=backup({gato_b:1}),both=backup({gato_b:2});
 assert.equal(decideSync({local:both,remote:both,base:base(old),remoteRevision:2}),'matched');
});
test('El servidor ya no tiene instantánea: no reemplazar datos locales',()=>{
 assert.equal(decideSync({local:backup({gato_b:2}),remote:null,base:base(backup()),remoteRevision:0}),'conflict');
});
test('Rechazar valores corruptos, prototipos maliciosos y formato nuevo',()=>{
 const a=backup({gato_b:-2});
 assert.throws(()=>assertBackup(a));
 const b=backup({gato_b:2});
 b.data.__proto__={bad:true}; // prototype alterations do not survive JSON, test explicit own property
 Object.defineProperty(b.data,'constructor',{value:{evil:1},enumerable:true});
 assert.throws(()=>assertBackup(b));
 assert.throws(()=>assertBackup({...backup(),format:3}));
});
test('Sincronización respeta actividad sin cartas (Tier/Reta)',()=>{
 assert.equal(hasGameProgress(backup()),false);
 assert.equal(hasGameProgress(backup({}, {rate:{gato:1}})),true);
 assert.equal(hasGameProgress(backup({}, {reta2:{round:3}})),true);
});

test('Calificar localmente mientras otro dispositivo abre sobre no bloquea ni altera cartas',()=>{
 const old=backup({gato_b:1},{pk:['abcdef12'],welcomeLeft:4});
 const local=backup({gato_b:1},{pk:['abcdef12'],welcomeLeft:4,rate:{gato:2}});
 const remote=backup({gato_b:2},{pk:['abcdef12','abcdef34'],welcomeLeft:3,rate:{perro:1}});
 const merged=reconcileMetadata({local,remote,base:base(old)});
 assert.deepEqual(merged.data.have,remote.data.have);
 assert.deepEqual(merged.data.pk,remote.data.pk);
 assert.equal(merged.data.welcomeLeft,3);
 assert.deepEqual(merged.data.rate,{perro:1,gato:2});
});
test('Dos colecciones independientes no se pueden reconciliar por metadata',()=>{
 const old=backup({gato_b:1});
 assert.equal(reconcileMetadata({local:backup({gato_b:4}),remote:backup({perro_b:2}),base:base(old)}),null);
 assert.equal(reconcileMetadata({local:old,remote:backup({perro_b:2}),base:null}),null);
});
test('Modificar la misma calificación de forma incompatible requiere revisión',()=>{
 const old=backup({gato_b:1},{rate:{gato:1}});
 assert.equal(reconcileMetadata({local:backup({gato_b:1},{rate:{gato:2}}),
 remote:backup({gato_b:1},{rate:{gato:3}}),base:base(old)}),null);
});
test('Archivo de conflicto independiente no sobrescribe una copia anterior',()=>{
 const store=new Map();
 const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 const first=backup({gato_b:3}),second=backup({perro_b:6});
 const a=archiveConflict(storage,{owner:'qa',local:first});
 const b=archiveConflict(storage,{owner:'qa',local:second});
 assert.notEqual(a,b);
 assert.deepEqual(JSON.parse(store.get(a)).backup,first);
 assert.deepEqual(JSON.parse(store.get(b)).backup,second);
 assert.throws(()=>archiveConflict({getItem:()=>null,setItem(){}},{owner:'qa',local:first}));
});
