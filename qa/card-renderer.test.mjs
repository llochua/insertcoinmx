import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'content/card-renderer.js'),'utf8');
const context={};
vm.runInNewContext(source,context,{filename:'content/card-renderer.js'});
const api=context.ICMX_CARD_RENDERER;
const sample={
  id:'sonic',nombre:'Sonic',categoria:'GAMER',ref:'Sonic the Hedgehog',ref2:'',
  linea:'Corre tan rápido que los anillos ni lo alcanzan.',frase:'Gotta go fast.',
  numero:'092/109',tipo:'Álbum',full:'F32',version_original:'comun'
};

test('expone el nuevo renderizador sin tocar progreso ni catálogo',()=>{
  assert.equal(typeof api.create,'function');
  assert.equal(typeof api.makeLayers,'function');
  assert.equal(typeof api.shellKey,'function');
  assert.equal(typeof api.numLabel,'function');
});
test('reutiliza los IDs previos de archivo y aliases',()=>{
  assert.equal(api.shellKey(sample,'b'),'sonic');
  assert.equal(api.shellKey(sample,'e'),'sonic_e');
  assert.equal(api.shellKey(sample,'r'),'sonic_r');
  assert.equal(api.shellKey(sample,'f'),'F_sonic');
  assert.equal(api.shellKey({...sample,fullKey:'F_zodiaco'},'f'),'F_zodiaco');
});
test('el número no forma parte de la imagen ni del ID',()=>{
  const a=api.makeLayers(sample,'b',{assetRoot:'../'});
  const b=api.makeLayers({...sample,numero:'092/250'},'b',{assetRoot:'../'});
  assert.equal(api.shellKey(sample,'b'),api.shellKey({...sample,numero:'092/250'},'b'));
  assert.ok(a.some(x=>x.text==='092/109'));
  assert.ok(b.some(x=>x.text==='092/250'));
});
test('valor y POP cambian como datos, con valores iniciales por rareza',()=>{
  const base=api.makeLayers(sample,'b',{assetRoot:'../'});
  assert.ok(base.some(x=>x.text==='Valor 10'));
  assert.ok(base.some(x=>x.text==='—'));
  const special=api.makeLayers(sample,'r',{points:75,pop:43,assetRoot:'../'});
  assert.ok(special.some(x=>x.text==='Valor 75'));
  assert.ok(special.some(x=>x.text==='43'));
  assert.equal(api.pointsOf('f',{}),100);
});
test('un cambio editorial no afecta los assets, solo las capas',()=>{
  const edited={...sample,nombre:'Sonic Reloaded',linea:'Nueva habilidad revisada'};
  assert.equal(api.shellKey(sample,'b'),api.shellKey(edited,'b'));
  assert.ok(api.makeLayers(edited,'b',{assetRoot:'../'}).some(x=>x.text==='Sonic Reloaded'));
});
test('BONUS no tiene número ni total de álbum',()=>{
  const bonus={...sample,tipo:'Bonus · nunca producida',numero:''};
  assert.equal(api.numLabel(bonus,'b',{}),'BONUS');
  const a=api.makeLayers(bonus,'b',{assetRoot:'../'});
  assert.ok(a.some(x=>x.text==='BONUS'));
});
test('jerarquía vectorial Full: 1 símbolo de habilidad y 3 estrellas de rareza',()=>{
  const layers=api.makeLayers(sample,'f',{fullTotal:74});
  const symbols=layers.filter(x=>x.type==='star');
  assert.equal(symbols.length,4);
  assert.equal(symbols.filter(x=>x.points===4).length,1);
  assert.equal(symbols.filter(x=>x.points===5).length,3);
  assert(!layers.some(x=>x.type==='text'&&/[✦★]/.test(x.text)),'no estrellas tipográficas');
});
test('la Full conserva numeración independiente',()=>{
  const layers=api.makeLayers(sample,'f',{fullTotal:74,points:125,pop:90,assetRoot:'../'});
  assert.ok(layers.some(x=>x.text==='Carta F32/74'));
  assert.ok(layers.some(x=>x.text==='Valor 125'));
  assert.ok(layers.some(x=>x.text==='90'));
});
test('rechaza ID, rareza y categoría desconocidos',()=>{
  assert.throws(()=>api.assertData({...sample,id:'../malicioso'},'b'),/ID/);
  assert.throws(()=>api.assertData(sample,'z'),/Rareza/);
  assert.throws(()=>api.assertData({...sample,categoria:'HTML'},'b'),/Categoría/);
  assert.throws(()=>api.assertData({...sample,full:null},'f'),/Full/);
});
test('motor aislado: no toca archivos de juego ni crea un laboratorio duplicado',()=>{
  const renderer=fs.readFileSync(path.join(root,'content/card-renderer.js'),'utf8');
  assert.doesNotMatch(renderer,/localStorage\\.(setItem|removeItem|clear)/);
  assert.doesNotMatch(renderer,/supabase\\.co/);
  assert.equal(fs.existsSync(path.join(root,'qa/cards-dynamic-preview.html')),false);
});
