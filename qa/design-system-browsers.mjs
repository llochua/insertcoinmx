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

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp',
 '.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(ROOT,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(ROOT+sep))throw Error('Outside repository');
  const data=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});
  res.end(data);
 }catch{res.writeHead(404);res.end('not found')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
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
  page.on('console',message=>{if(message.type()==='warning'||message.type()==='error')console.log('BROWSER '+message.type()+': '+message.text())});
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

  // La escena debe estar visible: el QA venía de Perfil (pack oculto).
  await page.locator('#icmxLabToggle').click();
  await page.locator('[data-lab-action="pack"]').click();
  await page.locator('#pack.on').waitFor({state:'visible'});
  // Contrato visual UNIVERSAL: todos los diseños usan el perímetro real del
  // arte, sin IDs privilegiados. Verificamos variantes, colores y degradados.
  for(const [designId,variant] of [["sonic","b"],["sonic","r"],["carton","b"],["karma","e"],["evilexes","b"],["robogodin","b"]]){
   await page.evaluate(([id,v])=>{
    const card=CB[id+'_'+v];
    if(!card)throw Error('No existe carta '+id+'/'+v);
    hand=[{...card,_new:false,_dnew:false,_comp:false,_doneB:true}];
    idx=0;showCard();
   },[designId,variant]);
   await page.waitForTimeout(400);
   console.log('EDGE DEBUG '+designId+'/'+variant,JSON.stringify(await page.evaluate(()=>{
    const D=document.getElementById('disc'),im=D?.querySelector('.dx-art img');
    return {id:D?.dataset.artId,classes:D?.className,background:D?.style.backgroundImage.slice(0,90),
      image:im?.getAttribute('src'),loaded:im?.complete,naturalWidth:im?.naturalWidth,
      scene:D?.getBoundingClientRect().toJSON(),imageRect:im?.getBoundingClientRect().toJSON(),
      hasRenderer:typeof D?._refreshEdgeBackdrop};
   })));
   await page.waitForFunction(([id])=>{
    const D=document.getElementById('disc'),im=D.querySelector('.dx-art img');
    return D.dataset.artId===id&&!!im?.naturalWidth
      &&D.classList.contains('art-edge-extended')
      &&(['solid','extended'].includes(D.dataset.artBackgroundMode))
      &&(D.dataset.artBackgroundMode==='solid'||D.style.backgroundImage.includes('data:image/png'));
   },[designId,variant],{timeout:10000});
   const result=await page.evaluate(async()=>{
    const D=document.getElementById('disc'),img=D.querySelector('.dx-art img');
    const scene=D.getBoundingClientRect(),element=img.getBoundingClientRect();
    const mode=D.dataset.artBackgroundMode;
    const bgUrl=D.style.backgroundImage.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/)?.[0];
    const bg=new Image();
    if(mode==='extended'){if(!bgUrl)throw Error('Fondo extendido ausente');bg.src=bgUrl;await bg.decode();}
    const bc=document.createElement('canvas');
    bc.width=mode==='solid'?Math.round(scene.width):bg.naturalWidth;
    bc.height=mode==='solid'?Math.round(scene.height):bg.naturalHeight;
    const bx=bc.getContext('2d',{willReadFrequently:true});
    if(mode==='solid'){bx.fillStyle=D.style.getPropertyValue('--bg');bx.fillRect(0,0,bc.width,bc.height);}
    else bx.drawImage(bg,0,0);
    let paint={left:element.left,top:element.top,width:element.width,height:element.height};
    if(getComputedStyle(img).objectFit==='contain'){
     const scale=Math.min(element.width/img.naturalWidth,element.height/img.naturalHeight);
     const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
     paint={left:element.left+(element.width-w)/2,top:element.top+(element.height-h)/2,width:w,height:h};
    }
    const clip=(img.closest('.ab')||img.closest('.dx-art')).getBoundingClientRect();
    const l=Math.max(scene.left,clip.left,paint.left),r=Math.min(scene.right,clip.right,paint.left+paint.width);
    const t=Math.max(scene.top,clip.top,paint.top),b=Math.min(scene.bottom,clip.bottom,paint.top+paint.height);
    const midY=(t+b)/2;
    const xLeft=Math.round(Math.max(1,(l-scene.left-3)*bc.width/scene.width));
    const xRight=Math.round(Math.min(bc.width-2,(r-scene.left+3)*bc.width/scene.width));
    const y=Math.round((midY-scene.top)*bc.height/scene.height);
    const color=x=>Array.from(bx.getImageData(x,y,1,1).data).slice(0,3);
    const source=document.createElement('canvas');source.width=img.naturalWidth;source.height=img.naturalHeight;
    const sx=source.getContext('2d',{willReadFrequently:true});sx.drawImage(img,0,0);
    const sy=Math.max(0,Math.min(img.naturalHeight-1,Math.round((midY-paint.top)/paint.height*img.naturalHeight)));
    const leftX=Math.max(0,Math.min(img.naturalWidth-1,Math.round((l-paint.left)/paint.width*img.naturalWidth)));
    const rightX=Math.max(0,Math.min(img.naturalWidth-1,Math.round((r-paint.left)/paint.width*img.naturalWidth)-1));
    const pixel=x=>Array.from(sx.getImageData(x,sy,1,1).data).slice(0,3);
    const delta=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
    return {left:delta(color(xLeft),pixel(leftX)),
      right:delta(color(xRight),pixel(rightX)),
      artColor:getComputedStyle(D.querySelector('.dx-art')).backgroundColor,
      stageWidth:scene.width,sourceWidth:r-l};
   });
   assert(result.sourceWidth>0&&result.sourceWidth<=result.stageWidth+1,'el arte respeta el ancho de escena');
   assert.equal(result.artColor,'rgba(0, 0, 0, 0)','no hay panel rectangular interno');
   assert(result.left<=40&&result.right<=40,
     designId+'/'+variant+': fondo exterior no coincide con las orillas reales: '+JSON.stringify(result));
   await page.screenshot({path:'qa/screenshots/ui-lab-edge-'+designId+'-'+variant+'-'+width+'.png'});
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
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
