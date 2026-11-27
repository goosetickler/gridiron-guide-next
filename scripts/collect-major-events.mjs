import {writeFile,mkdir,rename} from 'node:fs/promises';
const root=new URL('../data/',import.meta.url);
await mkdir(root,{recursive:true});
const sources={mma:['https://www.ufc.com/events','https://www.pflmma.com/'],boxing:['https://www.dazn.com/en-US/home','https://www.premierboxingchampions.com/'],xgames:['https://www.xgames.com/'],surfing:['https://www.worldsurfleague.com/events'],dogshows:['https://www.westminsterkennelclub.org/','https://nds.nationaldogshow.com/','https://www.akc.org/sports/conformation/national-championship/']};
const major=/\b(ESPN(?:2|\+)?|ABC|NBC(?:SN)?|CBS|FOX|FS1|FS2|TNT|TBS|USA Network|Peacock|Paramount\+|Netflix|Prime Video|Amazon Prime|DAZN|HBO Max|YouTube|WSL TV|PPV)\b/i;
const report={generatedAt:new Date().toISOString(),sports:{}};

const classify=t=>/\b(UFC|PFL|MMA|mixed martial arts)\b/i.test(t)?'mma':/\b(boxing|Top Rank|Matchroom)\b/i.test(t)?'boxing':/\bX Games\b/i.test(t)?'xgames':/\b(surfing|World Surf League)\b/i.test(t)?'surfing':/\b(dog shows?|Westminster Kennel Club|AKC National Championship)\b/i.test(t)?'dogshows':null;
const networkNames=x=>Array.isArray(x)?x.flatMap(networkNames):typeof x==='string'?[x]:x&&typeof x==='object'?[...networkNames(x.name),...networkNames(x.displayName),...networkNames(x.names),...networkNames(x.network),...networkNames(x.media)]:[];
const broadcasterRows=Object.fromEntries(Object.keys(sources).map(s=>[s,new Map()]));
report.broadcasters=[];
const stamp=t=>new Date(t).toISOString().slice(0,10);
async function probe(url,hint){
 const c={url,candidates:0,matched:0};report.broadcasters.push(c);
 try{const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json'}});c.status=r.status;if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();c.keys=Object.keys(data).slice(0,20);
 function visit(o){if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(visit);return;}
 const title=o.title||o.name||o.eventName;const date=o.startDate||o.startTime||o.date;const sport=hint||classify([title,o.sport?.name,o.category?.name].join(' '));
 if(typeof title==='string'&&sport&&typeof date==='string'&&/T\d\d:\d\d.*(?:Z|[+-]\d\d:?\d\d)$/i.test(date)){c.candidates++;const time=Date.parse(date);const networks=[...new Set(networkNames([o.network,o.networks,o.channel,o.channels,o.broadcasts,o.broadcastService,...(Array.isArray(o.competitions)?o.competitions.map(x=>x.broadcasts):[])]).filter(n=>/^(ESPN(?:2|3|U|\+)?|ABC|NBC|CBS|FOX|FS1|FS2|TNT|TBS|Peacock|Paramount\+|Netflix|Prime Video|DAZN|HBO Max|YouTube|PPV)$/i.test(n.trim())))];if(networks.length&&time>=Date.now()-86400000&&time<=Date.now()+90*86400000){const id=sport+':'+new Date(time).toISOString()+':'+title.toLowerCase().replace(/\W+/g,'-');broadcasterRows[sport].set(id,{id,dateTime:new Date(time).toISOString(),eventName:title,status:'pre',venue:'',fights:[],networks,source:url});c.matched++;}}
 if(!hint)Object.values(o).forEach(visit);}
 if(hint){if(!Array.isArray(data.events))throw Error('Unexpected scoreboard schema');data.events.forEach(visit);}else visit(data);
 }catch(e){c.error=e.message;}await new Promise(r=>setTimeout(r,500));
}
const now=Date.now(),day=86400000;
for(const [p,s] of [['mma/ufc','mma'],['mma/pfl','mma'],['boxing','boxing']])await probe('https://site.api.espn.com/apis/site/v2/sports/'+p+'/scoreboard?dates='+stamp(now-day).replace(/-/g,'')+'-'+stamp(now+90*day).replace(/-/g,'')+'&limit=200',s);
for(let i=0;i<90;i+=7){await probe('https://www.espn.com/watch/api/schedule?startDate='+stamp(now+i*day)+'&endDate='+stamp(now+Math.min(i+6,89)*day)+'&country=US');if(report.broadcasters.slice(-2).every(c=>c.error))break;}

for(const [sport,urls] of Object.entries(sources)){
 const games=new Map(broadcasterRows[sport]),checks=[];
 for(const url of urls){try{const res=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'GridironGuide schedule collector/1.0'}});if(!res.ok)throw Error('HTTP '+res.status);const html=await res.text();let count=0;
 const visit=o=>{if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(visit);return;}const types=[o['@type']].flat();if(types.some(t=>['SportsEvent','Event','BroadcastEvent'].includes(t))&&o.name&&o.startDate){const date=new Date(o.startDate);const broadcast=[o.broadcastOfEvent,o.broadcastService,o.publishedOn,o.broadcastChannel,o.broadcastDisplayName].filter(Boolean);const names=broadcast.flatMap(x=>typeof x==='string'?[x]:[x.name,x.broadcastDisplayName,x.broadcastService?.name,x.broadcastChannel?.name].filter(Boolean));const networks=[...new Set(names.filter(n=>major.test(n)))];if(networks.length&&Number.isFinite(+date)&&date>=new Date(Date.now()-86400000)&&date<=new Date(Date.now()+90*86400000)){const id=sport+':'+date.toISOString()+':'+o.name;games.set(id,{id,dateTime:date.toISOString(),eventName:o.name,status:'pre',venue:o.location?.name||'',fights:[],networks,source:url});count++;}}Object.values(o).forEach(visit);};
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{visit(JSON.parse(m[1]))}catch{}}
 checks.push({url,status:res.status,matched:count});
 }catch(e){checks.push({url,error:e.message});}await new Promise(r=>setTimeout(r,750));}
 report.sports[sport]={events:games.size,checks};if(games.size){const out=new URL(sport+'-events.json',root),tmp=new URL(out.href+'.tmp');await writeFile(tmp,JSON.stringify({version:1,generatedAt:report.generatedAt,games:[...games.values()]},null,2));await rename(tmp,out);}console.log(sport+': '+games.size+' confirmed broadcast events (zero retains existing file)');}
await writeFile(new URL('major-events-diagnostics.json',root),JSON.stringify(report,null,2));
if(Object.values(report.sports).some(s=>!s.events))process.exitCode=1;
