import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePlayerBoards,createPlayerRanking} from '../content/player-ranking.mjs';
const empty=()=>({pts:[],cards:[],designs:[],duplicates:[],ratings:[]});
test('Ranking: rechaza fuentes incompletas, valores negativos o datos privados',()=>{
 assert.throws(()=>normalizePlayerBoards({cards:[]}),/pts/);
 const data=empty();
 data.cards=[
  {ini:'AAA',handle:'player_one',score:1,mine:true,email:'private@example.test'},
  {ini:'BBB',handle:'player_two',score:23},
  {ini:'CCC',handle:'player_one',score:1000},
  {ini:'DDD',handle:'invalid@handle',score:1000},
  {ini:'EEE',handle:'player_zero',score:0}
 ];
 const got=normalizePlayerBoards(data).cards;
 assert.deepEqual(got.map(x=>x.ini),['BBB','AAA']);
 assert.equal(got[1].mine,true);
 assert.equal(got[0].mine,false);
 assert.equal('email' in got[1],false);
});
test('Ranking: acepta exactamente tres caracteres arcade, incluidos símbolos seguros',()=>{
 const data=empty();
 data.cards=[
  {ini:'R56',handle:'player_numbers',score:2},
  {ini:'R!6',handle:'player_symbol',score:3},
  {ini:'?56',handle:'player_question',score:4},
  {ini:'A<B',handle:'player_unsafe',score:5},
  {ini:'AB',handle:'player_short',score:6},
  {ini:'ABCD',handle:'player_long',score:7}
 ];
 assert.deepEqual(normalizePlayerBoards(data).cards.map(row=>row.ini),['?56','R!6','R56']);
});
test('Ranking: cinco tablas, solo primeras diez posiciones reales',()=>{
 const data=empty();
 data.pts=Array.from({length:12},(_,i)=>({ini:'P'+String(i).padStart(2,'0'),handle:'p_'+String(i).padStart(3,'0'),score:200-i}));
 const got=normalizePlayerBoards(data);
 assert.equal(got.pts.length,10);
 assert.equal(got.pts[0].score,200);
 assert.equal(got.pts.at(-1).score,191);
});
test('Ranking: carga RPC público y no fabrica una tabla si hay error',async()=>{
 const requested=[];
 const rank=createPlayerRanking({request:async(name,args)=>{requested.push({name,args});return empty()}});
 await rank.refresh();
 assert.equal(rank.state.status,'ready');
 assert.equal(rank.state.boards.cards.length,0);
 assert.equal(requested[0].name,'icmx_player_leaderboards');
 const failed=createPlayerRanking({request:async()=>{throw Error('network')}});
 await failed.refresh();
 assert.equal(failed.state.status,'offline');
 assert.equal(failed.state.boards,null);
});
test('Seguridad: SQL deriva PTS de pack_issues y nunca toma un score del cliente',()=>{
 const sql=readFileSync('supabase/sql/player_global_leaderboards_STAGED.sql','utf8');
 assert.match(sql,/private_sync\.pack_issues/);
 assert.match(sql,/private_sync\.pack_pool/);
 assert.match(sql,/public\.player_snapshots/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.icmx_player_leaderboards\(\) FROM PUBLIC/);
 assert.match(sql,/AS \$function\$/);
 assert.doesNotMatch(sql,/INSERT INTO|UPDATE public\.player_snapshots/);
 assert.doesNotMatch(sql,/p_score|p_points|p_cards/);
});
