import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');const path=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));if(!path.startsWith(root+sep))throw Error();const b=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store'});res.end(b)}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/qa/design-system/index.html';
const browser=await chromium.launch(process.env.ICMX_CHROME==='true'?{headless:true,channel:'chrome'}:{headless:true});
await mkdir('qa/screenshots',{recursive:true});
try{
 for(const [width,height] of [[390,844],[320,640]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route(/https?:\/\/[^/]*supabase\.co\//,r=>{remote.push(r.request().url());return r.abort()});
  await page.goto(url+'?legendary=kame');
  await page.locator('#pack.on').waitFor();
  assert.equal(await page.locator('#pTabs .lg-tab').count(),0);
  await page.evaluate(()=>localStorage.setItem('icmx-album2','real-sentinel'));
  await page.locator('#openBtn').click();
  await page.locator('#env.lg-secret').waitFor({state:'attached'});
  await page.locator('#disc.lg-reveal.cov #dcReveal').waitFor();
  assert.equal(await page.locator('#disc > .lg-field').count(),1);
  const full=await page.locator('#disc > .lg-field').boundingBox(),screen=await page.locator('#disc').boundingBox();
  assert.ok(full&&screen&&Math.abs(full.width-screen.width)<2&&Math.abs(full.height-screen.height)<2,'effect must cover the complete discovery screen');
  await page.locator('#dcReveal').click();
  await page.locator('#disc .lg-data').waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('#disc .lg-art,#disc .lg-frame')].length===2&&[...document.querySelectorAll('#disc .lg-art,#disc .lg-frame')].every(i=>i.complete&&i.naturalWidth>0));
  assert.match(await page.locator('#disc .lg-copy').innerText(),/SECRETO DESCUBIERTO/);
  assert.match(await page.locator('#disc .lg-data').textContent(),/Kame/);
  assert.equal(await page.evaluate(()=>hand[0].k),'kame_l');
  assert.equal(await page.evaluate(()=>S.have.kame_l),1);
  assert.equal(await page.evaluate(()=>player1.collectionProgress({kame_l:1}).discovered),0);
  await page.screenshot({path:'qa/screenshots/ui-lab-legendary-reveal-'+width+'.png'});
  for(let i=0;i<5;i++){
   if(await page.locator('#disc.cov #dcReveal').isVisible())await page.locator('#dcReveal').click();
   const next=page.locator('#disc #dcNext');if(await next.isVisible())await next.click();else break;
  }
  await page.locator('#sum.on').waitFor();
  assert.match(await page.locator('#sum .rh .dx-lab').innerText(),/LEGENDARY/);
  await page.locator('#sAlb').click();
  await page.locator('#pTabs .lg-tab').waitFor();
  await page.locator('#pTabs .lg-tab').click();
  assert.equal(await page.locator('#grid .lg-tile').count(),3);
  await page.locator('#grid [data-lg="kame_l"]').waitFor();
  await page.screenshot({path:'qa/screenshots/ui-lab-legendary-album-'+width+'.png'});
  await page.reload();await page.locator('#pack.on').waitFor();
  await page.locator('#openBtn').click();await page.locator('#disc.lg-reveal.cov #dcReveal').waitFor();
  await page.locator('#dcReveal').click();
  assert.doesNotMatch(await page.locator('#disc .lg-copy').innerText(),/SECRETO DESCUBIERTO/);
  assert.match(await page.locator('#disc .lg-copy').innerText(),/REPETIDA/);
  assert.equal(await page.evaluate(()=>lgOwned().length),1);
  await page.goto(url+'?legendary=none');
  await page.locator('#openBtn').click();await page.locator('#env.lg-odd').waitFor({state:'attached'});
  await page.locator('#disc.on').waitFor();
  assert.equal(await page.evaluate(()=>hand.some(c=>c.v==='l')),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('icmx-album2')),'real-sentinel');
  assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('Legendary: forced reveal, real images, persistent unlock, duplicate and false anomaly verified in mobile Chromium');
}finally{await browser.close();server.close()}
