import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../content/auth-account.js', import.meta.url), 'utf8');

function buildHarness({
  initialSession = null,
  verifyUser = null,
  signupError = null,
  signinError = null,
  callback = false,
} = {}) {
  const ids = [
    'profileAuthMessage', 'profileAuthGuest', 'profileAuthSigned', 'profileAuthUser',
    'profilePlayerName', 'profilePlayerState', 'profileAuthTabSignup', 'profileAuthTabLogin',
    'profileAuthSend', 'profileAuthForm', 'profileAuthPassword', 'profileAuthEmail',
    'profileAuthHint', 'profileAuthSignOut'
  ];
  const elements = Object.fromEntries(ids.map(id => {
    const listeners = {};
    return [id, {
      id, listeners, value: '', hidden: false, disabled: false, dataset: {}, textContent: '',
      attrs: {},
      addEventListener(eventName, handler) { listeners[eventName] = handler; },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      checkValidity() { return this.id !== 'profileAuthPassword' || this.value.length >= 8; },
      focus() { this.focused = true; },
    }];
  }));
  const calls = {signup: [], signin: [], signout: [], routes: [], storageWrites: []};
  const currentUser = {id: 'user-test', email: 'jugador@example.com'};
  const auth = {
    onAuthStateChange(callbackFn) { this.listener = callbackFn; return {data: {subscription: {unsubscribe() {}}}}; },
    async getSession() { return {data: {session: initialSession}, error: null}; },
    async getUser() { return {data: {user: verifyUser || currentUser}, error: null}; },
    async signUp(payload) {
      calls.signup.push(payload);
      return signupError ? {data: null, error: signupError} : {data: {user: currentUser, session: null}, error: null};
    },
    async signInWithPassword(payload) {
      calls.signin.push(payload);
      return signinError ? {data: null, error: signinError} : {data: {user: currentUser, session: {user: currentUser}}, error: null};
    },
    async signOut(payload) {
      calls.signout.push(payload);
      return {error: null};
    },
  };
  const context = {
    document: {getElementById: id => elements[id] || null},
    location: {hash: callback ? '#access_token=mock-token' : '', search: ''},
    window: {go: route => calls.routes.push(route)},
    __sdk: {createClient: () => ({auth})},
    localStorage: {setItem: (...args) => calls.storageWrites.push(args)},
    console,
  };
  // Replaces only the dependency import; leaves all form handling and state logic intact.
  const executable = source.replace('await import(SDK_URL)', 'globalThis.__sdk');
  assert.notEqual(executable, source, 'Mock SDK injection target changed');
  vm.runInNewContext(executable, context, {filename: 'auth-account.js', timeout: 2000});
  const flush = async () => {
    for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve));
  };
  return {elements, calls, auth, flush};
}

test('profile markup has unique IDs, accessible controls and correct script link', () => {
  // Solo el HTML real del body: en las plantillas JS hay textos id="..." duplicados legítimamente.
  const staticMarkup = html.slice(html.indexOf('<body>'), html.indexOf('<script src="content/card-texts.js'));
  const all = [...staticMarkup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(all).size, all.length, 'duplicate ID in document');
  for (const id of ['profile', 'profileAuthEmail', 'profileAuthPassword', 'profileAuthTabSignup',
                    'profileAuthTabLogin', 'profileAuthForm', 'profileAuthSignOut']) {
    assert.ok(all.includes(id), 'missing ID: ' + id);
  }
  assert.match(html, /data-go="profile"/);
  assert.match(html, /content\/auth-account\.js/);
  assert.match(html, /<label for="profileAuthEmail">/);
  assert.match(html, /<label for="profileAuthPassword">/);
});

test('classic inline scripts compile without syntax errors', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes) && !/application\/ld\+json/.test(attributes));
  assert.ok(scripts.length >= 2);
  for (const [, , body] of scripts) if (body.trim()) assert.doesNotThrow(() => new vm.Script(body));
  assert.doesNotThrow(() => new vm.Script(source));
});

test('register sends signUp with Confirm signup redirect, without modifying local progress', async () => {
  const h = buildHarness();
  await h.flush();
  const e = h.elements;
  e.profileAuthEmail.value = 'jugador@example.com';
  e.profileAuthPassword.value = 'password-for-test-123';
  let prevented = false;
  await e.profileAuthForm.listeners.submit({preventDefault() {prevented = true;}});
  assert.ok(prevented);
  assert.equal(h.calls.signup.length, 1);
  assert.equal(h.calls.signup[0].email, 'jugador@example.com');
  assert.equal(h.calls.signup[0].options.emailRedirectTo, 'https://insertcoinmx.com/');
  assert.match(e.profileAuthMessage.textContent, /Revisa tu correo/);
  assert.equal(h.calls.storageWrites.length, 0);
  assert.equal(e.profileAuthSend.disabled, false);
});

test('login and logout update UI, without deleting cards', async () => {
  const h = buildHarness();
  await h.flush();
  const e = h.elements;
  e.profileAuthTabLogin.listeners.click();
  assert.equal(e.profileAuthTabLogin.attrs['aria-pressed'], 'true');
  e.profileAuthEmail.value = 'jugador@example.com';
  e.profileAuthPassword.value = 'password-for-test-123';
  await e.profileAuthForm.listeners.submit({preventDefault() {}});
  assert.equal(h.calls.signin.length, 1);
  assert.equal(e.profileAuthGuest.hidden, true);
  assert.equal(e.profileAuthSigned.hidden, false);
  assert.equal(e.profileAuthUser.textContent, 'jugador@example.com');
  await e.profileAuthSignOut.listeners.click();
  assert.equal(h.calls.signout.length, 1);
  assert.equal(h.calls.signout[0].scope, 'local');
  assert.equal(e.profileAuthSigned.hidden, true);
  assert.equal(h.calls.storageWrites.length, 0);
});

test('confirmed email callback opens profile, when a session exists', async () => {
  const user = {id: 'user-test', email: 'jugador@example.com'};
  const h = buildHarness({initialSession: {user}, verifyUser: user, callback: true});
  await h.flush();
  assert.deepEqual(h.calls.routes, ['profile']);
  assert.match(h.elements.profileAuthMessage.textContent, /Correo confirmado/);
});

test('errors are readable and do not expose details', async () => {
  const h = buildHarness({signupError: {code: 'email_rate_limit_exceeded', message: 'sensitive context'}});
  await h.flush();
  h.elements.profileAuthEmail.value = 'jugador@example.com';
  h.elements.profileAuthPassword.value = 'password-for-test-123';
  await h.elements.profileAuthForm.listeners.submit({preventDefault() {}});
  assert.match(h.elements.profileAuthMessage.textContent, /límite/);
  assert.doesNotMatch(h.elements.profileAuthMessage.textContent, /sensitive context/);
  assert.equal(h.elements.profileAuthMessage.dataset.type, 'error');
});

test('confirmation template retains official logo and action token', () => {
  const email = readFileSync(new URL('../emails/confirm-signup.html', import.meta.url), 'utf8');
  assert.match(email, /https:\/\/insertcoinmx\.com\/logo\.png/);
  assert.match(email, /href="\{\{ \.ConfirmationURL \}\}"/);
});
