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
const PRINTS=new Map();
function safeName(id){return DESIGNS[id]?.name||id}
/* El JPG de catálogo conserva su fondo original. Lo separamos por color
   para integrarlo sobre tela, sin inventar ni regenerar las ilustraciones. */
function preparePrint(id){
 if(PRINTS.has(id))return;
 PRINTS.set(id,null);
 const im=new Image();
 im.onload=()=>{
  try{
   const w=im.naturalWidth,h=im.naturalHeight,cv=document.createElement("canvas");
   cv.width=w;cv.height=h;const ctx=cv.getContext("2d",{willReadFrequently:true});
   ctx.drawImage(im,0,0);const raw=ctx.getImageData(0,0,w,h),p=raw.data;
   const pts=[[3,3],[w-4,3],[3,h-4],[w-4,h-4],[Math.floor(w/2),h-4]];
   const colors=pts.map(([x,y])=>{const k=(y*w+x)*4;return[p[k],p[k+1],p[k+2]]});
   colors.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));
   const bg=colors[Math.floor(colors.length/2)];
   for(let k=0;k<p.length;k+=4){
    const dr=p[k]-bg[0],dg=p[k+1]-bg[1],db=p[k+2]-bg[2];
    const d=Math.sqrt((dr*dr+dg*dg+db*db)/3);
    const t=Math.max(0,Math.min(1,(d-12)/34));
    const alpha=t*t*(3-2*t);
    if(alpha>0&&alpha<1){
     // Quitar halo del JPG al recuperar los tonos originales del estampado.
     const a=Math.max(alpha,.14);
     for(let z=0;z<3;z++)p[k+z]=Math.max(0,Math.min(255,(p[k+z]-bg[z]*(1-a))/a));
    }
    p[k+3]=Math.round(alpha*255);
   }
   ctx.putImageData(raw,0,0);
   const uri=cv.toDataURL("image/png");
   PRINTS.set(id,uri);
   document.querySelectorAll('image[data-print-id="'+id+'"]').forEach(n=>{
    n.setAttribute("href",uri);n.classList.remove("pending");
   });
  }catch(err){PRINTS.set(id,"d/"+id+".jpg");injectPrint(id,"d/"+id+".jpg")}
 };
 im.onerror=()=>{PRINTS.set(id,"d/"+id+".jpg");injectPrint(id,"d/"+id+".jpg")};
 im.src="d/"+id+".jpg";
}
function injectPrint(id,url){
 document.querySelectorAll('image[data-print-id="'+id+'"]').forEach(n=>{
  n.setAttribute("href",url);n.classList.remove("pending");
 });
}
function shirt(id,uid){
 const d=DESIGNS[id],key=id+"-"+uid,shape="M106 29L143 16Q180 42 217 16L254 29L342 88L309 148L281 133L278 286H82L79 133L51 148L18 88Z";
 const uri=PRINTS.get(id),ready=!!uri;
 return '<svg class="shirt" viewBox="0 0 360 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="--shirt:'+d.base+'">'+
 '<defs><linearGradient id="fold-'+key+'" x1="0" y1="0" x2="1" y2=".1">'+
 '<stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".18" stop-color="#fff" stop-opacity=".1"/>'+
 '<stop offset=".36" stop-color="#000" stop-opacity=".12"/><stop offset=".56" stop-color="#fff" stop-opacity=".12"/>'+
 '<stop offset=".79" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".48"/></linearGradient>'+
 '<linearGradient id="vertical-'+key+'" x1="0" y1="0" x2=".05" y2="1">'+
 '<stop offset="0" stop-color="#fff" stop-opacity=".21"/><stop offset=".37" stop-color="#fff" stop-opacity=".02"/>'+
 '<stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>'+
 '<clipPath id="shape-'+key+'"><path d="'+shape+'"/></clipPath></defs>'+
 '<g clip-path="url(#shape-'+key+')">'+
 '<path class="garment" d="'+shape+'"/>'+
 '<path d="M0 0H360V300H0Z" fill="url(#vertical-'+key+')"/>'+
 '<path d="M70 120Q85 134 108 151L114 283M290 120Q275 134 252 151L246 283" stroke="#000" stroke-width="4" fill="none" opacity=".16"/>'+
 '<image class="print'+(ready?'':' pending')+'" data-print-id="'+id+'" href="'+(ready?uri:'')+'" x="87" y="45" width="186" height="222" preserveAspectRatio="xMidYMid meet"/>'+
 '<path d="M0 0H360V300H0Z" fill="url(#fold-'+key+')"/>'+
 '<path d="M86 280H274" stroke="#fff" stroke-width="2" opacity=".13"/></g>'+
 '<path d="'+shape+'" fill="none" stroke="#fff" stroke-width="2.5" opacity=".23"/>'+
 '<path d="M142 16Q180 55 218 16Q180 34 142 16Z" fill="#0d0c16" stroke="#ffffff50" stroke-width="2"/>'+
 '<path d="M141 16Q180 54 219 16" fill="none" stroke="#000" stroke-width="4" opacity=".35"/>'+
 '<path d="M55 111L80 133M280 133L305 111" stroke="#fff" stroke-width="2" opacity=".16"/>'+
 '</svg>'
}
function fighter(id,slot,isChamp,entry){
 return '<button type="button" class="fighter '+slot+(isChamp?' is-champion':'')+(entry?' enter':'')+
 '" id="'+slot+'" data-side="'+slot+'" aria-label="Elegir '+safeName(id)+'">'+
 '<div class="team"><i></i><span>'+(isChamp?'TU CAMPEONA':'HERE COMES A NEW CHALLENGER!')+'</span></div>'+
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
 preparePrint(id);
}
function refreshRoles(){
 for(const slot of ["top","bottom"]){
  const el=$(slot),isChamp=slots[slot]===champion;
  el.classList.toggle("is-champion",isChamp);
  el.querySelector(".team span").textContent=isChamp?"TU CAMPEONA":"HERE COMES A NEW CHALLENGER!";
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
  if(round>=TOTAL){end();return}
  // La ganadora nunca cambia de posición. Solo entra otro retador
  // en la ranura que quedó libre tras el impacto.
  slots[lostSide]=PAIRS[round+1];
  progress();
  paintSlot(lostSide,true);
  refreshRoles();
  locked=false;
 },prefersReduce?10:480);
}
function end(){
 progress();
 $("winnerName").textContent=safeName(champion);
 $("winnerCard").src="c2/"+champion+".jpg";
 $("finBackdrop").style.backgroundImage='url("d/'+champion+'.jpg")';
 $("finRounds").textContent=TOTAL+" ENCUENTROS · "+PAIRS.length+" DISEÑOS COMPARADOS";
 $("finish").classList.remove("on");void $("finish").offsetWidth;$("finish").classList.add("on");
 $("finish").setAttribute("aria-hidden","false");
 locked=true;sound("win");
}
function reset(){
 run++;round=0;champion=PAIRS[0];slots={top:PAIRS[0],bottom:PAIRS[1]};locked=false;
 $("finish").classList.remove("on");$("finish").setAttribute("aria-hidden","true");
 render(true);sound("start");
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
render(true);
})();
