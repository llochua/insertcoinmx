/* PANEL DE CARTAS DINÁMICAS · existe solo dentro del LAB de QA.
   No modifica sobres, inventario, Auth, Supabase ni el juego principal. */
(()=>{
'use strict';
const ID='icmxDynamicLab';
const qs=x=>document.getElementById(x);
const variants={b:'Base',e:'Holo',r:'Dorada',f:'Full'};
const pointsByVariant={b:10,e:25,r:50,f:100};
const choices=['1up','sonic','abuket'];
const css=document.createElement('style');
css.textContent=`
#${ID}{position:fixed;inset:0;z-index:20000;overflow-y:auto;background:#101024;color:#fff;padding:clamp(12px,3vw,30px);font:14px/1.4 AV,system-ui,sans-serif}
#${ID}[hidden]{display:none!important}
#${ID} *{box-sizing:border-box}
#${ID} .icmx-lab-inner{width:min(1100px,100%);margin:auto}
#${ID} header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
#${ID} h2{font:800 clamp(16px,4vw,24px)/1.3 AV,system-ui,sans-serif;color:#ffd400;margin:0}
#${ID} .lab-close{border:1px solid #ffd400;border-radius:9px;padding:10px 13px;font:800 13px AV;background:#ffd400;color:#161326;min-height:44px}
#${ID} p{color:#c5c2d2;font:12px/1.5 AV,system-ui,sans-serif;margin:7px 0 16px}
#${ID} .dyn-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-bottom:18px}
#${ID} label{display:flex;flex-direction:column;gap:5px;min-width:0;font:700 11px AV,system-ui,sans-serif;color:#e6e0ef}
#${ID} select,#${ID} input{width:100%;min-height:44px;border:1px solid #5d567c;border-radius:8px;background:#24213a;color:#fff;font:13px AV,system-ui,sans-serif;padding:10px}
#${ID} .dyn-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(8px,3vw,35px);align-items:start}
#${ID} .dyn-column{min-width:0;max-width:480px;margin:auto;width:100%}
#${ID} h3{font:700 12px AV;color:#ffd400;margin:0 0 8px;min-height:18px}
#${ID} .dyn-column>img{display:block;width:100%;aspect-ratio:960/1340;object-fit:contain;border-radius:4.6%}
#${ID} .icmx-dynamic-card{width:100%}
#${ID} .dyn-rarity-preview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0 16px}
#${ID} .dyn-rarity-item{border:1px solid #ffffff33;border-radius:9px;padding:9px 4px;text-align:center;font-size:11px;background:#1e1935}
#${ID} .dyn-rarity-item>svg{display:block;margin:0 auto 6px;width:72px;max-width:100%;height:22px}
#${ID} .dyn-rarity-item[data-tier="f"]{border-color:#ffce34}
#${ID} .dyn-rarity-item small{display:block;color:#aaa3ba}
#${ID} .dyn-note{border:1px solid #4e496b;border-radius:9px;padding:10px;margin:12px 0 0;color:#d6d1e7;min-height:40px;font-size:12px}
#${ID} .dyn-note[data-error="true"]{border-color:#df8395;color:#ffc3cd}
@media(max-width:420px){#${ID} .dyn-fields{grid-template-columns:repeat(2,minmax(0,1fr))}#${ID} h3{font-size:10px}#${ID} .dyn-columns{gap:8px}}
`;
document.head.appendChild(css);
const container=document.createElement('section');
container.id=ID;container.hidden=true;container.setAttribute('role','dialog');
container.setAttribute('aria-modal','true');container.setAttribute('aria-labelledby','icmxDynamicLabTitle');
container.innerHTML=`<div class="icmx-lab-inner">
<header><h2 id="icmxDynamicLabTitle">CARTAS DINÁMICAS · LAB</h2><button class="lab-close" id="icmxDynamicLabClose" type="button">CERRAR ×</button></header>
<p>Comparación real del LAB. Izquierda: carta aprobada en imagen. Derecha: el mismo arte con textos y valores variables. No altera tu colección LAB.</p>
<div class="dyn-fields">
<label>Diseño<select id="dynDesign"><option value="1up">1UP</option><option value="sonic">Sonic</option><option value="abuket">Abuket</option></select></label>
<label>Rareza<select id="dynVariant"><option value="b">Base</option><option value="e">Holo</option><option value="r">Dorada</option><option value="f">Full</option></select></label>
<label>PTS<input id="dynPoints" type="number" min="0" max="999999" value="10" inputmode="numeric"></label>
<label>POP<input id="dynPop" type="number" min="0" max="1000" placeholder="—" inputmode="numeric"></label>
<label>Número<input id="dynNumber" type="text" maxlength="16"></label>
<label>Nombre<input id="dynName" type="text" maxlength="80"></label>
<label>Referencia<input id="dynRef" type="text" maxlength="90"></label>
<label>Habilidad<input id="dynSkill" type="text" maxlength="200"></label>
<label>Frase<input id="dynPhrase" type="text" maxlength="180"></label>
</div>
<p><strong>Comparación:</strong> la carta izquierda conserva el diseño anterior para referencia. En la derecha, Base no lleva estrellas, Holo tiene 1, Dorada 2 y Full 3. El pie completo y los datos son independientes del arte.</p>
<div class="dyn-rarity-preview" id="dynRarityPreview" aria-label="Jerarquía de rarezas propuesta"></div>
<div class="dyn-columns">
<div class="dyn-column"><h3>CARTA ACTUAL</h3><img id="dynOld" alt="Carta actual del laboratorio"></div>
<div class="dyn-column"><h3>CARTA DINÁMICA</h3><div id="dynNew"></div></div>
</div>
<div class="dyn-note" id="dynStatus" role="status"></div></div>`;
document.body.appendChild(container);
let byId={},fullTotal=0,loaded=false,lastFocus=null;
function makeStar(cx,cy,radius=9) {
  const P=5,inner=radius*.48,pts=[];
  for(let i=0;i<P*2;i++){
    const a=-Math.PI/2+Math.PI*i/P;
    const r=i%2?inner:radius;
    pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r].map(v=>v.toFixed(2)).join(','));
  }
  return '<polygon points="'+pts.join(' ')+'" fill="#ffd21f"/>';
}
function tierPreview(){
  const labels=[['b','Base',0,10],['e','Holo',1,25],['r','Dorada',2,50],['f','Full',3,100]];
  qs('dynRarityPreview').innerHTML=labels.map(([code,label,stars,pts])=>{
    const shapes=stars?Array.from({length:stars},(_,j)=>makeStar(18+j*23,11)).join(''):
      '<circle cx="18" cy="11" r="4" fill="#ffd21f"/>';
    return '<div class="dyn-rarity-item" data-tier="'+code+'"><svg viewBox="0 0 82 22" aria-hidden="true">'+shapes+
      '</svg><strong>'+label+'</strong><small>'+pts+' PTS</small></div>';
  }).join('');
}
tierPreview();
const fieldNames=['dynNumber','dynName','dynRef','dynSkill','dynPhrase'];
const inputValue=(key,fallback)=>qs(key).value||fallback;
function restoreDefaults(){
 const d=byId[qs('dynDesign').value];if(!d)return;
 const visibleNumber=d.tipo==='Álbum'?(d.numero||'').replace(/\/\d+$/,'/???'):'BONUS';
 const map={dynNumber:visibleNumber,dynName:d.nombre||'',dynRef:d.ref||'',dynSkill:d.linea||'',dynPhrase:d.frase||''};
 for(const [key,val] of Object.entries(map))qs(key).value=val;
}
function legacyName(d,v){
 if(v==='f'){
  const aliases={theworldwarrior:'F_worldwarrior',zodiac:'F_zodiaco'};
  return aliases[d.id]||'F_'+d.id;
 }
 return d.version_original===({b:'comun',e:'holo',r:'dorada'}[v])?d.id:d.id+'_'+v;
}
function render(){
 if(!loaded)return;
 const d=byId[qs('dynDesign').value],v=qs('dynVariant').value,stat=qs('dynStatus');
 if(!d)return;
 if(v==='f'&&!d.full){
  qs('dynOld').removeAttribute('src');qs('dynNew').replaceChildren();
  stat.dataset.error='true';stat.textContent='Este diseño no tiene Full. Elige otra variante.';return;
 }
 const value=qs('dynPoints').value,pop=qs('dynPop').value;
 const resolved=window.ICMX_CARD_DATA.resolve({d:d.id,v},{
  catalog:Object.values(byId),unknownAlbumTotal:true,
  editorialOverrides:{numero:inputValue('dynNumber',d.numero),nombre:inputValue('dynName',d.nombre),
    ref:inputValue('dynRef',d.ref),linea:inputValue('dynSkill',d.linea),
    frase:inputValue('dynPhrase',d.frase)},
  fullAliases:{[d.id]:legacyName(d,'f')},
  points:value===''?undefined:Number(value),pop:pop===''?null:Number(pop),fullTotal
 });
 const card=resolved.card;
 const newer=window.ICMX_CARD_RENDERER.create(card,v,resolved.options);
 qs('dynOld').src='c2/'+legacyName(d,v)+'.webp';
 qs('dynNew').replaceChildren(newer);
 stat.dataset.error='false';
 stat.textContent='Comparación de '+card.nombre+' · '+variants[v]+'. Edita cualquier campo y la imagen de base permanece intacta.';
 const bg=newer.querySelector('.icmx-shell');
 bg.addEventListener('error',()=>{stat.dataset.error='true';stat.textContent='No se encontró la base visual para esta variante. Revisa los archivos cs2.'},{once:true});
}
function close(){
 container.hidden=true;document.body.style.removeProperty('overflow');
 if(lastFocus?.isConnected)lastFocus.focus();
}
async function open(){
 lastFocus=document.activeElement;
 container.hidden=false;
 qs('icmxDynamicLabClose').focus();
 if(!loaded){
  try{
   const response=await fetch('cartas/catalogo.json',{cache:'no-store'});
   if(!response.ok)throw Error('No se pudo cargar catálogo de cartas');
   const cat=await response.json();
   byId=Object.fromEntries(cat.filter(d=>choices.includes(d.id)).map(d=>[d.id,d]));
   fullTotal=cat.filter(d=>d.tipo==='Álbum'&&d.full).length;
   loaded=true;restoreDefaults();
  }catch(err){qs('dynStatus').dataset.error='true';qs('dynStatus').textContent=String(err.message);return;}
 }
 render();
}
qs('icmxDynamicLabClose').addEventListener('click',close);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!container.hidden){event.preventDefault();close();}});
qs('dynDesign').addEventListener('change',()=>{restoreDefaults();render();});
qs('dynVariant').addEventListener('change',()=>{
 qs('dynPoints').value=pointsByVariant[qs('dynVariant').value];render();
});
for(const id of ['dynPoints','dynPop',...fieldNames])qs(id).addEventListener('input',render);
const openButton=document.getElementById('icmxLabDynamicCards');
if(openButton)openButton.addEventListener('click',()=>{
 const panel=document.getElementById('icmxLabPanel'),toggle=document.getElementById('icmxLabToggle');
 if(panel)panel.hidden=true;if(toggle)toggle.setAttribute('aria-expanded','false');
 open();
});
})();
