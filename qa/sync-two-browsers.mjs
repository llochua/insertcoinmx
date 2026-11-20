/**
 * QA en Chromium real: dos contextos aislados, dos localStorage distintos
 * y una nube falsa compartida. Ejecuta el index.html VERDADERO y su módulo.
 * NO contacta Supabase real, no usa correos/cuentas reales, no escribe DB.
 *
 * node qa/sync-two-browsers.mjs
 * Requiere playwright@1.56.1 y Chromium instalado en el runner de CI.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const USER='qa-sync-user-01',OTHER='qa-sync-user-02';
const clone=x=>JSON.parse(JSON.stringify(x));
const baseState=()=>({
 have:{abuket_b:2},rate:{},ini:'',seen:0,last:'',extra:0,test:0,champ:'',
 sv:2,mv:2,rev:1,fg:1,pk:['qaoriginal12'],welcomeLeft:4,
 freeDay:'',freeUsed:0,freeCycle:Math.floor(Date.now()/(6*60*60*1000))
});
const snapshot=data=>({app:'insertcoinmx-album',format:2,
 exportedAt:'2026-11-19T00:00:00.000Z',data:clone(data)});
const cloud=new Map([[USER,{user_id:USER,game_format:2,
 revision:1,state:snapshot(baseState())}]]);
const json=(res,value,status=200)=>{
 res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*'});
 res.end(JSON.stringify(value));
};
const TYPES={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
 '.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const uri=new URL(req.url,'http://localhost');
  if(uri.pathname==='/__qa__/snapshot'){
   const row=cloud.get(uri.searchParams.get('uid'))??null;
   return json(res,{data:row?clone(row):null,error:null});
  }
  if(uri.pathname==='/__qa__/sync'){
   let body='';
   for await(const chunk of req)body+=chunk;
   const {uid,args}=JSON.parse(body);
   const row=cloud.get(uid);
   if(!row||row.revision!==args.p_expected_revision)
    return json(res,{data:{status:'conflict',revision:row?.revision??null},error:null});
   row.revision++;
   row.state=clone(args.p_state);
   return json(res,{data:{status:'updated',revision:row.revision},error:null});
  }
  const decoded=decodeURIComponent(uri.pathname);
  const file=resolve(ROOT,'.'+decoded);
  if(file!==ROOT&&!file.startsWith(ROOT+sep))return json(res,{error:'Invalid path'},403);
  const content=await readFile(file);
  res.writeHead(200,{'content-type':TYPES[extname(file)]||'application/octet-stream'});
  res.end(content);
 }catch(e){res.writeHead(404);res.end('Not found')}
});
const SDK_STUB=String.raw