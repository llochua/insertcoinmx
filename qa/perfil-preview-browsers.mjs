/**
 * Vista previa de Mi perfil publicada solo en /qa/perfil/, sin cambios remotos.
 * Nunca inicia sesión, emite sobres remotos ni toca la colección de producción.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp',
 '.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(ROOT,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(file!==ROOT&&!file.startsWith(ROOT+sep)){res.writeHead(403);res.end();return}
  const body=await readFile(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});
  res.end(body);
 }catch(_){res.writeHead(404);res.end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+'/qa/perfil/';
const browser=await chromium.launch();
try{
 for(const width of [390,1200]){
  const page=await browser.newPage({viewport:{width,height:850}});
  const exceptions=[],supabaseCalls=[];
  page.on('pageerror',e=>exceptions.push(e.message));
  page.on('request',r=>{if(r.url().includes('supabase.co'))supabaseCalls.push(r.url())});
  // Ya hay cartas en el juego real: jamás deben migrarse al laboratorio.
  await page.addInitScript(()=>localStorage.setItem('icmx-album2',
   '{"have":{"abuket_b":3},"rate":{"abuket":3},"seen":1}'));
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.locator('#onb.on').waitFor();
  await page.locator('#onNext').click();
  await page.locator('#onNext').click();
  assert.equal(await page.locator('#onAccount').isVisible(),true);
  await page.locator('#onAccount').click();
  assert.equal(await page.locator('#profile').evaluate(e=>e.classList.contains('on')),true);
  assert.equal(await page.locator('#profileAuthSend').isDisabled(),true,
    'preview cannot create accounts by mistake');
  const lab=page.locator('#profile .profile-account a[href="/qa/registro/"]');
  assert.equal(await lab.isVisible(),true);
  await page.locator('#profile [data-home]').click();
  await page.locator('#home .profile-entry').click();
  assert.equal(await page.locator('#profile').evaluate(e=>e.classList.contains('on')),true);
  const saved=await page.evaluate(()=>({
    real:localStorage.getItem('icmx-album2'),
    preview:sessionStorage.getItem('icmx-preview-perfil-20261120'),
    accidental:localStorage.getItem('icmx-preview-perfil-20261120')
  }));
  assert.deepEqual(JSON.parse(saved.real).have,{abuket_b:3});
  assert.ok(saved.preview===null||typeof saved.preview==='string', 'preview remains isolated from the real game');
  assert.equal(saved.accidental,null);
  assert.deepEqual(supabaseCalls,[],'preview must not reach Supabase');
  assert.deepEqual(exceptions,[],'no uncaught JavaScript errors');
  console.log('✓ Vista Mi perfil en '+width+'px, bienvenida, navegación y progreso real intacto');
  await page.close();
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
