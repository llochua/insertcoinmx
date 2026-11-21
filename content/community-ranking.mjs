import {rankDesigns} from './community-value.mjs';
/** One request per refresh, never substitutes local votes for global data. */
export function createCommunityRanking({request,onChange=()=>{}}){
 let sequence=0,state={status:'idle',rows:[],aggregates:[]};
 const publish=next=>{state=next;onChange(state)};
 return {
  get state(){return state},
  get(id){return state.rows.find(row=>row.id===id)||null},
  async refresh(){
   const seq=++sequence;
   if(state.status!=='ready')publish({...state,status:'loading'});
   try{
    const rows=await request('icmx_community_aggregates');
    if(!Array.isArray(rows))throw Error('Invalid ranking response');
    const ranked=rankDesigns(rows);
    if(seq===sequence)publish({status:rows.length?'ready':'disabled',rows:ranked,aggregates:rows});
   }catch(e){if(seq===sequence)publish({...state,status:'offline'})}
   return state;
  },
  async vote(design,channel,value){
   await request('icmx_community_vote',{p_design:design,p_channel:channel,p_value:value});
   return this.refresh();
  },
  async reta(day,matches){
   if(!validRetaMatches(matches))throw Error('Incomplete Reta ballot');
   await request('icmx_community_reta',{p_day:day,p_matches:matches});
   return this.refresh();
  }
 };
}
export function validRetaMatches(matches){
 if(!Array.isArray(matches)||matches.length!==7)return false;
 const seen=new Set();let champion=null;
 for(const m of matches){
  if(!m||!['winner','loser'].every(k=>typeof m[k]==='string'&&/^[a-z0-9]{1,40}$/.test(m[k]))||m.winner===m.loser)return false;
  if(champion===null){seen.add(m.winner);seen.add(m.loser)}
  else{
   const challenger=m.winner===champion?m.loser:m.loser===champion?m.winner:null;
   if(!challenger||seen.has(challenger))return false;
   seen.add(challenger);
  }
  champion=m.winner;
 }
 return seen.size===8;
}
