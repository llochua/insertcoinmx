/**
 * Prueba en Chromium del index.html PÚBLICO (no el laboratorio).
 * Corre contra servidor local con contexto aislado: jamás usa ni escribe cuentas reales.
 * La emisión, probabilidades y almacenamiento deben permanecer intactos.
 */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp',
 '.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(ROOT,'.'+(path.endsWith('/')?path+'index.html':path));
  if(file!==ROOT&&!file.startsWith(ROOT+sep)){res.writeHead(403);res.end();return}
  const body=await readFile(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});
  res.end(body);
 }catch(_){res.writeHead(404);res.end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch();
try{
 for(const width of [390,1200]){
  const context=await browser.newContext({viewport:{width,height:850}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/rest/v1/rpc/icmx_community_aggregates',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'[]'}));
  // El inicio real conserva la portada y ejecuta onboarding en dos entradas distintas.
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  assert.equal(await page.locator('#title.on').count(),1,'portada pública intacta');
  await page.locator('#title').click({position:{x:120,y:240}});
  await page.locator('#onb.on').waitFor({state:'visible'});
  for(let step=0;step<3;step++)await page.locator('#onNext').click();
  await page.locator('#onb').waitFor({state:'hidden'});
  await page.locator('#icmxGuestChoose').click();
  await page.locator('#icmxGuestIni').fill('TST');
  await page.locator('#icmxGuestHandle').fill('qa_guest');
  await page.locator('#icmxGuestPlay').click();
  await page.locator('#icmxGuestGate').waitFor({state:'hidden'});
  assert.equal(await page.locator('#home.on').count(),1,'guest identity leads to menu');
  assert.equal(await page.locator('#pack.on').count(),0,'no automatic pack');
  const before=await page.evaluate(()=>({
   saved:localStorage.getItem('icmx-album2'),
   have:JSON.stringify(S.have),fg:S.fg,extra:S.extra,freeUsed:S.freeUsed
  }));
  assert.equal(JSON.parse(before.saved).seen,1,'identidad se recuerda en el guardado real');
  assert.equal(await page.evaluate(()=>localStorage.getItem('icmx-onboarding-views-v1')),'1');
  assert.deepEqual(JSON.parse(before.have),{},'bienvenida no crea cartas');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(()=>S.seen),1,'progreso sobrevive recarga');
  await page.locator('#title').click({position:{x:120,y:240}});
  assert.equal(await page.locator('#icmxGuestGate:visible').count(),0,'guest access does not repeat after reload');
  assert.equal(await page.locator('#onb.on').count(),0,'reload does not repeat onboarding');
  assert.equal(await page.evaluate(()=>localStorage.getItem('icmx-onboarding-views-v1')),'1');
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#title').click({position:{x:120,y:240}});
  await page.locator('#onb.on').waitFor();
  for(let step=0;step<3;step++)await page.locator('#onNext').click();
  assert.equal(await page.locator('#icmxGuestGate:visible').count(),0,'known guest goes home');
  assert.equal(await page.evaluate(()=>localStorage.getItem('icmx-onboarding-views-v1')),'2');
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#title').click({position:{x:120,y:240}});
  assert.equal(await page.locator('#onb.on').count(),0,'third entry goes home');
  await page.locator('#homeHowToPlay').click();
  for(let step=0;step<3;step++)await page.locator('#onNext').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('icmx-onboarding-views-v1')),'2');

  const meta=await page.evaluate(()=>{
   go('pack');
   return {on:document.getElementById('pack').classList.contains('on'),
     variant:document.getElementById('pk').dataset.packVariant,
     variants:Object.keys(PACK_PRESENTATIONS)};
  });
  assert.equal(meta.on,true,'se puede acceder al sobre deliberadamente desde el menú');
  assert.equal(meta.variant,'standard','cada apertura real inicia como sobre normal');
  assert.deepEqual(meta.variants,['standard','gold'],'variación dorada disponible solo como carcasa futura');
  await page.evaluate(()=>setPackPresentation('gold'));
  assert.equal(await page.locator('#pk').getAttribute('data-pack-variant'),'gold');
  assert.notEqual(await page.locator('#pk .pkimg').evaluate(el=>getComputedStyle(el).filter),'none');
  await mkdir('qa/screenshots',{recursive:true});
  await page.screenshot({path:'qa/screenshots/live-experience-gold-'+width+'.png',fullPage:true});
  await page.evaluate(()=>resetPack());
  assert.equal(await page.locator('#pk').getAttribute('data-pack-variant'),'standard');
  assert.equal(await page.evaluate(()=>JSON.stringify(S.have)),before.have,'piel dorada no emite cartas');

  // Probar las tres rarezas con datos sintéticos, sin ejecutar la emisión de sobres.
  for(const [variant,label] of [['e','HOLO'],['r','DORADA'],['f','ILUSTRACIÓN']]){
   const reveal=await page.evaluate(v=>{
    const card=CARDS.find(c=>c.v===v&&c.img&&DB[c.d]&&!DB[c.d].bx);
    if(!card)return null;
    hand=[{...card,_new:true,_dnew:true,_prev:[],_doneB:false}];
    idx=0;REV=new Set([0]);CINEMATIC_SHOWN.clear();icAwardsSeen.clear();
    showCard();
    return {key:card.k,heading:document.querySelector('.dx-cinema-overlay strong')?.textContent};
   },variant);
   assert.ok(reveal,'existe carta '+variant+' con arte');
   assert.equal(reveal.heading,label,'la rareza tiene su presentación propia');
   assert.equal(await page.locator('#disc.dx-cinema .dx-cinema-overlay').count(),1);
   await page.waitForTimeout(310);
   await page.screenshot({path:'qa/screenshots/live-experience-'+variant+'-'+width+'.png',fullPage:true});
   await page.evaluate(()=>showCard());
   assert.equal(await page.locator('#disc .dx-cinema-overlay').count(),0,'no repite al volver a mostrar carta');
   await page.locator('#dcCard').click();
   assert.equal(await page.locator('#zoom[open]').count(),1,'ampliar carta desde revelación');
   await page.locator('#zFx').click();
   assert.equal(await page.locator('#zoom[open]').count(),0,'tocar carta ampliada la cierra');
  }
  await page.locator('#dcCard').click();
  await page.locator('#zFx').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#zoom[open]').count(),0,'tecla Enter también devuelve a revelación');
  const after=await page.evaluate(()=>({
   saved:localStorage.getItem('icmx-album2'),have:JSON.stringify(S.have),
   fg:S.fg,extra:S.extra,freeUsed:S.freeUsed
  }));
  assert.deepEqual(after,before,'animación y sobre dorado no afectan progreso real');
  assert.deepEqual(errors,[],'ninguna excepción de navegador');
  await context.close();

  // Simular a un jugador con colección preexistente en un navegador independiente.
  const existing=await browser.newContext({viewport:{width,height:850}});
  const existingPage=await existing.newPage(),oldErrors=[];
  existingPage.on('pageerror',e=>oldErrors.push(e.message));
  const prior={have:{abuket_b:3},rate:{abuket:3},seen:1,ini:'ABC',extra:1,fg:1};
  await existingPage.addInitScript(obj=>{
   if(!localStorage.getItem('icmx-album2'))localStorage.setItem('icmx-album2',JSON.stringify(obj));
  },prior);
  await existingPage.goto(url+'?preview=onboarding',{waitUntil:'domcontentloaded'});
  await existingPage.locator('#onb.on').waitFor();
  for(let n=0;n<3;n++)await existingPage.locator('#onNext').click();
  assert.equal(await existingPage.locator('#home.on').count(),1);
  assert.equal(await existingPage.locator('#pack.on').count(),0);
  const persisted=await existingPage.evaluate(()=>JSON.parse(localStorage.getItem('icmx-album2')));
  assert.deepEqual(persisted.have,prior.have,'no se perdieron cartas antiguas');
  assert.deepEqual(persisted.rate,prior.rate,'no se borraron calificaciones');
  assert.equal(persisted.extra,1,'sobres adicionales intactos');
  assert.deepEqual(oldErrors,[],'partida existente sin errores');
  await existing.close();
  console.log('✓ Público '+width+'px: onboarding→menú, carta reversible, tres rarezas, sobre reservado y progreso intacto');
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
