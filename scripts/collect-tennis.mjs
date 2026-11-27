import {writeFile,rename,mkdir,readFile} from 'node:fs/promises';
const root=new URL('../data/',import.meta.url);await mkdir(root,{recursive:true});
const now=new Date(),year=now.getUTCFullYear(),out=new URL('tennis-events.json',root);
const report={generatedAt:now.toISOString(),checks:[]},rows=new Map();
const major=/Australian Open|Roland Garros|French Open|Wimbledon|US Open|Indian Wells|BNP Paribas Open|Miami Open|Monte Carlo|Madrid Open|Italian Open|Internazionali|Canadian Open|National Bank Open|Cincinnati|Shanghai Masters|Paris Masters|ATP Finals|WTA Finals|Qatar TotalEnergies|Dubai Duty Free|China Open|Wuhan Open|Rome Masters/i;
const names=x=>Array.isArray(x)?x.flatMap(names):typeof x==='string'?[x]:x&&typeof x==='object'?[...names(x.names),...names(x.name),...names(x.media),...names(x.displayName)]:[];
const allowed=/^(Tennis Channel(?: Plus|\+)?|ESPN(?:2|3|U|\+)?|ABC|TNT|TBS|truTV|HBO Max|Max|Peacock|NBC|CBS|Prime Video)$/i;
for(const tour of ['atp','wta'])for(const y of [year,year+1]){
 const url='https://site.api.espn.com/apis/site/v2/sports/tennis/'+tour+'/scoreboard?dates='+y+'0101-'+y+'1231&limit=500';
 const c={tour,year:y,url,matched:0};report.checks.push(c);
 try{const res=await fetch(url,{signal:AbortSignal.timeout(25000)});c.status=res.status;if(!res.ok)throw Error('HTTP '+res.status);const data=await res.json();if(!Array.isArray(data.events))throw Error('Unexpected schema');c.candidates=data.events.length;
 for(const e of data.events){const title=e.name||e.shortName||'';if(!major.test(title))continue;const start=Date.parse(e.date||e.startDate),end=Date.parse(e.endDate||e.date||e.startDate);if(!Number.isFinite(start)||!Number.isFinite(end)||end<+now-7*86400000)continue;
 const networks=[...new Set(names([e.broadcasts,...(e.competitions||[]).map(x=>x.broadcasts)]).filter(n=>allowed.test(n)))];
 const id=tour+':'+(e.id||title)+':'+new Date(start).toISOString().slice(0,10);
 rows.set(id,{id,eventName:tour.toUpperCase()+' · '+title,dateTime:new Date(start).toISOString(),endDate:new Date(end).toISOString(),timeTbd:true,status:end<+now?'post':'pre',venue:e.venue?.fullName||'',tour:tour.toUpperCase(),networks,fights:[],source:url});c.matched++;
 }}catch(e){c.error=e.message;}await new Promise(r=>setTimeout(r,500));
}
let previous=[];try{previous=JSON.parse(await readFile(out,'utf8')).games||[]}catch{}
for(const g of previous)if(!rows.has(g.id)&&Date.parse(g.endDate||g.dateTime)>=+now-7*86400000)rows.set(g.id,g);
report.events=rows.size;report.withBroadcast=[...rows.values()].filter(g=>g.networks.length).length;
if(rows.size){const tmp=new URL(out.href+'.tmp');await writeFile(tmp,JSON.stringify({version:1,generatedAt:report.generatedAt,games:[...rows.values()].sort((a,b)=>a.dateTime.localeCompare(b.dateTime))},null,2));await rename(tmp,out);}
await writeFile(new URL('tennis-diagnostics.json',root),JSON.stringify(report,null,2));console.log('Tennis: '+report.events+' tournaments, '+report.withBroadcast+' with broadcast assignments');if(!report.checks.some(c=>c.matched))process.exitCode=1;
