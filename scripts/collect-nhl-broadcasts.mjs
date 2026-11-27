// Standalone NHL broadcast diagnostic, Node 22+, run from repo root.
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('js/core/team-media.js','utf8'),ctx);
const map=vm.runInContext('ggNhlProviders',ctx);
const now=new Date(), end=+now+7*86400000;
const day=n=>new Date(+now+n*86400000).toISOString().slice(0,10);
const file='data/nhl-broadcasts.json';
const get=async date=>{
 const url='https://api-web.nhle.com/v1/schedule/'+date;
 console.log('Fetching '+url);
 const res=await fetch(url,{signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error('HTTP '+res.status);
 const data=await res.json();
 if(!Array.isArray(data.gameWeek))throw Error('Unexpected NHL response');
 return data.gameWeek;
};
const games=new Map();
const days=new Set();
for(const date of [day(-1),day(6)]){
 for(const d of await get(date)){
  if(!Array.isArray(d.games))throw Error('Invalid games array');
  days.add(d.date);
  for(const g of d.games){
   if(!g.id||!g.homeTeam?.abbrev||!g.awayTeam?.abbrev||!Number.isFinite(Date.parse(g.startTimeUTC)))throw Error('Invalid game row');
   if(Date.parse(g.startTimeUTC)<+now||Date.parse(g.startTimeUTC)>=end)continue;
   const feeds=(g.tvBroadcasts||[]).filter(b=>typeof b.network==='string'&&b.network.trim()).map(b=>({network:b.network.trim(),country:b.countryCode||null,market:b.market||null}));
   games.set(g.id,{id:String(g.id),dateTime:g.startTimeUTC,home:g.homeTeam.abbrev,away:g.awayTeam.abbrev,broadcasts:[...new Set(feeds.map(b=>b.network))],feeds,sources:['NHL schedule API']});
  }
 }
}
for(let n=0;n<=7;n++)if(!days.has(day(n)))throw Error('Incomplete schedule: '+day(n));
const rows=[...games.values()].sort((a,b)=>Date.parse(a.dateTime)-Date.parse(b.dateTime));
if(!rows.length)throw Error('No upcoming games; preserving old file');
const us=g=>g.feeds.filter(b=>b.country==='US');
const mapped=b=>map({broadcasts:[b.network]}).length>0;
const count=rows.filter(g=>us(g).length).length;
const recognized=rows.filter(g=>us(g).some(mapped)).length;
const unknown={};
for(const g of rows)for(const b of g.feeds)if(!mapped(b)){const k=b.country+' / '+b.network;unknown[k]=(unknown[k]||0)+1}
const coverage={windowDays:7,total:rows.length,officialUS:count,mappedUS:recognized,officialUSPercent:Math.round(10000*count/rows.length)/100,mappedUSPercent:Math.round(10000*recognized/rows.length)/100,unknown,unresolved:rows.filter(g=>!us(g).some(mapped)).map(g=>({id:g.id,home:g.home,away:g.away,dateTime:g.dateTime,feeds:g.feeds}))};
console.log(JSON.stringify(coverage,null,2));
if(!count)throw Error('No US broadcast data; preserving old file');
fs.mkdirSync('data',{recursive:true});
fs.writeFileSync(file+'.tmp',JSON.stringify({version:1,generatedAt:now.toISOString(),games:rows,coverage},null,2));
fs.renameSync(file+'.tmp',file);
console.log('Saved '+file);
