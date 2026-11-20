/**
 * QA manual con Supabase REAL y dos navegadores aislados.
 *
 * Requiere cuenta EXCLUSIVA de laboratorio ya confirmada y permitida en
 * private_sync.sync_lab_allowlist. No crea usuarios, no cambia permisos
 * y por defecto NO abre sobres ni cambia la colección remota.
 *
 * ICMX_QA_EMAIL + ICMX_QA_PASSWORD: credenciales (preferir GitHub Secrets).
 * ICMX_QA_PACK_TEST=1: autoriza emitir UN sobre para esa cuenta de laboratorio.
 * Nunca utilizar una cuenta personal o una colección que haya que preservar.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const EMAIL=process.env.ICMX_QA_EMAIL?.trim();
const PASSWORD=process.env.ICMX_QA_PASSWORD;
const WITH_PACK=process.env.ICMX_QA_PACK_TEST==='1';
if(!EMAIL||!PASSWORD)throw Error('Faltan credenciales del usuario exclusivo de laboratorio');
if(WITH_PACK&&process.env.ICMX_QA_CONFIRM_TEST_ACCOUNT!=='1')
 throw Error('Para emitir un sobre se requiere confirmar que es una cuenta desechable de QA');
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript',
 '.mjs':'text/javascript','.css':'text/css','.json':'application/json',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  const decoded=decodeURIComponent(path);
  const file=resolve(ROOT,'.'+(decoded.endsWith('/')?decoded+'index.html':decoded));
  if(!file.startsWith(ROOT+sep))throw Error('Invalid path');
  const data=await readFile(file);
  res.writeHead(200,{'content-type':TYPES[extname(file)]||'application/octet-stream'});
  res.end(data);
 }catch(_){
  res.writeHead(404);res.end('Not found');
 }
});
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function until(fn,label,timeout=25000){
 const started=Date.now();
 while(Date.now()-started<timeout){
  if(await fn())return;
  await sleep(150);
 }
 throw Error('No se confirmó: '+label);
}
const count=s=>Object.values(s?.have||{}).reduce((n,x)=>n+x,0);
const extract=s=>({have:s.have,pk:s.pk,welcomeLeft:s.welcomeLeft,
 freeUsed:s.freeUsed,extra:s.extra});
const address=await new Promise(ok=>server.listen(0,'127.0.0.1',()=>ok(server.address())));
const origin='http://127.0.0.1:'+address.port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const contexts=[];
async function openDevice(){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 contexts.push(context);
 await context.route('**/*',route=>{
  if(['image','font','media'].includes(route.request().resourceType()))
   return route.abort();
  return route.continue();
 });
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto(origin+'/qa/registro/',{waitUntil:'domcontentloaded'});
 await until(async()=>((await page.locator('#message').innerText()).includes('Listo para registrar una cuenta de prueba.')),'formulario autenticado disponible');
 await page.locator('#tabLogin').click();
 await page.locator('#email').fill(EMAIL);
 await page.locator('#password').fill(PASSWORD);
 await page.locator('#submit').click();
 await until(async()=>await page.locator('#signed').getAttribute('aria-hidden')==='false',
  'sesión real confirmada');
 assert.equal((await page.locator('#signedEmail').innerText()).toLowerCase(),EMAIL.toLowerCase());
 await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
 await until(async()=>await page.locator('#cloudState').getAttribute('data-sync')==='synced',
  'colección sincronizada en juego');
 const local=await page.evaluate(()=>JSON.parse(localStorage.getItem('icmx-album2')));
 assert.ok(local&&typeof local.have==='object','colección local disponible');
 return {page,errors};
}
try{
 const A=await openDevice();
 const B=await openDevice();
 const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('icmx-album2')));
 const before=await read(A.page);
 assert.deepEqual(extract(await read(B.page)),extract(before),
  'Los dos dispositivos deben tener la misma colección');
 console.log('✓ Dos sesiones Supabase reales, dos navegadores aislados y misma colección');
 if(WITH_PACK){
  assert.equal(await A.page.evaluate(()=>packReady()),true,
   'La cuenta de QA debe contar con un sobre disponible');
  await A.page.evaluate(()=>{document.getElementById('title').classList.remove('on');go('pack');openPack()});
  await until(async()=>count(await read(A.page))===count(before)+5,
   'apertura del sobre real');
  const opened=await read(A.page);
  assert.equal(count(opened)-count(before),5);
  await B.page.evaluate(()=>cloudSync.check());
  await until(async()=>JSON.stringify(extract(await read(B.page)))===JSON.stringify(extract(opened)),
   'restaurar las cinco cartas en navegador B');
  assert.deepEqual(extract(await read(B.page)),extract(opened));
  console.log('✓ Un sobre real emitido en Supabase y recuperado sin duplicaciones');
 }else{
  console.log('✓ Modo solo lectura: no se pidió emitir ningún sobre');
 }
 for(const [i,device] of [A,B].entries())
  assert.deepEqual(device.errors,[],'Error JavaScript en navegador '+(i+1));
 console.log('QA REAL COMPLETADA (sin publicar ni reiniciar colecciones)');
}finally{
 await Promise.all(contexts.map(c=>c.close()));
 await browser.close();
 server.close();
}