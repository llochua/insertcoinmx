#!/usr/bin/env node
/**
 * Insert Coin MX · UI icon contract smoke checks.
 * Run: node scripts/check-ui-icons.mjs
 * Static checks are not a replacement for rendered 320–430px/mobile QA.
 */
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'content/ui-system.css'), 'utf8');
const results = [];
const check = (name, assertion) => {
  assertion();
  results.push(name);
};

check('stylesheet is loaded after the existing community styles', () => {
  const i = html.indexOf('content/community-value-ui.css');
  const j = html.indexOf('content/ui-system.css');
  assert(i >= 0 && j > i);
});

const names = [...html.matchAll(/<symbol\s+id="ic-icon-([\w-]+)"/g)].map(x => x[1]);
const refs = [...html.matchAll(/<use\s+href="#ic-icon-([\w-]+)"/g)].map(x => x[1]);
check('one unique icon registry with 16 UI glyphs', () => {
  assert.equal(names.length, 16);
  assert.equal(new Set(names).size, names.length);
  assert(refs.length >= 20);
  for (const ref of refs) assert(names.includes(ref), 'Undefined icon '+ref);
});

check('the core icon set exists', () => {
  for (const name of ['back','next','close','edit','download','chevron-down',
    'designs','duplicates','ratings','volume-on','volume-off','zoom-out',
    'zoom-in','refresh','user','share']) {
    assert(names.includes(name), 'Missing '+name);
  }
});

check('functional UI glyphs are SVG instead of Unicode characters', () => {
  assert(!/class="profile-metric-icon"[^>]*>\s*[✦▣★]/.test(html));
  assert(!/class="avatar-pencil"[^>]*>\s*✎/.test(html));
  assert(!/class="profile-backup-(?:symbol|chevron)"[^>]*>\s*[↓⌄]/.test(html));
  assert(!/class="vback"[^>]*>←/.test(html));
  assert(!/profile-avatar::after\s*\{[^}]*✎/.test(html));
});

check('shared touch-target sizing and accessible labels', () => {
  assert(/--ic-target\s*:\s*44px/.test(css));
  assert(/\.view>\.top \.vback,\.view>\.top \.sound-toggle/.test(css));
  assert(html.includes('aria-label="Volver al perfil"'));
  assert(html.includes('aria-label="Volver al inicio"'));
  assert(html.includes('aria-label="Cerrar ficha"'));
  assert(html.includes('aria-label="Silenciar música y efectos"') ||
         html.includes("btn.setAttribute('aria-label'"));
});

check('card graphics and Reta game hooks are left intact', () => {
  for (const fragment of [
    'content/card-value-overlay.js', 'content/auth-account.js',
    'content/avatar-profile.js', 'id="vStage"', 'data-reta-unlock-action',
    'class="zr-emoji"', 'id="pk"'
  ]) assert(html.includes(fragment), 'Missing '+fragment);
});

check('inline classic scripts still parse', () => {
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let parsed=0;
  for (const [, attributes, body] of blocks) {
    if (/\bsrc\s*=/.test(attributes) || /type="application\/ld\+json"/.test(attributes)) continue;
    new Script(body, { filename: 'index.html <inline script '+(++parsed)+'>' });
  }
  assert(parsed >= 2);
});

for (const result of results) process.stdout.write('OK · '+result+'\n');
process.stdout.write('\n'+results.length+' static checks passed. Browser/mobile QA remains required.\n');
