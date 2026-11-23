/**
 * UI Lab visual QA in real Chromium mobile browsers.
 * No credentials; no remote Supabase requests; local-only laboratory.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';


const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');

/* Comparación con la versión REAL de main, no con una copia de sus colores. */
const MAIN_HTML=execFileSync('git',['show','origin/main:index.html'],{cwd:ROOT,encoding:'utf8'});
const LAB_HTML=await readFile(resolve(ROOT,'qa/design-system/index.html'),'utf8');
const region=(html,begin,end)=>{
 const a=html.indexOf(begin),b=html.indexOf(end,a+begin.length);
 assert(a>=0&&b>a,'No se encontró región compartida '+begin);
 return html.slice(a,b);
};
for(const [begin,end] of [
 ['const dcol=id=>','const icAwardsSeen='],
 ['.disc.dx{background:var(--bg)}','.dx-top{position:'],
 [' const art=fa?',' D.className='+'\`disc on dx'],
]){
 assert.equal(region(LAB_HTML,begin,end),region(MAIN_HTML,begin,end),
  'El laboratorio debe conservar EXACTAMENTE el motor de arte de main: '+begin);
}
assert(!LAB_HTML.includes('extendArtworkEdges('),'No conservar renderizadores experimentales en Lab');
assert(LAB_HTML.includes(' resolveArtworkBackground(d,D);'),'El LAB debe invocar la función original de main');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp',
 '.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname==='/qa-main-reference.html'){
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
   res.end(MAIN_HTML);return;
  }
  const file=resolve(ROOT,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(ROOT+sep))throw Error('Outside repository');
  const data=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});
  res.end(data);
 }catch{res.writeHead(404);res.end('not found')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(process.env.ICMX_CHROME==='true'?{headless:true,channel:'chrome'}:{headless:true});
await mkdir('qa/screenshots',{recursive:true});
const LAB_URL='http://127.0.0.1:'+server.address().port+'/qa/design-system/';
const sentinel='{"have":{"gatosamurai_f":777},"ini":"LIVE","seen":1}';
try{
 for(const [width,height] of [[390,844],[320,640]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(fake=>{
   // A real game save already existing on this origin must never be touched.
   localStorage.setItem('icmx-album2',fake);
   localStorage.setItem('icmx-guest-handle-v1','real_guest');
   localStorage.setItem('icmx-local-ranking-public-2026-v2','SENTINEL_REAL_RANKING');
   localStorage.setItem('icmx-avatar-guest-v1','pizza');
  },sentinel);
  const page=await context.newPage(),errors=[],unexpectedRemote=[];
  page.on('pageerror',err=>errors.push(err.message));
  await context.route(/https?:\/\/[^/]*supabase\.co\//,route=>{
   unexpectedRemote.push(route.request().url());return route.abort();
  });
  const response=await page.goto(LAB_URL,{waitUntil:'domcontentloaded'});
  const probe=await page.evaluate(()=>{const el=document.getElementById('icmxLabToggle');return {
   href:location.href,base:document.baseURI,title:document.title,
   bodyLength:document.body?.innerHTML.length,buttonCount:document.querySelectorAll('button').length,
   labExists:!!el,display:el?getComputedStyle(el).display:null,visibility:el?getComputedStyle(el).visibility:null,
   rect:el?el.getBoundingClientRect().toJSON():null,bodySample:document.body?.innerHTML.slice(0,260)
  }});
  console.log('LAB LOAD',JSON.stringify({url:LAB_URL,status:response?.status(),probe,errors}));
  await page.screenshot({path:'qa/screenshots/ui-lab-debug-start-'+width+'.png'});
  assert.equal(response?.status(),200,'LAB should return 200');
  await page.locator('#icmxLabToggle').waitFor({state:'visible'});
  await page.locator('#home.on').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.getElementById('homePlayerAvatarImage').getAttribute('src')?.includes('assets/avatars/'));
  assert.equal(await page.locator('#title.on').count(),0,'opens straight at home without a login');
  assert.equal(await page.locator('#test').textContent(),'PRUEBA · SOBRES ILIMITADOS');

  const testIdentity=await page.evaluate(()=>({initials:S.ini,handle:arcadeIdentity().handle,infinite:packReady()}));
  assert.deepEqual(testIdentity,{initials:'LAB',handle:'lab_player',infinite:true});

  await page.locator('#icmxLabToggle').click();
  await page.locator('#icmxLabPanel').waitFor({state:'visible'});
  await page.locator('[data-lab-seed="5"]').click();
  await page.locator('#torneo.on .reta-unlock').waitFor({state:'visible'});
  assert.match(await page.locator('.reta-unlock-copy').innerText(),/Tienes 5 de 8 diseños/);
  assert.equal(await page.locator('[data-reta-unlock-action]').textContent(),'Abrir un sobre');
  assert.equal(await page.evaluate(()=>new Set(Object.keys(S.have).map(k=>designId(k))).size),5);
  await page.screenshot({path:'qa/screenshots/ui-lab-reta-5-'+width+'.png'});

  await page.locator('#icmxLabToggle').click();
  await page.locator('[data-lab-seed="7"]').click();
  await page.locator('#torneo.on .reta-unlock').waitFor({state:'visible'});
  assert.match(await page.locator('.reta-unlock-copy').innerText(),/Te falta 1/);
  assert.equal(await page.evaluate(()=>new Set(Object.keys(S.have).map(k=>designId(k))).size),7);
  await page.screenshot({path:'qa/screenshots/ui-lab-reta-7-'+width+'.png'});

  await page.locator('#icmxLabToggle').click();
  await page.locator('[data-lab-seed="8"]').click();
  await page.locator('#torneo.on #retaLive').waitFor({state:'visible'});
  assert.equal(await page.locator('#torneo .reta-unlock').count(),0);
  assert.equal(await page.evaluate(()=>new Set(Object.keys(S.have).map(k=>designId(k))).size),8);
  await page.screenshot({path:'qa/screenshots/ui-lab-reta-8-'+width+'.png'});

  await page.locator('#icmxLabToggle').click();
  await page.locator('[data-lab-action="home"]').click();
  await page.locator('#home.on').waitFor({state:'visible'});
  await page.locator('#icmxLabToggle').click();
  await page.locator('[data-lab-action="pack"]').click();
  await page.locator('#pack.on').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>packReady()),true);
  await page.locator('#openBtn').click();
  await page.waitForFunction(()=>Object.values(S.have).reduce((a,n)=>a+n,0)>=13);
  assert.equal(await page.evaluate(()=>packReady()),true,'packs remain infinite after opening');
  await page.screenshot({path:'qa/screenshots/ui-lab-pack-'+width+'.png'});

  await page.locator('#icmxLabToggle').click();
  await page.locator('[data-lab-action="profile"]').click();
  await page.locator('#profile.on').waitFor({state:'visible'});
  await page.locator('#profileAvatarButton').click();
  await page.locator('#avatarSelect.on').waitFor({state:'visible'});
  await page.locator('#avatarGrid [data-avatar="control"]').click();
  await page.locator('#avatarSave').click();
  await page.locator('#profile.on').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>localStorage.getItem('icmx-lab-design-avatar-v1')),'control');

  const storage=await page.evaluate(()=>({
   live:localStorage.getItem('icmx-album2'),
   liveHandle:localStorage.getItem('icmx-guest-handle-v1'),
   liveRanking:localStorage.getItem('icmx-local-ranking-public-2026-v2'),
   liveAvatar:localStorage.getItem('icmx-avatar-guest-v1'),
   lab:localStorage.getItem('icmx-ui-lab-progress-v1')
  }));



  // Al volver al sobre, comprueba el renderizador de main en cartas reales.
  await page.locator('#icmxLabToggle').click();
  await page.locator('[data-lab-action="pack"]').click();
  await page.locator('#pack.on').waitFor({state:'visible'});
  for(const id of ['oneplayer','continuara','booit','evilexes','carton','guardianes']){
   await page.evaluate(design=>{
    const card=CB[design+'_b'];
    if(!card)throw Error('Carta faltante '+design);
    hand=[{...card,_new:false,_dnew:false,_comp:false,_doneB:true}];
    idx=0;showCard();
   },id);
   await page.waitForFunction(design=>{
    const D=document.getElementById('disc'),im=D.querySelector('.dx-art img');
    if(D.dataset.artId!==design||!im?.naturalWidth)return false;
    const bg=bgFromArtwork(im),paint=D.style.getPropertyValue('--bg');
    if(!bg||!paint)return false;
    const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
    return Math.max(...rgb(bg).map((v,i)=>Math.abs(v-rgb(paint)[i])))<=3;
   },id,{timeout:10000});
   const state=await page.evaluate(()=>{
    const D=document.getElementById('disc'),im=D.querySelector('.dx-art img');
    return {color:D.style.getPropertyValue('--bg'),
      original:bgFromArtwork(im),visible:getComputedStyle(D).backgroundColor};
   });
   assert(state.original,'Se puede medir el borde original');
   assert.equal(state.visible,'rgb('+[1,3,5].map(i=>parseInt(state.color.slice(i,i+2),16)).join(', ')+')');
   await page.screenshot({path:'qa/screenshots/ui-lab-main-render-'+id+'-'+width+'.png'});
  }
  assert.equal(storage.live,sentinel,'real save is unchanged');
  assert.equal(storage.liveHandle,'real_guest','real handle untouched');
  assert.equal(storage.liveRanking,'SENTINEL_REAL_RANKING','real ranking untouched');
  assert.equal(storage.liveAvatar,'pizza','real avatar untouched');
  assert(storage.lab&&storage.lab.includes('"test":1'),'lab has its own persisted progress');
  assert.deepEqual(unexpectedRemote,[],'no Supabase traffic');
  assert.deepEqual(errors,[],'no browser runtime errors');
  console.log('✓ LAB '+width+'px: 5/7/8 designs, unlimited pack, avatar, isolated storage, no Supabase');
  await context.close();
 }


 // Comparación en navegador REAL de main vs LAB, misma pantalla y mismos
 // archivos: cada prueba guarda captura de ambas implementaciones.
 const desktop=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'no-preference'});
 const lab=await desktop.newPage();
 const main=await desktop.newPage();
 const desktopErrors=[];
 lab.on('pageerror',error=>desktopErrors.push('LAB '+error.message));
 await Promise.all([
  lab.goto(LAB_URL,{waitUntil:'domcontentloaded'}),
  main.goto('http://127.0.0.1:'+server.address().port+'/qa-main-reference.html',{waitUntil:'domcontentloaded'})
 ]);
 await lab.locator('#icmxLabToggle').click();
 await lab.locator('[data-lab-action="pack"]').click();
 await lab.locator('#pack.on').waitFor({state:'visible'});
 const cases=[
  ['oneplayer','b'],['continuara','b'],['booit','b'],['hipstermario','b'],
  ['carton','b'],['carton','e'],['guardianes','b'],['versus','r'],
  ['sonic','b'],['evilexes','b'],['karma','e']
 ];
 async function render(page,design,variant){
  await page.evaluate(([id,v])=>{
   const card=CB[id+'_'+v];
   if(!card)throw Error('No existe '+id+'/'+v);
   document.querySelectorAll('.crt > .screen.on').forEach(el=>el.classList.remove('on'));
   document.getElementById('pack').classList.add('on');
   hand=[{...card,_new:false,_dnew:false,_comp:false,_doneB:true}];
   idx=0;showCard();
  },[design,variant]);
  await page.waitForFunction(id=>{
   const D=document.getElementById('disc'),im=D?.querySelector('.dx-art img');
   if(!D||D.dataset.artId!==id||!im?.naturalWidth)return false;
   const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
   const expected=bgFromArtwork(im),actual=D.style.getPropertyValue('--bg');
   return expected&&actual&&Math.max(...rgb(expected).map((v,i)=>Math.abs(v-rgb(actual)[i])))<=3;
  },design,{timeout:10000});
  await page.waitForTimeout(750);
  return await page.evaluate(()=>{
   const D=document.getElementById('disc'),im=D.querySelector('.dx-art img'),art=D.querySelector('.dx-art');
   return {measured:bgFromArtwork(im),actual:D.style.getPropertyValue('--bg'),
    background:getComputedStyle(D).backgroundColor,artOpacity:getComputedStyle(art).opacity,
    imageSize:[im.naturalWidth,im.naturalHeight],
    viewport:[D.getBoundingClientRect().width,D.getBoundingClientRect().height]};
  });
 }
 for(const [id,v] of cases){
  const fromMain=await render(main,id,v);
  const fromLab=await render(lab,id,v);
  assert.equal(fromLab.background,fromMain.background,
    id+'/'+v+': color visible de LAB distinto de main');
  assert.equal(fromLab.measured,fromMain.measured,
    id+'/'+v+': fondo fuente distinto de main');
  assert.equal(fromLab.artOpacity,'1',id+'/'+v+': ilustración no visible en LAB');
  const mainCapture=await main.screenshot({path:'qa/screenshots/ui-lab-compare-main-'+id+'-'+v+'.png'});
  const labCapture=await lab.screenshot({path:'qa/screenshots/ui-lab-compare-lab-'+id+'-'+v+'.png'});
  // Comparación del RESULTADO VISIBLE, no sólo de los estilos.
  // Muestrea el exterior izquierdo/derecho del arte donde aparecían recuadros.
  async function capturePixels(page,png){
   return page.evaluate(async base64=>{
    const D=document.getElementById('disc'),bounds=D.getBoundingClientRect();
    const im=new Image();im.src='data:image/png;base64,'+base64;await im.decode();
    const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;
    const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
    const get=(x,y)=>Array.from(ctx.getImageData(Math.round(bounds.x+bounds.width*x),
     Math.round(bounds.y+bounds.height*y),1,1).data).slice(0,3);
    return [get(.08,.16),get(.92,.16),get(.08,.25),get(.92,.25)];
   },png.toString('base64'));
  }
  const mainPixels=await capturePixels(main,mainCapture);
  const labPixels=await capturePixels(lab,labCapture);
  const delta=(a,b)=>Math.max(...a.map((n,i)=>Math.abs(n-b[i])));
  for(let i=0;i<mainPixels.length;i++)
   assert(delta(mainPixels[i],labPixels[i])<=12,
    id+'/'+v+': píxeles visibles de Lab distintos de main: '+JSON.stringify({i,main:mainPixels[i],lab:labPixels[i]}));
  // Los fondos planos deben coincidir con el original incluso FUERA del dibujo.
  if(v==='b'&&['oneplayer','continuara','booit','hipstermario','carton','guardianes'].includes(id)){
   const rgb=[1,3,5].map(i=>parseInt(fromMain.measured.slice(i,i+2),16));
   for(let i=0;i<labPixels.length;i++)
    assert(delta(rgb,labPixels[i])<=14,
     id+'/'+v+': rectángulo visible (fondo de imagen y escenario no continúan)');
  }
  console.log('✓ MAIN = LAB (CSS + píxeles) '+id+'/'+v,JSON.stringify({background:fromMain.background,pixels:labPixels}));
 }
 // Verificación de COBERTURA: no se aprueba el motor si quedan diseños fuera.
 const entireCatalog=await lab.evaluate(()=>{
  const supported=new Set([...Object.keys(RBG),...Object.keys(ICOL),...AUTO_BG_IDS]);
  return {count:DESIGNS.length,missing:DESIGNS.map(d=>d.id).filter(id=>!supported.has(id))};
 });
 assert.deepEqual(entireCatalog.missing,[],'Todo diseño de main debe tener un fondo respaldado');
 console.log('✓ Cobertura heredada de main: '+entireCatalog.count+' diseños');
 assert.deepEqual(desktopErrors,[],'sin errores de navegador LAB');
 await desktop.close();
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
