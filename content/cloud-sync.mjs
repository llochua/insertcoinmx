/**
 * Insert Coin MX · sincronización conservadora v1.
 * El navegador guarda primero. Supabase recibe snapshots solo con CAS:
 * si ambos lados avanzaron, se bloquea la sincronización; NUNCA suma copias.
 *
 * La sesión comparte la misma storageKey que /qa/registro/.
 * No habilita nuevos registros ni mueve datos de un usuario a otro.
 */
const BASE_PREFIX='icmx-cloud-baseline-v1:';
const ACCOUNT_BINDING='icmx-cloud-active-account-v1';
const IGNORED=new Set(['rev','sv','mv','test']);
const CARD=/^[a-z0-9]{1,40}_[berf]$/;
const RATING=/^[a-z0-9]{1,40}$/;
const BAD_KEYS=new Set(['__proto__','prototype','constructor']);
const MAX_BYTES=1048576;
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

function safeCopy(value){
 const text=JSON.stringify(value);
 if(!text||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Respaldo demasiado grande');
 return JSON.parse(text,(k,v)=>{if(BAD_KEYS.has(k))throw Error('Clave insegura');return v});
}
export function assertBackup(value){
 const b=safeCopy(value);
 if(!isObj(b)||b.app!=='insertcoinmx-album'||b.format!==2||!isObj(b.data)||
    !isObj(b.data.have)||!isObj(b.data.rate)||
    (own(b,'ext')&&!isObj(b.ext)))throw Error('Formato de respaldo incompatible');
 if(Object.entries(b.data.have).some(([k,n])=>!CARD.test(k)||!Number.isInteger(n)||n<1||n>9999))
  throw Error('Cartas inválidas');
 if(Object.entries(b.data.rate).some(([k,n])=>!RATING.test(k)||!Number.isInteger(n)||n<0||n>3))
  throw Error('Calificaciones inválidas');
 return b;
}
function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(isObj(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function progressSignature(value){
 const b=assertBackup(value),data={};
 for(const [k,v] of Object.entries(b.data))if(!IGNORED.has(k))data[k]=v;
 return canonical({data,ext:b.ext??null});
}
export function sameProgress(a,b){return progressSignature(a)===progressSignature(b)}
export function hasGameProgress(backup){
 const b=assertBackup(backup),d=b.data;
 if(Object.keys(d.have).length||Object.keys(d.rate).length||b.ext&&Object.keys(b.ext).length)return true;
 if(d.fg||d.last||d.champ||d.ini||d.extra||d.reta2||d.rdia||
    d.welcomeLeft<5||d.freeUsed>0||Array.isArray(d.pk)&&d.pk.length)return true;
 for(const k of ['duel','logro'])if(isObj(d[k])&&Object.keys(d[k]).length)return true;
 return false;
}
/** Función pura: jamás fusiona datos de dos dispositivos. */
export function decideSync({local,remote,base,remoteRevision}){
 const localSig=progressSignature(local);
 if(!remote){
  if(base)return 'conflict';
  return hasGameProgress(local)?'first-upload-required':'empty';
 }
 const remoteSig=progressSignature(remote);
 if(!base){
  if(localSig===remoteSig)return 'matched';
  return hasGameProgress(local)?'conflict':'download';
 }
 if(!Number.isInteger(remoteRevision)||remoteRevision<1)return 'conflict';
 const baseSig=progressSignature(base.backup);
 const changedLocal=localSig!==baseSig;
 const changedRemote=remoteSig!==baseSig;
 if(localSig===remoteSig)return 'matched';
 if(changedLocal&&changedRemote)return 'conflict';
 if(changedRemote)return 'download';
 if(changedLocal)return 'upload';
 return 'matched';
}

function readBaseline(storage,userId){
 try{
  const value=JSON.parse(storage.getItem(BASE_PREFIX+userId));
  if(!isObj(value)||value.userId!==userId||
     !Number.isInteger(value.revision)||value.revision<1)return null;
  assertBackup(value.backup);
  return value;
 }catch(_){return null}
}
function persistBaseline(storage,userId,revision,backup){
 const value=JSON.stringify({userId,revision,backup:assertBackup(backup)});
 storage.setItem(BASE_PREFIX+userId,value);
 if(storage.getItem(BASE_PREFIX+userId)!==value)throw Error('No se pudo verificar el marcador local');
}

/**
 * @param {{readLocal:()=>object,restoreLocal:(backup:object)=>{ok:boolean},
 *  onStatus:(code:string,message:string)=>void}} callbacks
 * @returns {Promise<{changed:()=>void,check:()=>void,stop:()=>void}>}
 */
export async function startCloudSync({readLocal,restoreLocal,onStatus}){
 const sdk=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/+esm');
 const client=sdk.createClient(
  'https://ynugqxbtszhsupadqdkz.supabase.co',
  'sb_publishable_3wyMm9dwLqSb9GiYTh245Q_9TukyCLK',
  {auth:{flowType:'implicit',detectSessionInUrl:false,persistSession:true,
    autoRefreshToken:true,storageKey:'icmx-auth-qa-nov2026'}}
 );
 let stopped=false,busy=false,rerun=false,debounce=null,interval=null;
 let syncTask=null; // Espera la comprobación en curso antes de emitir un sobre.
 let accountUid=null,issuing=false,sessionActive=true;
 let importAvailable=false;
 const status=(code,message)=>{if(!stopped)onStatus(code,message)};
 async function syncOnce(){
  const {data:verified,error:authError}=await client.auth.getUser();
  if(authError){
   const {data:sessionData}=await client.auth.getSession();
   sessionActive=Boolean(sessionData?.session?.user?.id);
   if(!sessionActive)accountUid=null;
   const bound=localStorage.getItem(ACCOUNT_BINDING);
   status(sessionData?.session?'offline':bound?'auth_required':'guest',
    sessionData?.session?'NUBE SIN CONEXIÓN · EL PROGRESO LOCAL SIGUE A SALVO':
    bound?'SESIÓN CERRADA · INICIA SESIÓN PARA ABRIR SOBRES':'INVITADO · PROGRESO SOLO EN ESTE DISPOSITIVO');
   return;
  }
  const user=verified?.user;
  if(!user?.id){
   accountUid=null;sessionActive=false;importAvailable=false;
   const bound=localStorage.getItem(ACCOUNT_BINDING);
   status(bound?'auth_required':'guest',bound?
    'SESIÓN CERRADA · INICIA SESIÓN PARA ABRIR SOBRES':
    'INVITADO · PROGRESO SOLO EN ESTE DISPOSITIVO');
   return;
  }
  const uid=user.id;
  sessionActive=true;
  importAvailable=false;
  // El progreso local no está particionado por cuenta. Si alguien cambia
  // de usuario en el mismo navegador, bloquear descargas y subidas antes
  // de que una colección pueda sustituir o contaminar a la otra.
  const bound=localStorage.getItem(ACCOUNT_BINDING);
  if(bound&&bound!==uid){
   accountUid=null;
   status('conflict','OTRA CUENTA EN ESTE NAVEGADOR · COLECCIÓN LOCAL PROTEGIDA');
   return;
  }
  accountUid=uid;
  const local=assertBackup(readLocal());
  const {data:row,error:readError}=await client.from('player_snapshots')
   .select('user_id,game_format,state,revision').eq('user_id',uid).maybeSingle();
  if(readError)throw readError;
  if(row&&(row.user_id!==uid||row.game_format!==2||!Number.isSafeInteger(Number(row.revision))))
   throw Error('Respuesta de nube no compatible');
  const remote=row?assertBackup(row.state):null;
  const rev=row?Number(row.revision):0;
  const base=readBaseline(localStorage,uid);
  const action=decideSync({local,remote,base,remoteRevision:rev});
  // No vincular el dispositivo antes de comprobar que la colección local
  // puede recuperarse o sincronizarse sin conflicto.
  if(action!=='conflict'&&action!=='first-upload-required'){
   if(!bound){
    localStorage.setItem(ACCOUNT_BINDING,uid);
    if(localStorage.getItem(ACCOUNT_BINDING)!==uid)
     throw Error('No se pudo proteger la asociación de cuenta');
   }
  }
  if(action==='empty'){
   // Solo una cuenta sin respaldo Y un navegador sin progreso puede
   // inicializarse automáticamente. Nunca migrar cartas locales por esta vía.
   if(!sameProgress(readLocal(),local)){rerun=true;return}
   const {data:initialized,error:initError}=await client.rpc('ensure_player_snapshot');
   if(initError)throw initError;
   if(!['created','existing'].includes(initialized?.status)||
      !Number.isSafeInteger(Number(initialized.revision))||
      Number(initialized.revision)<1)
    throw Error('No se pudo verificar la colección inicial');
   const safeRemote=assertBackup(initialized.state);
   if(!sameProgress(readLocal(),local)){rerun=true;return}
   // Si se creó en otra pestaña y ya hay progreso, restaurar en lugar de
   // subir o sustituir las cartas del servidor.
   const outcome=restoreLocal(safeRemote);
   if(!outcome?.ok)throw Error('No se pudo restaurar la colección inicial');
   persistBaseline(localStorage,uid,Number(initialized.revision),safeRemote);
   status('synced','CUENTA LISTA · COLECCIÓN PROTEGIDA EN LA NUBE');
   return;
  }
  if(action==='first-upload-required'){
   importAvailable=!bound&&!base&&!remote;
   status('pending',importAvailable?'TU COLECCIÓN ESTÁ EN ESTE DISPOSITIVO · PUEDES VINCULARLA':'RESPALDO INICIAL PENDIENTE');
   return;
  }
  if(action==='conflict'){
   status('conflict','CONFLICTO DE PROGRESO · AMBAS COLECCIONES SE CONSERVAN, SIN MEZCLAR');
   return;
  }
  if(action==='matched'){
   persistBaseline(localStorage,uid,rev,remote);
   status('synced','NUBE AL DÍA · PROGRESO SINCRONIZADO');
   return;
  }
  if(action==='download'){
   // Otro dispositivo avanzó. Releer el navegador antes de reemplazar nada.
   if(!sameProgress(readLocal(),local)){rerun=true;return}
   const outcome=restoreLocal(remote);
   if(!outcome?.ok)throw Error('No se pudo proteger/restaurar la colección local');
   persistBaseline(localStorage,uid,rev,remote);
   status('synced','NUBE AL DÍA · PROGRESO RECUPERADO');
   return;
  }
  if(action==='upload'){
   // Si hubo otra acción mientras consultábamos Supabase, recalcular desde cero.
   if(!sameProgress(readLocal(),local)){rerun=true;return}
   const {data,error}=await client.rpc('sync_player_snapshot',{
    p_expected_revision:rev,p_state:local
   });
   if(error)throw error;
   if(data?.status==='conflict'){rerun=true;return}
   if(data?.status!=='updated'||!Number.isSafeInteger(Number(data.revision))||
      Number(data.revision)<=rev)throw Error('No se pudo verificar el cambio de revisión');
   persistBaseline(localStorage,uid,Number(data.revision),local);
   status('synced','NUBE AL DÍA · CAMBIOS GUARDADOS');
   if(!sameProgress(readLocal(),local))rerun=true;
  }
 }
 async function check(){
  if(stopped)return;
  if(busy||issuing){rerun=true;return syncTask}
  busy=true;
  syncTask=(async()=>{
   try{
    status('checking','COMPROBANDO SINCRONIZACIÓN…');
    await syncOnce();
   }catch(_){status('offline','NUBE NO DISPONIBLE · CONSERVAMOS TU PROGRESO LOCAL')}
   finally{
    busy=false;
    if(rerun&&!stopped){rerun=false;setTimeout(check,80)}
   }
  })();
  try{await syncTask}finally{syncTask=null}
 }
 // Una comprobación rutinaria no debe rechazar una apertura legítima como «ocupada».
 // Antes de mutar se comprueba que haya una sesión y un snapshot reconciliado.
 async function readyForMutation(){
  if(stopped)return 'guest';
  if(busy&&syncTask)await syncTask;
  if(stopped)return 'guest';
  if(!accountUid&&sessionActive)await check();
  if(busy&&syncTask)await syncTask;
  if(!accountUid)return localStorage.getItem(ACCOUNT_BINDING)?'auth_required':'guest';
  return null;
 }
 /**
  * Emisión en servidor. request_id permanece hasta confirmar la restauración:
  * un reintento tras perder la respuesta HTTP no entrega otras cinco cartas.
  * No existen parámetros de cartas o cuotas controlables por el navegador.
  */
 async function issuePack(){
  if(issuing)return {status:'busy'};
  const gate=await readyForMutation();
  if(gate)return {status:gate};
  if(issuing)return {status:'busy'};
  issuing=true;
  const uid=accountUid;
  const pendingKey='icmx-cloud-pack-request-v1:'+uid;
  try{
   const {data:authData,error:authErr}=await client.auth.getUser();
   if(authErr||authData?.user?.id!==uid)throw Error('La sesión cambió');
   const local=assertBackup(readLocal());
   const {data:row,error:readErr}=await client.from('player_snapshots')
    .select('user_id,game_format,state,revision').eq('user_id',uid).maybeSingle();
   if(readErr)throw readErr;
   if(!row||row.user_id!==uid||row.game_format!==2||
      !Number.isSafeInteger(Number(row.revision)))
    return {status:'pending'};
   const remote=assertBackup(row.state),rev=Number(row.revision);
   const baseline=readBaseline(localStorage,uid);
   const pending=localStorage.getItem(pendingKey);
   if(!pending&&(!sameProgress(local,remote)||
      baseline&&decideSync({local,remote,base:baseline,remoteRevision:rev})==='conflict')){
    rerun=true;return {status:'pending'};
   }
   let id=pending;
   if(!id){
    id=crypto.randomUUID();
    localStorage.setItem(pendingKey,id);
    if(localStorage.getItem(pendingKey)!==id)throw Error('No se pudo guardar la petición');
   }
   const {data,error}=await client.rpc('issue_player_pack',{
    p_request_id:id,p_expected_revision:baseline?.revision??rev
   });
   if(error)throw error;
   if(data?.status==='conflict'){
    // El servidor confirma que esta petición NO fue emitida. Permitir
    // un nuevo request_id una vez recuperada la revisión actual.
    localStorage.removeItem(pendingKey);
    rerun=true;return {status:'pending'}
   }
   if(data?.status==='no_packs'){
    localStorage.removeItem(pendingKey);
    rerun=true;
    return {status:'no_packs'};
   }
   if(!['issued','duplicate'].includes(data?.status)||
      !Array.isArray(data.cards)||data.cards.length!==5||
      !Number.isSafeInteger(Number(data.revision))||!data.state)
    throw Error('Respuesta de sobre inesperada');
   if(!sameProgress(readLocal(),local)){
    rerun=true;
    return {status:'pending'};
   }
   const outcome=restoreLocal(assertBackup(data.state));
   if(!outcome?.ok)throw Error('No fue posible restaurar las cartas protegidas');
   persistBaseline(localStorage,uid,Number(data.revision),data.state);
   localStorage.removeItem(pendingKey);
   status('synced','NUBE AL DÍA · SOBRE GUARDADO EN TU CUENTA');
   rerun=true;
   return data;
  }catch(_){
   status('offline','NO SE CONFIRMÓ EL SOBRE · PUEDE REINTENTARSE SIN DUPLICAR');
   return {status:'pending'};
  }finally{
   issuing=false;
   if(rerun&&!stopped){rerun=false;setTimeout(check,80)}
  }
 }
 async function exchangeDuplicates(){
  if(issuing)return {status:'busy'};
  const gate=await readyForMutation();
  if(gate)return {status:gate};
  if(issuing)return {status:'busy'};
  issuing=true;
  const uid=accountUid;
  const pendingKey='icmx-cloud-exchange-request-v1:'+uid;
  try{
   const {data:authData,error:authErr}=await client.auth.getUser();
   if(authErr||authData?.user?.id!==uid)throw Error('La sesión cambió');
   const local=assertBackup(readLocal());
   const {data:row,error:readErr}=await client.from('player_snapshots')
    .select('user_id,game_format,state,revision').eq('user_id',uid).maybeSingle();
   if(readErr)throw readErr;
   if(!row||row.user_id!==uid||row.game_format!==2||
      !Number.isSafeInteger(Number(row.revision)))
    return {status:'pending'};
   const remote=assertBackup(row.state),rev=Number(row.revision);
   const baseline=readBaseline(localStorage,uid);
   const pending=localStorage.getItem(pendingKey);
   if(!pending&&(!sameProgress(local,remote)||
      baseline&&decideSync({local,remote,base:baseline,remoteRevision:rev})==='conflict')){
    rerun=true;return {status:'pending'};
   }
   let id=pending;
   if(!id){
    id=crypto.randomUUID();
    localStorage.setItem(pendingKey,id);
    if(localStorage.getItem(pendingKey)!==id)throw Error('No se pudo guardar la petición');
   }
   const {data,error}=await client.rpc('exchange_duplicate_cards',{
    p_request_id:id,p_expected_revision:baseline?.revision??rev
   });
   if(error)throw error;
   if(data?.status==='conflict'){
    // El servidor confirma que esta petición NO fue emitida. Permitir
    // un nuevo request_id una vez recuperada la revisión actual.
    localStorage.removeItem(pendingKey);
    rerun=true;return {status:'pending'}
   }
   if(data?.status==='not_enough_duplicates'||data?.status==='extra_limit'){
    localStorage.removeItem(pendingKey);
    rerun=true;
    return {status:data.status};
   }
   if(!['exchanged','duplicate'].includes(data?.status)||
      !Number.isSafeInteger(Number(data.revision))||!data.state)
    throw Error('Respuesta de canje inesperada');
   if(!sameProgress(readLocal(),local)){
    rerun=true;
    return {status:'pending'};
   }
   const outcome=restoreLocal(assertBackup(data.state));
   if(!outcome?.ok)throw Error('No fue posible restaurar el canje protegido');
   persistBaseline(localStorage,uid,Number(data.revision),data.state);
   localStorage.removeItem(pendingKey);
   status('synced','NUBE AL DÍA · CANJE GUARDADO EN TU CUENTA');
   rerun=true;
   return data;
  }catch(_){
   status('offline','NO SE CONFIRMÓ EL CANJE · REINTENTA SIN DUPLICAR');
   return {status:'pending'};
  }finally{
   issuing=false;
   if(rerun&&!stopped){rerun=false;setTimeout(check,80)}
  }
 }
 async function importGuest(){
  if(stopped||busy||issuing||!accountUid||!importAvailable)return {status:'unavailable'};
  issuing=true;
  const uid=accountUid;
  try{
   const {data:auth,error:authError}=await client.auth.getUser();
   if(authError||auth?.user?.id!==uid)throw Error('La sesión cambió');
   const local=assertBackup(readLocal());
   if(!hasGameProgress(local))return {status:'unavailable'};
   const {data:row,error:readError}=await client.from('player_snapshots')
    .select('user_id,game_format,state,revision').eq('user_id',uid).maybeSingle();
   if(readError)throw readError;
   if(row||readBaseline(localStorage,uid)||localStorage.getItem(ACCOUNT_BINDING))
    return {status:'conflict'};
   if(!sameProgress(readLocal(),local))return {status:'pending'};
   const {data,error}=await client.rpc('import_guest_collection',{p_state:local});
   if(error)throw error;
   if(data?.status!=='imported'||!Number.isSafeInteger(Number(data.revision))||Number(data.revision)<1)
    return {status:'conflict'};
   if(!sameProgress(readLocal(),local))return {status:'pending'};
   const remote=assertBackup(data.state);
   if(!sameProgress(remote,local))throw Error('La importación no coincide');
   persistBaseline(localStorage,uid,Number(data.revision),remote);
   localStorage.setItem(ACCOUNT_BINDING,uid);
   if(localStorage.getItem(ACCOUNT_BINDING)!==uid)throw Error('No se pudo asociar la cuenta');
   importAvailable=false;
   status('synced','COLECCIÓN VINCULADA · YA PUEDES RECUPERAR TUS CARTAS');
   return {status:'imported'};
  }catch(_){
   status('offline','NO SE PUDO VINCULAR · TUS CARTAS SIGUEN EN ESTE DISPOSITIVO');
   return {status:'pending'};
  }finally{
   issuing=false;
   if(!stopped)setTimeout(check,80);
  }
 }
 const changed=()=>{
  if(stopped)return;
  clearTimeout(debounce);
  debounce=setTimeout(check,900);
 };
 const {data:listener}=client.auth.onAuthStateChange((_event,session)=>{
  sessionActive=Boolean(session?.user?.id);
  if(!sessionActive)accountUid=null;
  setTimeout(check,0);
 });
 const onFocus=()=>{if(!document.hidden)check()};
 const onStorage=e=>{
  if(e.key==='icmx-auth-qa-nov2026'||e.key==='icmx-album2')check();
 };
 window.addEventListener('focus',onFocus);
 document.addEventListener('visibilitychange',onFocus);
 window.addEventListener('storage',onStorage);
 interval=setInterval(()=>{if(!document.hidden)check()},15000);
 check();
 return {changed,check,issuePack,exchangeDuplicates,isAccount:()=>Boolean(accountUid),canImport:()=>importAvailable,importGuest,requiresServer:()=>Boolean(sessionActive||accountUid||localStorage.getItem(ACCOUNT_BINDING)),stop(){
  stopped=true;clearTimeout(debounce);clearInterval(interval);
  listener?.subscription?.unsubscribe();
  window.removeEventListener('focus',onFocus);
  document.removeEventListener('visibilitychange',onFocus);
  window.removeEventListener('storage',onStorage);
 }};
}
