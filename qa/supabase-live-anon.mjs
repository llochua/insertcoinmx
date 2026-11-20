/**
 * Smoke test NO DESTRUCTIVO contra el proyecto Supabase real.
 * No crea cuentas, no inicia sesión, no escribe snapshots ni descarga datos
 * privados. Solo comprueba que una sesión anónima no tiene acceso.
 * Uso: node qa/supabase-live-anon.mjs
 */
import assert from 'node:assert/strict';

const origin='https://ynugqxbtszhsupadqdkz.supabase.co';
const publicKey='sb_publishable_3wyMm9dwLqSb9GiYTh245Q_9TukyCLK';
const headers={'apikey':publicKey,'accept':'application/json'};
const request=async(path,options={})=>{
 const response=await fetch(origin+path,{
  headers:{...headers,...options.headers},...options,
  signal:AbortSignal.timeout(12000)
 });
 const text=await response.text();
 let data;
 try{data=JSON.parse(text)}catch{data=text}
 return {status:response.status,ok:response.ok,data};
};

function assertDeniedResult(result,label){
 assert.ok(!result.ok,label+' no debe tener HTTP 2xx');
 assert.ok([400,401,403,404].includes(result.status),
  label+': código HTTP inesperado '+result.status);
}

const user=await request('/auth/v1/user');
assertDeniedResult(user,'Auth sin sesión');
console.log('✓ Auth: sin token no hay perfil autenticado');

const data=await request('/rest/v1/player_snapshots?select=user_id,revision,game_format&limit=5');
assert.ok(
 (!data.ok&&[400,401,403].includes(data.status))||
 (data.ok&&Array.isArray(data.data)&&data.data.length===0),
 'Un visitante no puede recuperar ninguna colección privada'
);
console.log('✓ PostgREST: visitante sin sesión no obtiene colecciones ajenas');

// Un payload de prueba sin cambios en el servidor real: ninguna cuenta
// autenticada y revisión inválida para que no exista camino de escritura.
const rpc=await request('/rest/v1/rpc/sync_player_snapshot',{
 method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({
  p_expected_revision:-1,
  p_state:{app:'insertcoinmx-album',format:2,
   data:{have:{},rate:{}}}
 })
});
assertDeniedResult(rpc,'RPC de sincronización sin sesión');
console.log('✓ RPC: visitante sin sesión no puede sincronizar');

const initResponse=await request('/rest/v1/rpc/ensure_player_snapshot',{
 method:'POST',headers:{'content-type':'application/json'},body:'{}'
});
assertDeniedResult(initResponse,'Inicialización de cuenta sin sesión');
console.log('✓ Inicialización: un visitante no puede crear colecciones remotas');

for(const rpcName of ['issue_player_pack','exchange_duplicate_cards']){
 const response=await request('/rest/v1/rpc/'+rpcName,{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({
   p_request_id:'11111111-2222-4333-8444-555555555555',
   p_expected_revision:1
  })
 });
 assertDeniedResult(response,rpcName+' sin sesión');
}
console.log('✓ Emisión y canje: anónimos no pueden generar cartas ni sobres');

// No se comprueban aquí las sesiones reales A/B (no hay credenciales de QA
// conectadas al runner). El aislamiento de cuentas se probó antes con SQL
// reversible, y la lógica de dos navegadores se probó con nube simulada.
console.log('SMOKE SUPABASE REAL APROBADO (solo anónimo, sin mutaciones)');
