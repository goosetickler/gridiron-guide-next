// PROTOTYPE ONLY: Jolpica noncommercial terms. Revisit licensing before release.
const ggF1Cache=new Map(),ggF1Pending=new Map();
async function ggF1Data(year,kind,force=false){
 const key="gg.f1.v1."+year+"."+kind, ttl=21600000;
 let cached=ggF1Cache.get(key);try{cached=cached||JSON.parse(localStorage.getItem(key)||"null")}catch(_){}
 if(!force&&cached&&Date.now()-cached.time<ttl)return cached.rows;
 if(ggF1Pending.has(key))return ggF1Pending.get(key);
 const task=(async()=>{try{const rows=[];let offset=0;for(let page=0;page<10;page++){const endpoint={results:"results",drivers:"driverstandings",teams:"constructorstandings"}[kind];const r=await fetch("https://api.jolpi.ca/ergast/f1/"+year+"/"+endpoint+"/?limit=100&offset="+offset,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error("HTTP "+r.status);const d=(await r.json()).MRData;if(!d)throw Error("Invalid response");if(kind==="results"){for(const race of d.RaceTable.Races){let existing=rows.find(x=>x.round===race.round);if(existing)existing.Results.push(...race.Results);else rows.push(race)}}else rows.push(...(d.StandingsTable.StandingsLists[0]?.[kind==="drivers"?"DriverStandings":"ConstructorStandings"]||[]));offset+=Number(d.limit);if(offset>=Number(d.total))break;if(page===9)throw Error("Incomplete results")}const value={time:Date.now(),rows};ggF1Cache.set(key,value);try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}return rows}catch(e){if(cached)return cached.rows;throw e}})();ggF1Pending.set(key,task);try{return await task}finally{ggF1Pending.delete(key)}
}
