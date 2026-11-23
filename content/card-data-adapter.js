/* Insert Coin MX · adaptador de datos de cartas v2.
 * Fuente editorial: catalogo.json; fuente juego: variante e ID persistentes.
 * No lee/modifica almacenamiento, Auth ni Supabase. No infiere POP.
 */
(function(root){
  'use strict';
  const VERSIONS=Object.freeze({b:'comun',e:'holo',r:'dorada',f:'full'});
  const POINTS=Object.freeze({b:10,e:25,r:50,f:100});
  function own(obj,key){return Object.prototype.hasOwnProperty.call(obj,key)}
  function resolve(input,options={}){
    const designId=String(input?.d||input?.id||'');
    const variant=String(input?.v||input?.variant||'b');
    if(!/^[a-z0-9]{1,40}$/.test(designId))throw Error('ID de carta inválido');
    if(!own(VERSIONS,variant))throw Error('Rareza inválida');
    const catalog=options.catalog;
    if(!Array.isArray(catalog))throw Error('Falta catálogo editorial');
    const editorial=catalog.find(x=>x.id===designId);
    if(!editorial)throw Error('Diseño sin registro editorial: '+designId);
    if(variant==='f'&&!editorial.full)throw Error('No existe Full de '+designId);
    let number=String(editorial.numero||'');
    if(editorial.tipo==='Álbum'&&options.unknownAlbumTotal===true && variant!=='f'){
      // El índice se conserva; no se revela el tamaño final de colecciones futuras.
      const match=/^(\d{1,4})\/(?:\d{1,4}|\?{3})$/.exec(number);
      if(match)number=match[1]+'/???';
    }
    const fullAlias=options.fullAliases?.[designId];
    const fullKey=variant==='f'
      ? (typeof fullAlias==='string'&&/^F_[a-z0-9]{1,40}$/.test(fullAlias)
          ? fullAlias:'F_'+designId):null;
    const data={...editorial,numero:number};
    if(fullKey)data.fullKey=fullKey;
    const overrides=options.editorialOverrides||{};
    // Solo campos previstos: nunca permitir sobreescribir identidad/categoria o tipo.
    for(const key of ['nombre','ref','ref2','linea','frase','numero']){
      if(own(overrides,key)&&typeof overrides[key]==='string')data[key]=overrides[key];
    }
    const pointOverride=options.points;
    const points=Number.isSafeInteger(pointOverride)&&pointOverride>=0&&pointOverride<=999999
      ? pointOverride:POINTS[variant];
    const score=options.pop;
    const pop=Number.isSafeInteger(score)&&score>=0&&score<=1000?score:null;
    const fileKey=variant==='f'?data.fullKey
      :VERSIONS[variant]===data.version_original?data.id:data.id+'_'+variant;
    return Object.freeze({
      card:Object.freeze(data),variant,
      options:Object.freeze({points,pop,assetRoot:options.assetRoot||'',
        fullTotal:options.fullTotal||0,quality:options.quality||'full'}),
      fileKey,
      legacySrc:(options.assetRoot||'')+(options.quality==='thumb'?'c':'c2')+'/'+fileKey+'.webp'
    });
  }
  root.ICMX_CARD_DATA=Object.freeze({resolve,VERSIONS,POINTS});
})(typeof window!=='undefined'?window:globalThis);
