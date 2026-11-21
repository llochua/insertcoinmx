/**
 * Insert Coin MX · valores impresos sobre la imagen existente de la carta.
 *
 * Los WebP originales tienen "VALOR 100" arriba y "Valor —" abajo impresos.
 * Esta capa compone SOLO esos dos recuadros, sin alterar la ilustración
 * ni regenerar las ~386 cartas. La popularidad no existe hasta que haya
 * agregados verificables desde Supabase: nunca se inventa un número.
 */
(function(){
 'use strict';
 const W=960,H=1340;
 const POINTS=Object.freeze({b:10,e:25,r:50,f:100});
 const allowPoint=(v,n)=>Object.prototype.hasOwnProperty.call(POINTS,v)&&n===POINTS[v]?n:null;
 const isPop=v=>Number.isInteger(v)&&v>=0&&v<=1000;
 function ratioData(img){
  const off=document.createElement('canvas');
  off.width=W;off.height=H;
  const context=off.getContext('2d',{willReadFrequently:true});
  context.drawImage(img,0,0,W,H);
  return context.getImageData(0,0,W,H).data;
 }
 /**
  * Borra tipografía impresa de una banda de color mediante interpolación
  * vertical de los píxeles intactos arriba y abajo de la letra.
  * Conserva cualquier degradado horizontal de las plantillas Holo/Dorada.
  */
 function restoreBand(ctx,data,{x1,x2,y1,y2,sampleTop,sampleBottom}){
  const band=ctx.createImageData(x2-x1,y2-y1);
  for(let y=y1;y<y2;y++){
   const t=(y-y1)/(y2-y1-1);
   for(let x=x1;x<x2;x++){
    const sourceA=(sampleTop*W+x)*4,sourceB=(sampleBottom*W+x)*4;
    const dest=((y-y1)*(x2-x1)+(x-x1))*4;
    for(let c=0;c<3;c++)band.data[dest+c]=Math.round(data[sourceA+c]*(1-t)+data[sourceB+c]*t);
    band.data[dest+3]=255;
   }
  }
  ctx.putImageData(band,x1,y1);
 }
 function drawRight(ctx,txt,x,y,fontSize,color,maxWidth){
  ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.font='800 '+fontSize+'px "Avenir Next", Arial, sans-serif';
  ctx.fillStyle=color;
  ctx.fillText(txt,x,y,maxWidth);
 }
 function drawFace(ctx,img,{variant,points,pop}){
  const full=variant==='f';
  const ink=full?'#FFFFFF':variant==='e'?'#171319':variant==='r'?'#241706':'#191200';
  if(full){
   // Las Full tienen ilustraciones distintas bajo el velo: mate oscuro pequeño
   // en las dos zonas tipográficas, sin modificar el arte del centro.
   ctx.fillStyle='rgba(12,10,22,.98)';
   ctx.fillRect(632,868,300,137);
   ctx.fillRect(750,1241,177,60);
   ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='middle';
   ctx.font='700 25px "Avenir Next", Arial, sans-serif';
   ctx.fillText('POP',673,904,98);
   drawRight(ctx,isPop(pop)?String(pop):'—',907,958,73,ink,200);
   drawRight(ctx,'Valor '+(points===null?'—':points),911,1274,25,ink,170);
  }else{
   let data;
   try{data=ratioData(img)}
   catch(_){return false}
   restoreBand(ctx,data,{x1:570,x2:904,y1:142,y2:217,sampleTop:138,sampleBottom:222});
   restoreBand(ctx,data,{x1:641,x2:843,y1:1252,y2:1281,sampleTop:1249,sampleBottom:1287});
   ctx.fillStyle=ink;ctx.textAlign='left';ctx.textBaseline='middle';
   ctx.font='800 23px "Avenir Next", Arial, sans-serif';
   ctx.fillText('POP',591,185,104);
   drawRight(ctx,isPop(pop)?String(pop):'—',894,184,69,ink,190);
   ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='800 26px "Avenir Next", Arial, sans-serif';ctx.fillStyle=ink;
   ctx.fillText('Valor '+(points===null?'—':points),650,1267,183);
  }
  return true;
 }
 function mount(fx,{variant,points,pop=null}={}){
  if(!fx||!Object.prototype.hasOwnProperty.call(POINTS,variant))return;
  const img=fx.querySelector(':scope > img');
  if(!img)return;
  const old=fx.querySelector(':scope > canvas.icmx-card-face-values');
  if(old)old.remove();
  const canvas=document.createElement('canvas');
  canvas.className='icmx-card-face-values';
  canvas.width=W;canvas.height=H;
  canvas.setAttribute('aria-hidden','true');
  img.insertAdjacentElement('afterend',canvas);
  const safe=allowPoint(variant,points);
  const lastSrc=img.src;
  const paint=()=>{
   if(!canvas.isConnected||!img.complete||!img.naturalWidth)return;
   if(img.src!==lastSrc)return;
   const ctx=canvas.getContext('2d',{willReadFrequently:false});
   ctx.clearRect(0,0,W,H);
   try{
    if(drawFace(ctx,img,{variant,points:safe,pop})){
     canvas.dataset.variant=variant;
     canvas.dataset.points=safe===null?'—':String(safe);
     canvas.dataset.pop=isPop(pop)?String(pop):'—';
     canvas.dataset.ready='true';
    }
   }catch(_){canvas.dataset.ready='false'}
  };
  if(img.complete&&img.naturalWidth)paint();
  else img.addEventListener('load',paint,{once:true});
  return canvas;
 }
 window.ICMX_CARD_VALUE=Object.freeze({mount});
})();
