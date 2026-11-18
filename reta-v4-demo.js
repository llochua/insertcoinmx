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
let round=0,champion=PAIRS[0],locked=false,run=0,muted=false,soundCtx=null,lastReplaced=false;
function safeName(id){return DESIGNS[id]?.name||id}
function shirt(id){
 const d=DESIGNS[id],key=id.replace(/[^a-z0-9]/g,"");
 return '<svg class="shirt" viewBox="0 0 360 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="--shirt:'+d.base+'">'+
 '<defs><linearGradient id="fold-'+key+'" x1="0" y1="0" x2="1" y2="0">'+
 '<stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".20" stop-color="#fff" stop-opacity=".10"/>'+
 '<stop offset=".35" stop-color="#000" stop-opacity=".04"/><stop offset=".60" stop-color="#fff" stop-opacity=".19"/>'+
 '<stop offset=".80" stop-color="#000" stop-opacity=".10"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>'+
 '<linearGradient id="vertical-'+key+'" x1="0" y1="0" x2="0" y2="1">'+
 '<stop offset="0" stop-color="#fff" stop-opacity=".15"/><stop offset=".46" stop-color="#fff" stop-opacity="0"/>'+
 '<stop offset="1" stop-color="#000" stop-opacity=".19"/></linearGradient>'+
 '<clipPath id="shape-'+key+'"><path d="M111 35L148 16Q180 40 212 16L249 35L338 88L302 154L263 135L260 285H100L97 135L58 154L22 88Z"/></clipPath></defs>'+
 '<g clip-path="url(#shape-'+key+')">'+
 '<path class="garment" d="M111 35L148 16Q180 40 212 16L249 35L338 88L302 154L263 135L260 285H100L97 135L58 154L22 88Z"/>'+
 '<path d="M0 0H360V300H0Z" fill="url(#vertical-'+key+')"/>'+
 /* Print is deliberately large: more of the torso, fewer decorative borders. */
 '<image class="print" href="d/'+id+'.jpg" x="96" y="50" width="168" height="219" preserveAspectRatio="xMidYMid meet"/>'+
 '<path d="M0 0H360V300H0Z" fill="url(#fold-'+key+')"/>'+
 '<path d="M103 139Q118 166 116 277M257 139Q244 162 246 277" fill="none" stroke="#000" stroke-width="3" opacity=".12"/>'+
 '<path d="M100 281H260" stroke="#fff" stroke-width="2" opacity=".12"/></g>'+
 '<path d="M111 35L148 16Q180 40 212 16L249 35L338 88L302 154L263 135L260 285H100L97 135L58 154L22 88Z" fill="none" stroke="#fff" stroke-width="2" opacity=".22"/>'+
 '<path d="M147 16Q180 58 213 16Q180 32 147 16Z" fill="#101017" stroke="#ffffff50" stroke-width="2"/>'+
 '<path d="M146 16Q180 52 214 16" fill="none" stroke="#000" stroke-width="4" opacity=".4"/>'+
 '<path d="M73 110L104 132M287 132L318 110" stroke="#fff" stroke-width="2" opacity=".12"/>'+
 '</svg>';
}
function fighter(id,slot,entry){
 const isChamp=slot==="top";
 return '<button type="button" class="fighter '+slot+(entry?' enter':'')+'" id="'+slot+'" data-side="'+slot+'" aria-label="'+
 (isChamp?'Quedarme con ':'Elegir retadora ')+safeName(id)+'">'+
 '<div class="team"><i></i><span>'+(isChamp?'01 · TU CAMPEONA':'02 · NEW CHALLENGER')+'</span></div>'+
 shirt(id)+
 '<div class="f-title"><strong>'+safeName(id)+'</strong><small>'+(isChamp?'DEFENDER':'CAMBIAR')+'</small></div></button>';
}
function progress(){
 $('roundNum').textContent=String(Math.min(round+1,TOTAL)).padStart(2,"0");
 $('pips').innerHTML=Array.from({length:TOTAL},(_,i)=>'<i class="'+(i<round?'done':i===round?'current':'')+'"></i>').join("");
}
function render(enter){
 progress();
 $('topWrap').innerHTML=fighter(champion,"top",enter==="top");
 $('bottomWrap').innerHTML=fighter(PAIRS[round+1],"bottom",enter==="bottom");
 $('top').onclick=()=>select("top");
 $('bottom').onclick=()=>select("bottom");
 $('arena').setAttribute("aria-label","Combate "+(round+1)+" de "+TOTAL+". "+safeName(champion)+" contra "+safeName(PAIRS[round+1]));
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
 const id=side==="top"?champion:PAIRS[round+1],lostSide=side==="top"?"bottom":"top";
 const winner=$(side),loser=$(lostSide);
 const n=++run;
 if(side==="bottom")lastReplaced=true;else lastReplaced=false;
 winner.classList.add("win");
 loser.classList.add(lostSide==="top"?"ko-left":"ko-right");
 $("impactText").textContent=(round===TOTAL-1?"K.O.!":"HIT!");
 $("shock").classList.remove("show");void $("shock").offsetWidth;$("shock").classList.add("show");
 $("app").classList.add("impact");
 sound("hit");
 const delay=prefersReduce?10:480;
 setTimeout(()=>{
  if(n!==run)return;
  $("app").classList.remove("impact");
  $("shock").classList.remove("show");
  champion=id;round++;
  if(round>=TOTAL){end();return}
  render(lastReplaced?"top":"bottom");
  locked=false;
 },delay);
}
function end(){
 progress();
 $("winnerName").textContent=safeName(champion);
 $("winnerArt").innerHTML=shirt(champion);
 $("finRounds").textContent=TOTAL+" ENCUENTROS · 1 CAMPEONA";
 $("finish").classList.add("on");
 $("finish").setAttribute("aria-hidden","false");
 locked=true;sound("win");
}
function reset(){
 run++;round=0;champion=PAIRS[0];locked=false;lastReplaced=false;
 $("finish").classList.remove("on");
 $("finish").setAttribute("aria-hidden","true");
 render("bottom");
 sound("start");
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
render("");
})();
