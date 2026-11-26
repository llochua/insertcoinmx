// QA visual de UNA carta en sus variantes, dinámica y respaldo, a 320, 390 y 1280 px.
//
// Uso:  node qa/card-variants-browsers.mjs <id>
//       python3 qa/card-variants-sheet.py <id>   → qa/screenshots/cartas/<id>-<ancho>.jpg
//
// Dinámica: zoom real del juego (openCard) con base cs2/ + SVG del renderer.
// Respaldo: el mismo zoom mostrando la imagen estática c2/.
// Revisa: sin GOTY ni Likes, POP sin valor incrustado, estrellas por rareza, texto Holo = cómo se
// diseñó y Dorada = anécdota (si existen), y que la carta no se salga de la pantalla.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';

const id=process.argv[2];
assert.ok(/^[a-z0-9]{1,40}$/.test(id||''),'Uso: node qa/card-variants-browsers.mjs <id>');
const root=process.cwd();
const catalog=JSON.parse(await readFile('cartas/catalogo.json','utf8'));
const card=catalog.find(c=>c.id===id);
assert.ok(card,'No está en el catálogo: '+id);
const ctx={window:{}};vm.runInNewContext(await readFile('content/card-texts.js','utf8'),ctx);
const texts=ctx.window.ICMX_CARD_TEXTS[id]||{};
const variants=card.full?['b','e','r','f']:['b','e','r'];
const keyOf=v=>v==='f'?'F_'+id:(({b:'comun',e:'holo',r:'dorada'})[v]===card.version_original?id:id+'_'+v);
const stars={b:0,e:1,r:2,f:3};

const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json',
 '.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.css':'text/css','.woff2':'font/woff2',
 '.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf'};
const server=createServer(async(req,res)=>{
 try{
  let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p==='/')p='/index.html';
  const name=path.resolve(root,'.'+p);
  if(!name.startsWith(root+path.sep)||!(await stat(name)).isFile())throw Error('404');
  res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream'});
  res.end(await readFile(name));
 }catch{res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/';
const out=path.join(root,'.qa-cartas',id);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report=[];
try{
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:width===1280?900:760},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.ICMX_CARD_RUNTIME,{timeout:20000});
  for(const v of variants){
   const key=v==='f'?id+'_f':keyOf(v); // clave de carta del juego (openCard)
   await page.evaluate(k=>openCard(k),key);
   await page.waitForFunction(()=>{const fx=document.getElementById('zFx'),img=document.getElementById('zImg');
    return fx.classList.contains('idle')&&img.dataset.icmxDynamic==='true'&&img.complete&&img.naturalWidth>0&&
     fx.querySelectorAll(':scope > svg.icmx-data').length===1},null,{timeout:20000});
   await page.waitForTimeout(700);
   const dyn=await page.evaluate(()=>{
    const fx=document.getElementById('zFx'),zoom=document.getElementById('zoom'),r=fx.getBoundingClientRect();
    const svg=fx.querySelector('svg.icmx-data');
    return {src:document.getElementById('zImg').getAttribute('src'),
     inside:r.left>=-1&&r.right<=innerWidth+1,text:svg.textContent.replace(/\s+/g,' '),
     stars:svg.querySelectorAll('[data-icmx-star]').length,
     pop:svg.querySelector('[data-icmx-field="pop"]')?.textContent||'',
     zoomText:zoom.innerText};
   });
   assert.ok(dyn.src.includes('/cs2/'+keyOf(v)+'.webp'),`${width} ${v}: base dinámica incorrecta ${dyn.src}`);
   assert.ok(dyn.inside,`${width} ${v}: la carta se sale de la pantalla`);
   assert.ok(!/GOTY|Likes/i.test(dyn.text+dyn.zoomText),`${width} ${v}: aparece GOTY o Likes`);
   assert.equal(dyn.stars,stars[v],`${width} ${v}: estrellas de rareza`);
   assert.ok(dyn.text.includes(card.nombre),`${width} ${v}: falta el nombre`);
   if(v!=='f')assert.ok(dyn.text.includes(card.linea)&&dyn.text.includes(card.frase),`${width} ${v}: habilidad o frase`);
   if(v==='e'&&texts.holo)assert.ok(dyn.zoomText.includes(texts.holo.slice(0,40)),`${width} Holo: falta cómo se diseñó`);
   if(v==='r'&&texts.dorada)assert.ok(dyn.zoomText.includes(texts.dorada.slice(0,40)),`${width} Dorada: falta la anécdota`);
   await page.screenshot({path:path.join(out,`${width}_${v}_dinamica.png`)});
   await page.evaluate(src=>{const fx=document.getElementById('zFx');ICMX_CARD_RUNTIME.reset(fx);
    document.getElementById('zImg').src=src;},'c2/'+keyOf(v)+'.webp');
   await page.waitForFunction(()=>{const i=document.getElementById('zImg');return i.complete&&i.naturalWidth===960&&/\/c2\//.test(i.src)},null,{timeout:20000});
   await page.waitForTimeout(300);
   await page.screenshot({path:path.join(out,`${width}_${v}_respaldo.png`)});
   report.push({width,variant:v,base:dyn.src.replace(/^.*\/(cs2\/)/,'$1'),pop:dyn.pop,stars:dyn.stars});
   await page.evaluate(()=>typeof closeZoom==='function'&&closeZoom());await page.waitForTimeout(250);
  }
  assert.deepEqual(errors.filter(e=>!/guest-access|Failed to fetch dynamically imported module/.test(e)),[],`${width}: errores en la página`);
  await page.close();
 }
}finally{await browser.close();server.close();}
await writeFile(path.join(out,'reporte.json'),JSON.stringify(report,null,1));
console.log(`OK ${id}: ${variants.length} variantes × 3 anchos, dinámica y respaldo → .qa-cartas/${id}/`);
