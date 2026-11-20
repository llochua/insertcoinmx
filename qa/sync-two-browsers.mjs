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
   if(!['sync_player_snapshot','issue_player_pack','exchange_duplicate_cards'].includes(name))throw Error('Unexpected RPC');
   return fetchJSON(name==='issue_player_pack'?'/__qa__/pack':name==='exchange_duplicate_cards'?'/__qa__/exchange':'/__qa__/sync',{method:'POST',
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
  const afterTrade=await read(B.page);
  assert.equal(count(beforeTrade)-count(afterTrade),5);
  assert.equal(afterTrade.extra,beforeTrade.extra+1);
  await check(A.page);
  await until(async()=> (await read(A.page)).extra===afterTrade.extra,
    'A debe recibir el canje desde B');
  assert.equal(exchanges.size,1);
  console.log('✓ Canje de 5 duplicadas: sobre extra y revisión única, sincronizado en A');

  const C=await device(OTHER,null);
  assert.equal((await read(C.page))?.have?.abuket_b,undefined);
  assert.equal(cloud.get(OTHER),undefined);
  console.log('✓ Otro usuario no recibe cartas ajenas');

  for(const [name,entry] of [['A',A],['B',B],['C',C]])
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
