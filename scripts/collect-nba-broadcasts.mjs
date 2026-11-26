// Node 22; shares the browser's resolver for honest coverage metrics.
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console});
vm.runInContext(fs.readFileSync('js/sports/nba/media.js','utf8'),ctx);
const providers=vm.runInContext('ggNbaProviders',ctx);
const now=new Date(), start=now.getUTCMonth()<7?now.getUTCFullYear()-1:now.getUTCFullYear();
const season=start+'-'+String(start+1).slice(-2);
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Mozilla/5.0','Referer':'https://www.nba.com/'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
let rows;
for(const url of ['https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json','https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json']){
 try{const d=(await get(url)).leagueSchedule;if(d?.seasonYear!==season)throw Error('Wrong season '+d?.seasonYear);rows=d.gameDates.flatMap(x=>x.games||[]);if(!rows.length)throw Error('Empty schedule');break}catch(e){console.warn(url,e.message)}
}
if(!rows?.length)throw Error('No valid NBA schedule; preserving last published data');
const keys=['nationalBroadcasters','nationalOttBroadcasters','homeTvBroadcasters','awayTvBroadcasters','homeOttBroadcasters','awayOttBroadcasters'];
const games=rows.filter(g=>g.homeTeam?.teamTricode&&g.awayTeam?.teamTricode&&Number.isFinite(Date.parse(g.gameDateTimeUTC))).map(g=>{
 const broadcasts=[...new Set(keys.flatMap(k=>(g.broadcasters?.[k]||[]).flatMap(b=>[b.broadcasterDisplay,b.broadcasterAbbreviation])).filter(x=>typeof x==='string'&&x.trim()))];
 return {id:g.gameId,dateTime:g.gameDateTimeUTC,home:g.homeTeam.teamTricode,away:g.awayTeam.teamTricode,broadcasts};
});
const upcoming=games.filter(g=>Date.parse(g.dateTime)>=+now&&Date.parse(g.dateTime)<+now+7*86400000);
const confirmed=upcoming.filter(g=>providers(g).some(p=>p.network!=='League Pass'&&!/^(amazon|prime)$/i.test(p.raw))).length;
const coverage={windowDays:7,total:upcoming.length,confirmed,percent:upcoming.length?Math.round(10000*confirmed/upcoming.length)/100:null,target:95,unresolved:upcoming.filter(g=>!providers(g).some(p=>p.network!=='League Pass'&&!/^(amazon|prime)$/i.test(p.raw)))};
if(!games.some(g=>g.broadcasts.length))throw Error('No broadcast assignments; preserving last published data');
fs.mkdirSync('data',{recursive:true});fs.writeFileSync('data/nba-broadcasts.json',JSON.stringify({version:1,season,generatedAt:now.toISOString(),games,coverage}));console.log(JSON.stringify(coverage,null,2));
