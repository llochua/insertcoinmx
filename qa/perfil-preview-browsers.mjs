/**
 * Vista previa de Mi perfil publicada solo en /qa/perfil/, sin cambios remotos.
 * Nunca inicia sesión, emite sobres remotos ni toca la colección de producción.
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
  assert.equal(await page.locator('.on-save').isVisible(),true,'bienvenida muestra visual de respaldo');
  assert.equal(await page.locator('#onNext').textContent(),'SEGUIR COMO INVITADO');
  assert.match(await page.locator('#onP').textContent(),/navegador/);
  // Evitar medir el hover residual tras pulsar Siguiente en escritorio.
  await page.mouse.move(0,0);
  const hierarchy=await page.evaluate(()=>{
   const primary=document.getElementById('onAccount');
   const secondary=document.getElementById('onNext');
   const back=document.getElementById('onBack');
   return {
    primaryBackground:getComputedStyle(primary).backgroundColor,
    secondaryBackground:getComputedStyle(secondary).backgroundColor,
    backWidth:back.getBoundingClientRect().width,
    primaryWidth:primary.getBoundingClientRect().width,
    secondaryWidth:secondary.getBoundingClientRect().width
   };
  });
  assert.equal(hierarchy.primaryBackground,'rgb(255, 212, 0)','crear cuenta es la única acción amarilla');
  assert.equal(hierarchy.secondaryBackground,'rgba(0, 0, 0, 0)','seguir como invitado es enlace secundario sin fondo');
  assert.ok(hierarchy.backWidth<140,'atrás es discreto, no una columna');
  assert.ok(hierarchy.primaryWidth>hierarchy.backWidth*2);
  assert.ok(hierarchy.secondaryWidth>hierarchy.backWidth*2);
  await page.locator('#onAccount').click();
  assert.equal(await page.locator('#profile').evaluate(e=>e.classList.contains('on')),true);
  assert.equal(await page.locator('#profileAccountPanel').isVisible(),true,'formulario se revela al pedir cuenta');
  assert.equal(await page.locator('#profileWelcome').isVisible(),false,'sin duplicación de crear cuenta y formulario');
  assert.equal(await page.locator('#profile .profile-passport').isVisible(),false,'acceso a cuenta es una vista enfocada');
  assert.equal(await page.locator('#profile .profile-scroll').evaluate(e=>getComputedStyle(e).scrollbarWidth),'none','no hay barra lateral');
  assert.equal(await page.locator('#profileBackup').evaluate(e=>e.open),false,'respaldo manual plegado');
  assert.equal(await page.locator('#profileAuthSend').isDisabled(),true,
    'preview cannot create accounts by mistake');
  const lab=page.locator('#profile .profile-account a[href="/qa/registro/"]');
  assert.equal(await lab.isVisible(),true);
  await mkdir('qa/screenshots',{recursive:true});
  await page.screenshot({path:'qa/screenshots/perfil-cuenta-'+width+'.png',fullPage:true});
  // La flecha única regresa a Mi perfil desde registro; un segundo toque va a Inicio.
  await page.locator('#profile .top .vback').click();
  assert.equal(await page.locator('#profile .profile-passport').isVisible(),true,
    'volver desde registro muestra pasaporte y resumen');
  assert.equal(await page.locator('#profileAccountPanel').isVisible(),false,
    'registro no queda abierto');
  await page.locator('#profile .top .vback').click();
  assert.equal(await page.locator('#home .home-player-card').isVisible(),true);
  await page.locator('#home .home-player-card').click();
  assert.equal(await page.locator('#profile .profile-passport').isVisible(),true,
    'volver a Mi perfil desde Inicio muestra resumen');
  await page.locator('#profileQuickLogin').click();
  assert.equal(await page.locator('#profileAccountPanel').isVisible(),true,
    'login se abre al elegirlo');
  await page.locator('#profile .top .vback').click();
  assert.equal(await page.locator('#profile .profile-passport').isVisible(),true,
    'volver desde login muestra el resumen en la misma vista');
  await page.locator('#profile .top .vback').click();
  await page.locator('#home .home-player-card').click();
  assert.equal(await page.locator('#profile .profile-passport').isVisible(),true,
    'login anterior no reemplaza al perfil');
  assert.equal(await page.locator('#profileAccountPanel').isVisible(),false,
    'login queda cerrado al reentrar a Mi perfil');
  await page.locator('#profileQuickLogin').click();
  assert.equal(await page.locator('#profileAccountBack').count(),0,'no hay un segundo Volver al perfil');
  assert.equal(await page.locator('#profile .vback').count(),1,'una sola flecha atrás en Mi perfil');
  assert.equal(await page.locator('#profile .top .vback').getAttribute('aria-label'),'Volver a Mi perfil');
  await page.locator('#profile .top .vback').click();
  assert.equal(await page.locator('#profile .profile-passport').isVisible(),true,'flecha devuelve al resumen');
  assert.equal(await page.locator('#profile .top .vback').getAttribute('aria-label'),'Volver al inicio');
  assert.equal(await page.locator('#profileWelcome').isVisible(),true,'volver restaura el resumen');
  assert.equal(await page.locator('#profileAccountPanel').isVisible(),false);
  await page.locator('#profile [data-home]').click();
  assert.equal(await page.locator('#home .home-player-card').isVisible(),true,'tarjeta de Mi perfil visible en Inicio');
  const homeCRT=await page.locator('.crt').boundingBox();
  await page.locator('#home .home-player-card').click();
  assert.equal(await page.locator('#profile').evaluate(e=>e.classList.contains('on')),true);
  const profileCRT=await page.locator('.crt').boundingBox();
  assert.equal(Math.round(profileCRT.width),Math.round(homeCRT.width),'Mi perfil comparte ancho CRT de Inicio');
  assert.equal(Math.round(profileCRT.height),Math.round(homeCRT.height),'Mi perfil comparte alto CRT de Inicio');
  await page.locator('#profileBackup summary').click();
  assert.equal(await page.locator('#profileExport').isVisible(),true,'respaldo visible a solicitud');
  // Selector de personajes: usa los 24 WebP reales ya integrados.
  const profileContentWidth=await page.locator('#profile .profile-scroll').evaluate(el=>el.getBoundingClientRect().width);
  await page.locator('#profileAvatarChange').click();
  assert.equal(await page.locator('#avatarSelect.on').isVisible(),true,'pantalla de avatar accesible desde el perfil');
  const avatarContentWidth=await page.locator('#avatarSelect .avatar-scroller').evaluate(el=>el.getBoundingClientRect().width);
  assert.equal(Math.round(avatarContentWidth),Math.round(profileContentWidth),'selector usa mismo ancho del perfil');
  assert.equal(await page.locator('#avatarGrid .avatar-option').count(),12,'doce personajes aprobados');
  const avatars=await page.locator('#avatarGrid .avatar-option img').evaluateAll(imgs=>imgs.map(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth===128&&img.naturalHeight===128})));
  assert.equal(new Set(avatars.map(x=>x.src)).size,12,'todas las miniaturas son diferentes');
  assert.ok(avatars.every(x=>x.src.includes('assets/avatars/')&&x.src.endsWith('-128.webp')),'usa WebP de 128px');
  for(const img of page.locator('#avatarGrid .avatar-option img').all?await page.locator('#avatarGrid .avatar-option img').all():[]){
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(el=>el.decode());
    assert.equal(await img.evaluate(el=>el.naturalWidth),128,'miniatura WebP cargada sin error');
  }
  await mkdir('qa/screenshots',{recursive:true});
  await page.locator('#avatarSelect .avatar-scroller').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:'qa/screenshots/avatar-selector-'+width+'.png',fullPage:true});
  const first=await page.locator('#avatarGrid .avatar-option[aria-pressed="true"]').getAttribute('data-avatar');
  assert.equal(first,'moneda','primer avatar predeterminado');
  await page.locator('[data-avatar="pizza"]').click();
  assert.equal(await page.locator('#avatarPreviewName').textContent(),'Pizza');
  assert.equal(await page.locator('#avatarSave').isEnabled(),true);
  await page.locator('#avatarBack').click();
  await page.locator('#profileAvatarButton').click();
  assert.equal(await page.locator('#avatarPreviewName').textContent(),'Moneda','volver sin guardar descarta la selección');
  await page.locator('[data-avatar="cartucho"]').click();
  await page.locator('#avatarSave').click();
  assert.equal(await page.locator('#profileAvatarImage').getAttribute('src'),'assets/avatars/cartucho-128.webp');
  await page.screenshot({path:'qa/screenshots/mi-perfil-'+width+'.png',fullPage:true});
  await page.locator('#profile [data-home]').click();
  assert.equal(await page.locator('#homePlayerAvatarImage').getAttribute('src'),'assets/avatars/cartucho-128.webp');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('icmx-preview-avatar-20261120')),'cartucho');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#homePlayerAvatarImage').getAttribute('src'),'assets/avatars/cartucho-128.webp','avatar persiste en sesión');
  await page.locator('#onSkip').click();
  await page.locator('#home .home-player-card').click();
  await page.locator('#profileAvatarChange').click();
  assert.equal(await page.locator('#avatarPreviewName').textContent(),'Cartucho');
  await page.locator('#avatarBack').click();
  // El selector no debe permitir mutar cartas, iniciar sesión o emitir llamadas externas.
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
