/* Insert Coin MX · montaje productivo de cartas dinámicas (sin parches).
   Preserva el nodo IMG y el efecto foil de cada vista; solo cambia el shell
   y añade datos SVG. Fuente de verdad: catalogo.json + POP/PTS verificables.
*/
(function(root){
'use strict';
const R=()=>root.ICMX_CARD_RENDERER;
const A=()=>root.ICMX_CARD_DATA;
let catalogPromise=null;
const mounted=new WeakMap();
const images=new Map();
function catalog(){
 if(!catalogPromise){
  const pending=fetch('cartas/catalogo.json',{cache:'force-cache'})
   .then(r=>{if(!r.ok)throw Error('Catálogo HTTP '+r.status);return r.json()})
   .then(rows=>{if(!Array.isArray(rows))throw Error('Catálogo inválido');return rows});
  catalogPromise=pending;
  pending.catch(()=>{if(catalogPromise===pending)catalogPromise=null});
 }
 return catalogPromise;
}
function prepared(card,values,rows,quality){
 const aliases={};
 if(card.v==='f'&&/^F_[a-z0-9]+$/.test(card.img||''))aliases[card.d]=card.img;
 return A().resolve(card,{catalog:rows,fullAliases:aliases,
  points:values?.points,pop:values?.pop,quality,fullTotal:rows.filter(d=>!!d.full).length});
}
function cardImage(fx){
 return [...fx.children].find(e=>e.tagName==='IMG')||fx.querySelector('img');
}
function shellURL(key,quality){
 return new URL((quality==='full'?'cs2/':'cs/')+key+'.webp',document.baseURI).href;
}
function reset(fx){
 mounted.delete(fx);
 fx.querySelectorAll(':scope > svg.icmx-data').forEach(el=>el.remove());
 delete fx.dataset.icmxDynamic;delete fx.dataset.icmxError;
 const img=cardImage(fx);
 if(img){delete img.dataset.icmxDynamic;img.style.opacity='';}
}
function decodeTarget(img,src){
 const url=new URL(src,document.baseURI).href;
 if(img.src!==url)img.src=url;
 if(img.complete&&img.naturalWidth)return Promise.resolve();
 if(typeof img.decode==='function')return img.decode();
 return new Promise((resolve,reject)=>{
  const done=()=>{cleanup();resolve()};
  const bad=()=>{cleanup();reject(Error('Imagen no disponible: '+url))};
  const cleanup=()=>{img.removeEventListener('load',done);img.removeEventListener('error',bad)};
  img.addEventListener('load',done);img.addEventListener('error',bad);
 });
}
// Precarga acotada por intención; no descarga todas las Full del álbum.
function preload(card){
 if(!card?.img||! /^(?:F_)?[a-z0-9_]+$/.test(card.img))return;
 catalog().catch(()=>{});
 loadImage(shellURL(card.img,'full')).catch(()=>{});
}
function mount(fx,card,values){
 if(!fx||!card?.img||!card.d||!card.v)return Promise.resolve(false);
 const img=cardImage(fx);if(!img)return Promise.resolve(false);
 const quality=fx.id==='zFx'?'full':'thumb';
 const key=card.k+'|'+quality;
 const previous=mounted.get(fx);
 if(previous?.key===key&&previous.img===img){
  previous.values=values;
  if(previous.status==='ready'){
   R().updateValues(previous.svg,card.v,values);
   return Promise.resolve(true);
  }
  if(previous.status==='pending')return previous.promise;
 }
 const current=img.getAttribute('src')||'';
 const original=img.dataset.icmxOriginal||(/^(?:c|c2)\//.test(current)?current:'')||
  (quality==='full'?'c2/':'c/')+card.img+'.webp';
 const rec={key,img,values,status:'pending',promise:null,svg:null};
 mounted.set(fx,rec);
 const active=()=>mounted.get(fx)===rec&&fx.isConnected&&
  (fx.id!=='zFx'||document.getElementById('zoom')?.open);
 rec.promise=(async()=>{
  try{
   const shell=shellURL(card.img,quality);
   // Start the network and catalogue concurrently; the DOM IMG is the sole
   // shell loader on the direct path. Legacy assets are only a fallback.
   const hasLegacy=current&&/^(?:c|c2)\//.test(current);
   const imageReady=hasLegacy?loadImage(shell):decodeTarget(img,shell);
   const [rows]=await Promise.all([catalog(),imageReady]);
   if(!active())return false;
   const a=prepared(card,rec.values,rows,quality);
   if(shellURL(a.fileKey,quality)!==shell)throw Error('Clave editorial no coincide: '+card.k);
   const svg=R().renderData(a.card,a.variant,a.options);
   if(hasLegacy){await decodeTarget(img,shell);if(!active())return false;}
   fx.querySelectorAll(':scope > svg.icmx-data').forEach(el=>el.remove());
   svg.style.position='absolute';svg.style.inset='0';svg.style.width='100%';svg.style.height='100%';
   svg.style.pointerEvents='none';svg.style.zIndex='1';
   const overlay=[...fx.children].find(el=>el.tagName==='I');
   fx.insertBefore(svg,overlay||null);
   img.style.opacity='1';img.style.display='block';
   img.dataset.icmxDynamic='true';fx.dataset.icmxDynamic='true';
   delete fx.dataset.icmxError;
   rec.svg=svg;rec.status='ready';
   R().updateValues(svg,card.v,rec.values);
   return true;
  }catch(err){
   if(!active())return false;
   rec.status='fallback';
   fx.dataset.icmxError=String(err?.message||err);
   fx.querySelectorAll(':scope > svg.icmx-data').forEach(el=>el.remove());
   delete img.dataset.icmxDynamic;delete fx.dataset.icmxDynamic;
   img.style.opacity='1';
   console.warn('Carta dinámica no disponible:',card.k,err);
   try{await decodeTarget(img,original);return !!active()}catch{return false}
  }
 })();
 return rec.promise;
}
function loadImage(src){
 if(images.has(src)){const hit=images.get(src);images.delete(src);images.set(src,hit);return hit}
 const p=new Promise((resolve,reject)=>{
  const img=new Image();img.decoding='async';
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(Error('Falta shell: '+src));
  img.src=src;
 });
 images.set(src,p);if(images.size>48)images.delete(images.keys().next().value);
 p.catch(()=>{if(images.get(src)===p)images.delete(src)});
 return p;
}
function rect(ctx,x,y,w,h,r){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);
}
function canvasText(ctx,lay){
 ctx.save();
 ctx.fillStyle=lay.color;ctx.textBaseline='top';ctx.textAlign=lay.align==='end'?'right':lay.align==='middle'?'center':'left';
 let size=lay.size,weight=lay.weight||700;
 while(size>lay.size*.55){
  ctx.font=(lay.italic?'italic ':'')+weight+' '+size+'px '+lay.family;
  if(!lay.maxWidth||ctx.measureText(lay.text).width<=lay.maxWidth)break;
  size-=.5;
 }
 if(lay.clipBox){const b=lay.clipBox;ctx.beginPath();ctx.rect(b.x,b.y,b.width,b.height);ctx.clip()}
 ctx.fillText(lay.text,lay.x,lay.y);
 ctx.restore();
}
function star(ctx,lay){
 ctx.beginPath();
 const inner=lay.radius*(lay.points===4?.25:.48);
 for(let k=0;k<lay.points*2;k++){
  const a=-Math.PI/2+Math.PI*k/lay.points,r=k%2?inner:lay.radius;
  const x=lay.cx+Math.cos(a)*r,y=lay.cy+Math.sin(a)*r;
  if(!k)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 ctx.closePath();ctx.fillStyle=lay.color;ctx.fill();
}
const footer={
 b:[['#EABB1E',0],['#E9B91D',.6],['#E7B51E',1]],
 e:[['#FFD6D4',0],['#E7D9FA',.24],['#FFE0DA',.48],['#C8ECDD',.76],['#E5F8AD',1]],
 r:[['#F5DF9D',0],['#EBD087',.38],['#D6AB4D',.7],['#EDCF7D',1]]
};
async function layerCanvas(ctx,lay){
 if(lay.type==='text'){canvasText(ctx,lay);return}
 if(lay.type==='star'){star(ctx,lay);return}
 if(lay.type==='footer-plate'){
  const g=ctx.createLinearGradient(49,0,911,0);
  footer[lay.variant].forEach(([color,at])=>g.addColorStop(at,color));
  rect(ctx,49,1233,862,59,13);ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='#22180F';ctx.lineWidth=4;ctx.stroke();return;
 }
 if(lay.type==='footer-rule'){
  ctx.beginPath();ctx.moveTo(lay.x,1245);ctx.lineTo(lay.x,1280);
  ctx.strokeStyle=lay.color;ctx.lineWidth=3;ctx.stroke();return;
 }
 if(lay.type==='footer-dot'){
  ctx.beginPath();ctx.arc(lay.cx,lay.cy,5,0,Math.PI*2);
  ctx.fillStyle=lay.color;ctx.fill();return;
 }
 if(lay.type==='ability-icon'){
  ctx.save();ctx.translate(lay.cx,lay.cy);ctx.scale(lay.radius/44,lay.radius/44);
  if(lay.badge){
   ctx.beginPath();ctx.arc(0,0,44,0,Math.PI*2);
   ctx.fillStyle='#f8f2eb';ctx.fill();ctx.strokeStyle='#20191d';ctx.lineWidth=5;ctx.stroke();
  }
  ctx.beginPath();ctx.moveTo(-2,-27);ctx.lineTo(-19,2);ctx.lineTo(-4,2);
  ctx.lineTo(-12,27);ctx.lineTo(22,-8);ctx.lineTo(5,-8);ctx.lineTo(14,-27);
  ctx.closePath();ctx.fillStyle=lay.color;ctx.fill();ctx.restore();return;
 }
 if(lay.type==='image'){
  const im=await loadImage(lay.url);
  const w=lay.width||im.naturalWidth,h=lay.height||im.naturalHeight;
  const x=lay.anchor==='center'?lay.x-w/2:lay.x,y=lay.anchor==='center'?lay.y-h/2:lay.y;
  if(!lay.tint){ctx.drawImage(im,x,y,w,h);return}
  const tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;
  const t=tmp.getContext('2d',{willReadFrequently:true});t.drawImage(im,0,0,w,h);
  const pixels=t.getImageData(0,0,w,h);
  const rgb=[1,3,5].map((_,i)=>parseInt(lay.tint.slice(1+i*2,3+i*2),16));
  for(let i=0;i<pixels.data.length;i+=4){
   const luminance=(pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722)/255;
   pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];
   pixels.data[i+3]=Math.round(pixels.data[i+3]*luminance);
  }
  t.putImageData(pixels,0,0);ctx.drawImage(tmp,x,y,w,h);
 }
}
async function drawInto(ctx,card,values,x,y,width,height){
 const rows=await catalog(),a=prepared(card,values,rows,'full');
 const shell=shellURL(a.fileKey,'full');
 const im=await loadImage(shell);
 const cv=document.createElement('canvas');cv.width=960;cv.height=1340;
 const out=cv.getContext('2d');out.drawImage(im,0,0,960,1340);
 await document.fonts.ready;
 const layers=R().makeLayers(a.card,a.variant,a.options);
 for(const lay of layers)await layerCanvas(out,lay);
 ctx.drawImage(cv,x,y,width,height);
}
root.ICMX_CARD_RUNTIME=Object.freeze({mount,reset,preload,drawInto,catalog});
})(window);
