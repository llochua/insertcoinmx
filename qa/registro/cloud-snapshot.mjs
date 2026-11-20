/** Verifica el propietario, formato y revisión de un respaldo leído de Supabase. */
export function validCloudSnapshot(snapshot,userId){
 const rev=snapshot?.revision;
 if(typeof rev!=='number'&&!(typeof rev==='string'&&/^[1-9][0-9]*$/.test(rev)))return false;
 return snapshot?.user_id===userId&&snapshot.game_format===2&&
  Number.isSafeInteger(Number(rev))&&Number(rev)>=1;
}
