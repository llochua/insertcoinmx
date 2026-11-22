/* Insert Coin MX — color del fondo de ilustraciones sólidas (contrato DS-ART-01).
 * Se mide el borde DEL ARCHIVO realmente cargado; nunca se asigna un degradado
 * ni se inventa una paleta por rareza o por categoría.
 * Compatible con browser clásico y tests Node/VM, sin servicios externos.
 */
(function(root){
  'use strict';
  const size=Object.freeze({width:64,height:80});

  function colorFromPixels(rgba,width,height){
    if(!rgba||!width||!height||rgba.length<width*height*4)return null;
    // Los bordes de la imagen son sólidos. El centro contiene la ilustración.
    // Reducir la muestra a los 3 px exteriores evita incluir motivos centrales.
    const bands=new Map(),thickness=Math.max(1,Math.min(3,Math.floor(Math.min(width,height)/12)));
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      if(x>=thickness&&x<width-thickness&&y>=thickness&&y<height-thickness)continue;
      const i=(y*width+x)*4;
      if(rgba[i+3]<245)continue; // datos de imagen inválidos / excepcionalmente vacíos
      const r=rgba[i],g=rgba[i+1],b=rgba[i+2];
      // Agrupar pequeñas variaciones de compresión WebP/JPG sin crear colores nuevos.
      const key=(r>>4)+'/'+(g>>4)+'/'+(b>>4);
      let bucket=bands.get(key);
      if(!bucket){bucket={n:0,exact:new Map()};bands.set(key,bucket)}
      bucket.n++;
      const rgb=(r<<16)|(g<<8)|b;
      bucket.exact.set(rgb,(bucket.exact.get(rgb)||0)+1);
    }
    let best=null;
    for(const bucket of bands.values())if(!best||bucket.n>best.n)best=bucket;
    if(!best)return null;
    // Devolver uno de los RGB del archivo, no una media o gradiente aproximados.
    let rgb=null,max=-1;
    for(const [value,count]of best.exact)if(count>max){rgb=value;max=count}
    return '#'+rgb.toString(16).padStart(6,'0');
  }

  function fromImage(img){
    if(!img||!img.complete||!img.naturalWidth||!img.naturalHeight)return null;
    try{
      const c=document.createElement('canvas');
      c.width=size.width;c.height=size.height;
      const ctx=c.getContext('2d',{willReadFrequently:true});
      if(!ctx)return null;
      ctx.drawImage(img,0,0,size.width,size.height);
      const pixels=ctx.getImageData(0,0,size.width,size.height).data;
      return colorFromPixels(pixels,size.width,size.height);
    }catch(_){
      // El fallo al leer píxeles NO debe afectar la apertura del sobre.
      return null;
    }
  }
  root.ICMXArtworkBackground=Object.freeze({colorFromPixels,fromImage});
})(globalThis);
