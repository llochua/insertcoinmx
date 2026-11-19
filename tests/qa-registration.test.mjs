import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const page = readFileSync(new URL('../qa/registro/index.html', import.meta.url), 'utf8');
const scripts = [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
const main = scripts.find(([,attrs]) => /\btype="module"/.test(attrs));
assert.ok(main, 'Missing auth smoke script');
const source = main[2];

test('QA page JS parses cleanly', () => {
  assert.doesNotThrow(() => new vm.Script(source));
});

test('QA page is hidden from indexing and does not change the main game', () => {
  assert.match(page, /name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(page, /src="\/logo\.png"/);
  assert.match(page, /href="\/favicon\.png"/);
  assert.match(page, /href="\/ps2p\.ttf"/);
  assert.doesNotMatch(source, /icmx-album2|localStorage\.(getItem|setItem|removeItem)/);
  assert.doesNotMatch(source, /\.from\(["'](collection_cards|player_snapshots|collection_events)/);
});

test('registration uses project, public credential, pinned SDK and exact current page', () => {
  assert.match(source, /sb_publishable_/);
  assert.doesNotMatch(source, /sb_secret_|service_role|re_[a-zA-Z0-9]{20,}/);
  assert.match(source, /@supabase\/supabase-js@2\.95\.3/);
  assert.match(source, /const RETURN_URL = location\.origin \+ location\.pathname;/);
  assert.match(source, /client\.auth\.signUp\(\{email,password,options:\{emailRedirectTo:RETURN_URL\}\}\)/);
});

test('QA sessions use a separate key from the public game', () => {
  assert.match(source, /const SESSION_KEY = "icmx-auth-qa-nov2026"/);
  assert.match(source, /storageKey:SESSION_KEY/);
  assert.match(source, /detectSessionInUrl:true/);
  assert.match(source, /autoRefreshToken:true/);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /signOut\(\{scope:"local"\}\)/);
});

test('status announcements and basic form accessibility are present', () => {
  assert.match(page, /id="message" role="status" aria-live="polite"/);
  assert.match(page, /<label for="email">Correo electrónico<\/label>/);
  assert.match(page, /<label for="password">Contraseña<\/label>/);
  assert.match(page, /type="password"/);
  assert.match(page, /minlength="8"/);
});
