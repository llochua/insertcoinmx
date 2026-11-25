import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertBackup,progressSignature,sameProgress,hasGameProgress,decideSync,reconcileMetadata,archiveConflict,isFreshGuest} from './cloud-sync.mjs';

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
test('Regresión móvil 25 / escritorio 0: recuperar la nube aunque el perfil local ya tenga iniciales',()=>{
 const remote=backup({gato_b:10,perro_e:15},{
  ini:'JOS',fg:1,pk:['qa000001','qa000002','qa000003','qa000004','qa000005'],
  welcomeLeft:0,last:'2026-11-21'
 });
 const local=backup({}, {ini:'JOS',seen:1,fg:0,pk:[],freeCycle:0});
 const unchanged=JSON.stringify(remote);
 assert.equal(isFreshGuest(local),true);
 assert.equal(hasGameProgress(local),true,'las iniciales solas eran la causa del falso conflicto');
 assert.equal(decideSync({local,remote,base:null,remoteRevision:7}),'download');
 assert.equal(JSON.stringify(remote),unchanged,'la prueba no debe modificar el respaldo de 25 cartas');
});
test('Sin referencia común, actividad verdadera nunca se sobreescribe automáticamente',()=>{
 const remote=backup({gato_b:25},{ini:'JOS',fg:1,welcomeLeft:0});
 for(const local of [
  backup({perro_b:1},{ini:'JOS',fg:1,welcomeLeft:4}),
  backup({}, {ini:'JOS',rate:{perro:2}}),
  backup({}, {ini:'JOS',pk:['abcdef12'],fg:1,welcomeLeft:4}),
  backup({}, {ini:'JOS',welcomeLeft:4})
 ])assert.equal(decideSync({local,remote,base:null,remoteRevision:7}),'conflict');
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

import {ensureVerifiedGuest,beginGuestUpgrade,finishGuestUpgrade,upgradeStage,GUEST_BINDING} from './verified-guest.mjs';
test('Invitado sin cartas puede conservar identidad inicial, progreso real nunca se reinicia',()=>{
 assert.equal(isFreshGuest(backup({}, {ini:'JOS',seen:1,fg:0,pk:[],freeCycle:0})),true);
 assert.equal(isFreshGuest(backup({gato_b:1})),false);
 assert.equal(isFreshGuest(backup({}, {pk:['abcdef12']})),false);
 assert.equal(isFreshGuest(backup({}, {welcomeLeft:4})),false);
 assert.equal(isFreshGuest(backup({}, {rate:{gato:1}})),false);
 assert.equal(isFreshGuest(backup({}, {reta2:{round:1}})),false);
});
const guestAuthHarness=()=>{
 let user=null,created=0,updates=[];
 const auth={
  async getSession(){return {data:{session:user?{user}:null},error:null}},
  async getUser(){return {data:{user},error:null}},
  async signInAnonymously(args){
   if(args!==undefined)assert.equal(args.options.captchaToken,'qa-token');created++;
   user={id:'guest-uid',is_anonymous:true,user_metadata:{}};
   return {data:{user,session:{user}},error:null};
  },
  async updateUser(args){
   updates.push(args);
   if(args.email){user={...user,user_metadata:{...user.user_metadata,...args.data},new_email:args.email}}
   if(args.password){user={...user,user_metadata:{...user.user_metadata,...args.data}}}
   return {data:{user},error:null}
  }
 };
 const map=new Map();
 const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const params={auth,storage,exclusive:task=>task(),captchaToken:async()=> 'qa-token'};
 return {params,storage,auth,updates,get user(){return user},get created(){return created},
  verifyEmail(){user={...user,email:user.new_email,is_anonymous:false,email_confirmed_at:'2026-11-21T00:00:00Z'}}};
};
test('Invitado verificado reutiliza UID y no vuelve a crear identidad',async()=>{
 const h=guestAuthHarness();
 const first=await ensureVerifiedGuest(h.params);
 h.storage.setItem(GUEST_BINDING,first.id);
 const second=await ensureVerifiedGuest(h.params);
 assert.equal(second.id,first.id);assert.equal(h.created,1);
});
test('Sin CAPTCHA o sin sesión vinculada no se crea una identidad nueva',async()=>{
 const h=guestAuthHarness();
 await assert.rejects(()=>ensureVerifiedGuest({...h.params,captchaToken:async()=>''}),/guest_captcha_required/);
 h.storage.setItem(GUEST_BINDING,'old-uid');
 await assert.rejects(()=>ensureVerifiedGuest(h.params),/guest_session_lost/);
 assert.equal(h.created,0);
});
test('Conversión mantiene UID: correo primero y contraseña únicamente después de verificación',async()=>{
 const h=guestAuthHarness();
 const first=await ensureVerifiedGuest(h.params);
 const linked=await beginGuestUpgrade({auth:h.auth,expectedUid:first.id,email:'qa@example.invalid',ini:'JOS',handle:'qa_guest',redirectTo:'https://example.invalid'});
 assert.equal(linked.id,first.id);
 assert.equal(h.updates[0].password,undefined);
 assert.equal(upgradeStage(linked),'email');
 await assert.rejects(()=>finishGuestUpgrade({auth:h.auth,expectedUid:first.id,password:'qa-password'}),/guest_email_not_verified/);
 h.verifyEmail();
 assert.equal(upgradeStage(h.user),'password');
 const finished=await finishGuestUpgrade({auth:h.auth,expectedUid:first.id,password:'qa-password'});
 assert.equal(finished.id,first.id);
 assert.equal(upgradeStage(finished),'none');
 assert.equal(h.created,1);
});
test('No convertir ni cambiar contraseña de una sesión distinta',async()=>{
 const h=guestAuthHarness();await ensureVerifiedGuest(h.params);
 await assert.rejects(()=>beginGuestUpgrade({auth:h.auth,expectedUid:'other',email:'qa@example.invalid',ini:'JOS',handle:'qa_guest'}),/guest_identity_changed/);
 assert.equal(h.updates.length,0);
});

test('Beta sin CAPTCHA usa Auth real sin token, conserva UID y no repite alta',async()=>{
 const h=guestAuthHarness();const params={...h.params,captchaToken:undefined};
 const first=await ensureVerifiedGuest(params);h.storage.setItem(GUEST_BINDING,first.id);
 assert.equal((await ensureVerifiedGuest(params)).id,first.id);assert.equal(h.created,1);
});


test('Bienvenida nueva: tres sobres no consumidos siguen siendo partida fresca',()=>{
 const fresh=backup({}, {welcomeLeft:3,welcomeTotal:3});
 assert.equal(isFreshGuest(fresh),true);
 assert.equal(hasGameProgress(fresh),false);
 assert.equal(isFreshGuest(backup({}, {welcomeLeft:2,welcomeTotal:3})),false);
 assert.equal(hasGameProgress(backup({}, {welcomeLeft:2,welcomeTotal:3})),true);
 assert.equal(isFreshGuest(backup({}, {welcomeLeft:5})),true);
});
