/* Insert Coin MX — Fase 1: registro y sesión con correo/contraseña.
   La colección y el progreso siguen siendo locales: NUNCA se leen,
   sobrescriben ni sincronizan desde este módulo. */
const SUPABASE_URL = 'https://ynugqxbtszhsupadqdkz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3wyMm9dwLqSb9GiYTh245Q_9TukyCLK';
/* Versión fija para el sitio sin build ni dependencias locales. */
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/+esm';
const REDIRECT_URL = 'https://insertcoinmx.com/';
const $auth = id => document.getElementById(id);
let authClient = null;
let authMode = 'signup';
let authBusy = false;
const enteredFromEmail = /(?:^|[?&#])(?:access_token|code)=/.test(location.hash + '&' + location.search);

function authMessage(text, kind = 'info') {
  const el = $auth('profileAuthMessage');
  if (!el) return;
  el.textContent = text;
  el.dataset.type = kind;
}
function showAuthUser(user) {
  const active = Boolean(user);
  $auth('profileAuthGuest').hidden = active;
  $auth('profileAuthSigned').hidden = !active;
  $auth('profileAuthUser').textContent = active ? (user.email || 'Cuenta conectada') : '';
  $auth('profilePlayerName').textContent = active ? 'Jugador registrado' : 'Jugador invitado';
  $auth('profilePlayerState').textContent = active
    ? 'Sesión iniciada · cartas en este dispositivo'
    : 'Progreso en este dispositivo';
}
function changeAuthMode(mode) {
  if (authBusy || (mode !== 'signup' && mode !== 'login')) return;
  authMode = mode;
  $auth('profileAuthTabSignup').setAttribute('aria-pressed', String(mode === 'signup'));
  $auth('profileAuthTabLogin').setAttribute('aria-pressed', String(mode === 'login'));
  $auth('profileAuthSend').textContent = mode === 'signup' ? 'CREAR MI CUENTA' : 'INICIAR SESIÓN';
  $auth('profileAuthPassword').setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
  $auth('profileAuthHint').textContent = mode === 'signup'
    ? 'Te enviaremos un correo para confirmar tu cuenta.'
    : 'Entra con el correo y la contraseña que registraste.';
  authMessage('');
}
function setAuthBusy(busy) {
  authBusy = busy;
  $auth('profileAuthSend').disabled = busy;
  $auth('profileAuthForm').setAttribute('aria-busy', String(busy));
  $auth('profileAuthTabSignup').disabled = busy;
  $auth('profileAuthTabLogin').disabled = busy;
}
function friendlyAuthError(error, mode) {
  const text = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
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
        autoRefreshToken: true
      }
    });
    authClient.auth.onAuthStateChange((_event, session) => {
      showAuthUser(session?.user || null);
    });
    const {data:sessionData, error:sessionError} = await authClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (sessionData?.session) {
      const {data:verified, error:verifyError} = await authClient.auth.getUser();
      if (!verifyError && verified?.user) {
        showAuthUser(verified.user);
        authMessage('Tu sesión está activa. Por ahora, tus cartas permanecen en este dispositivo.', 'success');
      } else {
        showAuthUser(null);
        authMessage('No pudimos verificar la sesión. Puedes iniciar sesión nuevamente.', 'error');
      }
    } else {
      showAuthUser(null);
      authMessage('');
    }
    if (enteredFromEmail && sessionData?.session) {
      authMessage('¡Correo confirmado! Tu sesión ya está activa.', 'success');
      if (typeof window.go === 'function') window.go('profile');
    }
  } catch (_error) {
    authClient = null;
    showAuthUser(null);
    authMessage('No se pudo conectar con Supabase. Puedes seguir jugando como invitado.', 'error');
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
  if (!emailEl.checkValidity() || email.length > 254 || !email) {
    authMessage('Revisa tu correo electrónico.', 'error');
    emailEl.focus();
    return;
  }
  if (!passEl.checkValidity() || password.length < 8) {
    authMessage('La contraseña debe tener al menos 8 caracteres.', 'error');
    passEl.focus();
    return;
  }
  setAuthBusy(true);
  authMessage(authMode === 'signup' ? 'Preparando tu registro...' : 'Iniciando sesión...');
  try {
    if (authMode === 'signup') {
      const {data, error} = await authClient.auth.signUp({
        email,
        password,
        options: {emailRedirectTo: REDIRECT_URL}
      });
      if (error) throw error;
      if (data?.session) {
        showAuthUser(data.session.user);
        authMessage('¡Cuenta creada! Ya puedes entrar. Tus cartas aún son locales.', 'success');
      } else {
        authMessage('Revisa tu correo para confirmar la cuenta. Después podrás iniciar sesión aquí.', 'success');
      }
    } else {
      const {data, error} = await authClient.auth.signInWithPassword({email, password});
      if (error) throw error;
      showAuthUser(data?.user || null);
      authMessage('¡Sesión iniciada! Tu colección actual sigue en este dispositivo.', 'success');
    }
  } catch (error) {
    authMessage(friendlyAuthError(error, authMode), 'error');
  } finally {
    setAuthBusy(false);
  }
});
$auth('profileAuthSignOut').addEventListener('click', async () => {
  if (!authClient || authBusy) return;
  const button = $auth('profileAuthSignOut');
  button.disabled = true;
  try {
    const {error} = await authClient.auth.signOut({scope: 'local'});
    if (error) throw error;
    showAuthUser(null);
    authMessage('Sesión cerrada. Tus cartas siguen guardadas en este navegador.', 'success');
  } catch (_error) {
    authMessage('No pudimos cerrar la sesión. Vuelve a intentarlo.', 'error');
  } finally {
    button.disabled = false;
  }
});
showAuthUser(null);
authMessage('Conectando...');
initAccount();
