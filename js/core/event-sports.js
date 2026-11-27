const ggEventSources={mma:["UFC events","https://www.ufc.com/events"],boxing:["ESPN boxing schedule","https://www.espn.com/boxing/schedule"],xgames:["X Games schedule","https://www.xgames.com/"],surfing:["World Surf League events","https://www.worldsurfleague.com/events"],dogshows:["AKC events","https://www.akc.org/sports/"],};
const ggEventSport=id=>Object.hasOwn(ggEventSources,id);
async function ggEventFetch(league,k,request){
 if(!["mma","boxing"].includes(league))return [];
 const paths=league==="mma"?["mma/ufc","mma/pfl"]:["boxing"];
 const date=k.replace(/-/g,"");const results=await Promise.allSettled(paths.map(p=>request("https://site.api.espn.com/apis/site/v2/sports/"+p+"/scoreboard?dates="+date)));
 if(results.every(x=>x.status==="rejected"))throw Error("Schedule unavailable");
 const rows=[];
 for(let i=0;i<results.length;i++){const result=results[i];if(result.status!=="fulfilled")continue;for(const e of result.value.events||[]){if(!e.date||ggLocalDateKey(e.date)!==k)continue;const fights=(e.competitions||[]).map(c=>{const names=(c.competitors||[]).map(p=>(p.athlete||p).displayName||(p.athlete||p).fullName||"").filter(Boolean);const winner=(c.competitors||[]).find(p=>p.winner);return {name:names.join(" vs "),result:winner?(winner.athlete||winner).displayName||"Winner recorded":"",detail:c.status?.type?.detail||""}}).filter(f=>f.name);const networks=[...new Set((e.competitions||[]).flatMap(c=>(c.broadcasts||[]).flatMap(b=>b.names||[])))];rows.push({id:paths[i]+":"+e.id,dateTime:e.date,status:e.status?.type?.state||"pre",eventName:e.name||e.shortName||"Event",venue:e.venue?.fullName||e.competitions?.[0]?.venue?.fullName||"",fights,networks});}}
 return rows;
}
