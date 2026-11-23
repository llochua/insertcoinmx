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
  let maskSequence = 0;

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
    const value=String(rootPath||'');
    return !value?'':(value.endsWith('/')?value:value+'/');
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
      weight:options.weight || 700,italic:!!options.italic,spacing:options.spacing || 0,
      field:options.field||null,clipBox:options.clipBox||null});
  }
  // Las estrellas de rareza son un sistema independiente del símbolo de habilidad.
  // El ícono de habilidad representa energía/acción (rayo); nunca una estrella.
  function layerAbilityIcon(layers,cx,cy,opts={}) {
    layers.push({type:'ability-icon',cx,cy,radius:opts.radius||44,
      badge:opts.badge!==false,color:opts.color||'#20191d'});
  }
  function layerStar(layers, cx, cy, radius, points=5, color='#ffd21f') {
    layers.push({type:'star',cx,cy,radius,points,color});
  }
  function starPath(lay) {
    const inner=lay.radius*(lay.points===4?0.25:0.48);
    let path='';
    for(let k=0;k<lay.points*2;k++) {
      const a=-Math.PI/2+Math.PI*k/lay.points;
      const r=k%2?inner:lay.radius;
      const x=lay.cx+Math.cos(a)*r, y=lay.cy+Math.sin(a)*r;
      path+=(k?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)+' ';
    }
    return path+'Z';
  }
  function layerFooterPlate(layers,variant) {
    // Una SOLA placa vectorial continua: elimina los parches heredados de la plantilla
    // detrás del número y valor. No repinta regiones sueltas ni regenera ilustraciones.
    layers.push({type:'footer-plate',variant});
  }
  function layerFooterRule(layers,x,color) {
    layers.push({type:'footer-rule',x,color});
  }
  function layerFooterDot(layers,cx,cy,color) {
    layers.push({type:'footer-dot',cx,cy,color});
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
      // POP siempre dentro del encabezado (y=133–219): jamás invade el arte.
      layerText(layers,popOf(options),909,135,74,ink,
        {maxWidth:205,align:'end',field:'pop',clipBox:{x:699,y:132,width:214,height:88}});
      const [r1,r2]=splitRef(card),offset=r2?28:0;
      layerImage(layers,rootPath+'cartas/plantillas/etiqueta_habilidad.png',186,884,{tint:ink,width:264,height:26});
      layerImage(layers,rootPath+'cartas/plantillas/etiqueta_goty.png',790,900+offset,{tint:ink,width:102,height:78});
      layerAbilityIcon(layers,125.5,929.5+offset);
      layerText(layers,r1,193,926,49.2,ink,{maxWidth:590});
      if (r2) layerText(layers,r2,193,982,49.2,ink,{maxWidth:590});
      const habilidad=wrapLine(card.linea,r2?75:49);
      habilidad.forEach((line,i)=>layerText(layers,line,86,(r2?1045:999)+i*44.6,37.2,ink,
        {maxWidth:800,family:'"Carlito", Arial, sans-serif',weight:400}));
      layerText(layers,card.frase,75,1132,29.7,ink,
        {maxWidth:620,family:'"Carlito", Arial, sans-serif',weight:400,italic:true});
      // La placa completa (fondo + contorno) se crea una sola vez en SVG.
      // Debe preceder TODOS los datos y símbolos: ninguna máscara bajo cifras.
      layerFooterPlate(layers,variant);
      layerText(layers,'Carta',75,1250,23.4,ink,{maxWidth:63,field:'collection-label'});
      layerText(layers,numLabel(card,variant,options),148,1250,23.4,ink,
        {maxWidth:206,field:'collection-number'});
      layerFooterRule(layers,336,ink);
      if(variant==='b'){
        layerFooterDot(layers,370,1261,ink);
        layerText(layers,'Común',398,1250,23.4,ink,{maxWidth:165});
      } else if(variant==='e'){
        layerStar(layers,375,1261,12,5,ink);
        layerText(layers,'Holo',408,1250,23.4,ink,{maxWidth:172});
      } else {
        [374,408].forEach(cx=>layerStar(layers,cx,1261,12,5,ink));
        layerText(layers,'Dorada',472,1250,23.4,ink,{maxWidth:145});
      }
      layerFooterRule(layers,622,ink);
      layerText(layers,'Valor '+pointsOf(variant,options),647,1250,23.4,ink,{maxWidth:204});
    } else {
      layerImage(layers,pill,32,30);
      layerText(layers,card.nombre,48,922,64,'#ffffff',{maxWidth:590});
      layerText(layers,'POP',910,892,21,'#ffffff',{align:'end',spacing:4});
      // Full: bloque numérico encima de habilidad/GOTY, no a la altura de esa fila.
      layerText(layers,popOf(options),909,924,79,'#ffffff',
        {align:'end',maxWidth:230,field:'pop',clipBox:{x:665,y:922,width:249,height:100}});
      layerImage(layers,rootPath+'cartas/plantillas/etiqueta_habilidad.png',48,1006,{tint:'#ffffff',width:264,height:26});
      layerAbilityIcon(layers,62,1064,{radius:22,badge:false,color:'#ffd21f'});
      layerText(layers,(card.ref+' '+(card.ref2||'')).trim(),84,1050,38,'#ffd21f',{maxWidth:560});
      layerText(layers,'— GOTY',910,1050,38,'#ffd21f',{align:'end',maxWidth:210});
      layerText(layers,card.frase,78,1145,30,'#191200',
        {maxWidth:800,family:'"Carlito", Arial, sans-serif',weight:400});
      layerText(layers,'Carta '+numLabel(card,variant,options),48,1262,23.4,'#ffffff',{maxWidth:270});
      [374,396,418].forEach(cx=>layerStar(layers,cx,1274,11,5));
      layerText(layers,'Arte Especial',552,1262,23.4,'#ffffff',{align:'middle',maxWidth:205});
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
      if(lay.type==='footer-plate'){
        // Fondo homogéneo creado desde cero, no a partir de pixeles con parches
        // de la antigua tipografía. El trazo cierra el perímetro completo.
        const stops={
          b:[['0%','#EABB1E'],['60%','#E9B91D'],['100%','#E7B51E']],
          e:[['0%','#FFD6D4'],['24%','#E7D9FA'],['48%','#FFE0DA'],['76%','#C8ECDD'],['100%','#E5F8AD']],
          r:[['0%','#F5DF9D'],['38%','#EBD087'],['70%','#D6AB4D'],['100%','#EDCF7D']]
        }[lay.variant];
        const id='icmx-footer-gradient-'+(++maskSequence);
        const defs=el('defs');
        const grad=el('linearGradient',{id,x1:'0%',y1:'0%',x2:'100%',y2:'0%'});
        stops.forEach(([offset,color])=>grad.appendChild(el('stop',{offset,'stop-color':color})));
        defs.appendChild(grad);svg.appendChild(defs);
        svg.appendChild(el('rect',{x:49,y:1233,width:862,height:59,rx:13,
          fill:'url(#'+id+')',stroke:'#22180F','stroke-width':4,
          'data-icmx-footer-plate':'true'}));
      } else if (lay.type==='footer-rule'){
        svg.appendChild(el('line',{x1:lay.x,x2:lay.x,y1:1245,y2:1280,
          stroke:lay.color,'stroke-width':3,'data-icmx-footer-rule':'true'}));
      } else if(lay.type==='footer-dot'){
        svg.appendChild(el('circle',{cx:lay.cx,cy:lay.cy,r:5,fill:lay.color,
          'data-icmx-footer-dot':'true'}));
      } else if (lay.type==='ability-icon') {
        // Un rayo coherente en todas las rarezas, separado de las estrellas.
        if(lay.badge)svg.appendChild(el('circle',{cx:lay.cx,cy:lay.cy,r:lay.radius,
          fill:'#f8f2eb',stroke:'#20191d','stroke-width':5}));
        svg.appendChild(el('path',{
          d:'M -2 -27 L -19 2 H -4 L -12 27 L 22 -8 H 5 L 14 -27 Z',
          fill:lay.color,stroke:lay.color,'stroke-linejoin':'round',
          transform:'translate('+lay.cx+' '+lay.cy+') scale('+(lay.radius/44)+')',
          'data-icmx-ability-icon':'zap'
        }));
      } else if (lay.type==='star') {
        svg.appendChild(el('path',{d:starPath(lay),fill:lay.color,'data-icmx-star':lay.points,
          'aria-hidden':'true'}));
      } else if (lay.type==='image') {
        if(lay.tint) {
          // Archivos etiqueta_*.png son máscaras de luminancia (gris), NO PNG transparentes.
          // Rasterizar directamente el archivo añadiría un bloque negro al marco.
          const id='icmx-card-mask-'+(++maskSequence),w=lay.width,h=lay.height;
          const mask=el('mask',{id,x:lay.x,y:lay.y,width:w,height:h,
            maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse','mask-type':'luminance'});
          mask.style.maskType='luminance';
          mask.appendChild(el('image',{href:lay.url,x:lay.x,y:lay.y,width:w,height:h}));
          const rect=el('rect',{x:lay.x,y:lay.y,width:w,height:h,fill:lay.tint,
            mask:'url(#'+id+')'});
          svg.appendChild(mask);svg.appendChild(rect);
        } else {
          const im=el('image',{href:lay.url,x:lay.x,y:lay.y,width:lay.width||1,height:lay.height||1});
          svg.appendChild(im);
          const probe=new Image();
          probe.onload=()=>{
            const w=lay.width||probe.naturalWidth,h=lay.height||probe.naturalHeight;
            if(lay.anchor==='center') {
              im.setAttribute('x',lay.x-w/2);
              im.setAttribute('y',lay.y-h/2);
            }
            im.setAttribute('width',w);im.setAttribute('height',h);
          };
          probe.src=lay.url;
        }
      } else {
        const tx=el('text',{x:lay.x,y:lay.y,'font-size':lay.size,'font-family':lay.family,
          'font-weight':lay.weight,'dominant-baseline':'hanging',
          'text-anchor':lay.align,'font-style':lay.italic?'italic':'normal',
          'letter-spacing':lay.spacing,fill:lay.color},lay.text);
        if(lay.field)tx.setAttribute('data-icmx-field',lay.field);
        if(lay.clipBox) {
          const id='icmx-pop-clip-'+(++maskSequence),b=lay.clipBox;
          const clip=el('clipPath',{id,clipPathUnits:'userSpaceOnUse'});
          clip.appendChild(el('rect',{x:b.x,y:b.y,width:b.width,height:b.height}));
          svg.appendChild(clip);
          tx.setAttribute('clip-path','url(#'+id+')');
        }
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
