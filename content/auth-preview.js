
/* Insert Coin MX Fase 1 · Login por enlace solo en pruebas.
   Este archivo NO lee, escribe ni sincroniza el progreso del juego. */
const SUPABASE_URL = 'https://ynugqxbtszhsupadqdkz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3wyMm9dwLqSb9GiYTh245Q_9TukyCLK";
const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';
const el = id => document.getElementById(id);
let authClient = null;
let loggedIn = false;
const notice = (message, error = false) => {
  el('profileAuthMessage').textContent = message;
  el('profileAuthMessage').dataset.type = error ? 'error' : 'info';
};
function showAuth(user) {
  loggedIn = Boolean(user);
  el('profileAuthGuest').hidden = loggedIn;
  el('profileAuthSigned').hidden = !loggedIn;
  el('profileAuthUser').textContent = user?.email || '';
  el('profilePlayerName').textContent = loggedIn ? 'Cuenta de prueba' : 'Jugador invitado';
  el('profilePlayerState').textContent = loggedIn
    ? 'Sesión iniciada · colección solo en este dispositivo'
    : 'Progreso en este dispositivo';
  if (loggedIn) notice('Tu cuenta está conectada. Las cartas todavía no están respaldadas en la nube.');
}
async function initAuth() {
  try {
    const sdk = await import(CDN);
    authClient = sdk.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
    });
    authClient.auth.onAuthStateChange((_event, session) => {
      showAuth(session?.user || null);
    });
    const { data, error } = await authClient.auth.getUser();
    if (error) notice('No se pudo verificar la sesión. Puedes volver a solicitar un enlace.', true);
    showAuth(data?.user || null);
    if (new URLSearchParams(location.search).get('auth') === 'callback') {
      if (typeof window.go === 'function') window.go('profile');
      const u = new URL(location.href);
      u.searchParams.delete('auth');
      u.hash = '';
      history.replaceState(null, '', u.pathname + u.search);
    }
  } catch (error) {
    showAuth(null);
    notice('No se pudo iniciar el acceso. Revisa tu conexión.', true);
  }
}
el('profileAuthForm').addEventListener('submit', async event => {
  event.preventDefault();
  const emailInput = el('profileAuthEmail');
  const email = emailInput.value.trim();
  if (!authClient) { notice('El acceso aún no está disponible.', true); return; }
  if (!emailInput.checkValidity() || !email || email.length > 254) {
    notice('Revisa el correo electrónico.', true);
    return;
  }
  const button = el('profileAuthSend');
  button.disabled = true;
  notice('Solicitando enlace...');
  try {
    const redirect = new URL(location.href);
    redirect.search = '?auth=callback';
    redirect.hash = '';
    const { error } = await authClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect.href, shouldCreateUser: true }
    });
    if (error) {
      const message = error.message || '';
      if (/email.address.not.authorized/i.test(message)) notice('Solo se permite el correo de integrantes de la organización en Supabase.', true);
      else if (/rate.limit|too.many|over_email/i.test(message)) notice('Se alcanzó el límite de correos gratuitos. Podremos probar más tarde.', true);
      else notice('No se pudo enviar el enlace: ' + message, true);
    } else {
      notice('Enlace solicitado. Revisa tu correo y ábrelo en este mismo navegador.');
    }
  } catch (error) {
    notice('No se pudo contactar a Supabase. Revisa tu conexión.', true);
  } finally {
    button.disabled = false;
  }
});
el('profileAuthSignOut').addEventListener('click', async () => {
  if (!authClient) return;
  try {
    const { error } = await authClient.auth.signOut();
    if (error) throw error;
    showAuth(null);
    notice('Sesión cerrada. Tus cartas siguen en este navegador.');
  } catch (error) {
    notice('No se pudo cerrar la sesión.', true);
  }
});
showAuth(null);
notice('Conectando con Supabase...');
initAuth();
