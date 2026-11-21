/* Insert Coin MX — acceso de invitado. No lee ni escribe la colección. */
const STYLE = `
@font-face{font-family:ICGuestAV;src:url('/f/AvenirNextLTPro-Demi.otf') format('opentype');font-weight:500 600;font-display:swap}
@font-face{font-family:ICGuestAV;src:url('/f/AvenirNextLTPro-Bold.otf') format('opentype');font-weight:700 900;font-display:swap}
@font-face{font-family:ICGuestPX;src:url('/ps2p.ttf') format('truetype');font-display:swap}
#icmxGuestGate{position:fixed;inset:0;z-index:150;display:flex;justify-content:center;align-items:center;padding:clamp(16px,4vw,30px);overflow:auto;background:radial-gradient(120% 100% at 50% 40%,#1a1666 0,#0c0b2a 68%,#05041a 100%);color:#f3f1ff;font:600 14px/1.5 ICGuestAV,system-ui,sans-serif}
#icmxGuestGate[hidden],#icmxGuestGate [hidden]{display:none!important}
#icmxGuestGate *{box-sizing:border-box}
#icmxGuestGate .guest-panel{width:min(440px,100%);max-height:calc(100dvh - 40px);overflow:auto;padding:24px clamp(18px,5vw,28px);border:1px solid rgba(255,212,0,.36);border-radius:17px;background:linear-gradient(145deg,#292252,#14102b 80%);box-shadow:0 0 0 5px #0b0921,0 24px 62px #0008;text-align:center}
#icmxGuestGate .guest-brand{display:flex;align-items:center;flex-direction:column;gap:9px;margin:0 0 21px}
#icmxGuestGate .guest-brand img{display:block;object-fit:contain;width:98px;max-width:45%;height:auto}
#icmxGuestGate .guest-brand small{color:#ffd400;font:800 10px/1.4 ICGuestAV,system-ui,sans-serif;letter-spacing:.12em}
#icmxGuestGate h2{font:800 clamp(22px,5.6vw,28px)/1.2 ICGuestAV,system-ui,sans-serif;color:#fff;margin:0 0 10px}
#icmxGuestGate p{font:500 13px/1.5 ICGuestAV,system-ui,sans-serif;color:#d9d4e7;margin:0 0 16px}
#icmxGuestGate .guest-warning{margin:18px 0 0!important;padding:14px;border:1px solid #ffd40044;border-radius:11px;background:#ffd40011;text-align:left;font-size:12px}
#icmxGuestGate label{display:block;text-align:left;margin:14px 0 7px;font:700 11px ICGuestAV,system-ui,sans-serif;color:#f3eefa}
#icmxGuestGate input{min-width:0;width:100%;height:46px;padding:10px 12px;border:1px solid #ffffff45;border-radius:10px;background:#120e29;color:#fff;font:600 15px ICGuestAV,system-ui,sans-serif}
#icmxGuestGate input::placeholder{color:#837b9c}
#icmxGuestGate #icmxGuestIni{font:23px ICGuestPX,monospace;letter-spacing:.2em;text-align:center;color:#ffd400;padding-left:calc(12px + .2em);text-transform:uppercase}
#icmxGuestGate .guest-handle{display:flex;align-items:center;gap:6px;padding:0 12px;border:1px solid #ffffff45;border-radius:10px;background:#120e29;color:#ffd400}
#icmxGuestGate .guest-handle:focus-within{outline:2px solid #ffd400;outline-offset:2px}
#icmxGuestGate .guest-handle span{font:800 17px ICGuestAV,system-ui,sans-serif}
#icmxGuestGate .guest-handle input{border:0;outline:0;background:transparent;border-radius:0;padding-inline:0}
#icmxGuestGate .guest-help{color:#a9a2c5;font-size:12px;margin:10px 0}
#icmxGuestGate #icmxGuestError{color:#ffb6b6;font-size:12px}
#icmxGuestGate #icmxGuestError:empty{display:none}
#icmxGuestGate button{display:flex;align-items:center;justify-content:center;width:100%;min-height:46px;margin-top:10px;padding:11px 14px;border:1px solid #ffd400;border-radius:10px;background:#ffd400;color:#141026;font:800 12px ICGuestAV,system-ui,sans-serif;cursor:pointer}
#icmxGuestGate button.secondary{border:1px solid #ffffff4d;background:#ffffff0f;color:#fff}
#icmxGuestGate button:disabled{opacity:.5;cursor:not-allowed}
#icmxGuestGate button:focus-visible,#icmxGuestGate input:focus-visible{outline:2px solid #ffd400;outline-offset:3px}
#icmxGuestGate .guest-handle input:focus-visible{outline:0}
@media(max-height:650px){#icmxGuestGate .guest-brand{margin-bottom:12px}#icmxGuestGate .guest-brand img{width:64px}}
`;
let root;
const q=id=>root.querySelector('#'+id);
const validIni=v=>/^[A-Z0-9]{3}$/.test(v||'');
const validHandle=v=>/^[a-z0-9_]{3,20}$/.test(v||'');
let handlers=null;
function ensure(){
 if(root)return;
 const css=document.createElement('style');css.textContent=STYLE;document.head.appendChild(css);
 root=document.createElement('div');root.id='icmxGuestGate';root.hidden=true;
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Acceso de jugador');
 root.innerHTML=`<div class="guest-panel"><header class="guest-brand"><img src="/logo.png" alt="Insert Coin MX"><small>EL ÁLBUM</small></header>
 <section id="icmxGuestWelcome"><h2>PRESS START</h2><p>Tu colección comienza aquí.</p>
 <button id="icmxGuestCreate" type="button">CREAR MI CUENTA</button>
 <button id="icmxGuestChoose" class="secondary" type="button">JUGAR COMO INVITADO</button>
 <p class="guest-warning">Como invitado, tus cartas se guardan en este navegador, pero podrías perderlas si borras sus datos o cambias de dispositivo.</p>
 </section>
 <section id="icmxGuestIdentity" hidden><h2>Tu identidad arcade</h2><p>Elige tus tres iniciales y un nombre de usuario.</p>
 <label for="icmxGuestIni">TUS INICIALES</label><input id="icmxGuestIni" type="text" maxlength="3" autocapitalize="characters" spellcheck="false" autocomplete="off" placeholder="AAA">
 <label for="icmxGuestHandle">NOMBRE DE USUARIO</label><div class="guest-handle"><span aria-hidden="true">@</span><input id="icmxGuestHandle" type="text" maxlength="20" autocapitalize="none" spellcheck="false" autocomplete="off" placeholder="josplayer"></div>
 <p class="guest-help">De 3 a 20 caracteres: letras, números o guion bajo. Tu @usuario es provisional hasta crear una cuenta.</p>
 <p id="icmxGuestError" role="status" aria-live="polite"></p>
 <button id="icmxGuestPlay" type="button" disabled>¡A JUGAR!</button>
 <button id="icmxGuestBack" class="secondary" type="button">VOLVER</button>
 </section></div>`;
 document.body.appendChild(root);
 q('icmxGuestChoose').onclick=()=>show('identity');
 q('icmxGuestBack').onclick=()=>show('welcome');
 q('icmxGuestCreate').onclick=()=>{hide();handlers?.onCreate?.()};
 q('icmxGuestIni').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);validate()});
 q('icmxGuestHandle').addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,20);validate()});
 q('icmxGuestPlay').onclick=async()=>{
  const ini=q('icmxGuestIni').value,handle=q('icmxGuestHandle').value,button=q('icmxGuestPlay');
  if(!validIni(ini)||!validHandle(handle)||button.disabled)return;
  button.disabled=true;
  let ok=false;
  try{ok=await handlers?.onPlay?.({ini,handle})===true}catch(_){}
  if(ok)hide();
  else {q('icmxGuestError').textContent='No se pudo guardar tu identidad. Tu colección permanece intacta.';validate()}
 };
 for(const id of ['icmxGuestIni','icmxGuestHandle'])q(id).addEventListener('keydown',e=>{if(e.key==='Enter')q('icmxGuestPlay').click()});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(!q('icmxGuestIdentity').hidden)show('welcome')}}); 
}
function validate(){q('icmxGuestPlay').disabled=!validIni(q('icmxGuestIni').value)||!validHandle(q('icmxGuestHandle').value);q('icmxGuestError').textContent=''}
function show(step){
 const identity=step==='identity';
 q('icmxGuestWelcome').hidden=identity;
 q('icmxGuestIdentity').hidden=!identity;
 if(identity){
  q('icmxGuestIni').value=validIni(handlers?.ini)?handlers.ini:'';
  q('icmxGuestHandle').value=validHandle(handlers?.handle)?handlers.handle:'';
  validate();
 }
 (identity?(validIni(q('icmxGuestIni').value)?q('icmxGuestHandle'):q('icmxGuestIni')):q('icmxGuestChoose')).focus({preventScroll:true});
}
export function hide(){if(root)root.hidden=true}
export function openGuestAccess(options,step='welcome'){
 ensure();handlers=options;root.hidden=false;show(step);
}
