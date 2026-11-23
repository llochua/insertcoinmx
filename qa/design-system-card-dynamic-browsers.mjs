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
 for(const [width,height] of [[320,640],[390,844],[1280,850]]){
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
  const rarityCounts=await page.locator('#dynRarityPreview .dyn-rarity-item').evaluateAll(items=>
    items.map(el=>({tier:el.dataset.tier,stars:el.querySelectorAll('svg polygon').length})));
  assert.deepEqual(rarityCounts,[{tier:'b',stars:0},{tier:'e',stars:1},
    {tier:'r',stars:2},{tier:'f',stars:3}],'jerarquía de rareza 0/1/2/3');
  await page.waitForFunction(()=>{
    const images=[document.querySelector('#dynOld'),document.querySelector('#dynNew .icmx-shell')];
    return images.every(x=>x?.complete&&x.naturalWidth>0);
  });
  // Comprobar los PÍXELES del shell, no solamente las capas SVG.
  // El antiguo pie tenía bordes/trazos oscuros en todo este rectángulo.
  const shellInk=await page.evaluate(()=>{
    const im=document.querySelector('#dynNew .icmx-shell');
    const cv=document.createElement('canvas');cv.width=960;cv.height=1340;
    const ctx=cv.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(im,0,0,960,1340);
    const pixels=ctx.getImageData(43,1232,875,62).data;
    let dark=0;
    for(let i=0;i<pixels.length;i+=4)
      if(pixels[i]<85&&pixels[i+1]<85&&pixels[i+2]<85)dark++;
    return dark;
  });
  assert.equal(shellInk,0,'ningún borde anterior puede quedar bajo la placa SVG');
  const plate=page.locator('#dynNew .icmx-data rect[data-icmx-footer-plate="true"]');
  assert.equal(await plate.count(),1,'una sola placa continua bajo número, rareza y valor');
  const plateBounds=await plate.evaluate(el=>{const r=el.getBBox();return {x:r.x,y:r.y,width:r.width,height:r.height}});
  assert(plateBounds.x<=75 && plateBounds.x+plateBounds.width>=870 &&
    plateBounds.y<=1250 && plateBounds.y+plateBounds.height>=1280,
    'placa cubre la zona completa, no parches detrás de cifras');
  assert.equal(await page.locator('#dynNew .icmx-data mask').count(),2,'mask luminance en etiquetas');
  const pop=page.locator('#dynNew text[data-icmx-field="pop"]');
  assert.equal(await pop.count(),1,'POP dinámico único');
  assert.match(await pop.getAttribute('clip-path'),/url\(#icmx-pop-clip-/);
  assert.equal(await page.locator('#dynNew .icmx-data path[data-icmx-ability-icon="zap"]').count(),1,
    'habilidad usa rayo vectorial, no estrellas');
  assert.equal(await page.locator('#icmxDynamicLab .dyn-note[data-error="true"]').count(),0);
  assert.equal(await page.locator('#dynNumber').inputValue(),'001/???',
    'el LAB presenta numeración abierta sin cambiar el catálogo persistente');
  for(const n of [7,26,143]){
    await page.locator('#dynPop').fill(String(n));
    const text=page.locator('#dynNew text[data-icmx-field="pop"]');
    assert.equal(await text.textContent(),String(n));
    const rect=await text.evaluate(el=>{const r=el.getBBox();return {x:r.x,y:r.y,width:r.width,height:r.height}});
    assert(rect.y>=120&&rect.y+rect.height<=227,
      'POP Base dentro del encabezado para '+n+': '+JSON.stringify(rect));
  }
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
  assert.equal(await page.locator('#dynNew .icmx-data path[data-icmx-star="5"]').count(),1,'Holo = 1 estrella SVG');
  await page.locator('#dynVariant').selectOption('r');
  assert.equal(await page.locator('#dynNew .icmx-data path[data-icmx-star="5"]').count(),2,'Dorada = 2 estrellas SVG');
  await page.waitForFunction(()=>document.querySelector('#dynNew .icmx-shell')?.complete &&
    document.querySelector('#dynNew .icmx-shell')?.naturalWidth>0);
  // La antigua palabra Dorada y las tres estrellas NO deben existir en el raster base.
  const rawFooter=await page.evaluate(()=>{
    const im=document.querySelector('#dynNew .icmx-shell');
    const cv=document.createElement('canvas');cv.width=960;cv.height=1340;
    const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,960,1340);
    const pix=ctx.getImageData(470,1248,106,28).data;
    let ink=0;
    for(let i=0;i<pix.length;i+=4)if((pix[i]+pix[i+1]+pix[i+2])/3<65)ink++;
    return ink;
  });
  assert(rawFooter<30,'pie Dorada sin letras antiguas impresas: '+rawFooter+' píxeles');
  assert.equal(await page.locator('#dynNew .icmx-data rect[data-icmx-footer-plate="true"]').count(),1,
    'Dorada: mismo fondo continuo, sin parches por rareza');
  await page.screenshot({path:'qa/screenshots/ui-lab-dynamic-gold-'+width+'.png',fullPage:true});
  await page.locator('#dynVariant').selectOption('e');
  await page.waitForFunction(()=>document.querySelector('#dynNew .icmx-shell')?.complete &&
    document.querySelector('#dynNew .icmx-shell')?.naturalWidth>0);
  await page.screenshot({path:'qa/screenshots/ui-lab-dynamic-holo-'+width+'.png',fullPage:true});
  await page.locator('#dynDesign').selectOption('abuket');
  await page.locator('#dynVariant').selectOption('f');
  await page.waitForFunction(()=>document.querySelector('#dynNew .icmx-shell')?.complete &&
    document.querySelector('#dynNew .icmx-shell')?.naturalWidth>0);
  await page.screenshot({path:'qa/screenshots/ui-lab-dynamic-full-'+width+'.png',fullPage:true});
  const svgStarCount=await page.locator('#dynNew .icmx-data path[data-icmx-star]').count();
  assert.equal(svgStarCount,3,'Full tiene únicamente 3 estrellas de rareza');
  assert.equal(await page.locator('#dynNew .icmx-data path[data-icmx-ability-icon="zap"]').count(),1,
    'Full usa el mismo rayo de habilidad (no una estrella adicional)');
  const popFull=page.locator('#dynNew text[data-icmx-field="pop"]');
  assert.match(await popFull.getAttribute('clip-path'),/url\(#icmx-pop-clip-/);
  assert.equal(await popFull.getAttribute('y'),'924','Full POP arriba de GOTY');
  for(const n of [7,26,143]){
    await page.locator('#dynPop').fill(String(n));
    const text=page.locator('#dynNew text[data-icmx-field="pop"]');
    assert.equal(await text.textContent(),String(n));
    const rect=await text.evaluate(el=>{const r=el.getBBox();return {x:r.x,y:r.y,width:r.width,height:r.height}});
    assert(rect.y>=910&&rect.y+rect.height<=1035,
      'POP Full fuera de GOTY para '+n+': '+JSON.stringify(rect));
  }
  assert.equal(await page.locator('#dynNew .icmx-data text').filter({hasText:'★★'}).count(),0,
    'ninguna estrella Full se dibuja como carácter tipográfico');
  assert.deepEqual(errors,[],'sin errores del navegador');
  assert.deepEqual(external,[],'sin solicitudes a Supabase');
  await page.locator('#icmxDynamicLabClose').click();
  assert.equal(await page.locator('#icmxLabToggle').count(),1,'LAB original conservado');
  console.log('✓ LAB '+width+': Base/Holo/Full y SVG dinámico; sin reescribir assets ni usar Supabase');
  await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
