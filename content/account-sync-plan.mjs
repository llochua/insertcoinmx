/**
 * Fase 1 · Decisión segura antes de vincular colección y cuenta.
 *
 * NO conecta con la nube, NO altera el progreso y NO resuelve conflictos
 * automáticamente. Recibe dos respaldos YA validados por el juego / servidor.
 * El servidor aún debe verificar titularidad, procedencia y versión.
 */
const IGNORED_COMPARISON_FIELDS=new Set(['rev','sv','mv','test']);
const IGNORED_ACTIVITY_FIELDS=new Set(['rev','sv','mv','test','seen','freeCycle']);
const BASELINE={
  have:{},rate:{},duel:{},logro:{},ini:'',last:'',rdia:'',champ:'',
  extra:0,freeUsed:0,welcomeLeft:5,fg:0,pk:[],rhoy:[],rlast:null,
  freeDay:''
};
const RESERVED=new Set(['__proto__','constructor','prototype']);
const MAX_BACKUP_BYTES=1048576;
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

/* Canonización solo para comparación; NO usar como hash de integridad. */
function canonical(value,seen=new WeakSet(),depth=0){
 if(depth>10)throw Error('Datos demasiado anidados');
 if(value===null||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){
  if(!Number.isFinite(value))throw Error('Número inválido');
  return JSON.stringify(value);
 }
 if(typeof value==='string'){
  if(value.length>65536)throw Error('Texto demasiado largo');
  return JSON.stringify(value);
 }
 if(typeof value!=='object')throw Error('Tipo de dato no permitido');
 if(seen.has(value))throw Error('Referencias circulares');
 seen.add(value);
 let out;
 if(Array.isArray(value)){
  if(value.length>1000)throw Error('Lista demasiado grande');
  out='['+value.map(v=>canonical(v,seen,depth+1)).join(',')+']';
 }else{
  if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)
   throw Error('Objeto no permitido');
  const keys=Object.keys(value).sort();
  if(keys.length>1000)throw Error('Demasiados campos');
  if(keys.some(k=>RESERVED.has(k)))throw Error('Nombre de campo no permitido');
  out='{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k],seen,depth+1)).join(',')+'}';
 }
 seen.delete(value);
 if(out.length>MAX_BACKUP_BYTES)throw Error('Respaldo demasiado grande');
 return out;
}

function nonempty(value){
 if(value===null||value===undefined||value===false||value===0||value==='')return false;
 if(Array.isArray(value))return value.length>0;
 if(isObj(value))return Object.keys(value).length>0;
 return true;
}
function hasProgress(data,ext){
 if(nonempty(ext))return true;
 for(const [key,value] of Object.entries(data)){
  if(IGNORED_ACTIVITY_FIELDS.has(key))continue;
  if(own(BASELINE,key)){
   if(canonical(value)!==canonical(BASELINE[key]))return true;
  }else if(nonempty(value))return true; // dato futuro desconocido: proteger
 }
 return false;
}
function examine(backup){
 if(backup===null)return {exists:false,hasProgress:false,summary:null};
 if(!isObj(backup)||backup.app!=='insertcoinmx-album'||
    !Number.isInteger(backup.format)||backup.format<1||backup.format>2||!isObj(backup.data))
  throw Error('Formato de respaldo no compatible');
 if(backup.ext!==undefined&&!isObj(backup.ext))throw Error('Extensión inválida');
 const d=backup.data,have=d.have??{},rate=d.rate??{};
 if(!isObj(have)||!isObj(rate))throw Error('Cartas o calificaciones inválidas');
 for(const n of Object.values(have))if(!Number.isInteger(n)||n<1||n>9999)throw Error('Cantidad de cartas inválida');
 for(const n of Object.values(rate))if(!Number.isInteger(n)||n<0||n>3)throw Error('Calificación inválida');
 const comparable={};
 for(const k of Object.keys(d))if(!IGNORED_COMPARISON_FIELDS.has(k))comparable[k]=d[k];
 const signature=canonical({data:comparable,ext:backup.ext??null});
 const summary={
  variants:Object.keys(have).length,
  duplicates:Object.values(have).reduce((total,n)=>total+n-1,0),
  ratings:Object.keys(rate).length
 };
 return {exists:true,hasProgress:hasProgress(d,backup.ext??null),signature,summary};
}

/**
 * @param {{local: object|null, cloud: object|null}} args
 * @returns {{kind:string, writes:false, requiresConfirmation:boolean,
 *   requiresBackup:boolean, local:object|null, cloud:object|null}}
 */
export function planAccountSync({local,cloud}={}){
 let a,b;
 try{a=examine(local??null);b=examine(cloud??null)}
 catch(e){
  return {kind:'blocked-invalid-backup',writes:false,requiresConfirmation:false,
   requiresBackup:false,local:null,cloud:null,error:e.message};
 }
 const result=(kind,confirm=false,backup=false)=>({
  kind,writes:false,requiresConfirmation:confirm,requiresBackup:backup,
  local:a.summary,cloud:b.summary
 });
 if(!b.exists||!b.hasProgress){
  return a.hasProgress?result('offer-first-upload',true,true):result('empty-account');
 }
 if(!a.hasProgress)return result('offer-cloud-restore',true,true);
 if(a.signature===b.signature)return result('already-matched');
 return result('review-conflict',true,true);
}
