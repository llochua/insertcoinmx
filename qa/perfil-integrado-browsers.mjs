/**
 * QA visual del perfil integrado: 12 avatares, sesión simulada, persistencia y
 * protección del álbum. No abre sobres ni realiza llamadas reales a Supabase.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(ROOT,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(ROOT+sep)) throw Error('Invalid location');
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});
  res.end(await readFile(file));
 }catch(_){res.writeHead(404);res.end('Not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const TARGET_URL='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[],unexpectedRemote=[];
const sdk=[
 'function mockUser(){return {id:"qa-profile-test",email:"qa@example.test",user_metadata:{icmx_avatar_id:window.__qaAvatar,icmx_initials:"TST",icmx_handle:"qa_player"}}}',
 'export function createClient(){return {auth:{',
 'onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},',
 'async getSession(){return {data:{session:window.__qaSigned?{user:mockUser()}:null},error:null}},',
 'async getUser(){await new Promise(done=>setTimeout(done,220));return {data:{user:window.__qaSigned?mockUser():null},error:null}},',
 'async updateUser({data}){if(!window.__qaSigned)throw Error("Guest cannot update");window.__qaAvatar=data.icmx_avatar_id;sessionStorage.setItem("icmx-qa-avatar",window.__qaAvatar);return {data:{user:mockUser()},error:null}},',
 'async signOut(){window.__qaSigned=false;return {error:null}}',
 '},from(table){if(table!=="player_profiles")throw Error("Unexpected table");return {select(){return this},eq(){return this},async maybeSingle(){return {data:{public_handle:"qa_player",is_public:true},error:null}}}}}}'
].join('\n');
const syncStub='export function sameProgress(){return true} export async function startCloudSync({onStatus}){onStatus("synced","NUBE AL DÍA · QA SIMULADA");return {check(){},changed(){},requiresServer(){return false},isAccount(){return false},stop(){},canImport(){return false}}}';
async function device(signed){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(value=>{
  window.__qaSigned=value;window.__qaAvatar=sessionStorage.getItem('icmx-qa-avatar')||'jos';
  localStorage.setItem('icmx-guest-handle-v1','qa_guest');
  localStorage.setItem('icmx-album2',JSON.stringify({ini:'TST',have:{abuket_b:3,pizza_e:2},rate:{},seen:1,sv:2,mv:2}));
 },signed);
 await context.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:sdk}));
 await context.route('**/content/cloud-sync.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:syncStub}));
 await context.route('**/rest/v1/rpc/icmx_player_leaderboards',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({pts:[],cards:[],designs:[],duplicates:[],ratings:[]})}));
 await context.route(/https:\/\/.*supabase\.co\/.*/,route=>{unexpectedRemote.push(route.request().url());return route.abort()});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(TARGET_URL,{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),200,'QA page must load correctly');
 const avatarProbe=await page.evaluate(()=>{const el=document.getElementById('homePlayerAvatarImage');return {ready:document.documentElement.dataset.icmxAvatarReady||null,inline:el?.getAttribute('style'),computed:el?getComputedStyle(el).visibility:null,selectorMatched:el?.matches('html:not([data-icmx-avatar-ready="true"]) #homePlayerAvatarImage'),headStyle:document.querySelector('head style')?.textContent.slice(0,210)}});
 console.log('QA avatar initial state',JSON.stringify(avatarProbe));
 if(avatarProbe.ready!=='true')
  assert.equal(avatarProbe.computed,'hidden','avatar must stay hidden while identity is loading');
 await page.waitForFunction(()=>document.documentElement.dataset.icmxAvatarReady==='true');
 await page.locator('#homePlayerAvatarImage').waitFor({state:'visible'});
 // El juego siempre abre en su pantalla START; entrar primero como jugador real.
 await page.locator('#title .tstart').click();
 await page.locator('#title.on').waitFor({state:'hidden'});
 await page.locator('#home .home-player-card').click();
 await page.locator('#profile.on').waitFor();
 return {context,page};
}
const devices=[];
try {
 const guest=await device(false);devices.push(guest);
 assert.equal(await guest.page.locator('#profileAuthGuest').isVisible(),false,'signup section is progressive');
 assert.equal(await guest.page.locator('#profilePlayerName').innerText(),'TST');
 assert.match(await guest.page.locator('#profilePlayerState').innerText(),/Invitado/);
 assert.match(await guest.page.locator('#profileInitials').innerText(),/@qa_guest · provisional/);
 assert.equal(await guest.page.locator('#homePlayerAvatarImage').getAttribute('src'),'assets/avatars/moneda-128.webp');
 await guest.context.close();

 const signed=await device(true);devices.push(signed);
 assert.equal(await signed.page.locator('#profileAuthSigned').isVisible(),true);
 assert.equal(await signed.page.locator('#homePlayerAvatarImage').getAttribute('src'),'assets/avatars/jos-128.webp','account avatar must replace default before reveal');
 assert.equal(await signed.page.locator('#profileAvatarImage').getAttribute('src'),'assets/avatars/jos-128.webp');
 const original=await signed.page.evaluate(()=>JSON.parse(localStorage.getItem('icmx-album2')).have);
 await signed.page.locator('#profileAvatarButton').click();
 await signed.page.locator('#avatarSelect.on').waitFor();
 assert.equal(await signed.page.locator('#avatarGrid [data-avatar]').count(),12);
 await signed.page.locator('#avatarGrid [data-avatar="pizza"]').click();
 await signed.page.locator('#avatarSave').click();
 await signed.page.locator('#profile.on').waitFor();
 assert.equal(await signed.page.locator('#homePlayerAvatarImage').getAttribute('src'),'assets/avatars/pizza-128.webp');
 assert.deepEqual(await signed.page.evaluate(()=>JSON.parse(localStorage.getItem('icmx-album2')).have),original,'avatar save must not change cards');
 await signed.page.reload({waitUntil:'domcontentloaded'});
 await signed.page.waitForFunction(()=>document.documentElement.dataset.icmxAvatarReady==='true');
 assert.equal(await signed.page.locator('#homePlayerAvatarImage').getAttribute('src'),'assets/avatars/pizza-128.webp','account avatar survives page reload');
 assert.equal(unexpectedRemote.length,0,'no real Supabase requests');
 assert.deepEqual(errors,[],'no browser script errors');
 console.log('✓ Mi perfil integrado: invitado, cuenta, 12 avatares, guardado y álbum intacto sin conectar al servidor');
}finally {
 await Promise.allSettled(devices.map(d=>d.context.close()));
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
