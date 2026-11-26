/* Legendary · LAB only. Artwork, frame and metadata are independent layers. */
(function(root){
'use strict';
const PATH='qa/design-system/legendary/';
const ids=['kame','enjoy','hipstermario'];
const art=id=>PATH+id+'.webp';
const frame=PATH+'frame.webp';
const keys=ids.map(id=>id+'_l');
const owned=have=>keys.filter(k=>Number(have?.[k])>0);
const escape=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
let seq=0;
function makeCards(db){return ids.map(id=>({k:id+'_l',n:db[id].n,cat:db[id].cat,r:'legendary',v:'l',bx:false,no:0,d:id,img:id}))}
function roll(hand,deck,force,rng=Math.random){
 const result=hand.slice();
 if(force==='none')return result;
 if(force&&force!=='random'){
  const c=deck.find(x=>x.d===force);
  if(c){const i=result.findIndex(x=>x.v==='b');if(i>=0){result.splice(i,1);result.unshift({...c})}}
  return result;
 }
 // Existing slots: 3 base + .7 expected base in surprise slot. Replace only base.
 return result.map(c=>c.v==='b'&&rng()<1/74?{...deck[Math.min(deck.length-1,Math.floor(rng()*deck.length))]}:c);
}
function clear(fx){
 if(!fx)return;
 fx.querySelectorAll(':scope > .lg-layer').forEach(n=>n.remove());
 fx.querySelector('img')?.classList.remove('lg-art');
 fx.classList.remove('lg-mounted');
}
function mount(fx,c){
 clear(fx);
 fx.classList.add('r-legendary','lg-mounted');
 const img=fx.querySelector('img');if(!img)return Promise.resolve(false);
 img.classList.add('lg-art');img.style.opacity='1';img.src=art(c.d);img.alt='Ilustración de '+c.n;
 const fr=document.createElement('img');fr.className='lg-layer lg-frame';fr.alt='';fr.src=frame;fx.append(fr);
 for(const name of ['grain','varnish','dots','shine']){const el=document.createElement('i');el.className='lg-layer lg-'+name;fx.append(el)}
 const id='lg-metal-'+(++seq),size=c.n.length>19?40:46;
 fx.insertAdjacentHTML('beforeend','<svg class="lg-layer lg-data" viewBox="0 0 960 1340" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#faf5ff"/><stop offset=".24" stop-color="#b7cbe7"/><stop offset=".45" stop-color="#fefaff"/><stop offset=".65" stop-color="#d7b4f5"/><stop offset="1" stop-color="#f8f1ff"/></linearGradient></defs><text x="480" y="1118" font-size="27" letter-spacing="7" fill="url(#'+id+')">★★★★</text><text x="480" y="1160" font-size="45" font-style="italic" letter-spacing="2" fill="url(#'+id+')">LEGENDARY</text><text x="480" y="1210" font-size="'+size+'" fill="#fff">'+escape(c.n)+'</text><text x="480" y="1262" font-size="31" letter-spacing="1.2" fill="#eee8fa">250 PTS</text></svg>');
 const decode=im=>im.complete&&im.naturalWidth?Promise.resolve():im.decode();
 return Promise.all([decode(img),decode(fr)]).then(()=>true,()=>false);
}
function face(c){return '<span class="fx idle r-legendary"><img src="'+art(c.d)+'" alt=""><i class="foil"></i><i class="glare"></i></span>'}
function load(src){const img=new Image();img.src=src;return img.decode().then(()=>img)}
async function drawInto(ctx,c,x,y,w,h){
 const [a,f]=await Promise.all([load(art(c.d)),load(frame)]);
 const cv=document.createElement('canvas');cv.width=960;cv.height=1340;const g=cv.getContext('2d');
 g.save();g.beginPath();g.roundRect(36,36,889,1268,38);g.clip();
 const scale=Math.max(889/a.width,1268/a.height);g.drawImage(a,36+(889-a.width*scale)/2,36,a.width*scale,a.height*scale);g.restore();
 g.drawImage(f,0,0,960,1340);g.textAlign='center';g.fillStyle='#f5edff';
 for(const [t,py,sz] of [['★★★★',1118,27],['LEGENDARY',1160,45],[c.n,1210,c.n.length>19?40:46],['250 PTS',1262,31]]){g.font='bold '+sz+'px Arial';g.fillText(t,480,py,850)}
 ctx.drawImage(cv,x,y,w,h);
}
root.ICMX_LEGENDARY=Object.freeze({ids,keys,owned,art,frame,makeCards,roll,mount,clear,face,drawInto});
})(window);
