// Run externally with Node 22. No GitHub Actions required.
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console});
vm.runInContext(fs.readFileSync('js/sports/nba/media.js','utf8'),ctx);
const providers=vm.runInContext('ggNbaProviders',ctx);
const file='data/nba-broadcasts.json', now=new Date();
const old=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
if(old && Date.now()-Date.parse(old.generatedAt)<12*3600000 && !process.argv.includes('--force')){console.log('Using cached data',old.coverage);process.exit(0)}
const day=d=>d.toISOString().slice(0,10).replaceAll('-','');
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
const base='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
const names=c=>[...(c?.broadcasts||[]).flatMap(b=>b.names||[]),...[...(c?.geoBroadcasts||[]),...(c?.geoStreaming||[])].filter(b=>!b.market?.type||!['international','foreign'].includes(b.market.type.toLowerCase())).map(b=>b.media?.shortName)].filter(x=>typeof x==='string'&&x.trim());
const confirmed=g=>providers(g).some(p=>p.network!=='League Pass'&&!/^(amazon|prime)$/i.test(p.raw.trim()));
// ESPN site v2 stopped accepting YYYYMMDD-YYYYMMDD ranges (HTTP 400).
// Query each ESPN calendar day individually; include an extra UTC day at each edge
// so late-night Pacific games are not lost. Dedupe by game ID.
const days=[];
for(let n=-1;n<=8;n++){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+n));days.push(day(d))}
const events=new Map();let failedDays=0;
for(const date of days){
 try{
  const raw=await get(base+'scoreboard?dates='+date+'&limit=100');
  if(!Array.isArray(raw.events))throw Error('Invalid ESPN scoreboard response for '+date);
  for(const e of raw.events)if(e.id)events.set(String(e.id),e);
 }catch(e){failedDays++;console.warn('ESPN scoreboard '+date+': '+e.message);if(/HTTP (403|429)/.test(e.message))break}
}
if(!events.size)throw Error('No ESPN scoreboard events; preserving previous file');
if(failedDays)throw Error('Incomplete ESPN schedule ('+failedDays+' failed days); preserving previous file');
const games=[...events.values()].map(e=>{const c=e.competitions?.[0];return {id:e.id,dateTime:e.date,home:c?.competitors?.find(t=>t.homeAway==='home')?.team?.abbreviation,away:c?.competitors?.find(t=>t.homeAway==='away')?.team?.abbreviation,broadcasts:[...new Set(names(c))],sources:['ESPN scoreboard']}}).filter(g=>g.home&&g.away&&Date.parse(g.dateTime)>=+now&&Date.parse(g.dateTime)<+now+7*86400000);
if(!games.length)throw Error('No upcoming games; preserving previous file');
const baseline=games.filter(confirmed).length;
let requests=0;
for(const g of games.filter(g=>!confirmed(g))){
 const cached=old?.games?.find(x=>x.id===g.id&&x.dateTime===g.dateTime);
 if(cached&&confirmed(cached)){g.broadcasts=[...new Set([...g.broadcasts,...cached.broadcasts])];g.sources=[...new Set([...g.sources,...(cached.sources||[])])];continue}
 if(requests>=12)continue;
 requests++;
 await new Promise(r=>setTimeout(r,1000));
 try{const d=await get(base+'summary?event='+encodeURIComponent(g.id));const extra=(d.header?.competitions||[]).flatMap(names);if(extra.length){g.broadcasts=[...new Set([...g.broadcasts,...extra])];g.sources.push('ESPN summary')}}catch(e){console.warn(g.id,e.message);if(/HTTP (403|429)/.test(e.message))break}
}
// Optional manually verified fallback records, keyed by ESPN ID and exact tipoff.
const fallback='data/nba-broadcast-fallbacks.json';
if(fs.existsSync(fallback)){const entries=JSON.parse(fs.readFileSync(fallback,'utf8'));for(const g of games.filter(g=>!confirmed(g))){const x=entries.find(x=>x.id===g.id&&x.dateTime===g.dateTime&&x.source&&Array.isArray(x.broadcasts));if(x){g.broadcasts=[...new Set([...g.broadcasts,...x.broadcasts])];g.sources.push(x.source)}}}
const count=games.filter(confirmed).length;
const coverage={windowDays:7,total:games.length,baselineConfirmed:baseline,confirmed:count,percent:Math.round(10000*count/games.length)/100,target:95,summaryRequests:requests,unresolved:games.filter(g=>!confirmed(g))};
if(!count)throw Error('No confirmed broadcasts; preserving previous file');
fs.mkdirSync('data',{recursive:true});fs.writeFileSync(file,JSON.stringify({version:1,generatedAt:now.toISOString(),games,coverage}));console.log(JSON.stringify(coverage,null,2));
