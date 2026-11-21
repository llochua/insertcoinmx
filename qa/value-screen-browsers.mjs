/** QA visual real en Chromium, usando progreso de prueba aislado. Sin Supabase real. */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1'),path=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(ROOT,'.'+decodeURIComponent(path));
  if(!file.startsWith(ROOT+sep))throw Error('invalid path');
  const data=await readFile(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});
  res.end(data);
 }catch(_){res.writeHead(404);res.end('Not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('https://cdn.jsdelivr.net/**',r=>r.abort());
 await page.addInitScript(()=>{
  localStorage.setItem('icmx-album2',JSON.stringify({
   have:{abuket_b:3,abuket_e:2,arcade_f:1},rate:{abuket:0},ini:'TST',seen:1,sv:2,mv:2,welcomeLeft:0
  }));
 });
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),200);
 await page.locator('#title').click();
 await page.locator('#home .home-player-card').click();
 await page.locator('#profile.on').waitFor();
 await page.waitForFunction(()=>/^\d[\d.,]* PTS$/.test(document.getElementById('profileValuePoints')?.textContent||''),null,{timeout:10000});
 const pts=await page.locator('#profileValuePoints').innerText();
 assert.match(pts,/^\d[\d.,]* PTS$/);
 assert.ok(Number(pts.replace(/[^\d]/g,''))>=35,'Ya tiene Base + Holo únicas');
 await mkdir(resolve(ROOT,'qa/screenshots'),{recursive:true});
 await page.screenshot({path:resolve(ROOT,'qa/screenshots/value-profile-mobile.png'),fullPage:true});
 await page.evaluate(()=>go('scores'));
 await page.locator('#scores.on').waitFor();
 assert.equal(await page.locator('#scores .arcade-ranking-switch button').count(),4);
 assert.equal(await page.locator('#scores .arcade-scoreboard-rows .r').count(),10);
 assert.equal(await page.locator('#scores .icmx-global-board').count(),1);
 assert.equal(await page.locator('#scores #bkExp').count(),0);
 await page.locator('#scores .arcade-ranking-switch button[data-score-metric="designs"]').click();
 assert.equal(await page.locator('#scoreRankColumn').innerText(),'DISEÑOS');
 assert.equal(await page.locator('#scores .arcade-ranking-switch button[data-score-metric="designs"]').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:resolve(ROOT,'qa/screenshots/value-records-mobile.png'),fullPage:true});
 await page.evaluate(()=>openCard('abuket_b'));
 await page.locator('#zoom[open]').waitFor();
 assert.equal(await page.locator('#zVariantPoints').innerText(),'10 PTS');
 assert.equal(await page.locator('#zDesignPopularity').innerText(),'— POP');
 assert.match(await page.locator('#zVariantOwned').innerText(),/Descubierta/);
 await page.screenshot({path:resolve(ROOT,'qa/screenshots/value-card-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[],'sin errores JavaScript al navegar');
 console.log('✓ Pantallas reales: perfil '+pts+', Récords arcade y detalle con 10 PTS / — POP');
}finally{
 await page.close();
 await browser.close();
 await new Promise(done=>server.close(done));
}
