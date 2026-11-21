import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('index.html','utf8');
const assignment=html.match(/window\.ICMX_VERIFIED_GUEST_PLAY=([^;]+);/);
assert.ok(assignment,'la edición v2 debe habilitar invitados con Auth exclusivamente en dominio oficial');
function launch(hostname){
 const window={};
 vm.runInNewContext('window.ICMX_VERIFIED_GUEST_PLAY='+assignment[1]+';', {window,location:{hostname}});
 return window.ICMX_VERIFIED_GUEST_PLAY;
}
test('Activar invitados verificados solo en insertcoinmx.com y www',()=>{
 assert.equal(launch('insertcoinmx.com'),true);
 assert.equal(launch('www.insertcoinmx.com'),true);
 for(const host of ['localhost','127.0.0.1','test.insertcoinmx.com','insertcoinmx.com.attacker.test'])
  assert.equal(launch(host),false,'no invitar con Auth de producción fuera del dominio: '+host);
});
