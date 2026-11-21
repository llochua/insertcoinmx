// Turnstile: token de un solo uso. La clave secreta pertenece exclusivamente a Supabase.
// No carga recursos de terceros si no se solicita una comprobación.
let scriptPromise=null,active=null;
function loadTurnstile(){
 if(globalThis.turnstile?.render)return Promise.resolve(globalThis.turnstile);
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  const timer=setTimeout(()=>{script.remove();scriptPromise=null;reject(new Error('captcha_load_timeout'))},15000);
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async=true;
  script.onload=()=>{clearTimeout(timer);
   if(globalThis.turnstile?.render)resolve(globalThis.turnstile);
   else{script.remove();scriptPromise=null;reject(new Error('captcha_unavailable'))}
  };
  script.onerror=()=>{clearTimeout(timer);script.remove();scriptPromise=null;reject(new Error('captcha_unavailable'))};
  document.head.append(script);
 });
 return scriptPromise;
}
export async function requestCaptcha(siteKey){
 if(typeof siteKey!=='string'||!siteKey.trim())throw Error('captcha_configuration_missing');
 if(active)throw Error('captcha_already_pending');
 const task=(async()=>{
  const widget=await loadTurnstile();
  const dialog=document.createElement('dialog');
  dialog.className='icmx-captcha-dialog';
  dialog.setAttribute('aria-labelledby','icmxCaptchaHeading');
  dialog.innerHTML='<h2 id="icmxCaptchaHeading">Protege tu partida</h2><p>Comprobación de seguridad para continuar.</p><div class="icmx-captcha-widget"></div><button type="button" class="icmx-captcha-cancel">CANCELAR</button>';
  document.body.append(dialog);
  const previous=document.activeElement;
  let id=null,timer=null,settled=false;
  try{
   return await new Promise((resolve,reject)=>{
    function finish(error,token){
     if(settled)return;settled=true;
     if(error)reject(error);else resolve(token);
    }
    const cancel=()=>finish(Error('captcha_cancelled'));
    dialog.addEventListener('cancel',event=>{event.preventDefault();cancel()});
    dialog.querySelector('button').addEventListener('click',cancel);
    timer=setTimeout(()=>finish(Error('captcha_timeout')),120000);
    dialog.showModal();
    id=widget.render(dialog.querySelector('.icmx-captcha-widget'),{
     sitekey:siteKey,theme:'dark',size:'flexible',appearance:'interaction-only',
     callback:token=>typeof token==='string'&&token?finish(null,token):finish(Error('captcha_empty')),
     'error-callback':()=>{finish(Error('captcha_error'));return true},
     'expired-callback':()=>finish(Error('captcha_expired')),
     'timeout-callback':()=>finish(Error('captcha_timeout'))
    });
   });
  }finally{
   clearTimeout(timer);
   if(id!==null)try{widget.remove(id)}catch(_){}
   if(dialog.open)dialog.close();
   dialog.remove();
   if(previous?.isConnected)previous.focus({preventScroll:true});
  }
 })();
 active=task;
 try{return await task}finally{if(active===task)active=null}
}
