/**
 * Identidad anónima verificada. Las cartas nunca pasan por estas funciones.
 * El navegador no migra UID ni guarda contraseñas. Todo depende de Auth.
 */
export const GUEST_BINDING='icmx-cloud-active-account-v1';
const fail=code=>Object.assign(new Error(code),{code});
export function upgradeStage(user){
 if(!user?.id)return 'none';
 if(user.is_anonymous===true)return 'email';
 if(user.user_metadata?.icmx_guest_upgrade===true&&user.user_metadata?.icmx_guest_password_set!==true)
  return user.email_confirmed_at?'password':'email';
 return 'none';
}
export async function ensureVerifiedGuest({auth,storage,exclusive,captchaToken}){
 if(typeof exclusive!=='function')throw fail('guest_lock_unavailable');
 return exclusive(async()=>{
  const bound=storage.getItem(GUEST_BINDING);
  const {data,error}=await auth.getSession();
  if(error)throw error;
  if(data?.session?.user?.id){
   const {data:verified,error:verifyError}=await auth.getUser();
   if(verifyError)throw verifyError;
   const user=verified?.user;
   if(!user?.id||user.id!==data.session.user.id||bound&&bound!==user.id)
    throw fail('guest_identity_changed');
   return user;
  }
  // Una sesión perdida de una colección previa jamás genera otra bienvenida.
  if(bound)throw fail('guest_session_lost');
  let options;
  if(typeof captchaToken==='function'){
   const token=await captchaToken();
   if(typeof token!=='string'||!token.trim())throw fail('guest_captcha_required');
   options={options:{captchaToken:token}};
  }
  const {data:created,error:createError}=await auth.signInAnonymously(options);
  if(createError)throw createError;
  const uid=created?.user?.id||created?.session?.user?.id;
  const {data:verified,error:verifyError}=await auth.getUser();
  if(verifyError)throw verifyError;
  if(!uid||verified?.user?.id!==uid||verified.user.is_anonymous!==true)
   throw fail('guest_identity_changed');
  return verified.user;
 });
}
export async function beginGuestUpgrade({auth,expectedUid,email,ini,handle,redirectTo}){
 const {data:before,error}=await auth.getUser();
 if(error)throw error;
 if(!expectedUid||before?.user?.id!==expectedUid||before.user.is_anonymous!==true)
  throw fail('guest_identity_changed');
 if(typeof email!=='string'||!email.includes('@')||!/^[A-Z0-9]{3}$/.test(ini||'')||!/^[a-z0-9_]{3,20}$/.test(handle||''))
  throw fail('guest_invalid_identity');
 // Supabase requiere verificar el correo primero. No usar signUp aquí:
 // crearía un UID distinto y perdería el vínculo con todos los sobres.
 const {data,error:updateError}=await auth.updateUser({
  email,data:{icmx_initials:ini,icmx_handle:handle,icmx_guest_upgrade:true,icmx_guest_password_set:false}
 },{emailRedirectTo:redirectTo});
 if(updateError)throw updateError;
 if(data?.user?.id!==expectedUid)throw fail('guest_identity_changed');
 return data.user;
}
export async function finishGuestUpgrade({auth,expectedUid,password}){
 const {data:before,error}=await auth.getUser();
 if(error)throw error;
 const user=before?.user;
 if(!expectedUid||user?.id!==expectedUid||user.is_anonymous!==false||
    !user.email_confirmed_at||upgradeStage(user)!=='password')throw fail('guest_email_not_verified');
 if(typeof password!=='string'||password.length<8)throw fail('weak_password');
 const {data,error:updateError}=await auth.updateUser({
  password,data:{icmx_guest_password_set:true}
 });
 if(updateError)throw updateError;
 if(data?.user?.id!==expectedUid||data.user.is_anonymous!==false)
  throw fail('guest_identity_changed');
 return data.user;
}
