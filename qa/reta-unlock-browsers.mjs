/**
 * Reta: pruebas reales en Chromium móvil con colecciones ficticias.
 * No utiliza cuentas ni APIs de producción; solo una instancia local de index.html.
 */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp',
 '.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if(file!==ROOT&&!file.startsWith(ROOT+sep)){res.writeHead(403);res.end();return}
  const body=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404);res.end('not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true});
await mkdir('qa/screenshots',{recursive:true});

const seconds=text=>{
 const [h,m,s]=text.split(':').map(Number);
 return h*3600+m*60+s;
};
async function setup(page,count,hasPacks){
 return page.evaluate(({count,hasPacks})=>{
  // Cada diseño cuenta una vez aunque el jugador tenga variantes o repetidas.
  const designs=new Map();
  for(const c of CARDS)if(c.img&&!c.bx&&!designs.has(c.d))designs.set(c.d,c);
  const selected=[...designs.values()].slice(0,count);
  if(selected.length!==count)throw Error('Faltan cartas de prueba');
  S.have={};
  for(const c of selected)S.have[c.k]=1;
  // La segunda versión del primer diseño nunca debe sumar otro diseño.
  const sibling=CARDS.find(c=>c.d===selected[0].d&&c.k!==selected[0].k&&c.img);
  if(sibling)S.have[sibling.k]=2;
  S.welcomeLeft=hasPacks?1:0;
  S.freeCycle=packCycle();
  S.freeUsed=hasPacks?0:2;
  S.extra=0;S.test=false;
  if(!save())throw Error('No se guardó el progreso de prueba');
  go('torneo');
  return {distinct:retaPool().length,storedCards:Object.keys(S.have).length,packs:packReady()};
 },{count,hasPacks});
}
async function inspectMobile(page,width){
 const m=await page.evaluate(()=>{
  const panel=document.querySelector('#torneo .reta-unlock');
  const button=panel?.querySelector('[data-reta-unlock-action]');
  const wait=panel?.querySelector('.reta-unlock-wait:not([hidden])');
  const r=panel?.getBoundingClientRect(),b=button?.getBoundingClientRect();
  const w=wait?.getBoundingClientRect();
  return {innerWidth,innerHeight,documentWidth:document.documentElement.scrollWidth,
   panel:{top:r?.top,bottom:r?.bottom,left:r?.left,right:r?.right},
   button:{top:b?.top,bottom:b?.bottom,left:b?.left,right:b?.right},
   wait:wait?{bottom:w.bottom,left:w.left,right:w.right}:null};
 });
 assert.equal(m.innerWidth,width,'ancho móvil correcto');
 assert.ok(m.documentWidth<=width+2,'sin scroll horizontal en '+width+'px: '+JSON.stringify(m));
 assert.ok(m.panel.left>=-1&&m.panel.right<=width+1,'panel dentro de viewport');
 assert.ok(m.button.left>=-1&&m.button.right<=width+1,'CTA dentro de viewport');
 assert.ok(m.button.bottom<=m.innerHeight+1,'CTA visible sin desplazarse');
 if(m.wait)assert.ok(m.wait.bottom<=m.innerHeight+1,'contador visible en el móvil');
}

try{
 for(const {width,height} of [{width:390,height:844},{width:320,height:640}]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  // Entrar como invitado en esta instalación local, sin tocar datos de usuarios.
  await page.locator('#title').click({position:{x:120,y:240}});
  await page.locator('#icmxGuestChoose').click();
  await page.locator('#icmxGuestIni').fill('TST');
  await page.locator('#icmxGuestHandle').fill('qa_reta');
  await page.locator('#icmxGuestPlay').click();
  await page.locator('#icmxGuestGate').waitFor({state:'hidden'});
  assert.equal(await page.locator('#home.on').count(),1);

  const ready=await setup(page,5,true);
  assert.equal(ready.distinct,5,'cinco diseños distintos reales');
  assert.equal(ready.packs,true);
  await page.locator('#torneo.on .reta-unlock').waitFor();
  assert.equal(await page.locator('.reta-unlock-copy').textContent(),
   'Tienes 5 de 8 diseños. Te faltan 3 para jugar tu primera Reta');
  assert.equal(await page.locator('.reta-unlock-progress').getAttribute('aria-valuenow'),'5');
  assert.equal(await page.locator('[data-reta-unlock-action]').textContent(),'Abrir un sobre');
  assert.equal(await page.locator('[data-reta-unlock-action]').getAttribute('data-go'),'pack');
  assert.equal(await page.locator('.reta-unlock-wait:visible').count(),0);
  await inspectMobile(page,width);
  await page.screenshot({path:'qa/screenshots/reta-unlock-5-listos-'+width+'.png',fullPage:true});
  await page.locator('[data-reta-unlock-action]').click();
  assert.equal(await page.locator('#pack.on').count(),1,'CTA llega a la apertura real');

  const waiting=await setup(page,7,false);
  assert.equal(waiting.distinct,7,'siete diseños distintos reales');
  assert.equal(waiting.packs,false);
  await page.locator('#torneo.on .reta-unlock').waitFor();
  assert.equal(await page.locator('.reta-unlock-copy').textContent(),
   'Tienes 7 de 8 diseños. Te falta 1 para jugar tu primera Reta');
  assert.equal(await page.locator('.reta-unlock-progress').getAttribute('aria-valuenow'),'7');
  assert.equal(await page.locator('[data-reta-unlock-action]').textContent(),'Ver mi álbum');
  assert.equal(await page.locator('[data-reta-unlock-action]').getAttribute('data-go'),'album');
  assert.equal(await page.locator('.reta-unlock-wait:visible').count(),1);
  assert.match(await page.locator('.reta-unlock-wait').innerText(),/PRÓXIMOS 2 SOBRES EN/);
  let display=await page.locator('.reta-unlock-wait time').textContent();
  assert.match(display,/^\d{2}:\d{2}:\d{2}$/);
  let actual=await page.evaluate(()=>nextPackCountdown());
  assert.ok(Math.abs(seconds(display)-seconds(actual))<=1,'usa el reloj del juego, no uno nuevo');
  await page.waitForFunction(before=>{
   const time=document.querySelector('.reta-unlock-wait time');
   return time&&time.textContent!==before;
  },display,{timeout:8000,polling:200});
  const advanced=await page.locator('.reta-unlock-wait time').textContent();
  assert.ok(seconds(advanced)<seconds(display),'el reloj disminuye en tiempo real: '+display+' → '+advanced);
  await inspectMobile(page,width);
  await page.screenshot({path:'qa/screenshots/reta-unlock-7-agotados-'+width+'.png',fullPage:true});
  await page.locator('[data-reta-unlock-action]').click();
  assert.equal(await page.locator('#album.on').count(),1,'CTA agotado llega al álbum real');

  const unlocked=await setup(page,8,false);
  assert.equal(unlocked.distinct,8,'octavo diseño real desbloquea Reta');
  await page.locator('#torneo.on #retaLive').waitFor({state:'visible'});
  assert.equal(await page.locator('#torneo .reta-unlock').count(),0,'desaparece el bloqueo');
  const state=await page.evaluate(()=>({roster:S.reta2?.roster?.length,unique:new Set(S.reta2?.roster||[]).size,round:S.reta2?.round}));
  assert.deepEqual(state,{roster:8,unique:8,round:0},'se generan 8 contrincantes sin repetidos');
  const first=page.frameLocator('#retaLive').locator('#top');
  await first.waitFor({state:'visible'});
  await page.screenshot({path:'qa/screenshots/reta-unlock-8-jugando-'+width+'.png',fullPage:true});
  await first.click();
  await page.waitForFunction(()=>S.reta2?.round===1,{timeout:9000});
  assert.equal(await page.evaluate(()=>S.reta2.round),1,'el jugador puede elegir y avanzar una ronda');
  // Completa los siete duelos sin pausas nuevas, alternando hacia el retador.
  const frame=page.frameLocator('#retaLive');
  for(let r=1;r<7;r++){
   await page.waitForFunction(()=>!document.getElementById('retaLive').contentDocument.getElementById('app').classList.contains('impact'));
   await frame.locator('.fighter:not(.is-champion)').click();
   await page.waitForFunction(n=>S.reta2?.round===n,r+1);
  }
  await frame.locator('#showTopInsert').waitFor({state:'visible'});
  await frame.locator('#showTopInsert').click();
  await frame.locator('#topInsert').waitFor({state:'visible'});
  const expected=await page.evaluate(()=>({champ:S.reta2.champion,choices:S.reta2.matches.map(m=>m.winner)}));
  const actualTop=await page.locator('#retaLive').evaluate(f=>{
   const d=f.contentDocument,list=d.getElementById('topInsertList'),top=d.getElementById('topInsert');
   return {ids:[...list.querySelectorAll('.top-insert-shirt svg')].map(e=>e.dataset.shirtId),counts:[...list.querySelectorAll('.top-insert-count')].map(e=>Number(e.textContent.match(/\d+/)[0])),
    champ:list.querySelector('.champion svg')?.dataset.shirtId,visible:!top.hidden&&d.elementFromPoint(12,12)?.closest('#topInsert')!==null,
    listFits:list.scrollHeight<=list.clientHeight+1,footerFits:top.querySelector('footer').getBoundingClientRect().bottom<=f.contentWindow.innerHeight+1};
  });
  assert.equal(actualTop.champ,expected.champ);
  assert.equal(actualTop.ids.length,new Set(expected.choices).size);
  assert.equal(actualTop.counts.reduce((a,b)=>a+b,0),7);
  assert.ok(actualTop.visible&&actualTop.listFits&&actualTop.footerFits,'Top visible sin scroll: '+JSON.stringify(actualTop));
  await frame.locator('.top-insert-next').waitFor();
  assert.equal(await frame.locator('.top-insert-next').textContent(),'VER MI ÁLBUM');
  assert.match(await frame.locator('#topInsertClock').textContent(),/^\d{2}:\d{2}:\d{2}$/);
  await page.screenshot({path:'qa/screenshots/reta-top-insert-'+width+'.png'});
  // Canje: 14 repetidas todavía no alcanzan; 15 sí, incluyendo otras variantes.
  const below=await page.evaluate(()=>{
   const k=Object.keys(S.have)[0];S.have[k]=1;
   S.have[k]=1+14-dups();save();return dups();
  });
  assert.equal(below,14);
  assert.equal(await frame.locator('.top-insert-next[data-action="trade"]').count(),0);
  assert.equal(await frame.locator('.top-insert-next').textContent(),'VER MI ÁLBUM');
  const eligible=await page.evaluate(()=>{const k=Object.keys(S.have)[0];S.have[k]++;save();return dups()});
  assert.equal(eligible,15);
  await frame.locator('.top-insert-next[data-action="trade"]').waitFor();
  assert.equal(await frame.locator('.top-insert-next').textContent(),'CANJEAR UN SOBRE EXTRA');
  assert.equal(await frame.locator('#topInsertWait').isVisible(),false);
  await page.evaluate(()=>{S.extra=1;save()});
  await frame.locator('.top-insert-next[data-action="pack"]').waitFor();
  assert.equal(await frame.locator('.top-insert-next').textContent(),'ABRIR SOBRE');
  await frame.locator('#topInsertBack').click();
  await frame.locator('#showTopInsert').waitFor({state:'visible'});
  await frame.locator('#showTopInsert').click();
  await frame.locator('.top-insert-next').click();
  await page.locator('#pack.on').waitFor();
  assert.deepEqual(errors,[],'sin excepciones de navegador');
  console.log('✓ Reta móvil '+width+'px: 5 con sobres → abrir; 7 agotados → contador/álbum; 8 → juega 1ª ronda');
  await context.close();
 }
}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
