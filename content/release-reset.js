/* Insert Coin MX · lanzamiento de colección desde cero.
 * PREPARADO, NO ACTIVADO. El atributo data-active del script en index.html
 * solo debe pasar a "true" junto al reinicio transaccional en Supabase.
 * No elimina cuentas, sesión Auth ni preferencias de avatar.
 */
(function(){
 'use strict';
 const tag=document.currentScript;
 const edition=tag?.getAttribute('data-game-epoch')||'';
 const active=tag?.getAttribute('data-active')==='true' &&
  /^(?:www\.)?insertcoinmx\.com$/i.test(location.hostname);
 const marker='icmx-game-epoch';
 const exact=Object.freeze([
  'icmx-album2','icmx-album2.ext','icmx-album2.bak',
  'icmx-album2.corrupt','icmx-album2.premig',
  'icmx-cloud-active-account-v1'
 ]);
 const prefixes=Object.freeze([
  'icmx-cloud-baseline-v1:',
  'icmx-cloud-pack-request-v1:',
  'icmx-cloud-exchange-request-v1:'
 ]);
 function apply(storage,epoch){
  if(typeof epoch!=='string'||!/^public-[a-z0-9-]{5,40}$/.test(epoch))
   throw Error('La edición de lanzamiento no está definida');
  if(storage.getItem(marker)===epoch)return {status:'already-current'};
  // No borrar TODO localStorage: Supabase Auth, avatares y preferencias persisten.
  const keys=new Set(exact);
  for(let i=0;i<storage.length;i++){
   const key=storage.key(i);
   if(prefixes.some(prefix=>key?.startsWith(prefix)))keys.add(key);
  }
  for(const key of keys)storage.removeItem(key);
  storage.setItem(marker,epoch);
  if(storage.getItem(marker)!==epoch)throw Error('El navegador no pudo confirmar el reinicio');
  return {status:'reset',removed:keys.size};
 }
 let result={status:'staged'};
 if(active){
  try{result=apply(localStorage,edition)}
  catch(_){result={status:'storage-error'}}
 }
 window.ICMX_RELEASE_RESET=Object.freeze({
  active,edition,result,
  apply // función pura respecto al DOM para pruebas controladas; no invocar en UI
 });
})();
