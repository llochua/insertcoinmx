import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../content/auth-account.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');

function harness({initialSession=null,callback=false,signUpError=null}={}){
 const ids=['profileAuthMessage','profileAuthGuest','profileAuthSigned','profileAuthUser',
  'profilePlayerName','profilePlayerState','profileAuthTabSignup','profileAuthTabLogin',
  'profileAuthSend','profileAuthForm','profileAuthPassword','profileAuthEmail',
  'profileAuthHint','profileAuthSignOut'];
 const elements=Object.fromEntries(ids.map(id=>[id,{
  id,listeners:{},dataset:{},value:'',hidden:false,disabled:false,textContent:'',attrs:{},
  addEventListener(type,fn){this.listeners[type]=fn},
  setAttribute(name,val){this.attrs[name]=String(val)},
  checkValidity(){return this.id!=='profileAuthPassword'||this.value.length>=8},
  focus(){this.focused=true}
 }]));
 const calls={signup:[],signin:[],signout:[],avatarUpdates:[],events:[],opts:[],clicked:0,titleRemoved:0,storageWrites:[]};
 const user={id:'user-lab',email:'qa@example.test'};
 const auth={
  onAuthStateChange(fn){this.emit=fn;return {data:{subscription:{unsubscribe(){}}}};},
  async getSession(){return {data:{session:initialSession},error:null};},
  async getUser(){return {data:{user},error:null};},
  async signUp(args){calls.signup.push(args);return signUpError?
    {data:null,error:signUpError}:{data:{user,session:null},error:null};},
  async signInWithPassword(args){calls.signin.push(args);return {data:{user,session:{user}},error:null};},
  async updateUser(args){calls.avatarUpdates.push(args);return {data:{user:{...user,user_metadata:args.data}},error:null};},
  async signOut(args){calls.signout.push(args);return {error:null};}
 };
 const document={
  documentElement:{dataset:{}},
  querySelectorAll(){return []},
  getElementById(id){
   if(id==='title')return {classList:{remove(){calls.titleRemoved++}}};
   return elements[id]||null;
  },
  querySelector(selector){return selector==='#home .profile-entry'?{click(){calls.clicked++}}:null;},
  dispatchEvent(event){calls.events.push(event.type)}
 };
 const ctx={console,document,location:{origin:'https://insertcoinmx.com',
  hash:callback?'#access_token=lab-token':'',search:''},
  setTimeout(fn){fn()},Event:class{constructor(type){this.type=type}},
  __sdk:{createClient:(_u,_key,opts)=>{calls.opts.push(opts);return {auth}} },
  localStorage:{setItem(...args){calls.storageWrites.push(args)}}
 };
 const runnable=code.replace('await import(SDK_URL)','globalThis.__sdk');
 assert.notEqual(runnable,code,'sdk mock injection must exist');
 vm.runInNewContext(runnable,ctx,{filename:'auth-account.js',timeout:2000});
 const flush=async()=>{for(let i=0;i<7;i++)await new Promise(resolve=>setImmediate(resolve))};
 return {elements,calls,auth,flush,saveAvatar:ctx.icmxAvatarSaveForUser};
}

test('real profile components exist on the game without duplicate IDs',()=>{
 const body=page.slice(page.indexOf('<body>'),page.indexOf('<script src="content/card-texts.js'));
 const ids=[...body.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'duplicate static IDs');
 for(const id of ['profile','profileAuthForm','profileAuthSend','profileCloudStatus','profileLinkCollection','onAccount'])
  assert.ok(ids.includes(id),'missing '+id);
 assert.match(page,/data-go="profile"/);
 assert.match(page,/SEGUIR COMO INVITADO/);
});

test('signup uses official callback and shared auth storage, no local collection mutation',async()=>{
 const h=harness();await h.flush();
 assert.equal(h.calls.opts.length,1);
 assert.equal(h.calls.opts[0].auth.storageKey,'icmx-auth-qa-nov2026');
 h.elements.profileAuthEmail.value='tester@example.test';
 h.elements.profileAuthPassword.value='secure-pass-123';
 await h.elements.profileAuthForm.listeners.submit({preventDefault(){}});
 assert.equal(h.calls.signup.length,1);
 assert.equal(h.calls.signup[0].options.emailRedirectTo,'https://insertcoinmx.com/qa/registro/');
 assert.match(h.elements.profileAuthMessage.textContent,/Solicitud recibida/);
 assert.equal(h.calls.storageWrites.length,0);
});

test('login/logout is exposed and sessions send a cloud recheck event',async()=>{
 const h=harness();await h.flush();
 h.elements.profileAuthTabLogin.listeners.click();
 h.elements.profileAuthEmail.value='tester@example.test';
 h.elements.profileAuthPassword.value='secure-pass-123';
 await h.elements.profileAuthForm.listeners.submit({preventDefault(){}});
 assert.equal(h.calls.signin.length,1);
 assert.equal(h.elements.profileAuthSigned.hidden,false);
 h.auth.emit('SIGNED_IN',{user:{id:'user-lab',email:'qa@example.test'}});
 assert.ok(h.calls.events.includes('icmx:auth-changed'));
 await h.elements.profileAuthSignOut.listeners.click();
 assert.equal(h.calls.signout.length,1);
 assert.equal(h.calls.signout[0].scope,'local');
 assert.equal(h.elements.profileAuthSigned.hidden,true);
 assert.equal(h.calls.storageWrites.length,0);
});

test('email callback returns to visible profile, never starts a pack',async()=>{
 const user={id:'user-lab',email:'qa@example.test'};
 const h=harness({initialSession:{user},callback:true});await h.flush();
 assert.equal(h.calls.titleRemoved,1);
 assert.equal(h.calls.clicked,1);
 assert.match(h.elements.profileAuthMessage.textContent,/Correo confirmado/);
 assert.equal(h.calls.storageWrites.length,0);
});

test('avatar saved as cosmetic user metadata, never as collection or authorization',async()=>{
 const h=harness({initialSession:{user:{id:'user-lab',email:'qa@example.test'}}});
 await h.flush();
 const u=await h.saveAvatar('pizza');
 assert.equal(u.user_metadata.icmx_avatar_id,'pizza');
 assert.equal(h.calls.avatarUpdates.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(h.calls.avatarUpdates[0])),{data:{icmx_avatar_id:'pizza'}});
 assert.equal(h.calls.storageWrites.length,0,'no write to album storage');
 await assert.rejects(()=>h.saveAvatar('admin'),/Avatar/,'unknown avatar rejected');
 assert.equal(h.calls.avatarUpdates.length,1);
});
