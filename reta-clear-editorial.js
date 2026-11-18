/* Vista visual de una sola pantalla; no modifica partidas ni colecciones. */
(()=>{"use strict";
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

const choice=new URLSearchParams(location.search).get("design");
const id=Object.hasOwn(DESIGNS,choice)?choice:"gatosamurai";
document.getElementById("heroShirt").innerHTML=shirt(id,"editorial");
document.getElementById("winnerName").textContent=DESIGNS[id].name;
bgSample(id);
})();