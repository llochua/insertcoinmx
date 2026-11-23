/* Insert Coin MX · CardRenderer v2 (piloto; no reemplaza el render de producción).
 * Composición: WebP SIN datos (cs/cs2) + capas SVG + datos inmutables.
 * No escribe progreso, no consulta Supabase y no crea cartas coleccionables.
 */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const VARIANTS = Object.freeze({b:'comun',e:'holo',r:'dorada',f:'full'});
  const DEFAULT_POINTS = Object.freeze({b:10,e:25,r:50,f:100});
  const COLORS = Object.freeze({b:'#191200',e:'#131111',r:'#191203',f:'#ffffff'});
  const NAMES = Object.freeze({b:'Común',e:'Holo',r:'Dorada',f:'Arte Especial'});
  const CSS_ID = 'icmx-card-renderer-css';

  function assertData(card, variant) {
    if (!card || !/^[a-z0-9]{1,40}$/.test(String(card.id || ''))) throw Error('ID de carta inválido');
    if (!Object.prototype.hasOwnProperty.call(VARIANTS, variant)) throw Error('Rareza inválida');
    if (variant === 'f' && !card.full) throw Error('La carta no tiene versión Full');
    for (const key of ['nombre','categoria','ref','linea','frase']) {
      if (typeof card[key] !== 'string') throw Error('Falta el dato: '+key);
    }
    if (!/^(GAMER|ANIME|PELÍCULAS|CARICATURAS|OTROS)$/.test(card.categoria)) throw Error('Categoría inválida');
  }
  function shellKey(card, variant) {
    if (variant === 'f') return card.fullKey || 'F_'+card.id;
    const original = card.version_original || 'comun';
    return VARIANTS[variant] === original ? card.id : card.id+'_'+variant;
  }
  function cleanRoot(rootPath) {
    return String(rootPath || '').replace(/\/?$/, '/');
  }
  function numLabel(card, variant, opts) {
    if (card.tipo !== 'Álbum') return 'BONUS';
    if (variant === 'f') return card.full
      ? String(card.full).replace(/^F/,'F').padStart(3,'0')+'/'+String(opts.fullTotal || 0).padStart(2,'0')
      : 'BONUS';
    // El número es dato editorial; no integra las claves de progreso.
    return String(card.numero || '').trim() || '—';
  }
  function pointsOf(variant, options) {
    const explicit = options.points;
    return Number.isSafeInteger(explicit) && explicit >= 0 && explicit <= 999999
      ? explicit : DEFAULT_POINTS[variant];
  }
  function popOf(options) {
    return Number.isSafeInteger(options.pop) && options.pop >= 0 && options.pop <= 1000
      ? String(options.pop) : '—';
  }
  function el(name, attrs, content) {
    const node = document.createElementNS(NS,name);
    for (const [key,val] of Object.entries(attrs || {})) node.setAttribute(key,String(val));
    if (content !== undefined) node.textContent = String(content);
    return node;
  }
  function css() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id=CSS_ID;
    style.textContent = `
.icmx-dynamic-card{display:block;position:relative;isolation:isolate;width:100%;aspect-ratio:960/1340;margin:0;overflow:hidden;border-radius:4.6%;background:#181625}
.icmx-dynamic-card>.icmx-shell{display:block;width:100%;height:100%;object-fit:fill}
.icmx-dynamic-card>.icmx-data{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.icmx-dynamic-card .icmx-data text{font-synthesis:none;text-rendering:geometricPrecision}
.icmx-dynamic-card[data-variant="f"]{border-radius:4.6%}
`;
    document.head.appendChild(style);
  }
  function layerText(layers, text, x, y, size, color, options={}) {
    if (!text) return;
    layers.push({type:'text',text:String(text),x,y,size,color,
      maxWidth:options.maxWidth || 900,align:options.align || 'start',
      family:options.family || 'AV, "Avenir Next", sans-serif',
      weight:options.weight || 700,italic:!!options.italic,spacing:options.spacing || 0});
  }
  function layerImage(layers, url, x, y, options={}) {
    layers.push({type:'image',url,x,y,anchor:options.anchor||'start',
      width:options.width||0,height:options.height||0,tint:options.tint||null});
  }
  function splitRef(card) {
    const first=card.ref.trim(),second=(card.ref2||'').trim();
    if (second) return [first,second];
    if (first.length < 21) return [first,''];
    const multiply=first.indexOf(' × ');
    if (multiply !== -1 && multiply < 15) return [first.slice(0,multiply+2),first.slice(multiply+3)];
    const index=first.lastIndexOf(' ',28);
    return index>0?[first.slice(0,index),first.slice(index+1)]:[first,''];
  }
  function wrapLine(value, max) {
    const words=String(value||'').split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const out=[];let line='';
    for (const word of words) {
      if (line && (line+' '+word).length>max) { out.push(line);line=word; }
      else line = line ? line+' '+word : word;
    }
    if (line) out.push(line);
    return out.slice(0,2);
  }
  function makeLayers(card, variant, options) {
    assertData(card,variant);
    const rootPath=cleanRoot(options.assetRoot||'');
    const layers=[];
    const ink=COLORS[variant];
    const pill=rootPath+'cartas/plantillas/pastilla_'+card.categoria+'.png';
    if (variant !== 'f') {
      layerImage(layers,pill,50,48);
      layerText(layers,card.nombre,84,151,60,ink,{maxWidth:455});
      layerText(layers,'POP',594,160,23.4,ink,{maxWidth:95});
      layerText(layers,popOf(options),909,209,74,ink,{maxWidth:270,align:'end'});
      const [r1,r2]=splitRef(card),offset=r2?28:0;
      layerImage(layers,rootPath+'cartas/plantillas/etiqueta_habilidad.png',186,884,{tint:ink});
      layerImage(layers,rootPath+'cartas/plantillas/etiqueta_goty.png',790,900+offset,{tint:ink});
      layerImage(layers,rootPath+'cartas/plantillas/icono.png',125.5,929.5+offset,{anchor:'center'});
      layerText(layers,r1,193,926,49.2,ink,{maxWidth:590});
      if (r2) layerText(layers,r2,193,982,49.2,ink,{maxWidth:590});
      const habilidad=wrapLine(card.linea,r2?75:49);
      habilidad.forEach((line,i)=>layerText(layers,line,86,(r2?1045:999)+i*44.6,37.2,ink,
        {maxWidth:800,family:'"Carlito", Arial, sans-serif',weight:400}));
      layerText(layers,card.frase,75,1132,29.7,ink,
        {maxWidth:620,family:'"Carlito", Arial, sans-serif',weight:400,italic:true});
      layerText(layers,numLabel(card,variant,options),148,1250,23.4,ink,{maxWidth:200});
      layerText(layers,'Valor '+pointsOf(variant,options),651,1250,23.4,ink,{maxWidth:194});
    } else {
      layerImage(layers,pill,32,30);
      layerText(layers,card.nombre,48,922,64,'#ffffff',{maxWidth:590});
      layerText(layers,'POP',910,892,21,'#ffffff',{align:'end',spacing:4});
      layerText(layers,popOf(options),909,1011,79,'#ffffff',{align:'end',maxWidth:250});
      layerImage(layers,rootPath+'cartas/plantillas/etiqueta_habilidad.png',48,1006);
      layerText(layers,'✦',62,1052,37,'#ffd21f',{maxWidth:60,align:'middle'});
      layerText(layers,(card.ref+' '+(card.ref2||'')).trim(),84,1050,38,'#ffd21f',{maxWidth:560});
      layerText(layers,'— GOTY',910,1050,38,'#ffd21f',{align:'end',maxWidth:210});
      layerText(layers,card.frase,78,1145,30,'#191200',
        {maxWidth:800,family:'"Carlito", Arial, sans-serif',weight:400});
      layerText(layers,'Carta '+numLabel(card,variant,options),48,1262,23.4,'#ffffff',{maxWidth:270});
      layerText(layers,'★★ Arte Especial',508,1262,23.4,'#ffffff',{align:'middle',maxWidth:300});
      layerText(layers,'Valor '+pointsOf(variant,options),912,1262,23.4,'#ffffff',
        {align:'end',maxWidth:230});
    }
    return layers;
  }
  function resizeText(t,lay) {
    if (!t.getComputedTextLength) return;
    let size=lay.size;
    while (t.getComputedTextLength()>lay.maxWidth && size>lay.size*.55) {
      size-=.5;t.setAttribute('font-size',size);
    }
  }
  function renderSvg(layers) {
    const svg=el('svg',{viewBox:'0 0 960 1340',class:'icmx-data',
      preserveAspectRatio:'xMidYMid meet','aria-hidden':'true'});
    for (const lay of layers) {
      if (lay.type==='image') {
        const im=el('image',{href:lay.url,x:lay.x,y:lay.y,width:lay.width||1,height:lay.height||1});
        if(lay.tint)im.style.filter='brightness(0)'; // piloto: revisar igualación exacta de tinta antes de publicar
        svg.appendChild(im);
        const probe=new Image();
        probe.onload=()=>{
          const w=lay.width||probe.naturalWidth,h=lay.height||probe.naturalHeight;
          if (lay.anchor==='center') im.setAttribute('x',lay.x-w/2);
          im.setAttribute('width',w);im.setAttribute('height',h);
        };
        probe.src=lay.url;
      } else {
        const tx=el('text',{x:lay.x,y:lay.y,'font-size':lay.size,'font-family':lay.family,
          'font-weight':lay.weight,'dominant-baseline':'hanging',
          'text-anchor':lay.align,'font-style':lay.italic?'italic':'normal',
          'letter-spacing':lay.spacing,fill:lay.color},lay.text);
        svg.appendChild(tx);
        Promise.resolve(document.fonts && document.fonts.ready).then(()=>resizeText(tx,lay));
      }
    }
    return svg;
  }
  function create(card,variant='b',options={}) {
    css();
    assertData(card,variant);
    const rootPath=cleanRoot(options.assetRoot||'');
    const shellDir=options.quality==='thumb'?'cs':'cs2';
    const node=document.createElement('figure');
    node.className='icmx-dynamic-card';
    node.dataset.cardId=card.id;
    node.dataset.variant=variant;
    node.setAttribute('role','img');
    node.setAttribute('aria-label',card.nombre+' · '+NAMES[variant]);
    const image=document.createElement('img');
    image.className='icmx-shell';
    image.alt='';
    image.decoding='async';
    image.src=rootPath+shellDir+'/'+shellKey(card,variant)+'.webp';
    image.onerror=()=>{node.dataset.error='missing-shell';};
    node.appendChild(image);
    node.appendChild(renderSvg(makeLayers(card,variant,options)));
    return node;
  }
  root.ICMX_CARD_RENDERER=Object.freeze({
    create,makeLayers,assertData,shellKey,numLabel,pointsOf,VARIANTS
  });
})(typeof window!=='undefined'?window:globalThis);
