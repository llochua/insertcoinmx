/** Insert Coin MX · Top 10 global de jugadores. Solo lectura, ninguna estadística se envía. */
const METRICS=Object.freeze(['pts','cards','designs','duplicates','ratings']);
const validRow=row=>row&&/^[A-Z0-9]{3}$/.test(row.ini)&&
 /^[a-z0-9_]{3,20}$/.test(row.handle)&&
 Number.isSafeInteger(row.score)&&row.score>0&&row.score<=100000000;
export function normalizePlayerBoards(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Ranking incompleto');
 const result={};
 for(const metric of METRICS){
  if(!Array.isArray(data[metric]))throw Error('Ranking no disponible: '+metric);
  const seen=new Set();
  result[metric]=data[metric].filter(row=>{
   if(!validRow(row)||seen.has(row.handle))return false;
   seen.add(row.handle);return true;
  }).map(row=>({ini:row.ini,handle:row.handle,score:row.score,mine:row.mine===true}))
   .sort((a,b)=>b.score-a.score||a.handle.localeCompare(b.handle)).slice(0,10);
 }
 return result;
}
export function createPlayerRanking({request,onChange=()=>{}}){
 const state={status:'idle',boards:null};
 let active=null,refreshedAt=0;
 async function refresh(force=false){
  if(active)return active;
  if(!force&&state.status==='ready'&&Date.now()-refreshedAt<10000)return state.boards;
  state.status='loading';onChange(state);
  active=(async()=>{
   try{
    const boards=normalizePlayerBoards(await request('icmx_player_leaderboards',{}));
    state.boards=boards;state.status='ready';refreshedAt=Date.now();
   }catch(_){state.status='offline';state.boards=null}
   onChange(state);return state.boards;
  })();
  try{return await active}finally{active=null}
 }
 return {state,refresh};
}
