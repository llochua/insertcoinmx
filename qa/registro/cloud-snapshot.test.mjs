import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validCloudSnapshot} from './cloud-snapshot.mjs';
const USER='qa-test-user';
const row=revision=>({user_id:USER,game_format:2,revision});
test('El respaldo inicial y los posteriores pueden consultarse',()=>{
 for(const rev of [1,2,3,18,'2','18'])assert.equal(validCloudSnapshot(row(rev),USER),true);
});
test('Rechaza revisiones inválidas y colecciones ajenas',()=>{
 for(const rev of [0,-1,1.2,null,undefined,true,'0','-1','2.5','foo',Number.MAX_SAFE_INTEGER+1])
  assert.equal(validCloudSnapshot(row(rev),USER),false,String(rev));
 assert.equal(validCloudSnapshot({...row(3),user_id:'otro'},USER),false);
 assert.equal(validCloudSnapshot({...row(3),game_format:1},USER),false);
 assert.equal(validCloudSnapshot(null,USER),false);
});
