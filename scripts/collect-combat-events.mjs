import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const code=await readFile(new URL('js/core/event-sports.js',root),'utf8');
const ctx=vm.createContext({ggLocalDateKey:x=>{const d=new Date(x);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}});
vm.runInContext(code+'\nthis.collect=ggEventFetch;',ctx);
await mkdir(new URL('data/',root),{recursive:true});
let failed=0;
for(const league of ['mma','boxing']){
 try{const rows=new Map();const errors=[];let successful=0;for(let i=-1;i<90;i++){const d=new Date();d.setDate(d.getDate()+i);const k=ctx.ggLocalDateKey(d);let games=[];try{games=await ctx.collect(league,k,async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(url+' HTTP '+r.status);return r.json()});successful++;}catch(e){errors.push({date:k,error:e.message});if(errors.length>=3&&!successful)break;}for(const g of games)rows.set(g.id,g);await new Promise(r=>setTimeout(r,500));}
 await writeFile(new URL('data/'+league+'-diagnostics.json',root),JSON.stringify({generatedAt:new Date().toISOString(),successfulDays:successful,events:rows.size,errors},null,2));if(errors.length)throw Error('Incomplete source coverage; retaining previous file; see diagnostics');if(!rows.size)throw Error('No events returned across 90 days; retaining previous file');
 const out=new URL('data/'+league+'-events.json',root),tmp=new URL(out.href+'.tmp');await writeFile(tmp,JSON.stringify({version:1,generatedAt:new Date().toISOString(),games:[...rows.values()]},null,2));await rename(tmp,out);console.log(league+': '+rows.size+' events; '+[...rows.values()].filter(g=>g.networks.length).length+' with broadcast data');
 }catch(e){failed++;console.error(league+': '+e.message);}
}
process.exitCode=failed?1:0;
