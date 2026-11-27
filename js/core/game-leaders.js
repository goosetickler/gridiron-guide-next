// Shared lightweight game leaders; never fetch for collapsed cards.
const ggLeaderCache=new Map(),ggLeaderPending=new Map();
function ggParseLeaders(raw,league,g){
 const arr=x=>Array.isArray(x)?x:[],num=x=>x!==null&&x!==undefined&&String(x).trim()!==""&&Number.isFinite(Number(x))?Number(x):null;
 const teams=arr(raw.header?.competitions?.[0]?.competitors);
 const groups=arr(raw.boxscore?.players).length?arr(raw.boxscore.players):arr(raw.rosters);
 const out={away:[],home:[]};
 for(const side of ["away","home"]){
 const team=teams.find(t=>t.homeAway===side),abbr=g[side+"Abbr"];
 const group=groups.find(t=>String(t.team?.id||"")===String(team?.team?.id||"__")||t.team?.abbreviation===abbr);
 const players=new Map();
 function add(a,stats){const athlete=a.athlete||a;if(!athlete?.displayName&&!athlete?.fullName)return;const id=String(athlete.id||athlete.displayName||athlete.fullName);const p=players.get(id)||{name:athlete.shortName||athlete.displayName||athlete.fullName,stats:{}};Object.assign(p.stats,stats);players.set(id,p);}
 for(const block of arr(group?.statistics)){const labels=arr(block.labels).length?block.labels:arr(block.keys);for(const a of arr(block.athletes)){if(a.didNotPlay||a.active===false)continue;const stats={};arr(a.stats).forEach((v,i)=>{const n=num(v);if(n!==null&&labels[i])stats[String(labels[i]).toUpperCase()]=n});add(a,stats);}}
 for(const a of arr(group?.roster)){const stats={};for(const st of arr(a.stats||a.statistics)){const n=num(st.value??st.displayValue);if(n!==null)stats[String(st.abbreviation||st.name||"").toUpperCase()]=n;}if(Object.keys(stats).length)add(a,stats);}
 const specs=league==="nba"?[["PTS","POINTS"],["REB","REBOUNDS"],["AST","ASSISTS"],["STL","STEALS"],["BLK","BLOCKS"]]:league==="nhl"?[["G","GOALS"],["A","ASSISTS"],["PTS","POINTS"],["SOG","SHOTS"],["SV","SAVES"]]:[["G","GOALS","TOTALGOALS"],["A","ASSISTS","GOALASSISTS"],["SOT","SHOTS ON TARGET","SHOTSONTARGET"],["SH","SHOTS","TOTALSHOTS"],["SV","SAVES"]];
 const rows=[...players.values()].map(p=>{const vals=specs.map(keys=>keys.map(k=>p.stats[k]).find(v=>v!==undefined));const score=league==="nba"?(vals[0]||0)+1.2*(vals[1]||0)+1.5*(vals[2]||0)+2*((vals[3]||0)+(vals[4]||0)):league==="nhl"?5*(vals[0]||0)+3*(vals[1]||0)+(vals[3]||0)*.3+(vals[4]||0)*.25:6*(vals[0]||0)+4*(vals[1]||0)+(vals[2]||0)+.2*(vals[3]||0)+.5*(vals[4]||0);return {name:p.name,score,detail:vals.map((v,i)=>v===undefined?null:v+" "+specs[i][0]).filter(Boolean).join(" · ")};}).filter(p=>p.detail&&p.score>0).sort((a,b)=>b.score-a.score);
 out[side]=rows.slice(0,3);
 // Scoreboard/summary leaders fallback, including pregame season leaders.
 if(out[side].length<3){const leaderGroup=arr(raw.leaders).find(t=>t.team?.abbreviation===abbr||String(t.team?.id||"")===String(team?.team?.id||"__"));const seen=new Set(out[side].map(p=>p.name));for(const cat of arr(leaderGroup?.leaders)){for(const l of arr(cat.leaders).slice(0,1)){const name=l.athlete?.shortName||l.athlete?.displayName;if(!name||seen.has(name)||!l.displayValue)continue;seen.add(name);out[side].push({name,detail:String(l.displayValue)+" "+String(cat.shortDisplayName||cat.displayName||"")});if(out[side].length>=3)break;}if(out[side].length>=3)break;}}
 }
 return out;
}
async function ggLoadLeaders(league,g){
 const key=league+":"+g.id,storage="gg.leaders.v1."+key,ttl=g.status==="post"?86400000:g.status==="in"?60000:3600000;
 let cached=ggLeaderCache.get(key);if(!cached)try{cached=JSON.parse(localStorage.getItem(storage)||"null")}catch{}
 if(cached&&cached.status===g.status&&Date.now()-cached.at<ttl)return cached.data;
 if(ggLeaderPending.has(key))return ggLeaderPending.get(key);
 const pending=(async()=>{try{const res=await fetch(GG_LEAGUES[league].summary+"?event="+encodeURIComponent(g.id),{signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error("HTTP "+res.status);const data=ggParseLeaders(await res.json(),league,g);const entry={at:Date.now(),status:g.status,data};ggLeaderCache.set(key,entry);if(g.status==="post"&&(data.away.length||data.home.length))try{localStorage.setItem(storage,JSON.stringify(entry));const keys=Object.keys(localStorage).filter(k=>k.startsWith("gg.leaders.v1."));if(keys.length>100)for(const k of keys.slice(0,keys.length-100))localStorage.removeItem(k)}catch{}return data;}finally{ggLeaderPending.delete(key)}})();ggLeaderPending.set(key,pending);return pending;
}
