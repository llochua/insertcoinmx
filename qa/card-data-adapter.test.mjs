import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=fs.readFileSync(path.join(root,'content/card-data-adapter.js'),'utf8');
const ctx={};vm.runInNewContext(src,ctx);
const api=ctx.ICMX_CARD_DATA;
const cards=JSON.parse(fs.readFileSync(path.join(root,'cartas/catalogo.json'),'utf8'));

test('todas las variantes del catálogo resuelven a IDs persistentes',()=>{
 let count=0;
 for(const d of cards)for(const v of (d.full?['b','e','r','f']:['b','e','r'])){
  const result=api.resolve({d:d.id,v},{catalog:cards});
  assert.equal(result.card.id,d.id);
  assert.equal(result.variant,v);
  assert.match(result.fileKey,/^[a-zA-Z0-9_]+$/);
  assert.equal(typeof result.options.points,'number');
  count++;
 }
 assert(count>=400,'deben cubrirse todas las versiones activas del catálogo');
});

test('totales abiertos no cambian los números ni IDs persistentes',()=>{
 const d=cards.find(x=>x.id==='sonic');
 const input=Object.freeze({d:'sonic',v:'e'});
 const current=api.resolve(input,{catalog:cards});
 const open=api.resolve(input,{catalog:cards,unknownAlbumTotal:true});
 assert.match(current.card.numero,/\/\d+$/);
 assert.match(open.card.numero,/\/\?\?\?$/);
 assert.equal(current.fileKey,open.fileKey);
 assert.equal(d.numero,current.card.numero,'el catálogo original no se muta');
});

test('Full conserva numeración independiente y alias antiguos',()=>{
 const raw=api.resolve({d:'abuket',v:'f'},{catalog:cards});
 assert.equal(raw.card.full,'F01');
 assert.equal(raw.fileKey,'F_abuket');
 const alias=api.resolve({d:'abuket',v:'f'},{catalog:cards,fullAliases:{abuket:'F_worldwarrior'},unknownAlbumTotal:true});
 assert.equal(alias.fileKey,'F_worldwarrior');
 assert.equal(alias.card.numero,raw.card.numero,'la numeración de Full la calcula el renderer aparte');
});

test('POP desconocido nunca se convierte en puntuación ficticia',()=>{
 const ctx={catalog:cards};
 assert.equal(api.resolve({d:'1up',v:'b'},ctx).options.pop,null);
 assert.equal(api.resolve({d:'1up',v:'b'},{...ctx,pop:0}).options.pop,0);
 assert.equal(api.resolve({d:'1up',v:'b'},{...ctx,pop:143}).options.pop,143);
 assert.equal(api.resolve({d:'1up',v:'b'},{...ctx,pop:-1}).options.pop,null);
 assert.equal(api.resolve({d:'1up',v:'b'},{...ctx,pop:1001}).options.pop,null);
});
test('PTS vienen por rareza, overrides válidos solo para ensayos',()=>{
 assert.equal(api.resolve({d:'sonic',v:'b'},{catalog:cards}).options.points,10);
 assert.equal(api.resolve({d:'sonic',v:'e'},{catalog:cards}).options.points,25);
 assert.equal(api.resolve({d:'sonic',v:'r'},{catalog:cards}).options.points,50);
 assert.equal(api.resolve({d:'sonic',v:'f'},{catalog:cards}).options.points,100);
 assert.equal(api.resolve({d:'sonic',v:'f'},{catalog:cards,points:75}).options.points,75);
});
test('campos editoriales se editan sin mutar rareza, identidad o inventario',()=>{
 const original=cards.find(x=>x.id==='sonic');
 const x=api.resolve({d:'sonic',v:'b'},{catalog:cards,
  editorialOverrides:{nombre:'SONIC PRUEBA',linea:'Habilidad editada',id:'alterado',tipo:'Bonus'}});
 assert.equal(x.card.nombre,'SONIC PRUEBA');
 assert.equal(x.card.linea,'Habilidad editada');
 assert.equal(x.card.id,'sonic');
 assert.equal(x.card.tipo,original.tipo);
 assert.equal(original.nombre,'Sonic');
 assert.equal(x.fileKey,'sonic');
});
test('Bonus se etiqueta como Bonus, no infiere totales',()=>{
 const bonus=cards.find(x=>x.tipo!=='Álbum');
 assert(bonus,'debe existir una carta Bonus');
 const x=api.resolve({d:bonus.id,v:'e'},{catalog:cards,unknownAlbumTotal:true});
 assert.equal(x.card.tipo,bonus.tipo);
 assert.equal(x.card.numero,bonus.numero);
});
test('el adaptador no ejecuta red ni escrituras de almacenamiento',()=>{
 const code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 assert.doesNotMatch(code,/\b(?:localStorage|sessionStorage)\s*\.|\bfetch\s*\(|\bXMLHttpRequest\b|\bsupabase\s*\.|\bindexedDB\b/i);
});

test('el adaptador transmite la política de total oculto a las Full',()=>{
 const r=api.resolve({d:'sonic',v:'f'},{catalog:cards,unknownAlbumTotal:true});
 assert.equal(r.options.unknownAlbumTotal,true);
 assert.equal(r.card.full,cards.find(x=>x.id==='sonic').full);
});
