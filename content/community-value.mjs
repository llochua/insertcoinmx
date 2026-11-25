/**
 * Insert Coin MX — motor matemático de colección y popularidad (v1).
 * Puro y sin lecturas/escrituras: NO atribuye votos ni puntos a jugadores.
 * La identidad, autenticidad de sobres y anti-duplicados se validarán en Supabase.
 */
export const SCORING_VERSION = 'public-2026-value-v2';
export const VARIANT_POINTS = Object.freeze({b:10,e:25,r:50,f:100});
export const POPULARITY_WEIGHTS = Object.freeze({tiers:0.50,reta:0.50});
export const TIER_VALUES = Object.freeze({goty:1,genial:0.75,ok:0.4,mmm:0});
export const BAYES_PRIOR_VOTES = 10;
const CARD_KEY=/^[a-z0-9]{1,40}_[berf]$/;
const DESIGN_KEY=/^[a-z0-9]{1,40}$/;
const VALID=Object.freeze(['b','e','r','f']);
const safeCount=(n,key)=>{
 if(!Number.isSafeInteger(n)||n<0)throw new RangeError(key+' debe ser un entero no negativo');
 return n;
};
const arrayKeys=(keys,label)=>{
 if(!Array.isArray(keys)&&!(keys instanceof Set))throw new TypeError(label+' debe ser una lista o Set');
 return keys;
};
function canonicalEarned(keys,validCardKeys){
 arrayKeys(keys,'earnedKeys');
 const allowed=new Set(arrayKeys(validCardKeys,'validCardKeys'));
 return [...new Set(keys)].filter(k=>typeof k==='string'&&CARD_KEY.test(k)&&allowed.has(k)).sort();
}
/**
 * Una variante da puntos una sola vez, independientemente de sus duplicados.
 * earnedKeys es un histórico de descubrimientos, NO el inventario actual:
 * canjear repetidas nunca reduce los puntos otorgados.
 * validCardKeys es el catálogo permitido por el servidor, sin bonus ni diseños retirados.
 */
export function collectionPoints(earnedKeys,validCardKeys){
 const keys=canonicalEarned(earnedKeys,validCardKeys);
 const byVariant={b:0,e:0,r:0,f:0};
 for(const key of keys)byVariant[key.at(-1)]++;
 const points=VALID.reduce((sum,v)=>sum+byVariant[v]*VARIANT_POINTS[v],0);
 return {points,uniqueVariants:keys.length,byVariant};
}
/** Acumula únicamente primeras apariciones verificadas; nunca elimina un logro. */
export function awardDiscoveries(previousEarned,newCards,validCardKeys){
 const existing=canonicalEarned(previousEarned,validCardKeys);
 const earned=canonicalEarned([...existing,...arrayKeys(newCards,'newCards')],validCardKeys);
 const old=new Set(existing);
 const newlyEarned=earned.filter(k=>!old.has(k));
 return {earnedKeys:earned,newlyEarned,...collectionPoints(earned,validCardKeys)};
}
function bayes(normalizedTotal,observations){
 return (normalizedTotal+BAYES_PRIOR_VOTES/2)/(observations+BAYES_PRIOR_VOTES);
}
/**
 * Entradas agregadas por diseño provenientes del backend, no votos del cliente.
 * Los Likes históricos del backend se ignoran por completo.
 * tiers: {goty,genial,ok,mmm} — una calificación vigente por identidad/diseño.
 * reta: {wins,matches} — el último resultado válido por encuentro, sin rerolls descartados.
 * Sin votos: sin valor todavía (null); datos escasos: prior neutro 50/100.
 */
export function scoreDesign({tiers={},reta={}}={}){
 const counts={};
 for(const tier of Object.keys(TIER_VALUES))counts[tier]=safeCount(tiers[tier]??0,'tiers.'+tier);
 const tierCount=Object.values(counts).reduce((a,b)=>a+b,0);
 if(!Number.isSafeInteger(tierCount))throw new RangeError('Demasiados votos de Tier');
 const wins=safeCount(reta.wins??0,'reta.wins');
 const matches=safeCount(reta.matches??0,'reta.matches');
 if(wins>matches)throw new RangeError('reta.wins excede reta.matches');
 const interactions=tierCount+matches;
 if(!Number.isSafeInteger(interactions))throw new RangeError('Demasiadas interacciones');
 if(interactions===0)return {score:null,status:'unranked',interactions:0,
  components:{tiers:null,reta:null},counts:{tiers:0,reta:0}};
 const tierValue=Object.entries(TIER_VALUES).reduce((a,[name,value])=>a+counts[name]*value,0);
 const component={
  tiers:bayes(tierValue,tierCount),
  reta:bayes(wins,matches)
 };
 const score=Math.round(1000*Object.entries(POPULARITY_WEIGHTS)
  .reduce((sum,[source,weight])=>sum+weight*component[source],0));
 return {score,status:'ranked',interactions,
  components:Object.fromEntries(Object.entries(component).map(([k,v])=>[k,Math.round(v*1000)])),
  counts:{tiers:tierCount,reta:matches}};
}
/** Orden estable; sin votos aparece como 'sin clasificar' y sin puesto artificial. */
export function rankDesigns(designs){
 if(!Array.isArray(designs))throw new TypeError('designs debe ser un arreglo');
 const ids=new Set();
 const ranked=designs.map(entry=>{
  if(!entry||typeof entry.id!=='string'||!DESIGN_KEY.test(entry.id)||ids.has(entry.id))
   throw new TypeError('Diseño inválido o repetido');
  ids.add(entry.id);
  return {id:entry.id,...scoreDesign(entry)};
 }).sort((a,b)=>{
  if(a.score===null)return b.score===null?a.id.localeCompare(b.id):1;
  if(b.score===null)return -1;
  return b.score-a.score||b.interactions-a.interactions||a.id.localeCompare(b.id);
 });
 let lastScore=null,position=0;
 return ranked.map((item,i)=>{
  if(item.score===null)return {...item,position:null};
  if(item.score!==lastScore){position=i+1;lastScore=item.score}
  return {...item,position};
 });
}
