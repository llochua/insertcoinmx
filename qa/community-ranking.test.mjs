import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityRanking,validRetaMatches} from '../content/community-ranking.mjs';
const ballot=['b','c','d','e','f','g','h'].map(loser=>({winner:'a',loser}));
test('server aggregates produce shared design positions, never local votes',async()=>{
 const c=createCommunityRanking({request:async()=>[
  {id:'a',tiers:{goty:5}},
  {id:'b',tiers:{mmm:5}},
  {id:'c'}
 ]});
 await c.refresh();
 assert.equal(c.state.status,'ready');
 assert.equal(c.get('a').position,1);
 assert.equal(c.get('c').position,null);
 assert.equal(c.get('c').score,null);
});
test('closed and disconnected service do not invent a ranking',async()=>{
 const c=createCommunityRanking({request:async()=>[]});await c.refresh();
 assert.equal(c.state.status,'disabled');assert.deepEqual(c.state.rows,[]);
 const d=createCommunityRanking({request:async()=>{throw Error('offline')}});await d.refresh();
 assert.equal(d.state.status,'offline');assert.deepEqual(d.state.rows,[]);
});
test('Reta accepts only complete chains involving eight distinct designs',()=>{
 assert.equal(validRetaMatches(ballot),true);
 assert.equal(validRetaMatches(ballot.slice(0,6)),false);
 assert.equal(validRetaMatches([...ballot.slice(0,6),ballot[0]]),false);
 assert.equal(validRetaMatches([...ballot.slice(0,6),{winner:'x',loser:'y'}]),false);
 const flip=[...ballot.slice(0,6),{winner:'h',loser:'a'}];
 assert.equal(validRetaMatches(flip),true);
});
test('an incomplete Reta never reaches the RPC',async()=>{
 let calls=0;const c=createCommunityRanking({request:async()=>{calls++;return []}});
 await assert.rejects(c.reta('2026-11-21',[]));assert.equal(calls,0);
});
test('a stale fetch cannot replace newer rankings',async()=>{
 const pending=[],c=createCommunityRanking({request:()=>new Promise(r=>pending.push(r))});
 const a=c.refresh(),b=c.refresh();
 pending[1]([{id:'new',tiers:{goty:1}}]);await b;
 pending[0]([{id:'old'}]);await a;
 assert.equal(c.state.rows[0].id,'new');
});
test('votes send only the action and derive POP from aggregated server response',async()=>{
 const calls=[],c=createCommunityRanking({request:async(name,args)=>{calls.push([name,args]);return name.endsWith('aggregates')?[]:null}});
 await assert.rejects(c.vote('a','like',1));
 assert.equal(calls.length,0);
 await c.vote('a','tier',1);
 assert.deepEqual(calls[0],['icmx_community_vote',{p_design:'a',p_channel:'tier',p_value:1}]);
 assert.equal(calls[1][0],'icmx_community_aggregates');
});
