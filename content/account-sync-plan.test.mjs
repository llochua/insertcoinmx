import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planAccountSync} from './account-sync-plan.mjs';

const backup=(data={},ext)=>({app:'insertcoinmx-album',format:2,data:{have:{},rate:{},welcomeLeft:5,...data},...(ext?{ext}: {})});

test('Invitado con cartas y cuenta sin datos: ofrecer carga, sin ejecutarla',()=>{
 const local=backup({have:{gato_b:2,rosa_f:1},rate:{gato:1},pk:['abcdef']});
 const input=JSON.stringify(local);
 const plan=planAccountSync({local,cloud:null});
 assert.equal(plan.kind,'offer-first-upload');
 assert.equal(plan.writes,false);
 assert.equal(plan.requiresConfirmation,true);
 assert.equal(plan.requiresBackup,true);
 assert.equal(plan.local.variants,2);
 assert.equal(plan.local.duplicates,1);
 assert.equal(JSON.stringify(local),input);
});

test('Cuenta existente y navegador nuevo: ofrecer restauración, no copiar automáticamente',()=>{
 const plan=planAccountSync({local:backup(),cloud:backup({have:{gato_b:1}})});
 assert.equal(plan.kind,'offer-cloud-restore');
 assert.equal(plan.writes,false);
 assert.equal(plan.requiresBackup,true);
});

test('Colecciones distintas: no sumar cantidades ni adjudicar sobres',()=>{
 const local=backup({have:{gato_b:30},pk:['abcdef'],extra:2});
 const cloud=backup({have:{gato_b:12},pk:['ghijkl'],extra:1});
 const plan=planAccountSync({local,cloud});
 assert.equal(plan.kind,'review-conflict');
 assert.equal(plan.writes,false);
 assert.equal(plan.local.variants,1);
 assert.equal(plan.cloud.variants,1);
 assert.deepEqual(local.data.have,{gato_b:30});
 assert.deepEqual(cloud.data.have,{gato_b:12});
});

test('Mismos datos con distinto orden de claves y revisión local: no hay conflicto',()=>{
 const local=backup({have:{gato_b:1,rosa_f:2},rate:{gato:0},rev:28});
 const cloud=backup({rev:2,rate:{gato:0},have:{rosa_f:2,gato_b:1}});
 assert.equal(planAccountSync({local,cloud}).kind,'already-matched');
});

test('Misma cantidad de cartas con distinto historial: revisar',()=>{
 const local=backup({have:{gato_b:1},pk:['abcdef']});
 const cloud=backup({have:{gato_b:1},pk:['ghijkl']});
 assert.equal(planAccountSync({local,cloud}).kind,'review-conflict');
});

test('Sin progreso en ambos: no habilitar importación',()=>{
 assert.equal(planAccountSync({local:backup({seen:1}),cloud:null}).kind,'empty-account');
});

test('Avance solo de Reta, calificaciones o datos pendientes también se conserva',()=>{
 assert.equal(planAccountSync({local:backup({reta2:{round:2}}),cloud:null}).kind,'offer-first-upload');
 assert.equal(planAccountSync({local:backup({rate:{gato:3}}),cloud:null}).kind,'offer-first-upload');
 assert.equal(planAccountSync({local:backup(),cloud:null}).kind,'empty-account');
 assert.equal(planAccountSync({local:backup({}, {pend:{proximo_b:2}}),cloud:null}).kind,'offer-first-upload');
});

test('Bloquear objetos ilegales o datos dañados sin escritura',()=>{
 const invalid=backup({have:{gato_b:-1}});
 assert.equal(planAccountSync({local:invalid,cloud:null}).kind,'blocked-invalid-backup');
 const bad=backup();
 Object.defineProperty(bad.data,'__proto__',{value:{admin:true},enumerable:true});
 assert.equal(planAccountSync({local:bad,cloud:null}).kind,'blocked-invalid-backup');
});

test('Respaldo de una versión futura: detener y protegerlo',()=>{
 assert.equal(planAccountSync({local:{app:'insertcoinmx-album',format:99,data:{}},cloud:null}).kind,'blocked-invalid-backup');
});
