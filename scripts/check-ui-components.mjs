#!/usr/bin/env node
/* Insert Coin MX · Phase 2 primitive contract.
   Run: node scripts/check-ui-components.mjs
   Static only: still require rendered/mobile QA. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const html=read('index.html');
const tokens=read('content/design-tokens.css');
const components=read('content/ui-components.css');
const icons=read('content/ui-system.css');
const validations=[];
function test(name,fn){fn();validations.push(name)}
function elem(tag,id){
  const elements=[...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>', 'gi'))].map(x=>x[0]);
  const matches=elements.filter(x=>x.includes('id="'+id+'"'));
  assert.equal(matches.length,1,'Expected one '+tag+'#'+id);
  return matches[0];
}
test('CSS order: tokens before shared icons and component styles',()=>{
  const files=['content/design-tokens.css','content/ui-system.css','content/ui-components.css'];
  const positions=files.map(f=>html.indexOf(f));
  assert(positions.every(x=>x>=0));
  assert(positions[0]<positions[1]&&positions[1]<positions[2]);
});
test('foundational tokens are defined and used',()=>{
  for(const token of ['--ic-color-accent','--ic-color-text','--ic-font-ui','--ic-space-2',
    '--ic-radius-md','--ic-control-height','--ic-input-height','--ic-focus-ring']){
    assert(tokens.includes(token+':'),'missing token '+token);
  }
  assert(components.includes('var(--ic-control-height)'));
  assert(components.includes('var(--ic-focus-ring)'));
  assert(icons.includes('--ic-target:44px'));
});
test('six real account/identity inputs opt into shared field contract',()=>{
  for(const id of ['profileAuthInitials','profileAuthHandle','profileAuthEmail',
    'profileAuthPassword','profileSignedInitials','profileSignedHandle']){
    assert(/\bclass="ic-field"/.test(elem('input',id)),id);
  }
  assert(!elem('input','bkFile').includes('ic-field'),'file upload must remain untouched');
  assert(/\.ic-field:focus-visible/.test(components));
  assert(/\.ic-field\[aria-invalid="true"\]/.test(components));
});
test('primary and secondary buttons opt in without losing legacy classes',()=>{
  const ids=['mGo','openBtn','tShare','profileQuickSignup','profileQuickLogin',
    'profileAuthSend','profileAuthSignOut','avatarSave','onAccount','onNext',
    'uxPrimary','uxSecondary','profileExport','profileImport'];
  for(const id of ids){
    const t=elem('button',id);
    assert(t.includes('ic-button'),id+' missing shared button contract');
    assert(t.includes('data-ui-variant='),id+' missing semantic variant');
  }
  assert(elem('button','avatarSave').includes('disabled'),'avatar save disabled default');
});
test('all three segment groups get reusable semantics',()=>{
  for(const id of ['profileAuthTabSignup','profileAuthTabLogin']){
    const t=elem('button',id);
    assert(t.includes('ic-segment')&&t.includes('aria-pressed='));
  }
  assert(html.includes('class="ic-segment" data-i="${i}"'));
  assert(html.includes('class="btn ic-segment ${i===page?'));
  assert(html.includes('aria-pressed="${i===page}"'));
  assert(html.includes("tab.setAttribute('aria-pressed',String(i===mi))"));
});
test('existing game/state behaviors are not bypassed',()=>{
  for(const key of ['data-reta-unlock-action','id="vStage"','id="pk"',
    'content/auth-account.js','content/avatar-profile.js','content/release-reset.js',
    'content/card-value-overlay.js','id="bkFile"']){
    assert(html.includes(key),'missing '+key);
  }
});
test('classic inline JS remains valid syntax',()=>{
  let n=0;
  for(const [,attr,body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(/\bsrc\s*=/.test(attr)||/application\/ld\+json/.test(attr))continue;
    new Script(body,{filename:'index.html inline '+(++n)});
  }
  assert(n>=2);
});
for(const v of validations)console.log('OK · '+v);
console.log(validations.length+' component contract checks passed; mobile rendering remains pending');
