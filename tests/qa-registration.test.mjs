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
  assert.match(page, /url\("\/ps2p\.ttf"\)/);
  // El diagnóstico voluntario SOLO lee el progreso local; nunca lo modifica.
  assert.match(source, /localStorage\.getItem\("icmx-album2"\)/);
  assert.doesNotMatch(source, /localStorage\.(setItem|removeItem|clear)/);
  assert.doesNotMatch(source, /\.from\(["'](?:collection_cards|collection_events)/);
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
  assert.match(page, /Si este correo todavía no tiene cuenta/);
  assert.doesNotMatch(page, /¡Correo enviado!/);
});

test('status announcements and basic form accessibility are present', () => {
  assert.match(page, /id="message" role="status" aria-live="polite"/);
  assert.match(page, /<label for="email">Correo electrónico<\/label>/);
  assert.match(page, /<label for="password">Contraseña<\/label>/);
  assert.match(page, /type="password"/);
  assert.match(page, /minlength="8"/);
});

test('local collection inspection requires a user click and does not upload progress', () => {
  assert.match(page, /id="inspectProgress"/);
  assert.match(page, /id="localSummary"/);
  assert.match(source, /addEventListener\("click",inspectLocalProgress\)/);
  const localReadSection = source.slice(source.indexOf("function inspectLocalProgress()"),source.indexOf('el("inspectProgress").addEventListener'));
  assert.doesNotMatch(localReadSection, /\.from\(/);
  assert.doesNotMatch(source, /localStorage\.(?:setItem|removeItem|clear)/);
  assert.match(source, /\^\[a-z0-9\]/);
});

test('cloud backup always requires download acknowledgement and a separate click', () => {
  assert.match(page, /id="backupDownload"/);
  assert.match(page, /id="backupConsent" type="checkbox" disabled/);
  assert.match(page, /id="backupUpload" disabled/);
  assert.match(source, /el\("backupUpload"\)\.addEventListener\("click",async/);
  assert.match(source, /!pendingBackup\|\|!el\("backupConsent"\)\.checked/);
  assert.match(source, /localStorage\.getItem\(backupMainKey\)!==pendingBackup\.raw/);
  assert.match(source, /localStorage\.getItem\(backupExtKey\)!==pendingBackup\.rawExt/);
  assert.match(source, /await existingSnapshot\(user\.id\)/);
  assert.match(source, /\.from\("player_snapshots"\)\.insert\(/);
  assert.doesNotMatch(source, /\.upsert\(|\.update\(|\.delete\(/);
  assert.doesNotMatch(source, /localStorage\.(?:setItem|removeItem|clear)/);
});
test('cloud backup reads and verifies the same row and handles already-existing backup', () => {
  assert.match(source, /stableJSON\(saved\.state\)!==stableJSON\(pendingBackup\.state\)/);
  assert.match(source, /error\.code==="23505"/);
  assert.match(source, /state:\s*pendingBackup\.state/);
  assert.match(source, /game_format:2,revision:1/);
  assert.match(source, /backupMessage\("¡Respaldo confirmado en Supabase!/);
});
