// Revalidación final con bases WebP optimizadas.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.css':'text/css','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname)==='/'?'/index.html':decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const name=path.resolve(root,'.'+requestPath);
  if(!name.startsWith(root+path.sep))throw Error('path');
  const item=await stat(name);
  if(!item.isFile())throw Error('not file');
  res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream'});
  res.end(await readFile(name));
 }catch(e){res.writeHead(404);res.end('not found')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch(process.env.ICMX_CHROME==='true'?{headless:true,channel:'chrome'}:{headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const requests=[];
 page.on('request',r=>requests.push(new URL(r.url()).pathname));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.ICMX_CARD_RUNTIME&&!!window.ICMX_CARD_RENDERER,{timeout:20000});
 // Exercise the actual published Album zoom, not a synthetic card node.
 for(const key of ['booit_e','arcade_b','1up_e','1up_b','1up_r','sonic_f','booit_e']){
  const offset=requests.length;
  await page.evaluate(key=>openCard(key),key);
  await page.waitForFunction(()=>{
   const fx=document.getElementById('zFx'),img=document.getElementById('zImg');
   return fx.classList.contains('idle')&&!fx.classList.contains('is-error')&&
    img.dataset.icmxDynamic==='true'&&img.complete&&img.naturalWidth>0&&
    fx.querySelectorAll(':scope > svg.icmx-data').length===1&&
    getComputedStyle(img).visibility==='visible'&&getComputedStyle(img).opacity==='1'&&
    document.getElementById('zLoad').textContent==='';
  },null,{timeout:20000});
  const number=await page.locator('#zFx svg.icmx-data').textContent();
  assert.match(number,/\/?\?\?\?/,'Unreleased catalog denominator hidden');
  const actual=await page.locator('#zImg').getAttribute('src');
  assert.match(actual,/\/cs2\//,key+' '+actual);
  assert.equal(requests.slice(offset).filter(x=>x.startsWith('/c2/')).length,0,'No legacy download: '+key);
  if(key==='1up_e'){
   const values=await page.evaluate(async()=>{
    const fx=document.getElementById('zFx'),img=document.getElementById('zImg');
    const svg=fx.querySelector('svg.icmx-data'),src=img.src;
    const ok=await window.ICMX_CARD_RUNTIME.mount(fx,CB['1up_e'],{points:25,pop:143});
    return {ok,sameSvg:svg===fx.querySelector('svg.icmx-data'),sameImg:img===document.getElementById('zImg'),
      sameSrc:src===img.src,pop:svg.querySelector('[data-icmx-field="pop"]').textContent,opacity:img.style.opacity};
   });
   assert.deepEqual(values,{ok:true,sameSvg:true,sameImg:true,sameSrc:true,pop:'143',opacity:'1'});
   console.log('OK: POP updated without replacing or hiding image/SVG');
  }
  await page.locator('#zFx').click();
  await page.waitForFunction(()=>!document.getElementById('zoom').open);
 }
 console.log('OK: actual Album zoom, repeated open and close, Base/Holo/Dorada/Full');
 // A failed shell must not expose a pre-rendered catalog denominator or stale SVG.
 await page.route('**/cs2/booit_e.webp',r=>r.abort());
 await page.evaluate(()=>openCard('booit_e'));
 await page.waitForFunction(()=>{
  const fx=document.getElementById('zFx'),img=document.getElementById('zImg');
  return fx.classList.contains('is-error')&&
   !fx.querySelector('svg.icmx-data')&&new URL(img.src).pathname==='/coin.png';
 });
 assert.ok(await page.locator('#zFx').getAttribute('data-icmx-error'));
 await page.unroute('**/cs2/booit_e.webp');
 await page.locator('#zFx').click();
 await page.waitForFunction(()=>!document.getElementById('zoom').open);
 // Simulate rapid switching while the first shell request is delayed.
 await page.route('**/cs2/1up_e.webp',async r=>{await new Promise(resolve=>setTimeout(resolve,350));await r.continue().catch(()=>{})});
 await page.evaluate(()=>{openCard('1up_e');openCard('arcade_b')});
 await page.waitForFunction(()=>{
  const fx=document.getElementById('zFx'),img=document.getElementById('zImg');
  return fx.classList.contains('idle')&&img.dataset.icmxDynamic==='true'&&
   new URL(img.src).pathname==='/cs2/arcade.webp'&&fx.querySelectorAll('svg.icmx-data').length===1;
 });
 await page.waitForTimeout(450);
 assert.equal(await page.locator('#zImg').evaluate(img=>new URL(img.src).pathname),'/cs2/arcade.webp');
 assert.equal(await page.locator('#zFx svg.icmx-data').count(),1);
 await page.unroute('**/cs2/1up_e.webp');
 await page.locator('#zFx').click();
 await page.waitForFunction(()=>!document.getElementById('zoom').open);
 console.log('OK: no legacy denominator on failure; rapid card switching does not restore old art');

 const results=await page.evaluate(async()=>{
  const list=[['1up','b','1up'],['1up','e','1up_e'],['1up','r','1up_r'],['sonic','f','F_sonic']];
  const out=[];
  for(const [id,v,key] of list){
   const fx=document.createElement('span');fx.className='fx';fx.style.cssText='position:relative;display:block;width:300px;aspect-ratio:480/670;overflow:hidden';
   const img=document.createElement('img');img.src='c/'+key+'.webp';img.style.width='100%';img.style.display='block';fx.append(img);
   document.body.append(fx);
   const card={k:id+'_'+v,d:id,v,img:key};
   await window.ICMX_CARD_RUNTIME.mount(fx,card,{points:25,pop:143});
   const svg=fx.querySelector(':scope > svg.icmx-data');
   out.push({id,v,src:img.getAttribute('src'),svg:!!svg,stars:svg?.querySelectorAll('[data-icmx-star]').length,
    footer:svg?.querySelectorAll('[data-icmx-footer-plate]').length,
    pop:svg?.querySelector('[data-icmx-field="pop"]')?.textContent,
    error:fx.dataset.icmxError||null});
   fx.remove();
  }
  const c=document.createElement('canvas');c.width=480;c.height=670;
  const ctx=c.getContext('2d');
  await window.ICMX_CARD_RUNTIME.drawInto(ctx,{k:'1up_b',d:'1up',v:'b',img:'1up'}, {points:10,pop:143},0,0,480,670);
  out.push({exportPixels:[...ctx.getImageData(240,640,1,1).data]});
  return out;
 });
 for(const row of results.slice(0,4)){
  assert.equal(row.error,null,JSON.stringify(row));
  assert.equal(row.svg,true,JSON.stringify(row));
  assert.equal(row.pop,'143');
  assert.match(row.src,/\/cs\/|^cs\//);
  assert.equal(row.stars,row.v==='f'?3:row.v==='r'?2:row.v==='e'?1:0);
  assert.equal(row.footer,row.v==='f'?0:1);
 }
 assert.ok(results[4].exportPixels[3]>0);
 console.log('OK: Base, Holo, Dorada, Full y exportación Canvas:',JSON.stringify(results));
}finally{await browser.close();server.close()}
