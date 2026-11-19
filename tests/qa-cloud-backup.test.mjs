import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {TextEncoder} from 'node:util';

const page=readFileSync(new URL('../qa/registro/index.html',import.meta.url),'utf8');
const source=page.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'QA script not found');

function fixture({existing=null,localState=null,localExt=null}={}){
 const state=localState||{have:{hyrule_f:1,fatality_b:2},rate:{hyrule:3},rev:12,pk:['some-id'],welcomeLeft:0};
 const mainRaw=JSON.stringify(state);
 const files=new Map([['icmx-album2',mainRaw]]);
 if(localExt)files.set('icmx-album2.ext',JSON.stringify(localExt));
 const writes=[],downloads=[],uploads=[],user={id:'55555555-5555-4555-8555-555555555555',email:'qa@example.test'};
 const elements={};
 for(const id of ['guest','signed','signedEmail','tabSignup','tabLogin','password','modeHint','submit','message','logout','authForm','email','backupDownload','backupConsent','backupConsentLabel','backupUpload','backupStatus','localSummary','inspectProgress']){
  elements[id]={
   listeners:{},attrs:{},hidden:false,disabled:false,checked:false,value:'',textContent:'',dataset:{},
   addEventListener(type,handler){this.listeners[type]=handler;},
   setAttribute(key,val){this.attrs[key]=String(val);},
   reportValidity(){return true;}
  };
 }
 let stored=existing;
 const fakeClient={
  auth:{
   onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};},
   async getSession(){return {data:{session:{user}},error:null};},
   async getUser(){return {data:{user},error:null};},
   async signOut(){return {error:null};}
  },
  from(table){
   assert.equal(table,'player_snapshots');
   return {
    select(){return {eq(column,id){assert.equal(column,'user_id');assert.equal(id,user.id);return {async maybeSingle(){return {data:stored,error:null};}}}};},
    async insert(input){
      uploads.push(input);
      if(stored)return {error:{code:'23505'}};
      stored={...input};
      return {error:null};
    }
   };
  }
 };
 const a=new Map();
 const context={
  document:{
    getElementById:id=>elements[id],
    createElement:()=>({click(){downloads.push({filename:this.download,url:this.href})},remove(){}}),
    body:{appendChild(){}}
  },
  localStorage:{
   getItem(k){return files.has(k)?files.get(k):null;},
   setItem(...args){writes.push(['set',...args]);},
   removeItem(...args){writes.push(['remove',...args]);},
   clear(){writes.push(['clear']);}
  },
  location:{origin:'https://insertcoinmx.com',pathname:'/qa/registro/',hash:'',search:''},
  URL:{createObjectURL(){return 'blob:mock'},revokeObjectURL(){}},
  TextEncoder,
  Blob,
  setTimeout(){},
  __qaSdk:{createClient(){return fakeClient}},
  console,
 };
 const executable=source.replace('await import(SDK_URL)','globalThis.__qaSdk');
 assert.notEqual(executable,source);
 vm.runInNewContext(executable,context,{timeout:2000});
 const ready=async()=>{for(let i=0;i<7;i++)await new Promise(resolve=>setImmediate(resolve));};
 return {elements,files,writes,downloads,uploads,ready,get stored(){return stored}};
}

test('cloud backup does nothing without explicit user action',async()=>{
 const h=fixture();await h.ready();
 assert.equal(h.uploads.length,0);
 assert.equal(h.downloads.length,0);
 assert.equal(h.elements.backupUpload.disabled,true);
 assert.equal(h.writes.length,0);
});

test('download and unchecked button never upload; confirmation uploads once and verifies',async()=>{
 const h=fixture({localExt:{pend:{unreleased_b:1}}});await h.ready();
 await h.elements.backupDownload.listeners.click();
 assert.equal(h.downloads.length,1);
 assert.equal(h.uploads.length,0);
 assert.equal(h.elements.backupConsent.disabled,false);
 await h.elements.backupUpload.listeners.click();
 assert.equal(h.uploads.length,0);
 h.elements.backupConsent.checked=true;
 h.elements.backupConsent.listeners.change();
 assert.equal(h.elements.backupUpload.disabled,false);
 await h.elements.backupUpload.listeners.click();
 assert.equal(h.uploads.length,1);
 assert.equal(h.stored.game_format,2);
 assert.equal(h.stored.revision,1);
 assert.equal(h.stored.state.data.have.fatality_b,2);
 assert.equal(h.stored.state.ext.pend.unreleased_b,1);
 assert.match(h.elements.backupStatus.textContent,/Respaldo confirmado/);
 assert.equal(h.elements.backupUpload.textContent,'✓ RESPALDO GUARDADO');
 assert.equal(h.elements.backupUpload.disabled,true);
 assert.equal(h.elements.backupConsentLabel.hidden,true);
 assert.equal(h.writes.length,0);
 assert.equal(h.files.get('icmx-album2'),JSON.stringify({have:{hyrule_f:1,fatality_b:2},rate:{hyrule:3},rev:12,pk:['some-id'],welcomeLeft:0}));
});

test('existing cloud snapshot cannot be replaced',async()=>{
 const h=fixture({existing:{user_id:'55555555-5555-4555-8555-555555555555',state:{app:'insertcoinmx-album',format:2,data:{have:{x_b:1},rate:{}}},revision:1,game_format:2}});
 await h.ready();
 await h.elements.backupDownload.listeners.click();
 assert.equal(h.downloads.length,0);
 assert.equal(h.uploads.length,0);
 assert.match(h.elements.backupStatus.textContent,/ya tiene un respaldo/i);
});

test('local progress change after download blocks upload without modifying data',async()=>{
 const h=fixture();await h.ready();
 await h.elements.backupDownload.listeners.click();
 h.elements.backupConsent.checked=true;
 h.elements.backupConsent.listeners.change();
 h.files.set('icmx-album2',JSON.stringify({have:{hyrule_f:2},rate:{}}));
 await h.elements.backupUpload.listeners.click();
 assert.equal(h.uploads.length,0);
 assert.equal(h.writes.length,0);
 assert.match(h.elements.backupStatus.textContent,/No pudimos verificar/);
});

test('existing backup on login is identified without uploading or modifying data',async()=>{
 const prior={user_id:'55555555-5555-4555-8555-555555555555',state:{app:'insertcoinmx-album',format:2,data:{have:{x_b:1},rate:{}}},revision:1,game_format:2};
 const h=fixture({existing:prior});await h.ready();
 assert.equal(h.elements.backupUpload.textContent,'✓ RESPALDO GUARDADO');
 assert.equal(h.elements.backupUpload.disabled,true);
 assert.equal(h.elements.backupDownload.disabled,true);
 assert.equal(h.elements.backupConsentLabel.hidden,true);
 assert.equal(h.uploads.length,0);
 assert.equal(h.writes.length,0);
});
