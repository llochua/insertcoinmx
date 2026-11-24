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
/* Conservar arte, colocación y CSS originales; el fondo en LAB ahora
   se mide del archivo y NO se compara con la paleta manual de main. */
for(const [begin,end] of [
 ['.disc.dx{background:var(--bg)}','.dx-top{position:'],
 [' const art=fa?',' D.className='+String.fromCharCode(96)+'disc on dx'],
]){
 assert.equal(region(LAB_HTML,begin,end),region(MAIN_HTML,begin,end),
  'La colocación del arte de LAB debe seguir main: '+begin);
}
assert(LAB_HTML.includes('const sampled=bgFromArtwork(im);'),'Falta muestreo universal');
assert(LAB_HTML.includes('ART_BG_GENERATED[d.id]'),'Falta respaldo automático para imágenes externas');
assert(LAB_HTML.includes('D.style.backgroundColor=color'),'El fondo no ocupa toda la escena');
assert(!LAB_HTML.includes('extendArtworkEdges('),'Eliminar extensiones experimentales');
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


 // Auditar el renderizador sobre TODAS las cartas con arte disponible.
 // Nada de aprobar el motor por una selección pequeña de cartas.
 const desktop=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'no-preference'});
 const screen=await desktop.newPage(),desktopErrors=[];
 screen.on('pageerror',error=>desktopErrors.push(error.message));
 await screen.goto(LAB_URL,{waitUntil:'domcontentloaded'});
 await screen.locator('#icmxLabToggle').click();
 await screen.locator('[data-lab-action="pack"]').click();
 await screen.locator('#pack.on').waitFor({state:'visible'});
 const ids=await screen.evaluate(()=>DESIGNS.map(d=>d.id));
 const tested=[],missing=[],variants={b:0,e:0,r:0};
 const samples=new Set(['jokers/b','friendzone/e','oneplayer/b','continuara/b','booit/b',
  'hipstermario/b','guardianes/b','evilexes/b','sonic/b','carton/e','karma/r']);
 for(const id of ids)for(const v of ['b','e','r']){
  const state=await screen.evaluate(async ([design,variant])=>{
   const card=CB[design+'_'+variant];
   if(!card)return {skip:'no-card'};
   hand=[{...card,_new:false,_dnew:false,_comp:false,_doneB:true}];
   idx=0;showCard();
   const D=document.getElementById('disc'),im=D.querySelector('.dx-art img');
   if(!im)return {skip:'no-illustration'};
   if(!im.complete)await new Promise(resolve=>{
    im.addEventListener('load',resolve,{once:true});
    im.addEventListener('error',resolve,{once:true});
    setTimeout(resolve,6500);
   });
   if(!im.naturalWidth)return {skip:'missing-file'};
   // El listener del motor se registró ANTES de esta espera.
   await Promise.resolve();
   const sampled=bgFromArtwork(im);
   const expected=sampled||ART_BG_GENERATED[design];
   const actual=D.style.getPropertyValue('--bg');
   const bg=getComputedStyle(D).backgroundColor;
   const artColor=getComputedStyle(D.querySelector('.dx-art')).backgroundColor;
   const rgb=hex=>hex&&hex.length===7?[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)):null;
   const difference=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));
   const fromCss=bg.match(/[\d.]+/g)?.slice(0,3).map(Number);
   const scene=D.getBoundingClientRect();
   return {id:design,variant,status:D.dataset.artBgStatus,expected,actual,bg,artColor,
    computedDiff:expected&&fromCss?difference(rgb(expected),fromCss):null,
    sceneWidth:scene.width,sceneHeight:scene.height,
    artVisible:Number(getComputedStyle(D.querySelector('.dx-art')).opacity)};
  },[id,v]);
  if(state.skip){if(state.skip==='missing-file')missing.push(id+'/'+v);continue}
  const key=id+'/'+v;
  assert(state.expected&&state.actual===state.expected,
   key+': el fondo no coincide con los píxeles originales '+JSON.stringify(state));
  assert(['sampled','generated-fallback'].includes(state.status),key+': muestreo o respaldo no aplicado');
  assert(state.computedDiff<=2,key+': CSS del fondo no coincide con la imagen');
  assert(state.sceneWidth>500&&state.sceneHeight>500,key+': visor oculto');
  // Holo/Dorada conservan .dx-flat-art transparente!important: ahí el fondo
  // uniforme lo proporciona el escenario, no una caja rectangular opaca.
  assert(state.artColor===state.bg||state.artColor==='rgba(0, 0, 0, 0)',
   key+': capa de arte introduce un color distinto al del escenario');
  tested.push(key);variants[v]++;
  if(samples.has(key)){
   await screen.waitForTimeout(800);
   const shot=await screen.screenshot({type:'png',
     path:'qa/screenshots/ui-lab-universal-'+id+'-'+v+'.png'});
   if(key==='jokers/b'||key==='friendzone/e'){
    const b64=shot.toString('base64');
    console.log('ART_SHOT_BEGIN '+key+' '+b64.length);
    for(let pos=0;pos<b64.length;pos+=9000)
     console.log('ART_SHOT '+key+' '+pos+' '+b64.slice(pos,pos+9000));
    console.log('ART_SHOT_END '+key);
   }
  }
 }

 // Diagnóstico visual de los tres reportes más recientes: leer píxeles
 // REALMENTE pintados, no sólo getComputedStyle().
 for(const [id,v] of [['queenpower','b'],['friezainfinito','b'],['caritele','b']]){
  await screen.evaluate(([design,variant])=>{
   const card=CB[design+'_'+variant];
   hand=[{...card,_new:false,_dnew:false,_comp:false,_doneB:true}];
   idx=0;showCard();
  },[id,v]);
  await screen.waitForFunction(design=>document.getElementById('disc')?.dataset.artBgStatus==='sampled'&&
    document.getElementById('disc')?.dataset.artId===design,id);
  await screen.waitForTimeout(750);
  const report=await screen.evaluate(()=>{
   const D=document.getElementById('disc'),im=D.querySelector('.dx-art img'),art=D.querySelector('.dx-art');
   return {id:D.dataset.artId,hex:bgFromArtwork(im),inline:D.style.getPropertyValue('--bg'),
    computed:getComputedStyle(D).background,art:getComputedStyle(art).background,
    drect:D.getBoundingClientRect().toJSON(),arect:art.getBoundingClientRect().toJSON(),
    imageRect:im.getBoundingClientRect().toJSON(),classes:D.className};
  });
  console.log('VISUAL_DIAG '+id+' '+JSON.stringify(report));
  const shot=await screen.screenshot({path:'qa/screenshots/ui-lab-visual-diag-'+id+'.png'});
  const base64=shot.toString('base64');
  console.log('VISUAL_BEGIN '+id+' '+base64.length);
  for(let i=0;i<base64.length;i+=9000)console.log('VISUAL_PART '+id+' '+i+' '+base64.slice(i,i+9000));
  console.log('VISUAL_END '+id);
 }

 assert(tested.length>=100,'Se deben probar al menos 100 cartas reales del catálogo');
 assert(variants.b>=85,'Cobertura insuficiente de diseños Base');
 assert(variants.e>0&&variants.r>0,'Faltan pruebas Holo o Dorada');
 assert.deepEqual(missing,[],'Hay ilustraciones faltantes en cartas que declaran arte');
 assert.deepEqual(desktopErrors,[],'Errores en navegador de Lab');
 console.log('✓ FONDO UNIVERSAL REAL: '+tested.length+' variantes / '+ids.length+
  ' diseños de catálogo, Base '+variants.b+', Holo '+variants.e+', Dorada '+variants.r);
 await desktop.close();
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
