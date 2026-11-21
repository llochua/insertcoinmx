/** End-to-end GoTrue + PostgREST using a disposable local Supabase, never production. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {rankDesigns} from '../content/community-value.mjs';
const base=process.env.API_URL||'http://127.0.0.1:54321';
assert.equal(new URL(base).hostname,'127.0.0.1','local Supabase only');
const anon=process.env.ANON_KEY||process.env.PUBLISHABLE_KEY;
const admin=process.env.SERVICE_ROLE_KEY||process.env.SECRET_KEY;
assert.ok(anon&&admin,'local credentials missing');
async function req(path,{key=anon,token,body,method='POST'}={}){
 const res=await fetch(base+path,{method,headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body??{})})});
 const txt=await res.text();let data;try{data=JSON.parse(txt)}catch{data=null}
 return {ok:res.ok,status:res.status,data};
}
const rpc=(name,body,token)=>req('/rest/v1/rpc/'+name,{body,token});
const agg=()=>rpc('icmx_community_aggregates',{});
const vote=(token,value,channel='like')=>rpc('icmx_community_vote',{p_design:'abuket',p_channel:channel,p_value:value},token);
async function account(){
 const email='qa-'+randomUUID()+'@example.test',password=randomUUID()+'A1!';
 const created=await req('/auth/v1/admin/users',{key:admin,body:{email,password,email_confirm:true}});
 assert.ok(created.ok,'local admin creates account: '+created.status);
 const login=await req('/auth/v1/token?grant_type=password',{body:{email,password}});
 assert.ok(login.ok&&login.data?.access_token,'local auth issues session: '+login.status);
 const token=login.data.access_token;
 const verified=await req('/auth/v1/user',{token,method:'GET'});
 assert.ok(verified.ok&&verified.data?.id===login.data.user.id);
 return {token,id:verified.data.id};
}
for(let i=0;i<20;i++){if((await agg()).ok)break;await new Promise(r=>setTimeout(r,500));}
const a=await account(),b=await account();assert.notEqual(a.id,b.id);
if(process.argv.includes('--closed')){
assert.deepEqual((await agg()).data,[],'closed feature exposes no aggregates');
assert.equal((await vote(a.token,1)).ok,false,'gate rejects signed user');
assert.equal((await vote(undefined,1)).ok,false,'guest cannot vote');
console.log('PASS: two genuine local Supabase Auth sessions, closed feature, guest rejected');
// Only this disposable local database has the switch enabled. psql runs the second phase separately.
process.exit(0);
}

assert.ok((await vote(a.token,1)).ok);
assert.ok((await vote(a.token,1)).ok);
assert.ok((await vote(b.token,0)).ok);
assert.ok((await vote(b.token,0,'tier')).ok);
let rows=(await agg()).data,ab=rows.find(r=>r.id==='abuket');
assert.deepEqual(ab.likes,{total:2,positive:1});
assert.equal(ab.tiers.goty,1);
assert.equal(rankDesigns(rows).find(r=>r.id==='abuket').position,1);
assert.ok((await vote(b.token,1)).ok);
assert.equal((await agg()).data.find(r=>r.id==='abuket').likes.positive,2);
assert.ok((await vote(a.token,null)).ok);
assert.equal((await agg()).data.find(r=>r.id==='abuket').likes.total,1);
assert.equal((await vote(undefined,1)).ok,false);
const direct=await req('/rest/v1/community_design_votes',{token:a.token,method:'GET'});
assert.equal(direct.ok,false,'private table unavailable to client');
assert.equal((await rpc('icmx_community_vote',{p_design:'invalid_design',p_channel:'like',p_value:1},a.token)).ok,false);
console.log('PASS: two real JWTs through PostgREST, replace and withdraw votes, guest write denied, private table hidden, verified aggregate rank');
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Monterrey',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const matches=['arcade','1up','aku','b','c','d','e'].map(loser=>({winner:'abuket',loser}));
assert.ok((await rpc('icmx_community_reta',{p_day:day,p_matches:matches},a.token)).ok);
assert.equal((await agg()).data.find(r=>r.id==='abuket').reta.wins,7);
const replacement=['abuket','1up','aku','b','c','d','e'].map(loser=>({winner:'arcade',loser}));
assert.ok((await rpc('icmx_community_reta',{p_day:day,p_matches:replacement},a.token)).ok);
assert.deepEqual((await agg()).data.find(r=>r.id==='abuket').reta,{wins:0,matches:1});
console.log('PASS: authenticated Reta replacement through REST');
