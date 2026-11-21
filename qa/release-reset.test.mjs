/** Contrato de lanzamiento desde cero. No borra nada del usuario ni de Supabase real. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('content/release-reset.js','utf8');
const html=readFileSync('index.html','utf8');
const epoch='public-2026-launch-v1';
function storage(initial={}){
 const m=new Map(Object.entries(initial));
 return {
  get length(){return m.size},
  key(i){return [...m.keys()][i]??null},
  getItem(k){return m.has(k)?m.get(k):null},
  setItem(k,v){m.set(k,String(v))},
  removeItem(k){m.delete(k)},
  snapshot(){return Object.fromEntries(m)}
 };
}
function launch(s,active,version=epoch){
 const window={};
 const document={currentScript:{getAttribute(name){
  return {'data-active':active?'true':'false','data-game-epoch':version}[name]??null;
 }}};
 vm.runInNewContext(source,{localStorage:s,window,document});
 return window.ICMX_RELEASE_RESET;
}
const legacy=()=>storage({
 'icmx-album2':'{"have":{"abuket_b":3},"welcomeLeft":0}',
 'icmx-album2.ext':'{"pend":{"unreleased_f":1}}',
 'icmx-album2.bak':'backup',
 'icmx-album2.premig':'old',
 'icmx-album2.corrupt':'invalid',
 'icmx-cloud-active-account-v1':'old-account',
 'icmx-cloud-baseline-v1:player-A':'{"revision":3}',
 'icmx-cloud-pack-request-v1:player-A':'request-1',
 'icmx-cloud-exchange-request-v1:player-A':'request-2',
 'icmx-avatar-guest-v1':'jos',
 'sb-ynugqxbtszhsupadqdkz-auth-token':'auth',
 'unrelated-setting':'keep'
});
test('La PR mantiene el reinicio desactivado hasta autorizar la publicación',()=>{
 assert.match(html,/release-reset\\.js[^>]*data-active="false"[^>]*data-game-epoch="public-2026-launch-v1"/);
 const s=legacy();
 assert.equal(launch(s,false).result.status,'staged');
 assert.equal(JSON.parse(s.getItem('icmx-album2')).have.abuket_b,3);
 assert.equal(s.getItem('icmx-game-epoch'),null);
});
test('Al activarse elimina juego anterior, no usuarios, Auth ni avatar',()=>{
 const s=legacy();
 const run=launch(s,true);
 assert.equal(run.result.status,'reset');
 for(const key of [
  'icmx-album2','icmx-album2.ext','icmx-album2.bak',
  'icmx-album2.premig','icmx-album2.corrupt',
  'icmx-cloud-active-account-v1','icmx-cloud-baseline-v1:player-A',
  'icmx-cloud-pack-request-v1:player-A','icmx-cloud-exchange-request-v1:player-A'
 ])assert.equal(s.getItem(key),null,key);
 assert.equal(s.getItem('icmx-game-epoch'),epoch);
 assert.equal(s.getItem('icmx-avatar-guest-v1'),'jos');
 assert.equal(s.getItem('sb-ynugqxbtszhsupadqdkz-auth-token'),'auth');
 assert.equal(s.getItem('unrelated-setting'),'keep');
});
test('El reinicio es único: nunca elimina cartas nuevas al refrescar',()=>{
 const s=legacy();
 launch(s,true);
 s.setItem('icmx-album2','{"have":{"new_b":5}}');
 assert.equal(launch(s,true).result.status,'already-current');
 assert.equal(JSON.parse(s.getItem('icmx-album2')).have.new_b,5);
});
test('Solo un cambio explícito de edición vuelve a reiniciar',()=>{
 const s=legacy();
 launch(s,true);
 s.setItem('icmx-album2','{"have":{"new_b":5}}');
 launch(s,true,'public-2026-season-two');
 assert.equal(s.getItem('icmx-album2'),null);
 assert.equal(s.getItem('icmx-game-epoch'),'public-2026-season-two');
});
test('La importación manual de respaldos anteriores se bloquea al activar',()=>{
 assert.match(html,/b\\.edition!==window\\.ICMX_RELEASE_RESET\\.edition/);
 assert.match(html,/b\\.edition=window\\.ICMX_RELEASE_RESET\\.edition/);
});
