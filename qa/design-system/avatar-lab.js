/* LABORATORIO VISUAL: snapshot de avatar-profile.js. Preferencia local separada; sin Supabase. */
/* Insert Coin MX · identidad del jugador.
 * Solo guarda una preferencia cosmética. Nunca toca el progreso ni sus respaldos.
 * Invitado: localStorage separado. Cuenta: Supabase Auth user_metadata.
 */
const AVATAR_CATALOG = Object.freeze([
 ['moneda','Moneda'],['pizza','Pizza'],['control','Control'],
 ['cartucho','Cartucho'],['bote-tinta','Bote de tinta'],['mago','Mago'],
 ['gato-afk','Gato AFK'],['jos','Jos'],['glitch','Glitch'],
 ['playera','Playera'],['rasqueta-malla','Rasqueta y malla'],['arcade','Arcade']
]);
const AVATAR_ALLOW = new Set(AVATAR_CATALOG.map(([id])=>id));
const GUEST_AVATAR_KEY = 'icmx-lab-design-avatar-v1';
const $avatar = id=>document.getElementById(id);
const allowed = id=>typeof id==='string'&&AVATAR_ALLOW.has(id);
const guestAvatar = ()=>{
 try{const id=localStorage.getItem(GUEST_AVATAR_KEY);return allowed(id)?id:'moneda'}
 catch(_){return 'moneda'}
};
const srcAvatar = (id,size)=>'assets/avatars/'+(allowed(id)?id:'moneda')+'-'+size+'.webp';
let accountUser = null;
let currentAvatar = guestAvatar();
let draftAvatar = currentAvatar;
let savingAvatar = false;

function avatarMessage(text){
 const el=$avatar('avatarNote');if(el)el.textContent=text;
}
function paintAvatarImages(){
 for(const id of ['homePlayerAvatarImage','profileAvatarImage']){
  const el=$avatar(id);if(!el)continue;
  el.onerror=null;
  el.src=srcAvatar(currentAvatar,128);
  el.srcset=srcAvatar(currentAvatar,128)+' 128w, '+srcAvatar(currentAvatar,320)+' 320w';
  el.sizes=id==='profileAvatarImage'?'54px':'48px';
  el.onerror=()=>{el.onerror=null;el.removeAttribute('srcset');el.src='coin.png'};
  // The isolated LAB has no production Auth gate to reveal these images.
  el.style.visibility='visible';
 }
}
function paintAvatarChoice(){
 const av=AVATAR_CATALOG.find(x=>x[0]===draftAvatar)||AVATAR_CATALOG[0];
 $avatar('avatarPreviewImage').src=srcAvatar(av[0],320);
 $avatar('avatarPreviewImage').alt='Avatar '+av[1];
 $avatar('avatarPreviewName').textContent=av[1];
 $avatar('avatarGrid').querySelectorAll('[data-avatar]').forEach(btn=>{
  btn.setAttribute('aria-pressed',String(btn.dataset.avatar===draftAvatar));
 });
 $avatar('avatarSave').disabled=savingAvatar||draftAvatar===currentAvatar;
}
function openAvatarPicker(){
 draftAvatar=currentAvatar;
 $avatar('avatarGrid').innerHTML=AVATAR_CATALOG.map(([id,name])=>
  '<button type="button" class="avatar-option" data-avatar="'+id+'" aria-pressed="'+(id===draftAvatar)+'" aria-label="Elegir avatar '+name+'">'+
   '<img src="'+srcAvatar(id,128)+'" loading="lazy" decoding="async" width="128" height="128" alt="">'+
   '<span>'+name+'</span></button>').join('');
 avatarMessage(accountUser
  ? 'Tu elección se guardará en tu cuenta cuando confirmes el cambio.'
  : 'Como invitado, el avatar se guarda únicamente en este dispositivo.');
 paintAvatarChoice();
 go('avatarSelect');
 const scroller=$avatar('avatarSelect').querySelector('.avatar-scroller');
 if(scroller)scroller.scrollTop=0;
}
function setAvatarIdentity(user){
 accountUser=user&&typeof user.id==='string'?user:null;
 const fromAccount=accountUser?.user_metadata?.icmx_avatar_id;
 currentAvatar=accountUser?(allowed(fromAccount)?fromAccount:'moneda'):guestAvatar();
 if(!savingAvatar){
  draftAvatar=currentAvatar;
  if($avatar('avatarGrid')?.children.length)paintAvatarChoice();
 }
 paintAvatarImages();
 if($avatar('avatarSelect')?.classList.contains('on')&&!savingAvatar){
  avatarMessage(accountUser
   ? 'Avatar de tu cuenta. Guardar otro avatar requiere confirmación del servidor.'
   : 'Avatar de invitado. La elección queda solamente en este dispositivo.');
 }
}
$avatar('profileAvatarButton')?.addEventListener('click',openAvatarPicker);
$avatar('profileAvatarChange')?.addEventListener('click',openAvatarPicker);
$avatar('avatarBack')?.addEventListener('click',()=>{if(!savingAvatar)go('profile')});
$avatar('avatarGrid')?.addEventListener('click',event=>{
 const option=event.target.closest('[data-avatar]');
 if(!option||savingAvatar||!allowed(option.dataset.avatar))return;
 draftAvatar=option.dataset.avatar;
 paintAvatarChoice();
});
$avatar('avatarSave')?.addEventListener('click',async()=>{
 if(savingAvatar||draftAvatar===currentAvatar)return;
 const chosen=draftAvatar;
 const beforeUser=accountUser?.id||null;
 savingAvatar=true;paintAvatarChoice();
 avatarMessage('GUARDANDO AVATAR…');
 try{
  if(beforeUser){
   if(typeof globalThis.icmxAvatarSaveForUser!=='function')throw new Error('Sin servicio de cuenta');
   const user=await globalThis.icmxAvatarSaveForUser(chosen);
   if(accountUser?.id!==beforeUser||user?.id!==beforeUser||user?.user_metadata?.icmx_avatar_id!==chosen)
    throw new Error('No se confirmó la identidad o el avatar');
   accountUser=user;
  }else{
   if(accountUser)throw new Error('La sesión cambió durante el guardado');
   localStorage.setItem(GUEST_AVATAR_KEY,chosen);
  }
  currentAvatar=chosen;draftAvatar=chosen;
  paintAvatarImages();
  avatarMessage(beforeUser?'Avatar guardado en tu cuenta.':'Avatar guardado en este dispositivo.');
  go('profile');
 }catch(_error){
  avatarMessage(beforeUser
   ? 'No se confirmó el cambio en tu cuenta. Tu avatar anterior se conserva.'
   : 'No fue posible guardar el avatar en este dispositivo. Tu selección anterior se conserva.');
 }finally{
  savingAvatar=false;paintAvatarChoice();
 }
});
document.addEventListener('icmx:avatar-auth',()=>{
 const user=globalThis.icmxAvatarAuthUser||null;
 if(accountUser?.id!==user?.id||accountUser?.user_metadata?.icmx_avatar_id!==user?.user_metadata?.icmx_avatar_id){
  setAvatarIdentity(user);
 }
});
setAvatarIdentity(globalThis.icmxAvatarAuthUser||null);
// In production Auth marks this gate ready; the LAB has no Auth module.
document.documentElement.dataset.icmxAvatarReady='true';
