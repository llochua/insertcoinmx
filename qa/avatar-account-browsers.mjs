/**
 * QA visual de avatar de cuenta; SDK simulado, sin credenciales ni cambios en Supabase.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(ROOT,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));if(!file.startsWith(ROOT+sep))throw Error('invalid path');res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});res.end(await readFile(file))}catch(_){res.writeHead(404);res.end('Not found')}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+'/qa/avatar-cuenta/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let avatar='moneda',saveCount=0;const errors=[];
const user=()=>({id:'qa-user',email:'qa@example.test',user_metadata:{icmx_avatar_id:avatar}});
const sdk=[
'export function createClient(){return {',
'auth:{',
'async getUser(){await new Promise(done=>setTimeout(done,300));return {data:{user:window.__QA_SIGNED?await window.__qaUser():null},error:null}},',
'async updateUser(payload){return await window.__qaSave(payload)}',
'},',
'from(table){if(table!=="player_snapshots")throw Error("Unexpected table "+table);return {select(){return {eq(){return {async maybeSingle(){return {data:{user_id:"qa-user",state:{data:{have:{abuket_b:3,pizza_e:2}}}},error:null}}}}}}}}',
'}}'
].join('\n');
async function device(signed){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(value=>{window.__QA_SIGNED=value},signed);
 await context.exposeFunction('__qaUser',async()=>user());
 await context.exposeFunction('__qaSave',async payload=>{assert.ok(signed);assert.deepEqual(Object.keys(payload),['data']);assert.deepEqual(Object.keys(payload.data),['icmx_avatar_id']);avatar=payload.data.icmx_avatar_id;saveCount++;return {data:{user:user()},error:null}});
 await context.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:sdk}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('icmx-album2','{"have":{"local_b":4},"seen":1}'));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#preview').getAttribute('src'),null,'never hardcode a fallback avatar before auth');
 assert.equal(await page.locator('#selectedName').innerText(),'Cargando…','show a neutral loading state');
 assert.equal(await page.locator('#avatarHolder').getAttribute('aria-busy'),'true');
 return {context,page};
}
const devices=[];
try{
 const guest=await device(false);devices.push(guest);
 await guest.page.waitForFunction(()=>document.getElementById('account').textContent.includes('No hay una sesión activa'));
 assert.equal(await guest.page.locator('#save').isDisabled(),true);
 assert.equal(await guest.page.locator('#selection').evaluate(el=>el.disabled),true);
 assert.equal(await guest.page.locator('#selectedName').innerText(),'Sin sesión');
 await guest.context.close();
 const A=await device(true);devices.push(A);
 await A.page.getByText('5 cartas en la nube').waitFor();
 await A.page.locator('#preview').waitFor({state:'visible'});
 assert.equal(await A.page.locator('#preview').getAttribute('src'),'/assets/avatars/moneda-320.webp');
 assert.equal(await A.page.locator('#grid [data-avatar]').count(),12);
 const images=await A.page.locator('#grid img').evaluateAll(items=>items.map(el=>el.getAttribute('src')));
 assert.equal(new Set(images).size,12);
 await A.page.locator('[data-avatar="pizza"]').click();
 assert.equal(await A.page.locator('#save').isEnabled(),true);
 await A.page.locator('#save').click();
 await A.page.getByText('¡Avatar guardado en tu cuenta!',{exact:false}).waitFor();
 assert.equal(avatar,'pizza');assert.equal(saveCount,1);
 assert.equal(await A.page.evaluate(()=>localStorage.getItem('icmx-album2')),'{"have":{"local_b":4},"seen":1}');
 const B=await device(true);devices.push(B);
 await B.page.getByText('5 cartas en la nube').waitFor();
 assert.equal(await B.page.locator('#selectedName').innerText(),'Pizza');
 await B.page.locator('#preview').waitFor({state:'visible'});
 assert.equal(await B.page.locator('#preview').getAttribute('src'),'/assets/avatars/pizza-320.webp','other device never flashed Moneda');
 assert.equal(await B.page.locator('#save').isDisabled(),true);
 await B.page.locator('[data-avatar="control"]').click();await B.page.locator('#save').click();
 await B.page.getByText('¡Avatar guardado en tu cuenta!',{exact:false}).waitFor();
 assert.equal(avatar,'control');
 await A.page.reload({waitUntil:'domcontentloaded'});await A.page.getByText('5 cartas en la nube').waitFor();
 assert.equal(await A.page.locator('#selectedName').innerText(),'Control');
 assert.equal(saveCount,2);assert.deepEqual(errors,[]);
 console.log('✓ Invitado sin permisos, 12 avatares, guardado de cuenta simulado y persistencia entre navegadores; álbum intacto');
}finally{await Promise.allSettled(devices.map(x=>x.context.close()));await browser.close();await new Promise(ok=>server.close(ok))}
