/** Solo lee el endpoint público de GoTrue; no crea usuarios ni emite correos. */
import assert from 'node:assert/strict';
const origin='https://ynugqxbtszhsupadqdkz.supabase.co';
const apikey='sb_publishable_3wyMm9dwLqSb9GiYTh245Q_9TukyCLK';
const response=await fetch(origin+'/auth/v1/settings',{
 headers:{apikey,accept:'application/json'},
 signal:AbortSignal.timeout(12000)
});
assert.equal(response.status,200,'No se pudieron consultar las opciones públicas de Auth');
const settings=await response.json();
assert.equal(settings.disable_signup,false,'Supabase está rechazando nuevos registros');
assert.equal(settings.mailer_autoconfirm,false,'Las cuentas deben confirmar su correo');
assert.equal(settings.external?.email,true,'No está habilitado el acceso por correo');
console.log('✓ Auth: registro habilitado, confirmación de correo necesaria, proveedor de correo activo');
console.log('✓ Verificada configuración pública de GoTrue sin enviar emails ni credenciales');
console.log('NOTA: la allowlist de Redirect URLs no se expone en este endpoint; validar en el dashboard.');
