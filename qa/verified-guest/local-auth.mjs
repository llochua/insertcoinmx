// Real local GoTrue + PostgREST + disposable email inbox; never production.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {ensureVerifiedGuest,beginGuestUpgrade,finishGuestUpgrade,upgradeStage} from '../../content/verified-guest.mjs';
const base=process.env.API_URL||'http://127.0.0.1:54321';
const anon=process.env.ANON_KEY||process.env.PUBLISHABLE_KEY;
assert.equal(new URL(base).hostname,'127.0.0.1','local only');
assert.ok(anon,'local key required');
const newClient=()=>createClient(base,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit'}});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const rpc=async(client,name,args={})=>{
 const {data,error}=await client.rpc(name,args);
 assert.ok(!error,name+': '+(error?.code||'')+' '+(error?.message||''));
 return data;
};
const state=async(client,uid)=>{
 const {data,error}=await client.from('player_snapshots').select('user_id,revision,state').eq('user_id',uid).single();
 assert.ok(!error,'own snapshot must be readable');return data;
};
const count=s=>Object.values(s.data.have).reduce((a,b)=>a+b,0);
async function guest(){
 const c=newClient();
 const user=await ensureVerifiedGuest({auth:c.auth,storage:{getItem:()=>null},exclusive:task=>task()});
 assert.ok(user.is_anonymous,'real anonymous session');
 return {c,uid:user.id};
}
const a=await guest(),b=await guest();
assert.notEqual(a.uid,b.uid);
if(process.argv.includes('--closed')){
 assert.ok((await a.c.rpc('ensure_player_snapshot')).error,'closed feature must reject guest');
 console.log('PASS: real anonymous JWT rejected with gate closed');
 process.exit(0);
}
const publicIdentity=await rpc(a.c,'icmx_register_guest_identity',{p_ini:'TST',p_handle:'qa_guest_a'});
assert.equal(publicIdentity.handle,'qa_guest_a');
assert.equal((await rpc(a.c,'icmx_register_guest_identity',{p_ini:'TST',p_handle:'qa_guest_a'})).status,'registered','reintento de identidad idempotente');
assert.ok((await b.c.rpc('icmx_register_guest_identity',{p_ini:'TST',p_handle:'qa_guest_a'})).error,'@usuario de invitado único');
assert.ok((await a.c.rpc('icmx_register_guest_identity',{p_ini:'BAD',p_handle:'changed_name'})).error,'identidad no se puede cambiar tras registrar');
const initial=await rpc(a.c,'ensure_player_snapshot');
assert.equal(initial.status,'created');
assert.equal(initial.state.data.welcomeLeft,5);
assert.equal(count(initial.state),0);
assert.equal((await rpc(a.c,'ensure_player_snapshot')).status,'existing');
const request=randomUUID();
let pack=await rpc(a.c,'issue_player_pack',{p_request_id:request,p_expected_revision:initial.revision});
assert.equal(pack.status,'issued');assert.equal(count(pack.state),5);
assert.equal(pack.state.data.welcomeLeft,4);assert.match(pack.cards[4],/_f$/);
const duplicate=await rpc(a.c,'issue_player_pack',{p_request_id:request,p_expected_revision:initial.revision});
assert.equal(duplicate.status,'duplicate');assert.deepEqual(duplicate.cards,pack.cards);
assert.deepEqual(duplicate.state,pack.state);
pack=await rpc(a.c,'issue_player_pack',{p_request_id:randomUUID(),p_expected_revision:pack.revision});
assert.equal(count(pack.state),10);
const guestBoard=await rpc(a.c,'icmx_player_leaderboards');
assert.ok(guestBoard.cards.some(row=>row.handle==='qa_guest_a'&&row.score>0),'invitado entra al ranking solo con cartas verificadas');
assert.ok(guestBoard.pts.some(row=>row.handle==='qa_guest_a'&&row.score>0),'PTS obtenidos de sobres del servidor');
assert.ok(!JSON.stringify(guestBoard).includes(a.uid),'nunca exponer UID en respuesta');

assert.equal(pack.state.data.welcomeLeft,3);
const illegal=structuredClone(pack.state);illegal.data.have.forged_b=999;
assert.ok((await a.c.rpc('sync_player_snapshot',{p_expected_revision:pack.revision,p_state:illegal})).error,'cannot forge cards');
const quota=structuredClone(pack.state);quota.data.welcomeLeft=5;
assert.ok((await a.c.rpc('sync_player_snapshot',{p_expected_revision:pack.revision,p_state:quota})).error,'cannot refill quota');
const rated=structuredClone(pack.state);rated.data.rate.abuket=2;rated.data.ini='TST';
const saved=await rpc(a.c,'sync_player_snapshot',{p_expected_revision:pack.revision,p_state:rated});
assert.equal(saved.status,'updated');
const before=await state(a.c,a.uid);
assert.equal(before.revision,saved.revision);
assert.deepEqual(before.state,rated);
assert.ok((await a.c.from('player_profiles').insert({user_id:a.uid,public_handle:'guest_'+randomUUID().slice(0,8),is_public:true})).error,'anonymous profile forbidden');
assert.deepEqual((await b.c.from('player_snapshots').select('user_id').eq('user_id',a.uid)).data,[]);
assert.equal(count((await rpc(b.c,'ensure_player_snapshot')).state),0);
const nextGuest=await guest();
assert.equal((await rpc(nextGuest.c,'ensure_player_snapshot')).status,'created');
assert.equal((await rpc(nextGuest.c,'ensure_player_snapshot')).status,'existing');
assert.equal((await rpc(a.c,'ensure_player_snapshot')).status,'existing');
assert.equal((await rpc(b.c,'ensure_player_snapshot')).status,'existing');
assert.equal((await rpc(nextGuest.c,'ensure_player_snapshot')).status,'existing');
console.log('PASS: guest 101 admitted; existing sessions preserved; no global cap');
console.log('PASS: real guest, 10 cards, idempotent pack, ratings, quota protection, isolated UID and private profile');
const email='qa-'+randomUUID()+'@example.test';
const password=randomUUID()+'A1!';
const initiated=await beginGuestUpgrade({auth:a.c.auth,expectedUid:a.uid,email,ini:'TST',handle:'qa_guest',redirectTo:'http://127.0.0.1:3000'});
assert.equal(initiated.id,a.uid);
assert.equal(upgradeStage(initiated),'email');
await assert.rejects(()=>finishGuestUpgrade({auth:a.c.auth,expectedUid:a.uid,password}),/guest_email_not_verified/);
assert.deepEqual(await state(a.c,a.uid),before);
async function mailLink(){
 const inbox='http://127.0.0.1:54324';
 for(let i=0;i<60;i++){
  try{
   const list=await fetch(inbox+'/api/v1/messages');
   if(list.ok){
    const j=await list.json();
    for(const m of j.messages||[]){
     if(!(m.To||[]).some(x=>x.Address===email))continue;
     const full=await (await fetch(inbox+'/api/v1/message/'+encodeURIComponent(m.ID))).json();
     const body=(full.HTML||'')+' '+(full.Text||'');
     const links=body.match(/https?:[^\s<>"']+/g)||[];
     const match=links.find(x=>x.includes('/auth/v1/verify')&&x.includes('token='));
     if(match)return match.replaceAll('&amp;','&');
    }
   }
  }catch(_){}
  await delay(500);
 }
 throw Error('No verification link in disposable mailbox');
}
const link=new URL(await mailLink());
assert.ok(['localhost','127.0.0.1','0.0.0.0'].includes(link.hostname),'local mail link only');
link.hostname='127.0.0.1';
const verification=await fetch(link,{redirect:'manual'});
assert.ok(verification.status>=300&&verification.status<400,'email confirmation must redirect');
const url=new URL(verification.headers.get('location'));
const hash=new URLSearchParams(url.hash.slice(1));
assert.ok(hash.get('access_token')&&hash.get('refresh_token'),'email confirmation must return session');
const fresh=await a.c.auth.setSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token')});
assert.ok(!fresh.error,'confirmed session');
assert.equal(fresh.data.user.id,a.uid);
assert.equal(fresh.data.user.is_anonymous,false);
assert.equal(upgradeStage(fresh.data.user),'password');
const done=await finishGuestUpgrade({auth:a.c.auth,expectedUid:a.uid,password});
assert.equal(done.id,a.uid);assert.equal(upgradeStage(done),'none');
const second=newClient();
const login=await second.auth.signInWithPassword({email,password});
assert.ok(!login.error,'second browser login: '+(login.error?.message||''));
const secondGuest=await rpc(b.c,'icmx_register_guest_identity',{p_ini:'TWO',p_handle:'qa_guest_b'});
assert.equal(secondGuest.handle,'qa_guest_b');
const blocked=await second.from('player_profiles').insert({user_id:a.uid,public_handle:'qa_guest_b',is_public:true});
assert.ok(blocked.error,'cuenta registrada no puede duplicar el @handle reservado por invitado');
const owned=await second.from('player_profiles').insert({user_id:a.uid,public_handle:'qa_guest_a',is_public:true});
assert.ok(!owned.error,'invitado convertido conserva su mismo @handle registrado');

assert.equal(login.data.user.id,a.uid);
assert.deepEqual(await state(second,a.uid),before);
const recovered=await rpc(second,'ensure_player_snapshot');
assert.equal(recovered.status,'existing');
assert.equal(recovered.state.data.welcomeLeft,3);
assert.equal(count(recovered.state),10);
assert.deepEqual(recovered.state.data.rate,{abuket:2});
const next=await rpc(second,'issue_player_pack',{p_request_id:randomUUID(),p_expected_revision:recovered.revision});
assert.equal(next.status,'issued');assert.equal(count(next.state),15);
assert.equal(next.state.data.welcomeLeft,2);
console.log('PASS: genuine email-link confirmation, same UID, password, second device, identical collection, remaining packs and next issuance');
