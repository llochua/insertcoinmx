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
   if(name!=='sync_player_snapshot')throw Error('Unexpected RPC');
   return fetchJSON('/__qa__/sync',{method:'POST',
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

  // Dos sobres simultáneos en navegadores diferentes.
  // B queda sin red para garantizar que el primer CAS corresponde a A.
  const shared=await read(A.page);
  await B.page.evaluate(()=>{window.__qaCloudOffline=true});
  await Promise.all([A.page.evaluate(()=>openPack()),B.page.evaluate(()=>openPack())]);
  await until(async()=>{
   const [a,b]=await Promise.all([read(A.page),read(B.page)]);
   return a.pk.length===shared.pk.length+1&&b.pk.length===shared.pk.length+1;
  },'cada navegador debe guardar su apertura local');
  await check(A.page);
  await until(()=>cloud.get(USER).revision===4,'A debe guardar primero su apertura');
  await B.page.evaluate(()=>{window.__qaCloudOffline=false});
  await check(B.page);
  await until(async()=> (await B.page.locator('#cloudState').getAttribute('data-sync'))==='conflict',
    'B debe detectar sobres abiertos en paralelo');
  const divergentA=await read(A.page),divergentB=await read(B.page);
  assert.equal(count(divergentA)-count(shared),5);
  assert.equal(count(divergentB)-count(shared),5);
  assert.notEqual(divergentA.pk.at(-1),divergentB.pk.at(-1));
  assert.equal(cloud.get(USER).state.data.pk.at(-1),divergentA.pk.at(-1));
  assert.equal(cloud.get(USER).revision,4,'solo una apertura llega al servidor');
  assert.equal(divergentB.welcomeLeft,shared.welcomeLeft-1);
  console.log('✓ Dos sobres paralelos: uno confirmado, el otro protegido como conflicto');

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
