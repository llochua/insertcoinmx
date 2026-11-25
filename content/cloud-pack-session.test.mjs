/**
 * Regresión: cuentas ligadas sin sesión y comprobación automática durante apertura.
 * SDK y nube falsos. No usa datos personales ni escribe en Supabase real.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('./cloud-sync.mjs',import.meta.url),'utf8');
const gameHtml=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const needle="const sdk=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/+esm');";
assert.ok(source.includes(needle),'Debe mantenerse el SDK original');
const mockSource=source.replace(needle,'const sdk=globalThis.__icmxSdkMock;');
const {startCloudSync}=await import('data:text/javascript;base64,'+Buffer.from(mockSource).toString('base64'));
const copy=value=>structuredClone(value);
const backup=(have={})=>({app:'insertcoinmx-album',format:2,
 exportedAt:'2026-11-20T00:00:00Z',
 data:{have,rate:{},welcomeLeft:5,freeUsed:0,fg:0,pk:[],last:''}});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function harness({uid='qa-user',local=backup(),remote=backup(),verifiedGuests=false,anonymous=false,initialStorage={}}={}){
 const store=new Map(Object.entries(initialStorage));
 const storage={
  get length(){return store.size},key:i=>[...store.keys()][i]??null,
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>store.set(k,String(v)),
  removeItem:k=>store.delete(k)
 };
 const h={uid,anonymous,guestCreations:0,local:copy(local),remote:remote?copy(remote):null,
  revision:1,issueCalls:0,exchangeCalls:0,issued:null,gate:null,statuses:[],authEvent:null};
 const auth={
  async getUser(){if(h.gate)await h.gate;return {data:{user:h.uid?{id:h.uid,is_anonymous:h.anonymous}:null},error:null}},
  async getSession(){return {data:{session:h.uid?{user:{id:h.uid}}:null},error:null}},
  onAuthStateChange(fn){h.authEvent=fn;return {data:{subscription:{unsubscribe(){}}}}}
 };
 const client={
  auth,
  from(name){
   assert.equal(name,'player_snapshots');
   return {select(){return this},eq(k,v){assert.equal(k,'user_id');this.userId=v;return this},
    async maybeSingle(){return {data:h.remote?{
     user_id:this.userId,game_format:2,state:copy(h.remote),revision:h.revision}:null,error:null}}};
  },
  async rpc(name,args){
   if(name==='sync_player_snapshot'){
    if(args.p_expected_revision!==h.revision)return {data:{status:'conflict',revision:h.revision},error:null};
    h.remote=copy(args.p_state);h.revision++;
    return {data:{status:'updated',revision:h.revision},error:null};
   }
   if(name==='ensure_player_snapshot'){
    if(h.remote)return {data:{status:'existing',revision:h.revision,state:copy(h.remote)},error:null};
    h.remote=backup();h.revision=1;return {data:{status:'created',revision:1,state:copy(h.remote)},error:null};
   }
   if(name==='issue_player_pack'){
    h.issueCalls++;
    const cards=['gato_b','perro_b','pizza_b','gato_e','gato_f'];
    const next=copy(h.remote);
    for(const card of cards)next.data.have[card]=(next.data.have[card]||0)+1;
    next.data.welcomeLeft--;
    next.data.pk.push('pack-qa-1');
    next.data.fg=1;
    h.remote=next;
    h.revision++;
    return {data:{status:'issued',cards,kind:'welcome',
     revision:h.revision,state:copy(next)},error:null};
   }
   if(name==='exchange_duplicate_cards'){
    h.exchangeCalls++;
    return {data:{status:'not_enough_duplicates'},error:null};
   }
   throw Error('RPC inesperada: '+name);
  }
 };
 globalThis.__icmxSdkMock={createClient:()=>client};
 globalThis.localStorage=storage;
 globalThis.window={addEventListener(){},removeEventListener(){}};
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
 h.controller=await startCloudSync({
  verifiedGuests,
  guestSession:async()=>{
   h.guestCreations++;
   h.uid='guest-stable-uid';h.anonymous=true;
   return {id:h.uid,is_anonymous:true};
  },
  readLocal:()=>copy(h.local),
  restoreLocal:value=>{h.local=copy(value);return {ok:true}},
  onStatus:(code,message)=>h.statuses.push({code,message})
 });
 await h.controller.check();
 await pause(110); // espera el recheck encolado durante INITIAL_SESSION
 h.signedOut=()=>{h.uid=null;h.authEvent('SIGNED_OUT',null)};
 h.stop=()=>{h.controller.stop();delete globalThis.__icmxSdkMock};
 return h;
}

test('El juego bloquea la apertura local si el módulo nube falla al cargar',()=>{
 assert.match(gameHtml,/if\(!cloudSync&&\(localStorage\.getItem\('icmx-cloud-active-account-v1'\)/);
 assert.match(gameHtml,/NO SE CONSUMIÓ EL SOBRE/);
});

test('Al cerrar sesión una colección vinculada NO abre como invitado ni toca las cartas',{concurrency:false},async()=>{
 const h=await harness();
 try{
  assert.equal(h.controller.requiresServer(),true);
  assert.equal(localStorage.getItem('icmx-cloud-active-account-v1'),'qa-user');
  const before=copy(h.local);
  h.signedOut();
  await h.controller.check();
  const result=await h.controller.issuePack();
  assert.equal(result.status,'auth_required');
  assert.equal(h.controller.requiresServer(),true,'El vínculo de cuenta impide acuñar cartas locales');
  assert.deepEqual(h.local,before);
  assert.equal(h.issueCalls,0);
  assert.ok(h.statuses.some(s=>s.code==='auth_required'&&s.message.includes('INICIA SESIÓN')));
 }finally{h.stop()}
});

test('Comprobación de nube en curso: el sobre espera, no responde busy',{concurrency:false},async()=>{
 const h=await harness();
 try{
  let unblock;
  h.gate=new Promise(resolve=>unblock=resolve);
  const ongoing=h.controller.check();
  const issued=h.controller.issuePack();
  await pause(0);
  assert.equal(h.issueCalls,0,'No emitir hasta completar el check');
  h.gate=null;
  unblock();
  await ongoing;
  const result=await issued;
  assert.equal(result.status,'issued');
  assert.equal(h.issueCalls,1,'Solo una emisión');
  assert.equal(Object.values(h.local.data.have).reduce((n,v)=>n+v,0),5);
  assert.equal(h.local.data.welcomeLeft,4);
  assert.equal(h.controller.requiresServer(),true);
 }finally{h.stop()}
});

test('El canje espera una sincronización activa sin gastar duplicadas',{concurrency:false},async()=>{
 const h=await harness();
 try{
  let unblock;
  h.gate=new Promise(resolve=>unblock=resolve);
  const ongoing=h.controller.check();
  const exchange=h.controller.exchangeDuplicates();
  await pause(0);
  assert.equal(h.exchangeCalls,0);
  h.gate=null;unblock();
  await ongoing;
  assert.equal((await exchange).status,'not_enough_duplicates');
  assert.equal(h.exchangeCalls,1);
  assert.deepEqual(h.local.data.have,{});
 }finally{h.stop()}
});

test('Invitado sin vinculación conserva su apertura local normal',{concurrency:false},async()=>{
 const h=await harness({uid:null,remote:null});
 try{
  assert.equal(h.controller.requiresServer(),false);
  assert.equal((await h.controller.issuePack()).status,'guest');
  assert.equal(h.issueCalls,0);
 }finally{h.stop()}
});

test('Conflicto local/remoto nunca emite ni mezcla cartas',{concurrency:false},async()=>{
 const local=backup({gato_b:2});
 const h=await harness({local,remote:backup({gato_b:7})});
 try{
  assert.ok(h.statuses.some(s=>s.code==='conflict'));
  const result=await h.controller.issuePack();
  assert.equal(result.status,'pending');
  assert.equal(h.issueCalls,0);
  assert.deepEqual(h.local,local);
 }finally{h.stop()}
});

test('Una colección independiente se archiva y se recupera la cuenta sin sumar cartas',{concurrency:false},async()=>{
 const local=backup({gato_b:2}),remote=backup({perro_b:7});
 const h=await harness({local,remote});
 try{
  const review=h.controller.getConflict();
  assert.ok(review);
  assert.equal((await h.controller.useCloud(review)).status,'resolved');
  assert.deepEqual(h.local,remote);
  assert.deepEqual(h.remote,remote);
  assert.deepEqual(h.controller.listConflictArchives()[0].backup,local);
  assert.equal(h.issueCalls,0);
  assert.equal((await h.controller.issuePack()).status,'issued');
  assert.equal(h.issueCalls,1);
 }finally{h.stop()}
});
test('Si cambia el servidor después de la revisión no se reemplaza el progreso local',{concurrency:false},async()=>{
 const local=backup({gato_b:2});
 const h=await harness({local,remote:backup({perro_b:7})});
 try{
  const review=h.controller.getConflict();
  h.remote=backup({perro_b:8});h.revision++;
  assert.equal((await h.controller.useCloud(review)).status,'changed');
  assert.deepEqual(h.local,local);
  assert.equal(h.controller.listConflictArchives().length,0);
 }finally{h.stop()}
});
test('Progreso invitado con cuenta nueva: copia separada y alta sin acuñar cartas',{concurrency:false},async()=>{
 const local=backup({gato_b:2});
 const h=await harness({local,remote:null});
 try{
  const review=h.controller.getConflict();
  assert.ok(review);assert.equal(review.remote,null);
  assert.equal((await h.controller.useCloud(review)).status,'resolved');
  assert.deepEqual(h.remote.data.have,{});
  assert.deepEqual(h.local.data.have,{});
  assert.deepEqual(h.controller.listConflictArchives()[0].backup,local);
  assert.equal(h.issueCalls,0);
 }finally{h.stop()}
});

test('Primer sobre de invitado se emite en servidor y convertir UID no reinicia nada',{concurrency:false},async()=>{
 const local=backup();
 local.data.ini='JOS';local.data.seen=1;
 const h=await harness({uid:null,local,remote:null,verifiedGuests:true});
 try{
  assert.equal(h.controller.requiresServer(),true);
  const first=await h.controller.issuePack();
  assert.equal(first.status,'issued');
  assert.equal(h.guestCreations,1);
  assert.equal(h.uid,'guest-stable-uid');
  assert.equal(h.local.data.ini,'JOS');
  assert.equal(h.local.data.welcomeLeft,4);
  assert.equal(h.issueCalls,1);
  const before=copy(h.remote);
  h.anonymous=false;
  h.authEvent('USER_UPDATED',{user:{id:h.uid,is_anonymous:false}});
  await h.controller.check();
  await pause(110);
  assert.deepEqual(h.local,before);
  assert.deepEqual(h.remote,before);
  assert.equal(h.guestCreations,1);
  assert.equal(h.issueCalls,1);
  assert.equal(localStorage.getItem('icmx-cloud-active-account-v1'),h.uid);
 }finally{h.stop()}
});
test('Invitado verificado con cartas locales antiguas no las acuña en servidor',{concurrency:false},async()=>{
 const local=backup({gato_b:7});
 const h=await harness({uid:null,local,remote:null,verifiedGuests:true});
 try{
  assert.equal((await h.controller.issuePack()).status,'pending');
  assert.equal(h.issueCalls,0);
  assert.deepEqual(h.local,local);
  assert.equal(h.remote,null);
  assert.ok(h.controller.getConflict());
 }finally{h.stop()}
});

test('Invitado y registrado anteriores al reset recuperan su partida sin mezclar cartas',{concurrency:false},async()=>{
 for(const anonymous of [true,false]){
  const old=backup({gato_b:5});old.data.last='2026-11-20';old.data.fg=1;
  const current=backup({perro_b:9});current.data.last='2026-11-24';current.data.fg=1;
  const h=await harness({local:old,remote:current,verifiedGuests:true,anonymous});
  try{
   assert.deepEqual(h.local,current);
   assert.deepEqual(h.remote,current);
   assert.equal(h.controller.getConflict(),null);
   assert.deepEqual(h.controller.listConflictArchives()[0].backup,old);
   assert.equal(localStorage.getItem('icmx-game-epoch'),'public-2026-launch-v2');
   assert.equal(h.issueCalls,0);
   assert.equal((await h.controller.issuePack()).status,'issued');
   assert.equal(h.issueCalls,1);
  }finally{h.stop()}
 }
});
test('Invitado histórico sin snapshot se inicializa sin restaurar cartas antiguas',{concurrency:false},async()=>{
 const old=backup({gato_b:5});old.data.last='2026-11-20';old.data.fg=1;
 const h=await harness({uid:null,local:old,remote:null,verifiedGuests:true});
 try{
  const result=await h.controller.issuePack();
  assert.equal(result.status,'issued');
  assert.equal(h.guestCreations,1);
  assert.equal(h.issueCalls,1);
  assert.deepEqual(h.controller.listConflictArchives()[0].backup,old);
  assert.equal(Object.values(h.local.data.have).reduce((n,v)=>n+v,0),5);
 }finally{h.stop()}
});
test('Progreso reciente, fecha ambigua, marcador actual y peticiones pendientes no se migran',{concurrency:false},async()=>{
 for(const variant of ['recent','ambiguous','epoch','pending','baseline']){
  const old=backup({gato_b:5});old.data.last=variant==='recent'?'2026-11-24':variant==='ambiguous'?'2026-11-21':'2026-11-20';old.data.fg=1;
  const current=backup({perro_b:9});current.data.last='2026-11-24';
  const initialStorage={};
  if(variant==='epoch')initialStorage['icmx-game-epoch']='public-2026-launch-v2';
  if(variant==='pending')initialStorage['icmx-cloud-pack-request-v1:qa-user']='pending-id';
  if(variant==='baseline'){
   const post=copy(old);post.exportedAt='2026-11-23T00:00:00Z';
   initialStorage['icmx-cloud-baseline-v1:qa-user']=JSON.stringify({userId:'qa-user',revision:1,backup:post});
  }
  const h=await harness({local:old,remote:current,verifiedGuests:true,initialStorage});
  try{
   // El flujo normal puede descargar si el local coincide con una baseline válida.
   if(variant!=='baseline')assert.deepEqual(h.local,old);
   assert.equal(h.controller.listConflictArchives().length,0);
   assert.deepEqual(h.remote,current);
   assert.equal(h.issueCalls,0);
  }finally{h.stop()}
 }
});
