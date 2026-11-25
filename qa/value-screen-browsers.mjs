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
 await page.route('**/rest/v1/rpc/icmx_community_aggregates',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'[]'}));
 await page.addInitScript(()=>{
  localStorage.setItem('icmx-guest-handle-v1','qa_guest');
  localStorage.setItem('icmx-album2',JSON.stringify({
   have:{abuket_b:3,abuket_e:2,arcade_f:1},rate:{abuket:0},ini:'TST',seen:1,sv:2,mv:2,welcomeLeft:0
  }));
 });
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),200);
 await page.locator('#title').click();
 await page.locator('#onb.on').waitFor({state:'visible'});
 for(let step=0;step<3;step++)await page.locator('#onNext').click();
 await page.locator('#onb').waitFor({state:'hidden'});
 await page.locator('#home .home-player-card').click();
 await page.locator('#profile.on').waitFor();
 await page.waitForFunction(()=>/^\d[\d.,]*$/.test(document.getElementById('profileValuePoints')?.textContent||''),null,{timeout:10000});
 const pts=await page.locator('#profileValuePoints').innerText();
 assert.match(pts,/^\d[\d.,]*$/);
 assert.equal(await page.locator('.pc-score-number small').innerText(),'PTS');
 assert.ok(Number(pts.replace(/[^\d]/g,''))>=35,'Ya tiene Base + Holo únicas');
 await mkdir(resolve(ROOT,'qa/screenshots'),{recursive:true});
 await page.screenshot({path:resolve(ROOT,'qa/screenshots/value-profile-mobile.png'),fullPage:true});
 await page.evaluate(()=>go('scores'));
 await page.locator('#scores.on').waitFor();
 assert.deepEqual(await page.locator('#scores .arcade-ranking-switch button').allTextContents(),['COLECCIONISTAS','POP']);
 assert.equal(await page.locator('#tbl .r').count(),10);
 assert.equal(await page.locator('#scoreRankColumn').innerText(),'PTS');
 assert.equal(Number(await page.locator('#sMine').innerText()),Number(pts.replace(/[^\d]/g,'')));
 assert.equal(await page.locator('#scores .arcade-bonus-stats, #scores #bkExp').count(),0);
 await page.getByRole('button',{name:'POP',exact:true}).click();
 assert.equal(await page.locator('#scoreRankColumn').innerText(),'POP');
 assert.equal(await page.locator('#communityRankEmpty').isVisible(),true);
 await page.getByRole('button',{name:'COLECCIONISTAS',exact:true}).click();
 assert.equal(await page.locator('#tbl').isVisible(),true);
 await page.screenshot({path:resolve(ROOT,'qa/screenshots/value-records-mobile.png'),fullPage:true});
 await page.evaluate(()=>openCard('abuket_b'));
 await page.locator('#zoom[open]').waitFor();
 await page.locator('#zFx svg.icmx-data [data-icmx-field="pop"]').waitFor();
 assert.ok((await page.locator('#zFx svg.icmx-data').textContent()).includes('Valor 10'));
 assert.equal(await page.locator('#zFx svg.icmx-data [data-icmx-field="pop"]').textContent(),'—');
 await page.locator('#zVoting').waitFor({state:'visible'});
 assert.deepEqual(await page.locator('#zRate button[data-r]').evaluateAll(buttons=>buttons.map(b=>b.getAttribute('aria-label'))),
  ['GOTY','GENIAL','OK','MMM'],'Solo cuatro reacciones compactas');
 assert.equal(await page.locator('#zCommunityFormula').count(),0,'No mostrar la fórmula POP retirada');
 assert.equal(await page.locator('#zoom #zLikeStatus').count(),1,'Un solo estado de publicación');
 const goty=page.locator('#zRate button[data-r="0"]');
 assert.equal(await goty.getAttribute('aria-pressed'),'true','Reacción previa seleccionada');
 await goty.click();
 assert.equal(await goty.getAttribute('aria-pressed'),'false','Segundo toque retira la reacción');
 await goty.click();
 assert.equal(await goty.getAttribute('aria-pressed'),'true','Se puede volver a seleccionar');
 assert.equal(await page.locator('#zoom .icmx-card-value').count(),0,'no duplicar cifras debajo de la carta');
 await page.screenshot({path:resolve(ROOT,'qa/screenshots/value-card-mobile.png'),fullPage:true});
 await page.locator('#zClose').click();
 await page.locator('#zoom[open]').waitFor({state:'hidden'});
 await page.waitForFunction(()=>!document.getElementById('zImg').getAttribute('src'));
 await page.evaluate(()=>openCard('abuket_e'));
 await page.waitForFunction(()=>document.querySelector('#zFx svg.icmx-data')?.textContent.includes('Valor 25'));
 await page.screenshot({path:resolve(ROOT,'qa/screenshots/value-card-holo-mobile.png'),fullPage:true});
 await page.locator('#zClose').click();
 await page.locator('#zoom[open]').waitFor({state:'hidden'});
 await page.waitForFunction(()=>!document.getElementById('zImg').getAttribute('src'));
 await page.evaluate(()=>openCard('abuket_r'));
 await page.waitForFunction(()=>document.querySelector('#zFx svg.icmx-data')?.textContent.includes('Valor 50'));
 await page.screenshot({path:resolve(ROOT,'qa/screenshots/value-card-gold-mobile.png'),fullPage:true});
 await page.locator('#zClose').click();
 await page.locator('#zoom[open]').waitFor({state:'hidden'});
 await page.waitForFunction(()=>!document.getElementById('zImg').getAttribute('src'));
 await page.evaluate(()=>openCard('arcade_f'));
 await page.waitForFunction(()=>document.querySelector('#zFx svg.icmx-data')?.textContent.includes('Valor 100'));
 await page.screenshot({path:resolve(ROOT,'qa/screenshots/value-card-full-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[],'sin errores JavaScript al navegar');
 console.log('✓ Pantallas reales: Récords arcade, PTS incrustados de Base/Holo/Full y POP sin datos ficticios');
}finally{
 await page.close();
 await browser.close();
 await new Promise(done=>server.close(done));
}
