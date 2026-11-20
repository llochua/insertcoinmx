/**
 * Mi perfil en Chromium, sin cuentas reales y sin modificar colecciones remotas.
 * Se ejecuta en la PR para asegurar el recorrido visible de invitado.
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
  const path=resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if(path!==ROOT&&!path.startsWith(ROOT+sep)){res.writeHead(403);res.end();return;}
  const file=await readFile(path);
  res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream'});
  res.end(file);
 }catch(_){res.writeHead(404);res.end('Not found');}
});
const listen=()=>new Promise(ok=>server.listen(0,'127.0.0.1',ok));
await listen();
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // La prueba visual no depende de la red ni intenta Auth real.
 await page.route('**/cdn.jsdelivr.net/**',r=>r.abort());
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('#title').click();
 await page.locator('#onNext').click();
 await page.locator('#onNext').click();
 await page.locator('#onAccount').waitFor({state:'visible'});
 assert.equal(await page.locator('#onNext').textContent(),'SEGUIR COMO INVITADO');
 assert.equal(await page.locator('.on-save').isVisible(),true,'nueva ilustración visual de respaldo');
 assert.match(await page.locator('#onP').textContent(),/invitado|navegador/i);
 await page.locator('#onAccount').click();
 assert.equal(await page.locator('#profile').evaluate(e=>e.classList.contains('on')),true,
  'crear cuenta desde bienvenida debe abrir Mi perfil');
 await page.locator('#profileAuthTabSignup').click();
 assert.equal(await page.locator('#profileAccountPanel').isVisible(),true,'registro revelado al elegir crear cuenta');
 assert.equal(await page.locator('#profileAuthForm').isVisible(),true);
 assert.equal(await page.locator('#profileBackup').evaluate(e=>e.open),false,'respaldo manual oculto hasta que el jugador lo solicite');
 assert.equal(await page.locator('#profileAuthEmail').isVisible(),true);
 assert.equal(await page.locator('#profileAuthPassword').isVisible(),true);
 const cardsBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('icmx-album2')||'{}').have||{});
 await page.locator('#profile [data-home]').click();
 assert.equal(await page.locator('#home .home-player-card').isVisible(),true,'tarjeta visible en menú principal');
 await page.locator('#home .home-player-card').click();
 assert.equal(await page.locator('#profile').evaluate(e=>e.classList.contains('on')),true,
  'icono en Inicio debe abrir Mi perfil');
 const cardsAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('icmx-album2')||'{}').have||{});
 assert.deepEqual(cardsAfter,cardsBefore,'navegar y sugerir registro no debe tocar cartas');
 await page.locator('#profileBackup summary').click();
 assert.equal(await page.locator('#profileExport').isVisible(),true,'respaldo manual disponible bajo demanda');
 assert.ok(await page.locator('#profileCloudStatus').isVisible(),
  'estado de sincronización debe estar en Mi perfil');
 // Preferencia de avatar del invitado: separada de la colección real.
 const back=page.locator('#profileAccountBack');
 if(await back.isVisible())await back.click();
 await page.locator('#profileAvatarChange').click();
 assert.equal(await page.locator('#avatarSelect.on').isVisible(),true);
 assert.equal(await page.locator('#avatarGrid .avatar-option').count(),12);
 const pizza=page.locator('#avatarGrid [data-avatar="pizza"]');
 await pizza.click();
 await page.locator('#avatarSave').click();
 assert.equal(await page.locator('#profileAvatarImage').getAttribute('src'),'assets/avatars/pizza-128.webp');
 assert.equal(await page.evaluate(()=>localStorage.getItem('icmx-avatar-guest-v1')),'pizza');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('icmx-album2')||'{}').have||{}),
  cardsBefore,'cambiar avatar no toca las cartas');
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#homePlayerAvatarImage').getAttribute('src'),'assets/avatars/pizza-128.webp',
  'el avatar de invitado se recuerda al recargar');
 assert.deepEqual(errors,[],'juego debe arrancar sin excepciones JS');
 await page.close();
 console.log('✓ Primera visita, Mi perfil, registro visible y progreso intacto');
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
