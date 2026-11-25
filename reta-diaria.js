/* RETA V4 · LAB
 No modifica ningún dato del álbum. Usa sólo imágenes existentes /d de Insert Coin MX.
 Un mismo escenario, siete comparaciones; sin pantallas ni clics de "Siguiente". */
(() => {
"use strict";
const DESIGNS={
 gatosamurai:{name:"Gato Samurái",base:"#2b55a0"},
 x:{name:"X",base:"#1154b3"},
 fatality:{name:"Fatality",base:"#171417"},
 shenzalcoatl:{name:"Shenzalcoatl",base:"#111417"},
 arcade:{name:"Anatomía del Arcade",base:"#efeee9"},
 controls:{name:"Controls",base:"#1b2148"},
 samus:{name:"Samus",base:"#12203b"},
 gameover:{name:"Game Over",base:"#181518"}
};
let PAIRS=["gatosamurai","x","fatality","shenzalcoatl","arcade","controls","samus","gameover"];
let TOTAL=PAIRS.length-1;
const $=id=>document.getElementById(id);
const isEmbedded=new URLSearchParams(location.search).get('embedded')==='1';
if(isEmbedded)document.documentElement.classList.add('embedded');
let dailyDay='',dailyState=null;
let communityPacket=null,communityWait=null;
function clearCommunity(){
 communityPacket=null;communityWait=null;
 $('communityDuel').hidden=true;$('communitySummary').hidden=true;
}
function displayCommunity(row,chosen,other){
 const panel=$('communityDuel');
 panel.replaceChildren();
 const add=(tag,cls,copy,parent=panel)=>{
  const node=document.createElement(tag);node.className=cls;node.textContent=copy;parent.appendChild(node);return node;
 };
 add('strong','community-title','LA COMUNIDAD ELIGIÓ');
 if(!row||row.winner!==chosen||row.loser!==other){
  add('p','community-note','Resultados no disponibles por ahora.');
 }else{
  const total=row.winner_votes+row.loser_votes;
  if(total===0)add('p','community-note','Aún no hay votos de otros jugadores en este duelo.');
  else{
   const pct=Math.round(100*row.winner_votes/total);
   const pair=add('div','community-pair','');
   for(const [name,share,own] of [[chosen,pct,true],[other,100-pct,false]]){
    const option=add('div','community-option'+(own?' chosen':''),'',pair);
    add('span','community-name',safeName(name),option);
    add('b','community-pct',share+'%',option);
    const bar=add('div','community-bar','',option);
    const fill=add('i','','',bar);fill.style.width=share+'%';
   }
   add('p','community-note',(row.winner_votes===row.loser_votes?'¡Empate!':row.winner_votes>row.loser_votes?'Coincides con la mayoría.':'Elegiste diferente.')+' · '+total+' '+(total===1?'voto':'votos'));
  }
 }
 panel.hidden=false;
}
function displaySummary(packet){
 const label=$('communitySummary');
 if(!isEmbedded)return;
 const rows=packet?.results;
 label.hidden=false;
 if(!Array.isArray(rows)||rows.length!==TOTAL){label.textContent='Resultados comunitarios no disponibles.';return}
 const known=rows.filter(r=>r.winner_votes!==r.loser_votes);
 const withVotes=rows.filter(r=>r.winner_votes+r.loser_votes>0);
 const agreed=known.filter(r=>r.winner_votes>r.loser_votes).length;
 label.textContent=known.length?'Coincidiste con la mayoría en '+agreed+' de '+known.length+' duelos con mayoría.':withVotes.length?'Los duelos con votos quedaron empatados.':'Aún no hay votos de otros jugadores en tus duelos.';
}
function waitForCommunity(completed){
 return new Promise(resolve=>{
  if(communityPacket?.completed===completed){resolve(communityPacket);return}
  let settled=false;
  const finish=packet=>{if(settled)return;settled=true;clearTimeout(timer);if(communityWait?.finish===finish)communityWait=null;resolve(packet)};
  const timer=setTimeout(()=>finish(null),1400);
  communityWait={completed,finish};
 });
}
const artSrc=id=>DESIGNS[id]?.art||'d/'+id+'.webp';
const ambientSrc=id=>DESIGNS[id]?.ambient||'c2/'+id+'.webp';
const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const tellParent=data=>{if(isEmbedded)window.parent.postMessage(data,location.origin)};
const prefersReduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
let round=0,champion=PAIRS[0],slots={top:PAIRS[0],bottom:PAIRS[1]},locked=false,run=0,muted=isEmbedded,soundCtx=null;
let previousChampion=null,challengers=PAIRS.slice(1),streak=0;
/* RETA V4.2: fondo de la playera = color real de la plasta del diseño.
   El JPG original se enmascara suavemente dentro de la silueta, SIN borrar
   píxeles del estampado. Se evita el parche rectangular sin inventar arte. */
const SHIRT_BG=new Map();
function safeName(id){return DESIGNS[id]?.name||id}
function bgSample(id){
 if(SHIRT_BG.has(id))return;
 SHIRT_BG.set(id,DESIGNS[id].base);
 const im=new Image();
 im.onload=()=>{
  try{
   const cv=document.createElement("canvas");
   cv.width=80;cv.height=100;
   const c=cv.getContext("2d",{willReadFrequently:true});
   c.drawImage(im,0,0,80,100);
   const d=c.getImageData(0,0,80,100).data, pts=[];
   for(const [x,y] of [[2,2],[77,2],[2,97],[77,97],[40,97],[2,50],[77,50]]){
    const z=(y*80+x)*4;pts.push([d[z],d[z+1],d[z+2]]);
   }
   const median=channel=>pts.map(p=>p[channel]).sort((a,b)=>a-b)[Math.floor(pts.length/2)];
   const hex='#'+[0,1,2].map(ch=>median(ch).toString(16).padStart(2,'0')).join('');
   SHIRT_BG.set(id,hex);
   document.querySelectorAll('svg.shirt[data-shirt-id="'+id+'"]').forEach(svg=>svg.style.setProperty('--shirt',hex));
  }catch(e){/* El color declarado de respaldo ya está aplicado. */}
 };
 im.src=artSrc(id);
}
function shirt(id,uid){
 const d=DESIGNS[id],key=id+'-'+uid;
 const shape='M106 29L143 16Q180 42 217 16L254 29L342 88L309 148L281 133L278 286H82L79 133L51 148L18 88Z';
 const base=SHIRT_BG.get(id)||d.base;
 return '<svg class="shirt" data-shirt-id="'+id+'" viewBox="0 0 360 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="--shirt:'+base+'">'+
 '<defs>'+
 '<clipPath id="shape-'+key+'"><path d="'+shape+'"/></clipPath>'+
 '<linearGradient id="fold-'+key+'" x1="0" y1="0" x2="1" y2="0">'+
 '<stop offset="0" stop-color="#000" stop-opacity=".44"/>'+
 '<stop offset=".13" stop-color="#fff" stop-opacity=".05"/>'+
 '<stop offset=".29" stop-color="#000" stop-opacity=".12"/>'+
 '<stop offset=".52" stop-color="#fff" stop-opacity=".13"/>'+
 '<stop offset=".76" stop-color="#000" stop-opacity=".07"/>'+
 '<stop offset="1" stop-color="#000" stop-opacity=".39"/></linearGradient>'+
 '<linearGradient id="depth-'+key+'" x1="0" y1="0" x2="0" y2="1">'+
 '<stop offset="0" stop-color="#fff" stop-opacity=".11"/>'+
 '<stop offset=".35" stop-color="#fff" stop-opacity="0"/>'+
 '<stop offset="1" stop-color="#000" stop-opacity=".27"/></linearGradient>'+
 /* The JPEG is 4:5, projected almost at native ratio across the torso. */
 '<linearGradient id="fadeX-'+key+'" x1="0%" y1="0%" x2="100%" y2="0%">'+
 '<stop offset="0" stop-color="#fff" stop-opacity="0"/>'+
 '<stop offset=".045" stop-color="#fff" stop-opacity="1"/>'+
 '<stop offset=".955" stop-color="#fff" stop-opacity="1"/>'+
 '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'+
 '<linearGradient id="fadeY-'+key+'" x1="0%" y1="0%" x2="0%" y2="100%">'+
 '<stop offset="0" stop-color="#fff" stop-opacity="0"/>'+
 '<stop offset=".045" stop-color="#fff" stop-opacity="1"/>'+
 '<stop offset=".955" stop-color="#fff" stop-opacity="1"/>'+
 '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'+
 '<mask id="fadeVertical-'+key+'" maskUnits="userSpaceOnUse" x="73" y="28" width="214" height="267">'+
 '<rect x="73" y="28" width="214" height="267" fill="url(#fadeY-'+key+')"/></mask>'+
 '<mask id="artMask-'+key+'" maskUnits="userSpaceOnUse" x="73" y="28" width="214" height="267">'+
 '<rect x="73" y="28" width="214" height="267" fill="url(#fadeX-'+key+')" mask="url(#fadeVertical-'+key+')"/></mask>'+
 '</defs>'+
 '<g clip-path="url(#shape-'+key+')">'+
 '<path d="'+shape+'" fill="var(--shirt)"/>'+
 '<image class="print" href="'+artSrc(id)+'" x="73" y="28" width="214" height="267" preserveAspectRatio="xMidYMid meet" mask="url(#artMask-'+key+')"/>'+
 '<path d="M0 0H360V300H0Z" fill="url(#fold-'+key+')"/>'+
 '<path d="M0 0H360V300H0Z" fill="url(#depth-'+key+')"/>'+
 '<path d="M92 130Q101 163 106 280M268 130Q257 163 253 280" fill="none" stroke="#000" stroke-width="3" opacity=".08"/>'+
 '<path d="M85 280H276" stroke="#fff" stroke-width="1.7" opacity=".13"/>'+
 '</g>'+
 '<path d="'+shape+'" fill="none" stroke="#fff" stroke-width="2.2" opacity=".19"/>'+
 '<path d="M142 16Q180 55 218 16Q180 34 142 16Z" fill="#101018" stroke="#ffffff46" stroke-width="2"/>'+
 '<path d="M141 16Q180 54 219 16" fill="none" stroke="#000" stroke-width="4" opacity=".35"/>'+
 '<path d="M55 111L80 133M280 133L305 111" stroke="#fff" stroke-width="2" opacity=".11"/>'+
 '</svg>'
}
function fighter(id,slot,isChamp,entry){
 return '<button type="button" class="fighter '+slot+(isChamp?' is-champion':'')+(entry?' enter':'')+
 '" id="'+slot+'" data-side="'+slot+'" aria-label="Elegir '+htmlEscape(safeName(id))+'">'+
 '<div class="team"><i></i><span>'+(isChamp?'CHAMPION':'CHALLENGER')+'</span></div>'+
 shirt(id,slot)+
 '</button>';
}
function progress(){
 $('roundNum').textContent=String(Math.min(round+1,TOTAL)).padStart(2,"0");
 $('pips').innerHTML=Array.from({length:TOTAL},(_,i)=>'<i class="'+(i<round?'done':i===round?'current':'')+'"></i>').join("");
}
function paintSlot(slot,enter){
 const id=slots[slot],isChamp=champion===id;
 $(slot+"Wrap").innerHTML=fighter(id,slot,isChamp,enter);
 $(slot).onclick=()=>select(slot);
 bgSample(id);
}
function refreshRoles(){
 for(const slot of ["top","bottom"]){
  const el=$(slot),isChamp=slots[slot]===champion;
  el.classList.toggle("is-champion",isChamp);
  el.querySelector(".team span").textContent=isChamp?"CHAMPION":"CHALLENGER";
 }
 $("duelTop").textContent=safeName(slots.top);
 $("duelBottom").textContent=safeName(slots.bottom);
 $("duelTop").classList.toggle("incumbent",slots.top===champion);
 $("duelBottom").classList.toggle("incumbent",slots.bottom===champion);
 $('arena').setAttribute("aria-label","Encuentro "+(round+1)+" de "+TOTAL+
 ". "+safeName(slots.top)+" contra "+safeName(slots.bottom));
}
function render(first){
 progress();
 if(first){paintSlot("top",false);paintSlot("bottom",true)}
 refreshRoles();
}
function sound(kind){
 if(muted)return;
 try{
  soundCtx=soundCtx||new(window.AudioContext||window.webkitAudioContext)();
  if(soundCtx.state==="suspended")soundCtx.resume();
  let now=soundCtx.currentTime;
  const note=(f,start,duration,vol,shape)=>{
   const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();
   osc.type=shape||"square";osc.frequency.setValueAtTime(f,now+start);
   osc.frequency.exponentialRampToValueAtTime(Math.max(55,f/2),now+start+duration);
   gain.gain.setValueAtTime(Math.max(.001,vol),now+start);
   gain.gain.exponentialRampToValueAtTime(.001,now+start+duration);
   osc.connect(gain);gain.connect(soundCtx.destination);
   osc.start(now+start);osc.stop(now+start+duration+.01)
  };
  if(kind==="hit"){note(190,0,.08,.047,"sawtooth");note(82,.052,.19,.055,"square")}
  if(kind==="start"){note(440,0,.06,.02);note(660,.10,.08,.02)}
  if(kind==="win"){[392,494,587,784,1047].forEach((v,i)=>note(v,i*.125,i===4?.42:.17,i===4?.042:.035,i===4?"triangle":"square"))}
 }catch(e){}
}
function select(side){
 if(locked||round>=TOTAL)return;
 locked=true;
 const id=slots[side],lostSide=side==="top"?"bottom":"top",other=slots[lostSide];
 if(isEmbedded)tellParent({type:'icmx-reta-choice',day:dailyDay,round,side,winner:id});
 const winner=$(side),loser=$(lostSide),n=++run;
 winner.classList.add("win");
 loser.classList.add(lostSide==="top"?"ko-left":"ko-right");
 // Conteo consecutivo del mismo diseño: un cambio de campeón es COUNTER.
 const counter=id!==champion;
 streak=counter?1:streak+1;
 const finisher=round===TOTAL-1;
 const call=finisher?"FINISH HIM!":counter?"COUNTER!":streak>=2?streak+" HITS!":"HIT!";
 $("impactText").textContent=call;
 $("shock").classList.toggle("finisher",finisher);
 $("shock").classList.toggle("counter",counter&&!finisher);
 $("shock").classList.remove("show");void $("shock").offsetWidth;$("shock").classList.add("show");
 $("app").classList.add("impact");sound("hit");
 setTimeout(async()=>{
  if(n!==run)return;
  $("app").classList.remove("impact");$("shock").classList.remove("show");
  winner.classList.remove("win");
  if(isEmbedded){
   const packet=await waitForCommunity(round+1);
   if(n!==run)return;
   displayCommunity(packet?.results?.[round],id,other);
   await new Promise(resolve=>setTimeout(resolve,2100));
   if(n!==run)return;
   $('communityDuel').hidden=true;
  }
  champion=id;round++;
  if(round>=TOTAL){
   $('app').classList.add('victory-hold');winner.classList.add('last-one');
   setTimeout(()=>{if(n===run)end(side)},prefersReduce?15:420);
   return;
  }
  // La ganadora nunca cambia de posición. Solo entra otro retador
  // en la ranura que quedó libre tras el impacto.
  slots[lostSide]=challengers[round];
  progress();
  paintSlot(lostSide,true);
  refreshRoles();
  locked=false;
 },prefersReduce?10:480);
}
function end(side){
 // La pantalla de victoria no es una ficha ni un resumen: solo la
 // playera ganadora, WINNER IS y la siguiente acción.
 const titleDefended=previousChampion===champion;
 previousChampion=champion;
 $('winnerName').textContent=safeName(champion);
 $('winnerStatus').textContent=(dailyState&&dailyState.done?dailyState.titleDefended:titleDefended)?'TÍTULO DEFENDIDO':'TU NUEVA CAMPEONA';
 $('winnerFuture').textContent='Mañana podrás defenderla.';
 if(isEmbedded)displaySummary(communityPacket);
 const fallen=slots[side==='top'?'bottom':'top'];
 const earlier=PAIRS.filter(id=>id!==champion&&id!==fallen).slice(-1)[0]||fallen;
 $('winnerShirt').innerHTML=shirt(champion,'finish');
 $('winnerEchoLeft').innerHTML=shirt(fallen,'echo-left');
 $('winnerEchoRight').innerHTML=shirt(earlier,'echo-right');
 $('winnerBg').style.setProperty('--winner-art','url("'+ambientSrc(champion)+'")');
 bgSample(champion);bgSample(fallen);bgSample(earlier);
 const screen=$('finish');
 screen.dataset.origin=side;
 screen.classList.remove('on');void screen.offsetWidth;
 screen.classList.add('on');
 screen.setAttribute('aria-hidden','false');
 locked=true;
 sound('win');
}
function reset(){
 run++;round=0;streak=0;
 champion=previousChampion||PAIRS[0];
 challengers=PAIRS.filter(id=>id!==champion);
 slots={top:champion,bottom:challengers[0]};
 locked=false;
 $('app').classList.remove('victory-hold');
 $('finish').classList.remove('on');
 $('finish').setAttribute('aria-hidden','true');
 render(true);sound('start');
}
$("reset").onclick=isEmbedded?()=>{}:reset;
$("again").onclick=isEmbedded?()=>{}:reset;
const sobres=$('finish').querySelector('.winner-next');
if(isEmbedded&&sobres)sobres.onclick=e=>{e.preventDefault();tellParent({type:'icmx-reta-pack',day:dailyDay,action:sobres.dataset.action||'pack'})};
$("mute").onclick=()=>{
 muted=!muted;$("mute").textContent=muted?"♪̸":"♫";
 $("mute").setAttribute("aria-label",muted?"Activar sonido":"Silenciar sonido");
 $("mute").setAttribute("aria-pressed",String(muted));
};
document.addEventListener("keydown",e=>{
 if(locked)return;
 if(e.key==="ArrowUp"){e.preventDefault();select("top")}
 if(e.key==="ArrowDown"){e.preventDefault();select("bottom")}
});
/* En producción, el álbum entrega el catálogo vigente y el estado diario
   por mensajería mismo origen. El iframe no escribe en localStorage. */
function hydrate(config){
 const entries=Array.isArray(config.catalog)?config.catalog:[];
 for(const d of entries){
  if(!d||!(/^[a-z0-9]{1,40}$/).test(d.id))continue;
  DESIGNS[d.id]={
   name:String(d.name||d.id).slice(0,90),
   base:/^#[0-9a-f]{6}$/i.test(d.base)?d.base:'#1b2148',
   art:String(d.art||'d/'+d.id+'.webp'),
   ambient:String(d.ambient||d.art||'d/'+d.id+'.webp')
  };
 }
 const state=config.state;
 if(!state||!Array.isArray(state.roster)||state.roster.length!==8||state.roster.some(id=>!DESIGNS[id]))return;
 clearCommunity();
 dailyState=state;dailyDay=state.day;
 // El sitio principal gobierna el audio: no hay segundo mute independiente.
 if(isEmbedded)muted=!!config.audioMuted;
  if(isEmbedded&&sobres){
   const action=config.packsAvailable?'pack':config.canTrade?'trade':'album';
   sobres.dataset.action=action;
   sobres.textContent=action==='pack'?'ABRIR SOBRE':action==='trade'?'CANJEAR UN SOBRE EXTRA':'VER MI ÁLBUM';
   const note=$('winnerPackNote');
   note.hidden=action==='pack';
   note.textContent=action==='trade'?'Sin sobres por hoy. Tienes repetidas para conseguir otro.':action==='album'?'Sin sobres por hoy. Mañana llegan 2 más.':'';
  }
 PAIRS=state.roster.slice();TOTAL=PAIRS.length-1;
 champion=state.champion;
 slots={top:state.top,bottom:state.bottom};
 round=Math.max(0,Math.min(TOTAL,state.round|0));
 streak=state.streak|0;previousChampion=state.lastChampion||null;
 challengers=PAIRS.slice(1);run++;locked=false;
 $('finish').classList.remove('on');$('finish').setAttribute('aria-hidden','true');
 render(true);
 if(state.done||round>=TOTAL){round=TOTAL;end(state.lastSide||'top')}
}
if(isEmbedded){
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.origin!==location.origin)return;
  const data=event.data;
  if(data?.type==='icmx-audio-state')muted=!!data.muted;
  if(data?.type==='icmx-reta-init')hydrate(data);
  if(data?.type==='icmx-reta-community'&&data.day===dailyDay&&data.seed===dailyState?.seed&&Number.isInteger(data.completed)&&(data.completed===round||data.completed===round+1)){
   if(communityPacket&&communityPacket.completed>data.completed)return;
   communityPacket=data;
   if(communityWait?.completed===data.completed)communityWait.finish(data);
   if(round===TOTAL)displaySummary(data);
  }
 });
 window.parent.postMessage({type:'icmx-reta-ready'},location.origin);
}else{
 const preview=new URLSearchParams(location.search);
 if(preview.get('preview')==='final'){
  round=TOTAL-1;slots={top:champion,bottom:challengers[round]};
 }
 if(preview.get('preview')==='winner'){
  const chosen=preview.get('design');
  if(chosen&&Object.prototype.hasOwnProperty.call(DESIGNS,chosen))champion=chosen;
  slots={top:champion,bottom:PAIRS.find(id=>id!==champion)};
  round=TOTAL;
 }
 render(true);
 if(preview.get('preview')==='winner')end('top');
}
})();