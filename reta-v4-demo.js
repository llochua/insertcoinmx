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
const PAIRS=["gatosamurai","x","fatality","shenzalcoatl","arcade","controls","samus","gameover"];
const TOTAL=PAIRS.length-1;
const $=id=>document.getElementById(id);
const prefersReduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
let round=0,champion=PAIRS[0],slots={top:PAIRS[0],bottom:PAIRS[1]},locked=false,run=0,muted=false,soundCtx=null;
let previousChampion=null,challengers=PAIRS.slice(1);
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
 im.src='d/'+id+'.jpg';
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
 '<image class="print" href="d/'+id+'.jpg" x="73" y="28" width="214" height="267" preserveAspectRatio="xMidYMid meet" mask="url(#artMask-'+key+')"/>'+
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
 '" id="'+slot+'" data-side="'+slot+'" aria-label="Elegir '+safeName(id)+'">'+
 '<div class="team"><i></i><span>'+(isChamp?'CHAMPION':'CHALLENGER')+'</span></div>'+
 shirt(id,slot)+
 '<div class="f-title"><strong>'+safeName(id)+'</strong></div></button>';
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
  if(kind==="win"){[392,523,659,784].forEach((v,i)=>note(v,i*.09,.12,.03))}
 }catch(e){}
}
function select(side){
 if(locked||round>=TOTAL)return;
 locked=true;
 const id=slots[side],lostSide=side==="top"?"bottom":"top";
 const winner=$(side),loser=$(lostSide),n=++run;
 winner.classList.add("win");
 loser.classList.add(lostSide==="top"?"ko-left":"ko-right");
 $("impactText").textContent=round===TOTAL-1?"K.O.!":"HIT!";
 $("shock").classList.remove("show");void $("shock").offsetWidth;$("shock").classList.add("show");
 $("app").classList.add("impact");sound("hit");
 setTimeout(()=>{
  if(n!==run)return;
  $("app").classList.remove("impact");$("shock").classList.remove("show");
  winner.classList.remove("win");
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
 previousChampion=champion;
 $('winnerName').textContent=safeName(champion);
 $('winnerShirt').innerHTML=shirt(champion,'finish');
 $('winnerBg').style.setProperty('--winner-art',`url("c2/${champion}.jpg")`);
 bgSample(champion);
 const screen=$('finish');
 screen.classList.remove('on');void screen.offsetWidth;
 screen.classList.add('on');
 screen.setAttribute('aria-hidden','false');
 locked=true;
 sound('win');
}
function reset(){
 run++;round=0;
 champion=previousChampion||PAIRS[0];
 challengers=PAIRS.filter(id=>id!==champion);
 slots={top:champion,bottom:challengers[0]};
 locked=false;
 $('app').classList.remove('victory-hold');
 $('finish').classList.remove('on');
 $('finish').setAttribute('aria-hidden','true');
 render(true);sound('start');
}
$("reset").onclick=reset;
$("again").onclick=reset;
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
/* Atajo exclusivo de revisión: simula que ya ocurrieron los seis
   primeros encuentros. Una elección permite evaluar el K.O. y el Stage Clear. */
if(new URLSearchParams(location.search).get('preview')==='final'){
 round=TOTAL-1;
 slots={top:champion,bottom:challengers[round]};
}
render(true);
})();
