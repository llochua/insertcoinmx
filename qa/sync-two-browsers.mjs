/**
 * QA en Chromium real: dos contextos aislados, dos localStorage distintos
 * y una nube falsa compartida. Ejecuta el index.html VERDADERO y su módulo.
 * NO contacta Supabase real, no usa correos/cuentas reales, no escribe DB.
 *
 * node qa/sync-two-browsers.mjs
 * Requiere playwright@1.56.1 y Chromium instalado en el runner de CI.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const USER='qa-sync-user-01',OTHER='qa-sync-user-02';
const clone=x=>JSON.parse(JSON.stringify(x));
const baseState=()=>({
 have:{abuket_b:2},rate:{},ini:'',seen:0,last:'',extra:0,test:0,champ:'',
 sv:2,mv:2,rev:1,fg:1,pk:['qaoriginal12'],welcomeLeft:4,
 freeDay:'',freeUsed:0,freeCycle:Math.floor(Date.now()/(6*60*60*1000))
});
const snapshot=data=>({app:'insertcoinmx-album',format:2,
 exportedAt:'2026-11-19T00:00:00.000Z',data:clone(data)});
const cloud=new Map([[USER,{user_id:USER,game_format:2,
 revision:1,state:snapshot(baseState())}]]);
const issued=new Map();
const exchanges=new Map();
const json=(res,value,status=200)=>{
 res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*'});
 res.end(JSON.stringify(value));
};
const TYPES={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
 '.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const uri=new URL(req.url,'http://localhost');
  if(uri.pathname==='/__qa__/snapshot'){
   const row=cloud.get(uri.searchParams.get('uid'))??null;
   return json(res,{data:row?clone(row):null,error:null});
  }
  if(uri.pathname==='/__qa__/initialize'){
   let body='';
   for await(const chunk of req)body+=chunk;
   const {uid}=JSON.parse(body);
   if(!uid)return json(res,{data:null,error:{message:'No session'}},401);
   let row=cloud.get(uid);
   let status='existing';
   if(!row){
    status='created';
    const state=snapshot({
     have:{},rate:{},ini:'',seen:0,last:'',extra:0,test:0,champ:'',
     sv:2,mv:2,rev:0,fg:0,pk:[],welcomeLeft:5,
     freeDay:'',freeUsed:0,freeCycle:0
    });
    row={user_id:uid,game_format:2,revision:1,state};
    cloud.set(uid,row);
   }
   return json(res,{data:{status,state:clone(row.state),revision:row.revision},error:null});
  }
  if(uri.pathname==='/__qa__/import'){
   let body='';for await(const chunk of req)body+=chunk;
   const {uid,args}=JSON.parse(body);
   const old=cloud.get(uid);
   if(old)return json(res,{data:{status:'conflict',state:clone(old.state),revision:old.revision},error:null});
   const state=clone(args.p_state);
   cloud.set(uid,{user_id:uid,game_format:2,revision:1,state});
   return json(res,{data:{status:'imported',state,revision:1},error:null});
  }
  if(uri.pathname==='/__qa__/exchange'){
   let body='';
   for await(const chunk of req)body+=chunk;
   const {uid,args}=JSON.parse(body);
   const row=cloud.get(uid),id=uid+':'+args.p_request_id;
   if(!row)return json(res,{data:{status:'no_snapshot'},error:null});
   if(exchanges.has(id))return json(res,{data:{status:'duplicate',
    revision:row.revision,state:clone(row.state)},error:null});
   if(row.revision!==args.p_expected_revision)
    return json(res,{data:{status:'conflict',revision:row.revision},error:null});
   let need=5;
   for(const k of Object.keys(row.state.data.have).sort()){
    const n=row.state.data.have[k],taken=Math.min(need,Math.max(0,n-1));
    need-=taken;
   }
   if(need>0)return json(res,{data:{status:'not_enough_duplicates',revision:row.revision},error:null});
   need=5;
   for(const k of Object.keys(row.state.data.have).sort()){
    const n=row.state.data.have[k],taken=Math.min(need,Math.max(0,n-1));
    row.state.data.have[k]=n-taken;need-=taken;
    if(need===0)break;
   }
   row.state.data.extra=(row.state.data.extra||0)+1;
   row.revision++;exchanges.set(id,row.revision);
   return json(res,{data:{status:'exchanged',revision:row.revision,
    state:clone(row.state)},error:null});
  }
  if(uri.pathname==='/__qa__/pack'){
   let body='';
   for await(const chunk of req)body+=chunk;
   const {uid,args}=JSON.parse(body);
   const row=cloud.get(uid);
   if(!row)return json(res,{data:{status:'no_snapshot'},error:null});
   const key=uid+':'+args.p_request_id;
   const prior=issued.get(key);
   if(prior){
    return json(res,{data:{...clone(prior),status:'duplicate',
     revision:row.revision,state:clone(row.state)},error:null});
   }
   if(row.revision!==args.p_expected_revision)
    return json(res,{data:{status:'conflict',revision:row.revision},error:null});
   const d=row.state.data;
   if(d.welcomeLeft<=0)return json(res,{data:{status:'no_packs',revision:row.revision},error:null});
   const cards=['abuket_b','arcade_b','artemis_b','abuket_e','abuket_f'];
   for(const k of cards)d.have[k]=(d.have[k]||0)+1;
   const packId='qa'+String(issued.size).padStart(8,'0');
   d.pk.push(packId);d.fg=1;d.welcomeLeft--;d.last='2026-11-19';
   row.revision++;
   const result={status:'issued',pack_id:packId,kind:'welcome',
    cards,revision:row.revision,state:clone(row.state)};
   issued.set(key,result);
   return json(res,{data:result,error:null});
  }
  if(uri.pathname==='/__qa__/sync'){
   let body='';
   for await(const chunk of req)body+=chunk;
   const {uid,args}=JSON.parse(body);
   const row=cloud.get(uid);
   if(!row||row.revision!==args.p_expected_revision)
    return json(res,{data:{status:'conflict',revision:row?.revision??null},error:null});
   row.revision++;
   row.state=clone(args.p_state);
   return json(res,{data:{status:'updated',revision:row.revision},error:null});
  }
  const decoded=decodeURIComponent(uri.pathname);
  const file=resolve(ROOT,'.'+decoded);
  if(file!==ROOT&&!file.startsWith(ROOT+sep))return json(res,{error:'Invalid path'},403);
  const content=await readFile(file);
  res.writeHead(200,{'content-type':TYPES[extname(file)]||'application/octet-stream'});
  res.end(content);
 }catch(e){res.writeHead(404);res.end('Not found')}
});
const SDK_STUB=String.raw`
export function createClient(){
 const uid=()=>localStorage.getItem('icmx-qa-user');
 const offline=()=>window.__qaCloudOffline===true;
 const fetchJSON=async(url,opts)=>{
  if(offline())throw Error('offline');
  const res=await fetch(url,opts);
  if(!res.ok)throw Error('mock server');
  return res.json();
 };
 return {
  auth:{
   async getUser(){return {data:{user:uid()?{id:uid(),email:'qa@example.invalid'}:null},error:null}},
   async getSession(){return {data:{session:uid()?{user:{id:uid()}}:null},error:null}},
   onAuthStateChange(callback){
    Promise.resolve().then(()=>callback('INITIAL_SESSION',uid()?{user:{id:uid()}}:null));
    return {data:{subscription:{unsubscribe(){}}}};
   }
  },
  from(table){
   if(table!=='player_snapshots')throw Error('Unexpected table');
   return {
    select(){return this},
    eq(field,value){if(field!=='user_id')throw Error('Unexpected filter');this.id=value;return this},
    async maybeSingle(){return fetchJSON('/__qa__/snapshot?uid='+encodeURIComponent(this.id))}
   };
  },
  rpc(name,args){
   if(!['sync_player_snapshot','issue_player_pack','exchange_duplicate_cards','ensure_player_snapshot','import_guest_collection'].includes(name))throw Error('Unexpected RPC');
   return fetchJSON(name==='ensure_player_snapshot'?'/__qa__/initialize':name==='issue_player_pack'?'/__qa__/pack':name==='exchange_duplicate_cards'?'/__qa__/exchange':name==='import_guest_collection'?'/__qa__/import':'/__qa__/sync',{method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({uid:uid(),args})});
  }
 };
}
`;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(predicate,message,ms=12000){
 const start=Date.now();
 while(Date.now()-start<ms){
  if(await predicate())return;
  await delay(80);
 }
 throw Error('Timeout: '+message);
}
const count=state=>Object.values(state.have).reduce((n,v)=>n+v,0);

async function run(){
 const listener=await new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address())));
 const origin='http://127.0.0.1:'+listener.port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const contexts=[];
 async function device(user,initial){
  const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});
  contexts.push(context);
  await context.addInitScript(({user,initial})=>{
   localStorage.setItem('icmx-qa-user',user);
   if(initial)localStorage.setItem('icmx-album2',JSON.stringify(initial));
  },{user,initial});
  await context.route('**/*',route=>{
   const url=route.request().url();
   if(url==='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/+esm')
    return route.fallback();
   if(route.request().resourceType()==='image'||route.request().resourceType()==='font')
    return route.abort();
   if(url.startsWith(origin+'/'))return route.continue();
   return route.abort();
  });
  await context.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/+esm',
   route=>route.fulfill({status:200,contentType:'text/javascript',
    headers:{'access-control-allow-origin':'*'},body:SDK_STUB}));
  const page=await context.newPage();
  const exceptions=[];
  page.on('pageerror',error=>exceptions.push(error.message));
  await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#cloudState',{state:'attached'});
  await until(async()=>{
   const status=await page.locator('#cloudState').getAttribute('data-sync');
   return ['synced','empty','pending','conflict','offline','guest'].includes(status);
  },'estado inicial de sincronización');
  return {page,exceptions,context};
 }
 const read=async page=>page.evaluate(()=>JSON.parse(localStorage.getItem('icmx-album2')));
 const check=async page=>page.evaluate(()=>cloudSync.check());
 let result;
 try{
  const A=await device(USER,baseState());
  const B=await device(USER,null);
  await until(async()=> (await read(B.page))?.have?.abuket_b===2,
    'B debe recuperar de la nube');
  assert.equal((await read(B.page)).freeCycle,baseState().freeCycle);
  assert.equal((await read(B.page)).welcomeLeft,4);
  console.log('✓ Recuperación B desde la nube sin duplicar cartas');

  // Abrir sobre desde el código real del juego, sin alterar funciones del juego.
  const before=await read(A.page);
  await A.page.evaluate(()=>openPack());
  await until(()=>cloud.get(USER).revision===2,'sobre A debe subir con CAS');
  await until(async()=>count(await read(A.page))===count(before)+5,
    'el navegador A debe terminar de guardar el sobre antes de verificar');
  const after=await read(A.page);
  assert.equal(count(after)-count(before),5,'abrir un sobre entrega 5 cartas');
  assert.equal(after.pk.length,before.pk.length+1);
  assert.equal(after.welcomeLeft,before.welcomeLeft-1);
  await check(B.page);
  await until(async()=> (await read(B.page)).pk.length===after.pk.length,
    'B debe recibir el nuevo sobre');
  assert.deepEqual((await read(B.page)).have,after.have);
  assert.equal((await read(B.page)).welcomeLeft,after.welcomeLeft);
  await check(B.page);
  await delay(350);
  assert.equal(cloud.get(USER).revision,2,'no debe haber segundo envío');
  console.log('✓ Sobre abierto en A, cinco cartas recibidas en B, sin duplicaciones');

  // B conserva un cambio local mientras se simula desconexión de Supabase.
  await B.page.evaluate(()=>{window.__qaCloudOffline=true;S.ini='OFF';save()});
  await delay(1400);
  assert.equal(cloud.get(USER).revision,2);
  assert.equal((await read(B.page)).ini,'OFF');
  await B.page.evaluate(()=>{window.__qaCloudOffline=false});
  await check(B.page);
  await until(()=>cloud.get(USER).revision===3,'reconexión debe subir cambios de B');
  await check(A.page);
  await until(async()=> (await read(A.page)).ini==='OFF',
    'A debe recibir cambios reconectados');
  console.log('✓ Cambios sin conexión, reconexión y recuperación en A');

  // Desconexión al abrir un sobre NO entrega cartas localmente.
  const shared=await read(A.page);
  await B.page.evaluate(()=>{window.__qaCloudOffline=true});
  await B.page.evaluate(()=>openPack());
  await delay(1000);
  assert.deepEqual((await read(B.page)).have,shared.have,
    'sin servidor no debe aparecer ninguna carta nueva');
  assert.equal(cloud.get(USER).revision,3);

  // A abre el segundo sobre; B aún tiene su petición anterior pendiente.
  await A.page.evaluate(()=>openPack());
  await until(()=>cloud.get(USER).revision===4,'sobre A confirmado por servidor');
  await B.page.evaluate(()=>{window.__qaCloudOffline=false});
  await B.page.evaluate(()=>openPack());
  await check(B.page);
  await until(async()=> (await read(B.page)).pk.length===3,
    'B debe restaurar el sobre de A sin inventar uno');
  assert.equal(cloud.get(USER).revision,4);
  console.log('✓ Sin conexión no se acuñan cartas; conflicto conserva revisión real');

  // Reintento después de sincronizar: nueva petición legítima.
  await B.page.evaluate(()=>openPack());
  await until(()=>cloud.get(USER).revision===5,'B debe emitir su propio sobre desde servidor');
  await check(A.page);
  await until(async()=> (await read(A.page)).pk.length===4,
    'A recibe el siguiente sobre emitido desde B');
  assert.equal(cloud.get(USER).state.data.welcomeLeft,1);
  assert.equal(issued.size,3);
  console.log('✓ Dos dispositivos emiten con revisiones distintas y reciben tres sobres únicos');

  // El canje no permite usar las mismas cinco repetidas dos veces.
  const beforeTrade=await read(B.page);
  await B.page.evaluate(()=>trade(renderHome));
  await until(()=>cloud.get(USER).revision===6,'canje transaccional en la nube');
  await until(async()=>count(await read(B.page))===count(beforeTrade)-5,
    'el canje debe estar restaurado en el navegador antes de verificar');
  const afterTrade=await read(B.page);
  assert.equal(count(beforeTrade)-count(afterTrade),5);
  assert.equal(afterTrade.extra,beforeTrade.extra+1);
  await check(A.page);
  await until(async()=> (await read(A.page)).extra===afterTrade.extra,
    'A debe recibir el canje desde B');
  assert.equal(exchanges.size,1);
  console.log('✓ Canje de 5 duplicadas: sobre extra y revisión única, sincronizado en A');

  // Una cuenta nueva sin cartas se inicializa una sola vez en servidor.
  const C=await device(OTHER,null);
  await until(()=>cloud.has(OTHER),'la segunda cuenta debe inicializarse');
  assert.deepEqual(cloud.get(OTHER).state.data.have,{});
  assert.equal(cloud.get(OTHER).state.data.welcomeLeft,5);
  assert.equal(cloud.get(OTHER).revision,1);
  assert.equal((await read(C.page))?.have?.abuket_b,undefined);
  await check(C.page);
  assert.equal(cloud.get(OTHER).revision,1,'repetir check no debe reiniciar la cuenta');
  console.log('✓ Alta de segunda cuenta vacía, idempotente y aislada');

  // Cambiar de cuenta en el mismo navegador nunca reemplaza ni sube
  // el álbum de la cuenta anterior (el localStorage del juego es compartido).
  const otherBefore=await read(C.page);
  const firstBefore=clone(cloud.get(USER));
  const secondBefore=clone(cloud.get(OTHER));
  await C.page.evaluate(()=>localStorage.setItem('icmx-qa-user',"qa-sync-user-01"));
  await check(C.page);
  assert.equal(await C.page.locator('#cloudState').getAttribute('data-sync'),'conflict');
  assert.deepEqual(await read(C.page),otherBefore,'el cambio de cuenta alteró cartas locales');
  assert.deepEqual(cloud.get(USER),firstBefore,'el cambio de cuenta escribió en el primer usuario');
  assert.deepEqual(cloud.get(OTHER),secondBefore,'el cambio de cuenta escribió en el segundo usuario');
  assert.equal(await C.page.evaluate(()=>cloudSync.isAccount()),false);
  assert.equal(await C.page.evaluate(()=>cloudSync.requiresServer()),true);
  await C.page.evaluate(()=>openPack());
  await delay(250);
  assert.deepEqual(await read(C.page),otherBefore,
    'cambiar de cuenta no debe abrir sobres locales mientras la nube está bloqueada');
  console.log('✓ Cambio de cuenta bloqueado sin mezclar ni sustituir colecciones');

  // La existencia de cartas locales sin nube bloquea la migración automática.
  const LEGACY='qa-sync-legacy-03';
  const D=await device(LEGACY,{...baseState(),have:{abuket_b:4}});
  assert.equal(cloud.has(LEGACY),false,'una colección local no debe crear respaldo remoto');
  assert.equal((await read(D.page)).have.abuket_b,4);
  assert.equal(await D.page.locator('#cloudState').getAttribute('data-sync'),'pending');
  assert.equal(await D.page.evaluate(()=>cloudSync.requiresServer()),true);
  const legacyBefore=await read(D.page);
  await D.page.evaluate(()=>openPack());
  await delay(300);
  assert.deepEqual(await read(D.page),legacyBefore,
    'una cuenta pendiente no puede acuñar cartas en local');
  assert.equal(cloud.has(LEGACY),false);
  console.log('✓ Colección local previa permanece intacta, sin migración automática ni sobres locales');
  assert.equal(await D.page.evaluate(()=>cloudSync.canImport()),true);
  await D.page.evaluate(()=>{document.getElementById('title').classList.remove('on');go('scores')});
  D.page.once('dialog',dialog=>dialog.accept());
  await D.page.locator('#cloudImport').click();
  await until(()=>cloud.has(LEGACY),'importación de colección local');
  await until(async()=>await D.page.locator('#cloudState').getAttribute('data-sync')==='synced',
    'estado sincronizado tras importación');
  assert.equal(cloud.get(LEGACY).state.data.have.abuket_b,4);
  assert.equal(await D.page.evaluate(()=>cloudSync.canImport()),false);
  const importedBefore=clone(cloud.get(LEGACY));
  await check(D.page);
  assert.deepEqual(cloud.get(LEGACY),importedBefore,'no reimportar colección');
  console.log('✓ Vinculación explícita conserva las cartas originales');

  // Recorrido completo después de importar: emisión por servidor y recuperación
  // desde un navegador nuevo, sin compartir almacenamiento local.
  const importedCards=count((await read(D.page)));
  await D.page.evaluate(()=>go('pack'));
  await until(async()=>await D.page.locator('#cloudState').getAttribute('data-sync')==='synced',
    'sincronización lista antes de abrir el primer sobre vinculado');
  const linkedIssue=()=>[...issued.keys()].some(key=>key.startsWith(LEGACY+':'));
  await D.page.evaluate(()=>openPack());
  // importGuest programa una última comprobación asíncrona. Si coincide con
  // el primer tap, issuePack devuelve "busy" SIN acuñar cartas: la UI indica
  // reintentar. Cubrir ese reintento legítimo sin ocultar fallos persistentes
  // ni permitir más de un sobre/revisión.
  await until(linkedIssue,'primera petición tras vincular',1200).catch(async()=>{
    assert.equal(count(await read(D.page)),importedCards,
      'un intento ocupado no debe añadir cartas en el dispositivo');
    await until(async()=>await D.page.locator('#cloudState').getAttribute('data-sync')==='synced',
      'la última comprobación de nube debe terminar antes del reintento',5000);
    await delay(250);
    await D.page.evaluate(()=>openPack());
  });
  await until(linkedIssue,
    'el primer sobre tras vincular debe emitirse en servidor',4500).catch(async(error)=>{
    const diagnostic=await D.page.evaluate(()=>({
      sync:document.getElementById('cloudState').dataset.sync,
      canImport:cloudSync.canImport(),account:cloudSync.isAccount(),
      requiresServer:cloudSync.requiresServer(),busy:serverPackBusy,
      scene:cur,packReady:packReady(),
      welcomeLeft:S.welcomeLeft,localCards:Object.keys(S.have).length,
      pending:localStorage.getItem('icmx-cloud-pack-request-v1:'+localStorage.getItem('icmx-qa-user'))
    }));
    throw Error(error.message+' | Diagnóstico: '+JSON.stringify(diagnostic));
  });
  await until(async()=>count(await read(D.page))===importedCards+5,
    'la colección vinculada debe recibir exactamente cinco cartas');
  assert.equal(cloud.get(LEGACY).state.data.have.abuket_b,5);
  assert.equal([...issued.keys()].filter(key=>key.startsWith(LEGACY+':')).length,1,
    'el sobre vinculado solamente debe emitirse una vez');
  const importedAfterPack=await read(D.page);
  const E=await device(LEGACY,null);
  await until(async()=>count(await read(E.page))===count(importedAfterPack),
    'el segundo dispositivo debe recuperar la colección vinculada');
  assert.deepEqual((await read(E.page)).have,importedAfterPack.have);
  assert.deepEqual((await read(E.page)).pk,importedAfterPack.pk);
  assert.equal((await read(E.page)).welcomeLeft,importedAfterPack.welcomeLeft);
  await check(E.page);
  assert.equal([...issued.keys()].filter(key=>key.startsWith(LEGACY+':')).length,1,
    'recuperar en otro dispositivo no debe crear sobres adicionales');
  console.log('✓ Importación, apertura de sobre y recuperación en segundo dispositivo sin duplicar');

  // Cerrar y reabrir la misma sesión en el mismo navegador no borra
  // ni cambia la colección; durante el cierre no se pueden abrir sobres.
  const beforeRelog=await read(B.page);
  const beforeRevision=cloud.get(USER).revision;
  await B.page.evaluate(()=>localStorage.removeItem('icmx-qa-user'));
  await check(B.page);
  await until(async()=>await B.page.locator('#cloudState').getAttribute('data-sync')==='guest',
    'estado invitado tras cerrar sesión');
  await B.page.evaluate(()=>openPack());
  await delay(250);
  assert.deepEqual(await read(B.page),beforeRelog,
    'cerrar sesión no puede alterar ni generar cartas asociadas a la cuenta');
  await B.page.evaluate(()=>localStorage.setItem('icmx-qa-user', 'qa-sync-user-01'));
  await check(B.page);
  await until(async()=>await B.page.locator('#cloudState').getAttribute('data-sync')==='synced',
    'la misma cuenta debe volver a sincronizar tras iniciar sesión');
  assert.deepEqual(await read(B.page),beforeRelog);
  assert.equal(cloud.get(USER).revision,beforeRevision,
    'volver a iniciar sesión no debe duplicar cartas ni sobres');
  console.log('✓ Cerrar y volver a iniciar sesión preserva la colección sin nuevas emisiones');

  for(const [name,entry] of [['A',A],['B',B],['C',C],['D',D],['E',E]])
   assert.deepEqual(entry.exceptions,[],name+' tuvo errores JavaScript');
  result={passed:true,revision:cloud.get(USER).revision};
 }finally{
  await Promise.all(contexts.map(c=>c.close()));
  await browser.close();
  server.close();
 }
 return result;
}
try{
 const result=await run();
 console.log('PRUEBA EN DOS NAVEGADORES APROBADA',result);
}catch(error){
 console.error(error);
 server.close();
 process.exitCode=1;
}
