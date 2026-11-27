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
 try{const rows=new Map();for(let i=-1;i<8;i++){const d=new Date();d.setDate(d.getDate()+i);const k=ctx.ggLocalDateKey(d);const games=await ctx.collect(league,k,async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json()});for(const g of games)rows.set(g.id,g);await new Promise(r=>setTimeout(r,500));}
 if(!rows.size)throw Error('No events returned; retaining previous file');
 const out=new URL('data/'+league+'-events.json',root),tmp=new URL(out.href+'.tmp');await writeFile(tmp,JSON.stringify({version:1,generatedAt:new Date().toISOString(),games:[...rows.values()]},null,2));await rename(tmp,out);console.log(league+': '+rows.size+' events; '+[...rows.values()].filter(g=>g.networks.length).length+' with broadcast data');
 }catch(e){failed++;console.error(league+': '+e.message);}
}
process.exitCode=failed?1:0;
