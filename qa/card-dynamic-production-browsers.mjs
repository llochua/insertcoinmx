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
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.ICMX_CARD_RUNTIME&&!!window.ICMX_CARD_RENDERER,{timeout:20000});
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
