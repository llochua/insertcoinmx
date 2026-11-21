/* Insert Coin MX — Fase 1: registro y sesión con correo/contraseña.
   La colección y el progreso siguen siendo locales: NUNCA se leen,
   sobrescriben ni sincronizan desde este módulo. */
const SUPABASE_URL = 'https://ynugqxbtszhsupadqdkz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3wyMm9dwLqSb9GiYTh245Q_9TukyCLK';
/* Versión fija para el sitio sin build ni dependencias locales. */
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/+esm';
const REDIRECT_URL = location.origin + '/qa/registro/'; // ruta confirmada en el correo de laboratorio; la confirmación vuelve al juego
const $auth = id => document.getElementById(id);
let authClient = null;
let authMode = 'signup';
let authBusy = false;
let identityCheckVersion = 0;
let currentGuestUser=null,guestStage='none';
const stageFor=user=>!user?.id?'none':user.is_anonymous===true?'email':
 user.user_metadata?.icmx_guest_upgrade===true&&user.user_metadata?.icmx_guest_password_set!==true
  ?(user.email_confirmed_at?'password':'email'):'none';
const iniOK = v => /^[A-Z0-9]{3}$/.test(v || '');
const handleOK = v => /^[a-z0-9_]{3,20}$/.test(v || '');
const enteredFromEmail = /(?:^|[?&#])(?:access_token|code)=/.test(location.hash + '&' + location.search);

function authMessage(text, kind = 'info') {
  const el = $auth('profileAuthMessage');
  if (!el) return;
  el.textContent = text;
  el.dataset.type = kind;
}
function renderGuestAuthStage(){
 const guest=guestStage!=='none',passwordStage=guestStage==='password';
 const email=$auth('profileAuthEmail'),password=$auth('profileAuthPassword');
 $auth('profileAuthTabLogin').hidden=guest;
 email.required=!passwordStage;
 password.required=!guest||passwordStage;
 const emailField=email.closest?.('.profile-auth-field'),passwordField=password.closest?.('.profile-auth-field');
 if(emailField)emailField.hidden=passwordStage;
 if(passwordField)passwordField.hidden=guest&&!passwordStage;
 for(const [container,id] of [['profileSignupInitialsField','profileAuthInitials'],['profileSignupHandleField','profileAuthHandle']]){
  const visible=guest?!passwordStage:authMode==='signup';
  $auth(container).hidden=!visible;$auth(id).required=visible;
 }
 if(guest){
  $auth('profileAuthTabSignup').setAttribute('aria-pressed','true');
  $auth('profileAuthSend').textContent=passwordStage?'GUARDAR CONTRASEÑA':'CONFIRMAR MI CORREO';
  $auth('profileAuthHint').textContent=passwordStage
   ?'Tu correo ya está confirmado. Crea una contraseña para recuperar tu colección en otros dispositivos.'
   :'Confirma tu correo primero. Tus cartas seguirán en la misma cuenta; después crearás tu contraseña.';
 }
}
function showAuthUser(user) {
  const previousStage=guestStage;
  guestStage=stageFor(user);
  currentGuestUser=guestStage==='none'?null:user;
  if(currentGuestUser)authMode='signup';
  if(currentGuestUser||previousStage!=='none')renderGuestAuthStage();
  const active = Boolean(user)&&guestStage==='none';
  if(active&&globalThis.icmxAccountIdentity?.userId!==user.id){identityCheckVersion++;globalThis.icmxAccountIdentity=null;}
  const entryOpen=$auth('entryAccount')&&!$auth('entryAccount').hidden;
  // Perfil progresivo: invitado ve una sola invitación; cuenta autenticada ve su estado.
  const welcome = $auth('profileWelcome');
  const panel = $auth('profileAccountPanel');
  const homeStatus = $auth('homePlayerStatus');
  const profile = $auth('profile');
  const back = $auth('profileAccountBack');
  if (active) {
    profile?.classList.remove('account-focus');
    if (welcome) welcome.hidden = true;
    if (panel) panel.hidden = false;
    if (back) back.hidden = true;
  } else {
    if (welcome) welcome.hidden = Boolean(profile?.classList.contains('account-focus'));
    if (panel && !profile?.classList.contains('account-focus')&&!entryOpen) panel.hidden = true;
    if (back) back.hidden = false;
  }
  if (homeStatus) homeStatus.textContent = active
    ? 'Cuenta conectada · revisa tu respaldo'
    : currentGuestUser?'Invitado · revisa tu respaldo':'Tu colección, tu progreso';
  $auth('profileAuthGuest').hidden = active;
  $auth('profileAuthSigned').hidden = !active;
  $auth('profileAuthUser').textContent = active ? (user.email || 'Cuenta conectada') : '';
  $auth('profilePlayerName').textContent = active ? 'Jugador registrado' : 'Jugador invitado';
  $auth('profilePlayerState').textContent = active
    ? 'Sesión activa · comprueba el estado de la nube'
    : currentGuestUser?'Invitado · vincula tu correo para recuperar tus cartas':'Invitado · progreso solo en este dispositivo';
  if (!active) {
    identityCheckVersion++;
    globalThis.icmxAccountIdentity = null;
    $auth('profileSignedIdentityForm').hidden = true;
    document.dispatchEvent(new Event('icmx:player-identity'));
  }
  globalThis.icmxAvatarAuthUser = active?user:null;
  document.dispatchEvent(new Event('icmx:avatar-auth'));
  document.dispatchEvent(new Event('icmx:entry-auth-state'));

}
/* El avatar es metadato cosmético controlado por la cuenta; no autoriza sobres ni premios. */
const ACCOUNT_AVATAR_IDS = new Set('moneda pizza control cartucho bote-tinta mago gato-afk jos glitch playera rasqueta-malla arcade'.split(' '));
globalThis.icmxAvatarSaveForUser = async function(id) {
  if (!ACCOUNT_AVATAR_IDS.has(id) || !authClient) throw new Error('Avatar o sesión no disponibles');
  const {data:verified,error:verifyError} = await authClient.auth.getUser();
  if (verifyError || !verified?.user?.id) throw new Error('Primero confirma tu sesión');
  const {data,error} = await authClient.auth.updateUser({data:{icmx_avatar_id:id}});
  if (error || !data?.user || data.user.id!==verified.user.id) throw new Error('No se pudo guardar el avatar');
  globalThis.icmxAvatarAuthUser = data.user;
  document.dispatchEvent(new Event('icmx:avatar-auth'));
  return data.user;
};


/* La identidad pública se comprueba contra la fila del propio usuario.
   La unicidad real está protegida por el índice lower(public_handle) de Postgres.
   Nunca se confía en datos locales o en user_metadata para publicar récords. */
function guestDraft() {
  const draft = globalThis.icmxGuestIdentity?.get?.() || {};
  return {
    ini:iniOK(draft.ini)?draft.ini:'',
    handle:handleOK(draft.handle)?draft.handle:''
  };
}
function fillRegistrationFromGuest() {
  const draft=guestDraft();
  if (!$auth('profileAuthInitials').value) $auth('profileAuthInitials').value=draft.ini;
  if (!$auth('profileAuthHandle').value) $auth('profileAuthHandle').value=draft.handle;
}
function showMissingIdentity(ini,handle,message) {
  const form=$auth('profileSignedIdentityForm');
  form.hidden=false;
  $auth('profileSignedInitials').value=iniOK(ini)?ini:'';
  $auth('profileSignedHandle').value=handleOK(handle)?handle:'';
  $auth('profileSignedIdentityStatus').textContent=message||'Completa tu identidad para participar en Récords públicos.';
}
async function loadAccountIdentity(expectedId) {
  const version=++identityCheckVersion;
  if(!authClient||!expectedId)return;
  const {data:authData,error:authError}=await authClient.auth.getUser();
  if(version!==identityCheckVersion)return;
  const user=authData?.user;
  if(authError||!user||user.id!==expectedId||stageFor(user)!=='none')return;
  const meta=user.user_metadata||{};
  const draft=guestDraft();
  const wantedHandle=handleOK(meta.icmx_handle)?meta.icmx_handle.toLowerCase():'';
  let ini=iniOK(meta.icmx_initials)?meta.icmx_initials:(draft.ini||'');
  let {data:profile,error:readError}=await authClient
    .from('player_profiles').select('public_handle,is_public').eq('user_id',user.id).maybeSingle();
  if(version!==identityCheckVersion)return;
  if(profile?.public_handle&&!iniOK(meta.icmx_initials))ini=''; // Una cuenta existente no adopta iniciales ajenas del navegador.
  if(readError){
    showMissingIdentity(ini,wantedHandle||draft.handle,'No se pudo consultar tu identidad. Tu colección sigue intacta.');
    document.dispatchEvent(new Event('icmx:player-identity'));
    return;
  }
  if(!profile?.public_handle&&wantedHandle){
    const {error:insertError}=await authClient.from('player_profiles')
      .insert({user_id:user.id,public_handle:wantedHandle,is_public:true});
    if(version!==identityCheckVersion)return;
    if(!insertError)profile={public_handle:wantedHandle,is_public:true};
    else if(insertError.code==='23505'){
      showMissingIdentity(ini,'','Ese nombre ya está registrado. Elige otro para completar tu cuenta.');
    }else{
      showMissingIdentity(ini,wantedHandle,'No pudimos registrar tu identidad. Puedes intentar nuevamente.');
    }
  }
  if(profile?.public_handle&&handleOK(profile.public_handle.toLowerCase())&&iniOK(ini)){
    globalThis.icmxAccountIdentity={
      userId:user.id,
      ini,
      handle:profile.public_handle.toLowerCase(),
      isPublic:profile.is_public===true
    };
    $auth('profileSignedIdentityForm').hidden=true;
    $auth('profileSignedIdentityStatus').textContent='JUGADOR '+ini+' · @'+profile.public_handle.toLowerCase();
    globalThis.icmxGuestIdentity?.markSeenForAccount?.(ini);
  }else{
    globalThis.icmxAccountIdentity=null;
    if(!$auth('profileSignedIdentityStatus').textContent.startsWith('Ese nombre ya'))
      showMissingIdentity(ini,wantedHandle||draft.handle,'Completa tus iniciales y un @usuario único.');
  }
  document.dispatchEvent(new Event('icmx:player-identity'));
}
function normalizeIdentityField(id,type) {
  const input=$auth(id);
  input.addEventListener('input',()=>{
    input.value=type==='ini'
      ?input.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3)
      :input.value.toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,20);
  });
}
for(const id of ['profileAuthInitials','profileSignedInitials'])normalizeIdentityField(id,'ini');
for(const id of ['profileAuthHandle','profileSignedHandle'])normalizeIdentityField(id,'handle');
$auth('profileSignedIdentityForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!authClient||authBusy)return;
  const ini=$auth('profileSignedInitials').value.toUpperCase();
  const handle=$auth('profileSignedHandle').value.toLowerCase();
  if(!iniOK(ini)||!handleOK(handle)){
    $auth('profileSignedIdentityStatus').textContent='Necesitamos 3 iniciales y un usuario de 3 a 20 caracteres.';
    return;
  }
  const button=$auth('profileSignedSave');
  button.disabled=true;
  try{
    const {data,error:verifyError}=await authClient.auth.getUser();
    if(verifyError||!data?.user?.id)throw Error('Sesión no verificada');
    const {error:writeError}=await authClient.from('player_profiles')
      .upsert({user_id:data.user.id,public_handle:handle,is_public:true},{onConflict:'user_id'});
    if(writeError){
      $auth('profileSignedIdentityStatus').textContent=writeError.code==='23505'
        ?'Ese @usuario ya está ocupado. Elige otro.'
        :'No se pudo registrar el @usuario. Inténtalo nuevamente.';
      return;
    }
    const {error:metaError}=await authClient.auth.updateUser({data:{icmx_initials:ini,icmx_handle:handle}});
    if(metaError){
      $auth('profileSignedIdentityStatus').textContent='Tu usuario está reservado, pero faltó guardar las iniciales. Inténtalo de nuevo.';
      return;
    }
    await loadAccountIdentity(data.user.id);
  }catch(_){
    $auth('profileSignedIdentityStatus').textContent='No se pudo confirmar tu sesión. Tu progreso local está a salvo.';
  }finally{button.disabled=false}
});

function changeAuthMode(mode) {
  if (authBusy || (mode !== 'signup' && mode !== 'login')) return;
  if(guestStage!=='none')mode='signup';
  authMode = mode;
  $auth('profileAuthTabSignup').setAttribute('aria-pressed', String(mode === 'signup'));
  $auth('profileAuthTabLogin').setAttribute('aria-pressed', String(mode === 'login'));
  $auth('profileAuthSend').textContent = mode === 'signup' ? 'CREAR MI CUENTA' : 'INICIAR SESIÓN';
  for(const [container,id] of [['profileSignupInitialsField','profileAuthInitials'],['profileSignupHandleField','profileAuthHandle']]){
    const visible=mode==='signup';
    $auth(container).hidden=!visible;
    $auth(id).required=visible;
  }
  if(mode==='signup')fillRegistrationFromGuest();
  $auth('profileAuthPassword').setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
  $auth('profileAuthHint').textContent = mode === 'signup'
    ? 'Te enviaremos un correo para confirmar tu cuenta.'
    : 'Entra con el correo y la contraseña que registraste.';
  if(guestStage!=='none')renderGuestAuthStage();
  authMessage('');
  document.dispatchEvent(new CustomEvent('icmx:auth-entry-mode',{detail:mode}));
}
function setAuthBusy(busy) {
  authBusy = busy;
  $auth('profileAuthSend').disabled = busy;
  $auth('profileAuthForm').setAttribute('aria-busy', String(busy));
  $auth('profileAuthTabSignup').disabled = busy;
  $auth('profileAuthTabLogin').disabled = busy||guestStage!=='none';
}
async function authCaptchaOptions(){
 if(globalThis.ICMX_VERIFIED_GUEST_PLAY!==true&&globalThis.ICMX_CAPTCHA_ENABLED!==true)return {};
 if(typeof globalThis.icmxGuestCaptcha!=='function')throw Error('captcha_configuration_missing');
 const captchaToken=await globalThis.icmxGuestCaptcha();
 if(typeof captchaToken!=='string'||!captchaToken.trim())throw Error('captcha_empty');
 return {captchaToken};
}
function friendlyAuthError(error, mode) {
  const text = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  if(/captcha/.test(code+' '+text))return 'No se completó la comprobación de seguridad. Tu progreso sigue intacto; puedes volver a intentarlo.';
  if (/over_email_send_rate_limit|email_rate_limit_exceeded|rate.limit|too.many/.test(code + ' ' + text)) {
    return 'Se alcanzó el límite de envíos. Podrás intentarlo más tarde.';
  }
  if (/email_not_confirmed|email.not.confirmed/.test(code + ' ' + text)) {
    return 'Falta confirmar tu correo. Revisa el mensaje que te enviamos.';
  }
  if (/invalid_credentials|invalid.login.credentials/.test(code + ' ' + text)) {
    return 'Correo o contraseña incorrectos.';
  }
  if (/weak.password|password.should|password.is.too/.test(code + ' ' + text)) {
    return 'La contraseña no cumple los requisitos de seguridad.';
  }
  return mode === 'signup'
    ? 'No pudimos completar el registro. Revisa tus datos e inténtalo de nuevo.'
    : 'No pudimos iniciar sesión. Inténtalo nuevamente.';
}
async function initAccount() {
  try {
    const sdk = await import(SDK_URL);
    authClient = sdk.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        flowType: 'implicit',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'icmx-auth-qa-nov2026' // mismo espacio seguro que cloud-sync.mjs
      }
    });
    authClient.auth.onAuthStateChange((_event, session) => {
      showAuthUser(session?.user || null);
      // Evitar operaciones Supabase desde dentro del bloqueo de Auth.
      setTimeout(() => {
        if(session?.user?.id&&stageFor(session.user)==='none')loadAccountIdentity(session.user.id);
        document.dispatchEvent(new Event('icmx:auth-changed'));
      }, 0);
    });
    const {data:sessionData, error:sessionError} = await authClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (sessionData?.session) {
      const {data:verified, error:verifyError} = await authClient.auth.getUser();
      if (!verifyError && verified?.user) {
        showAuthUser(verified.user);
        if(stageFor(verified.user)==='none')loadAccountIdentity(verified.user.id);
        authMessage(guestStage==='password'?'Correo confirmado. Crea tu contraseña para terminar el registro.':
          guestStage==='email'?'Tu partida de invitado sigue vinculada a este navegador.':
          'Sesión activa. Confirma el estado NUBE AL DÍA antes de confiar en la recuperación de cartas.', 'success');
      } else {
        showAuthUser(null);
        authMessage('No pudimos verificar la sesión. Puedes iniciar sesión nuevamente.', 'error');
      }
    } else {
      showAuthUser(null);
      authMessage('');
    }
    if ((enteredFromEmail||guestStage==='password') && sessionData?.session) {
      authMessage(guestStage==='password'?'¡Correo confirmado! Crea tu contraseña para terminar.':'¡Correo confirmado! Tu sesión ya está activa.', 'success');
      // Al volver del correo, salir de START y mostrar el perfil real.
      document.getElementById('title')?.classList.remove('on');
      document.querySelector('#home .profile-entry')?.click();
      if(guestStage==='password')$auth('profileQuickSignup')?.click();
    }
  } catch (_error) {
    authClient = null;
    showAuthUser(null);
    authMessage('No se pudo conectar con Supabase. Puedes seguir jugando como invitado.', 'error');
  } finally {
    // Identity is confirmed (account or guest). Never reveal the default avatar before that.
    const img=document.getElementById('homePlayerAvatarImage');
    if(img?.decode) await img.decode().catch(()=>{});
    document.documentElement.dataset.icmxAvatarReady='true';
    for(const element of document.querySelectorAll('#homePlayerAvatarImage,#profileAvatarImage'))
      element.style.removeProperty('visibility');
  }
}
$auth('profileAuthTabSignup').addEventListener('click', () => changeAuthMode('signup'));
$auth('profileAuthTabLogin').addEventListener('click', () => changeAuthMode('login'));
$auth('profileAuthForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (authBusy) return;
  if (!authClient) {
    authMessage('El servicio de cuentas no está disponible. Revisa tu conexión.', 'error');
    return;
  }
  const emailEl = $auth('profileAuthEmail');
  const passEl = $auth('profileAuthPassword');
  const email = emailEl.value.trim();
  const password = passEl.value;
  if(guestStage==='password'){
   if(!passEl.checkValidity()||password.length<8){authMessage('La contraseña debe tener al menos 8 caracteres.','error');return}
   setAuthBusy(true);
   try{
    const {finishGuestUpgrade}=await import('./verified-guest.mjs?v=20261121');
    const user=await finishGuestUpgrade({auth:authClient.auth,expectedUid:currentGuestUser?.id,password});
    passEl.value='';
    showAuthUser(user);
    await loadAccountIdentity(user.id);
    document.dispatchEvent(new Event('icmx:auth-changed'));
    authMessage('¡Cuenta lista! Tus cartas y sobres siguen en la misma colección.','success');
   }catch(error){authMessage(friendlyAuthError(error,'signup'),'error')}
   finally{setAuthBusy(false)}
   return;
  }
  if (!emailEl.checkValidity() || email.length > 254 || !email) {
    authMessage('Revisa tu correo electrónico.', 'error');
    emailEl.focus();
    return;
  }
  if (guestStage==='none'&&(!passEl.checkValidity() || password.length < 8)) {
    authMessage('La contraseña debe tener al menos 8 caracteres.', 'error');
    passEl.focus();
    return;
  }
  let signupIdentity=null;
  if(authMode==='signup'){
    const ini=$auth('profileAuthInitials').value.toUpperCase();
    const handle=$auth('profileAuthHandle').value.toLowerCase();
    if(!iniOK(ini)||!handleOK(handle)){
      authMessage('Elige 3 iniciales y un @usuario de 3 a 20 caracteres.', 'error');
      return;
    }
    signupIdentity={ini,handle};
  }
  setAuthBusy(true);
  authMessage(authMode === 'signup' ? 'Preparando tu registro...' : 'Iniciando sesión...');
  try {
    if(guestStage==='email'){
      const {beginGuestUpgrade}=await import('./verified-guest.mjs?v=20261121');
      const user=await beginGuestUpgrade({auth:authClient.auth,expectedUid:currentGuestUser?.id,email,
       ini:signupIdentity?.ini,handle:signupIdentity?.handle,redirectTo:REDIRECT_URL});
      passEl.value='';
      showAuthUser(user);
      authMessage('Revisa tu correo y confirma el enlace. Tus cartas permanecen en esta partida.','success');
      return;
    }
    if (authMode === 'signup') {
      const {data, error} = await authClient.auth.signUp({
        email,
        password,
        options: {emailRedirectTo: REDIRECT_URL,...await authCaptchaOptions(),
          data:{icmx_initials:signupIdentity.ini,icmx_handle:signupIdentity.handle}}
      });
      if (error) throw error;
      if (data?.session) {
        showAuthUser(data.session.user);
        loadAccountIdentity(data.session.user.id);
        authMessage('Cuenta creada. Revisa el estado de la nube; las cartas no se vinculan sin tu confirmación.', 'success');
      } else {
        authMessage('Solicitud recibida. Si este correo todavía no tiene cuenta, recibirás un mensaje para confirmarla. Si ya tienes cuenta, elige INICIAR SESIÓN.', 'success');
      }
    } else {
      const captchaOptions=await authCaptchaOptions();
      const {data, error} = await authClient.auth.signInWithPassword({email,password,...(captchaOptions.captchaToken?{options:captchaOptions}:{})});
      if (error) throw error;
      showAuthUser(data?.user || null);
      if(data?.user?.id)loadAccountIdentity(data.user.id);
      authMessage('Sesión iniciada. Comprueba la nube antes de cambiar de dispositivo.', 'success');
    }
  } catch (error) {
    authMessage(guestStage==='email'&&/already|exists|registered|identity_already_exists/i.test(String(error?.code||'')+' '+String(error?.message||''))?'Ese correo ya tiene cuenta. Tu partida de invitado sigue intacta; usa otro correo mientras preparamos la vinculación de cuentas existentes.':friendlyAuthError(error, authMode), 'error');
  } finally {
    setAuthBusy(false);
  }
});
$auth('profileAuthSignOut').addEventListener('click', async () => {
  if (!authClient || authBusy||guestStage!=='none') return;
  const button = $auth('profileAuthSignOut');
  button.disabled = true;
  try {
    const {error} = await authClient.auth.signOut({scope: 'local'});
    if (error) throw error;
    showAuthUser(null);
    authMessage('Sesión cerrada. Tu progreso local permanece en este navegador.', 'success');
  } catch (_error) {
    authMessage('No pudimos cerrar la sesión. Vuelve a intentarlo.', 'error');
  } finally {
    button.disabled = false;
  }
});
showAuthUser(null);
changeAuthMode(globalThis.icmxInitialAuthMode==='login'?'login':'signup');
fillRegistrationFromGuest();
authMessage('Conectando...');
initAccount();

// Community reads use the public API, writes use the already verified account session.
globalThis.icmxCommunityRequest=async function(name,args){
 const read=name==='icmx_community_aggregates';
 if(!read&&!['icmx_community_vote','icmx_community_reta'].includes(name))throw Error('Unknown community operation');
 if(read){
  const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:'{}'});
  if(!response.ok)throw Error('Ranking unavailable');
  return response.json();
 }
 if(!authClient)throw Error('Account session unavailable');
 const expected=globalThis.icmxAccountIdentity?.userId;
 const {data:sessionData,error:sessionError}=await authClient.auth.getSession();
 const token=sessionData?.session?.access_token;
 if(sessionError||!expected||!token||sessionData?.session?.user?.id!==expected)throw Error('Account session unavailable');
 const {data:verified,error:verifyError}=await authClient.auth.getUser(token);
 if(verifyError||verified?.user?.id!==expected||verified.user.is_anonymous||globalThis.icmxAccountIdentity?.userId!==expected)throw Error('Registered account required');
 const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args)});
 if(!response.ok)throw Error('Community vote rejected');
 return null;
}
