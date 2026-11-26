// Respaldo estático de cartas (c/ y c2/) generado con el renderer dinámico.
//
// Uso:  node cartas/respaldo-dinamico.mjs <id> [<id>…] [--etiqueta "Navidad Gamer"]
//
// Regla de producción (Cartas Dinámicas 2.0): el renderer dinámico es la referencia visual
// definitiva. El respaldo es la base limpia (cs2/) + las mismas capas SVG del renderer,
// capturadas a 960×1340, sin POP (se muestra «—»), sin GOTY ni Likes.
// --etiqueta: texto junto a «Carta» en el pie (p. ej. el nombre de la colección). Sin ella se usa
// lo que el juego muestra hoy (serie de PLAYER 1, F##/??? o ARCHIVO). En el juego ese valor
// lo pone el runtime encima; aquí solo queda fijo en el respaldo.
// Escribe PNG temporales en .respaldo/ ; luego `python3 cartas/respaldo-webp.py <ids>` los pasa a
// c2/ (960×1340) y c/ (480×670) y actualiza el manifiesto. No toca cs/, cs2/, fa/, d/ ni el motor.
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const args=process.argv.slice(2);
const at=args.indexOf('--etiqueta');
const label=at>=0?args[at+1]:null;
const ids=args.filter((a,i)=>!a.startsWith('--')&&i!==at+1);
if(!ids.length||ids.some(id=>!/^[a-z0-9]{1,40}$/.test(id))){
 console.error('Uso: node cartas/respaldo-dinamico.mjs <id> [<id>…] [--etiqueta "Texto"]');process.exit(2);
}
const root=process.cwd();
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
await mkdir(path.join(root,'.respaldo'),{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:1500},deviceScaleFactor:1});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.ICMX_CARD_RUNTIME&&!!window.ICMX_CARD_RENDERER,{timeout:20000});
 for(const id of ids){
  const variants=await page.evaluate(async id=>{
   const rows=await ICMX_CARD_RUNTIME.catalog();const c=rows.find(r=>r.id===id);
   if(!c)throw Error('No está en el catálogo: '+id);
   return c.full?['b','e','r','f']:['b','e','r'];
  },id);
  for(const v of variants){
   const info=await page.evaluate(async({id,v,label})=>{
    document.getElementById('icmx-respaldo')?.remove();
    const rows=await ICMX_CARD_RUNTIME.catalog();
    const a=ICMX_CARD_DATA.resolve({d:id,v},{catalog:rows,quality:'full',unknownAlbumTotal:true});
    // Misma numeración que el runtime del juego, salvo que se indique una etiqueta.
    let card={...a.card};
    const levels=window.ICMX_PLAYER1_LEVELS;
    if(card.tipo==='Álbum'&&levels){
     const no=levels.numberOf(id);
     card.numero=no?String(no).padStart(3,'0')+'/???':'ARCHIVO';
    }
    if(label)card.numero=label;
    const box=document.createElement('div');box.id='icmx-respaldo';
    box.style.cssText='position:fixed;left:0;top:0;width:960px;height:1340px;z-index:2147483647;background:#000';
    const img=new Image();img.src='cs2/'+a.fileKey+'.webp';
    img.style.cssText='position:absolute;inset:0;width:960px;height:1340px';
    const svg=ICMX_CARD_RENDERER.renderData(card,v,{...a.options,pop:null});
    svg.style.cssText='position:absolute;inset:0;width:960px;height:1340px';
    if(v==='f'&&label){
     const t=[...svg.querySelectorAll('text')].find(t=>t.textContent.startsWith('Carta '));
     if(t)t.textContent='Carta '+label;
    }
    box.append(img,svg);document.body.appendChild(box);
    await img.decode();await document.fonts.ready;await new Promise(r=>setTimeout(r,400));
    const text=svg.textContent;
    if(/GOTY|Likes/i.test(text))throw Error('El respaldo trae GOTY o Likes');
    return {fileKey:a.fileKey,text:text.replace(/\s+/g,' ')};
   },{id,v,label});
   await page.locator('#icmx-respaldo').screenshot({path:path.join(root,'.respaldo',info.fileKey+'.png')});
   console.log('ok',id,v,'→',info.fileKey,'·',info.text);
  }
 }
}finally{await browser.close();server.close();}
