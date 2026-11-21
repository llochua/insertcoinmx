import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('qa/registro/index.html','utf8');
const raw=html.split('<script type="module">')[1]?.split('</script>')[0];
assert.ok(raw,'Falta el script del callback');
const runnable=raw
 .replace('import {validCloudSnapshot} from "./cloud-snapshot.mjs";','const validCloudSnapshot=()=>true;')
 .replace('await import(SDK_URL)','globalThis.__sdk');

function harness({recovery=true,session=true}={}){
 const calls={updated:[],redirects:[],history:[],storage:[],events:[]};
 const elements=new Map();
 const element=id=>{
  if(!elements.has(id))elements.set(id,{
   id,hidden:false,value:'',disabled:false,dataset:{},textContent:'',
   listeners:{},attributes:{},
   addEventListener(event,fn){this.listeners[event]=fn},
   setAttribute(name,value){this.attributes[name]=String(value)},
   getAttribute(name){return this.attributes[name]},
   focus(){calls.focused=id},
   reportValidity(){return true},
  });
  return elements.get(id);
 };
 const user={id:'same-player-id',is_anonymous:false,email:'owner@example.test'};
 const auth={
  onAuthStateChange(fn){this.emit=fn;return {data:{subscription:{unsubscribe(){}}}};},
  async getSession(){return {data:{session:session?{user}:null},error:null}},
  async getUser(){return {data:{user},error:null}},
  async updateUser(payload){calls.updated.push(payload);return {data:{user},error:null}}
 };
 const location={
  origin:'https://insertcoinmx.com',pathname:'/qa/registro/',search:'',
  hash:recovery?'#access_token=test-token&refresh_token=other-token&type=recovery':'#access_token=test-token&refresh_token=other-token&type=signup',
  replace(target){calls.redirects.push(target)}
 };
 const ctx={
  URLSearchParams,URL,console,location,
  history:{replaceState(...args){calls.history.push(args)}},
  document:{getElementById:element,querySelector:element},
  localStorage:{getItem(){return null},setItem(...args){calls.storage.push(args)}},
  __sdk:{createClient(_url,_key,options){calls.options=options;return {auth}}},
  setTimeout(fn){fn()},TextEncoder,Date,Blob,
 };
 vm.runInNewContext(runnable,ctx,{filename:'qa/registro/index.html',timeout:2000});
 const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))};
 return {calls,element,auth,flush,user};
}

test('Recovery link remains on password form; does not auto-redirect to game',async()=>{
 const h=harness();await h.flush();
 assert.equal(h.element('recovery').hidden,false);
 assert.equal(h.element('guest').hidden,true);
 assert.equal(h.calls.redirects.length,0);
 assert.equal(h.calls.history.length,1,'remove token from history');
 assert.equal(h.calls.history[0][2],'/qa/registro/');
 assert.equal(h.calls.options.auth.storageKey,'icmx-auth-qa-nov2026');
 assert.equal(h.calls.storage.length,0,'never touch album storage');
});

test('Two passwords must match; only verified account can update password',async()=>{
 const h=harness();await h.flush();
 h.element('recoveryPassword').value='secure-new-pass-123';
 h.element('recoveryConfirm').value='different-secure-pass';
 await h.element('recoveryForm').listeners.submit({preventDefault(){}});
 assert.equal(h.calls.updated.length,0);
 assert.match(h.element('message').textContent,/no coinciden/);
 h.element('recoveryConfirm').value='secure-new-pass-123';
 await h.element('recoveryForm').listeners.submit({preventDefault(){}});
 assert.equal(h.calls.updated.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(h.calls.updated[0])),{password:'secure-new-pass-123'});
 assert.equal(h.element('recoveryForm').hidden,true);
 assert.equal(h.element('recoveryHome').hidden,false);
 assert.match(h.element('message').textContent,/actualizada correctamente/);
 assert.equal(h.calls.storage.length,0);
});

test('Ordinary signup confirmation still redirects back to game without password form',async()=>{
 const h=harness({recovery:false});await h.flush();
 assert.deepEqual(h.calls.redirects,['/']);
 assert.equal(h.element('recovery').hidden,false===true);
 assert.equal(h.calls.updated.length,0);
});

test('Expired recovery without verified session never opens the password form',async()=>{
 const h=harness({recovery:true,session:false});await h.flush();
 assert.notEqual(h.element('recovery').hidden,false);
 assert.match(h.element('message').textContent,/expiró/);
 assert.equal(h.calls.updated.length,0);
 assert.equal(h.calls.redirects.length,0);
});
