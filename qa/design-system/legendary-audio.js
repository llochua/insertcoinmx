/* Original Legendary sound design. AudioContext is unlocked by the user's gesture.
   Assets are preloaded and decoded; HTMLAudio is the fallback. No external requests. */
(function(root){
'use strict';
const files={glitch:'audio/legendary-glitch.wav',wait:'audio/legendary-wait.wav',charge:'audio/legendary-charge.wav',reveal:'audio/legendary-reveal.wav'};
const gain={glitch:.60,wait:.32,charge:.58,reveal:.68};
const buffers={},pending={},fallback={};
let context=null,source=null,output=null,active=null,generation=0;
for(const [kind,src] of Object.entries(files)){const a=new Audio(src);a.preload='auto';fallback[kind]=a}
function prepare(){
 if(!context){const C=root.AudioContext||root.webkitAudioContext;if(!C)return;try{context=new C()}catch(_){return}}
 for(const [kind,src] of Object.entries(files))if(!pending[kind]){
  pending[kind]=fetch(src).then(r=>{if(!r.ok)throw Error('audio '+r.status);return r.arrayBuffer()}).then(b=>context.decodeAudioData(b)).then(b=>{buffers[kind]=b;return b}).catch(()=>null);
 }
}
function unlock(){prepare();if(context?.state==='suspended')context.resume().catch(()=>{})}
function stop(){
 generation++;active=null;
 if(source){try{source.stop()}catch(_){}source.disconnect();source=null}
 if(output){output.disconnect();output=null}
 for(const a of Object.values(fallback)){a.pause();try{a.currentTime=0}catch(_){}}
}
function play(kind){
 if(!files[kind])return;stop();active=kind;const token=generation,loop=kind==='wait';prepare();
 const html=()=>{if(token!==generation)return;const a=fallback[kind];a.loop=loop;a.volume=gain[kind];a.onended=()=>{if(token===generation&&!loop)active=null};try{a.currentTime=0;a.play().catch(()=>{if(token===generation)active=null})}catch(_){if(token===generation)active=null}};
 const start=b=>{
  if(token!==generation)return;
  if(!b||!context||context.state!=='running'){html();return}
  try{
   source=context.createBufferSource();output=context.createGain();source.buffer=b;source.loop=loop;output.gain.value=gain[kind];source.connect(output);output.connect(context.destination);
   source.onended=()=>{if(token===generation&&!loop)active=null};source.start();
  }catch(_){html()}
 };
 if(buffers[kind])start(buffers[kind]);else html();
}
root.ICMX_LG_AUDIO=Object.freeze({prepare,unlock,play,stop,active:()=>active});
})(window);
