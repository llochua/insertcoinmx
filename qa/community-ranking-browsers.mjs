/** Chromium: real frontend, two independent sessions, deterministic simulated REST. No production traffic. */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {rankDesigns} from '../content/community-value.mjs';
const root=resolve('.');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.otf':'font/otf'};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  const f=resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
  if(!f.startsWith(root+sep))throw Error('invalid file');
  const body=await readFile(f);res.writeHead(200,{'content-type':mime[extname(f)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const votes=new Map(),errors=[],contexts=[];
const ids=['abuket','arcade','1up'];
const aggregates=()=>ids.map(id=>{
 const rows=[...votes.values()].filter(v=>v.id===id);
 const likes=rows.filter(v=>v.like!=null),tiers=rows.filter(v=>v.tier!=null);
 return {id,likes:{positive:likes.filter(v=>v.like===1).length,total:likes.length},tiers:Object.fromEntries(['goty','genial','ok','mmm'].map((k,i)=>[k,tiers.filter(v=>v.tier===i).length])),reta:{wins:0,matches:0}};
});
const sdk=`export function createClient(){const user=()=>window.__qaIdentity?{id:window.__qaIdentity,email:'test@example.invalid',user_metadata:{icmx_initials:'TST',icmx_handle:'qa_'+window.__qaIdentity}}:null;
return {auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},async getSession(){return {data:{session:user()?{user:user(),access_token:'test-'+user().id}:null},error:null}},async getUser(){return {data:{user:user()},error:null}}},from(table){if(table!=='player_profiles')throw Error('Unexpected table');return {select(){return this},eq(){return this},async maybeSingle(){return {data:{public_handle:'qa_'+user().id,is_public:true},error:null}}}}};}`;
const cloud=`export function sameProgress(){return true} export async function startCloudSync(){return {check(){},changed(){},requiresServer(){return false},isAccount(){return false},canImport(){return false}}}`;
async function open(identity,width){
 const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});contexts.push(context);
 await context.addInitScript(id=>{window.__qaIdentity=id;localStorage.setItem('icmx-guest-handle-v1','qa_guest');localStorage.setItem('icmx-album2',JSON.stringify({have:{abuket_b:2,abuket_e:1},ini:'TST',rate:{},seen:1,sv:2,mv:2}));},identity);
 await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:sdk}));
 await context.route('**/content/cloud-sync.mjs',r=>r.fulfill({status:200,contentType:'text/javascript',body:cloud}));
 await context.route(/https:\/\/.*supabase\.co\//,async r=>{
  const req=r.request(),path=new URL(req.url()).pathname;
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'apikey,authorization,content-type','access-control-allow-methods':'POST,OPTIONS'};
  const send=(body,status=200)=>r.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  if(req.method()==='OPTIONS')return send(null);
  if(path.endsWith('/icmx_community_aggregates'))return send(aggregates());
  if(path.endsWith('/icmx_player_leaderboards'))return send({pts:[],cards:[],designs:[],duplicates:[],ratings:[]});
  if(path.endsWith('/icmx_community_vote')){
   const token=req.headers().authorization,person=token?.replace('Bearer test-','');
   if(!identity||person!==identity)return send({error:'no session'},403);
   const a=req.postDataJSON(),key=person+':'+a.p_design;
   if(!ids.includes(a.p_design)||!['like','tier'].includes(a.p_channel))return send({error:'invalid'},400);
   const row=votes.get(key)||{id:a.p_design,like:null,tier:null};row[a.p_channel]=a.p_value;votes.set(key,row);return send(null);
  }
  throw Error('Unexpected production path '+path);
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.icmxAvatarReady==='true');
 if(identity)await page.waitForFunction(id=>globalThis.icmxAccountIdentity?.userId===id,identity);
 await page.locator('#title').click();
 await page.evaluate(()=>go('scores'));
 await page.waitForFunction(()=>communityRanking?.state.status==='ready');
 return page;
}
try{
 const a=await open('alpha',390),b=await open('beta',1200),guest=await open(null,390);
 assert.equal(await a.locator('#communityRankRows button').count(),0);
 const before=await a.evaluate(()=>JSON.stringify(S.have));
 await a.evaluate(()=>openCard('abuket_b'));
 assert.equal(await a.locator('#zRate button[data-r]').count(),4,'Solo cuatro reacciones');
 // Una reacción controla Tier y Like; el mismo botón permite retirarla sin duplicar votos.
 await a.locator('#zRate [data-r="0"]').click(); // GOTY: Tier GOTY + Like positivo
 await a.waitForFunction(()=>{
  const x=communityRanking?.state.aggregates.find(x=>x.id==='abuket');
  return x?.tiers.goty===1&&x?.likes.total===1&&x?.likes.positive===1;
 });
 await a.locator('#zRate [data-r="0"]').click(); // Segundo toque: retirar ambos
 await a.waitForFunction(()=>{
  const x=communityRanking?.state.aggregates.find(x=>x.id==='abuket');
  return x?.tiers.goty===0&&x?.likes.total===0;
 });
 assert.equal(aggregates()[0].likes.total,0,'El retiro no deja Likes huérfanos');
 await a.locator('#zRate [data-r="1"]').click(); // GENIAL: Like positivo
 await a.waitForFunction(()=>{
  const x=communityRanking?.state.aggregates.find(x=>x.id==='abuket');
  return x?.tiers.genial===1&&x?.likes.total===1&&x?.likes.positive===1;
 });
 await b.evaluate(()=>openCard('abuket_e'));
 await b.locator('#zRate [data-r="3"]').click(); // MMM: Like negativo
 await b.waitForFunction(()=>{
  const x=communityRanking?.state.aggregates.find(x=>x.id==='abuket');
  return x?.tiers.mmm===1&&x?.likes.total===2&&x?.likes.positive===1;
 });
 await b.locator('#zRate [data-r="2"]').click(); // OK: Tier neutro, sin Like
 await b.waitForFunction(()=>{
  const x=communityRanking?.state.aggregates.find(x=>x.id==='abuket');
  return x?.tiers.ok===1&&x?.tiers.mmm===0&&x?.likes.total===1;
 });
 await b.locator('#zRate [data-r="0"]').click(); // Cambia a GOTY: reemplaza el voto de beta
 await b.waitForFunction(()=>{
  const x=communityRanking?.state.aggregates.find(x=>x.id==='abuket');
  return x?.tiers.goty===1&&x?.tiers.ok===0&&x?.likes.total===2&&x?.likes.positive===2;
 });
 const expected=rankDesigns(aggregates()).find(x=>x.id==='abuket').score;
 await b.waitForFunction(v=>document.querySelector('#zFx svg.icmx-data [data-icmx-field="pop"]')?.textContent===String(v),expected);
 await a.locator('#zClose').click();await a.evaluate(()=>go('scores'));
 await a.waitForFunction(v=>document.querySelector('#communityRankRows strong')?.textContent===v+' POP',expected);
 for(const k of ['abuket_b','abuket_e','abuket_r']){
  await a.evaluate(k=>openCard(k),k);
  await a.waitForFunction(v=>document.querySelector('#zFx svg.icmx-data [data-icmx-field="pop"]')?.textContent===String(v),expected);
  await a.locator('#zClose').click();
 }
 const publishedBeforeGuest=JSON.stringify(aggregates());
 await guest.evaluate(()=>openCard('abuket_b'));
 await guest.locator('#zRate [data-r="0"]').click();
 assert.equal(await guest.locator('#zRate [data-r="0"]').getAttribute('aria-pressed'),'true','Invitado puede reaccionar localmente');
 assert.equal(JSON.stringify(aggregates()),publishedBeforeGuest,'Invitado sin cuenta no publica votos');
 assert.equal(await a.evaluate(()=>JSON.stringify(S.have)),before,'votes do not modify inventory');
 await mkdir('qa/screenshots',{recursive:true});
 await a.screenshot({path:'qa/screenshots/global-pop-mobile.png',fullPage:true});
 await b.locator('#zClose').click();await b.evaluate(()=>go('scores'));
 await b.screenshot({path:'qa/screenshots/global-pop-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: two authenticated browser identities, reaction replacement/retraction, shared POP, guest local-only, inventory preserved');
}finally{await Promise.allSettled(contexts.map(c=>c.close()));await browser.close();await new Promise(r=>server.close(r));}
