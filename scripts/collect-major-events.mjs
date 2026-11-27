import {writeFile,mkdir,rename} from 'node:fs/promises';
const root=new URL('../data/',import.meta.url);
await mkdir(root,{recursive:true});
const sources={mma:['https://www.ufc.com/events','https://www.pflmma.com/'],boxing:['https://www.dazn.com/en-US/home','https://www.premierboxingchampions.com/'],xgames:['https://www.xgames.com/'],surfing:['https://www.worldsurfleague.com/events'],dogshows:['https://www.westminsterkennelclub.org/','https://nds.nationaldogshow.com/','https://www.akc.org/sports/conformation/national-championship/']};
const major=/\b(ESPN(?:2|\+)?|ABC|NBC(?:SN)?|CBS|FOX|FS1|FS2|TNT|TBS|USA Network|Peacock|Paramount\+|Netflix|Prime Video|Amazon Prime|DAZN|HBO Max|YouTube|WSL TV|PPV)\b/i;
const report={generatedAt:new Date().toISOString(),sports:{}};
for(const [sport,urls] of Object.entries(sources)){
 const games=new Map(),checks=[];
 for(const url of urls){try{const res=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'GridironGuide schedule collector/1.0'}});if(!res.ok)throw Error('HTTP '+res.status);const html=await res.text();let count=0;
 const visit=o=>{if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(visit);return;}const types=[o['@type']].flat();if(types.some(t=>['SportsEvent','Event','BroadcastEvent'].includes(t))&&o.name&&o.startDate){const date=new Date(o.startDate);const broadcast=[o.broadcastOfEvent,o.broadcastService,o.publishedOn,o.broadcastChannel,o.broadcastDisplayName].filter(Boolean);const names=broadcast.flatMap(x=>typeof x==='string'?[x]:[x.name,x.broadcastDisplayName,x.broadcastService?.name,x.broadcastChannel?.name].filter(Boolean));const networks=[...new Set(names.filter(n=>major.test(n)))];if(networks.length&&Number.isFinite(+date)&&date>=new Date(Date.now()-86400000)&&date<=new Date(Date.now()+90*86400000)){const id=sport+':'+date.toISOString()+':'+o.name;games.set(id,{id,dateTime:date.toISOString(),eventName:o.name,status:'pre',venue:o.location?.name||'',fights:[],networks,source:url});count++;}}Object.values(o).forEach(visit);};
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{visit(JSON.parse(m[1]))}catch{}}
 checks.push({url,status:res.status,matched:count});
 }catch(e){checks.push({url,error:e.message});}await new Promise(r=>setTimeout(r,750));}
 report.sports[sport]={events:games.size,checks};if(games.size){const out=new URL(sport+'-events.json',root),tmp=new URL(out.href+'.tmp');await writeFile(tmp,JSON.stringify({version:1,generatedAt:report.generatedAt,games:[...games.values()]},null,2));await rename(tmp,out);}console.log(sport+': '+games.size+' confirmed broadcast events (zero retains existing file)');}
await writeFile(new URL('major-events-diagnostics.json',root),JSON.stringify(report,null,2));
if(Object.values(report.sports).some(s=>!s.events))process.exitCode=1;
