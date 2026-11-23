/** QA visual del componente dentro del LAB existente. No Auth, sin cambios a producción. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp',
 '.ttf':'font/ttf','.otf':'font/otf','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(ROOT,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(ROOT+sep))throw Error('Fuera del repositorio');
  const bytes=await readFile(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end('No existe')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+'/qa/design-system/';
const browser=await chromium.launch({headless:true});
await mkdir('qa/screenshots',{recursive:true});
try{
 for(const [width,height] of [[390,844],[1280,850]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route(/https?:\/\/[^/]*supabase\.co\//,route=>{external.push(route.request().url());route.abort();});
  const result=await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(result?.status(),200);
  await page.locator('#icmxLabToggle').waitFor({state:'visible'});
  await page.locator('#icmxLabToggle').click();
  await page.locator('#icmxLabDynamicCards').click();
  await page.locator('#icmxDynamicLab').waitFor({state:'visible'});
  await page.waitForFunction(()=>{
    const images=[document.querySelector('#dynOld'),document.querySelector('#dynNew .icmx-shell')];
    return images.every(x=>x?.complete&&x.naturalWidth>0);
  });
  assert.equal(await page.locator('#dynNew .icmx-data mask').count(),2,'mask luminance en etiquetas');
  assert.equal(await page.locator('#icmxDynamicLab .dyn-note[data-error="true"]').count(),0);
  let before=await page.locator('#dynNew .icmx-shell').getAttribute('src');
  await page.locator('#dynNumber').fill('001/250');
  await page.locator('#dynPoints').fill('75');
  await page.locator('#dynPop').fill('42');
  await page.locator('#dynName').fill('1UP PERSONALIZADA');
  const texts=await page.locator('#dynNew .icmx-data text').allTextContents();
  for(const expected of ['001/250','Valor 75','42','1UP PERSONALIZADA'])
    assert(texts.includes(expected),expected+' debe estar en el SVG');
  assert.equal(await page.locator('#dynNew .icmx-shell').getAttribute('src'),before,
    'modificar datos no debe regenerar/reemplazar la imagen');
  await page.screenshot({path:'qa/screenshots/ui-lab-dynamic-base-'+width+'.png',fullPage:true});
  await page.locator('#dynDesign').selectOption('sonic');
  await page.locator('#dynVariant').selectOption('e');
  await page.waitForFunction(()=>document.querySelector('#dynNew .icmx-shell')?.complete &&
    document.querySelector('#dynNew .icmx-shell')?.naturalWidth>0);
  await page.screenshot({path:'qa/screenshots/ui-lab-dynamic-holo-'+width+'.png',fullPage:true});
  await page.locator('#dynDesign').selectOption('abuket');
  await page.locator('#dynVariant').selectOption('f');
  await page.waitForFunction(()=>document.querySelector('#dynNew .icmx-shell')?.complete &&
    document.querySelector('#dynNew .icmx-shell')?.naturalWidth>0);
  await page.screenshot({path:'qa/screenshots/ui-lab-dynamic-full-'+width+'.png',fullPage:true});
  assert.deepEqual(errors,[],'sin errores del navegador');
  assert.deepEqual(external,[],'sin solicitudes a Supabase');
  await page.locator('#icmxDynamicLabClose').click();
  assert.equal(await page.locator('#icmxLabToggle').count(),1,'LAB original conservado');
  console.log('✓ LAB '+width+': Base/Holo/Full y SVG dinámico; sin reescribir assets ni usar Supabase');
  await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
