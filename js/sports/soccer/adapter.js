// Soccer scoreboard adapter. No NFL state or provider defaults.
function ggSoccerNormalize(raw,leagueId){
  if(GG_LEAGUES[leagueId]?.sport!=="soccer")throw Error("Not a soccer league");
  const seen=new Set(),games=[];
  for(const e of raw?.events||[]){
    const c=e.competitions?.[0],h=c?.competitors?.find(t=>t.homeAway==="home"),a=c?.competitors?.find(t=>t.homeAway==="away");
    if(!e.id||seen.has(String(e.id))||!h?.team||!a?.team)continue;
    const status=c.status||e.status||{},type=status.type||{};
    const list=x=>Array.isArray(x)?x:[];
    const names=[...list(c.broadcasts).flatMap(b=>list(b?.names).length?b.names:[b?.name||b?.shortName]),...list(c.geoBroadcasts).filter(b=>String(b?.region||b?.market?.type||"").toLowerCase()==="us").map(b=>b.media?.shortName)].filter(x=>typeof x==="string"&&x.trim());
    const broadcasts=[...new Set(names)];
    const g=ggNormalizeGame({id:String(e.id),dateTime:e.date||c.date,homeTeam:h.team.displayName||h.team.name,awayTeam:a.team.displayName||a.team.name,homeAbbr:h.team.abbreviation,awayAbbr:a.team.abbreviation,homeLogo:h.team.logo||h.team.logos?.[0]?.href||"",awayLogo:a.team.logo||a.team.logos?.[0]?.href||"",homeScore:h.score,awayScore:a.score,homePenaltyScore:h.shootoutScore,awayPenaltyScore:a.shootoutScore,status:type.state||"pre",statusName:type.name||"",statusDetail:type.shortDetail||type.description||"",clock:status.displayClock||"",network:broadcasts[0]||"TBD",broadcasts,venue:c.venue?.fullName||""},leagueId);
    if(g){seen.add(g.id);games.push(g)}
  }
  return games.sort((a,b)=>new Date(a.dateTime)-new Date(b.dateTime));
}
function ggSoccerDateRange(day){
  const d=new Date(day+"T12:00:00");if(!Number.isFinite(d.getTime()))throw Error("Invalid date");
  const from=new Date(d),to=new Date(d);from.setDate(d.getDate()-1);to.setDate(d.getDate()+1);
  return [from,to].map(x=>ggLocalDateKey(x).replace(/-/g,"")).join("-");
}
async function ggSoccerFetch(leagueId,day,request=fetchJson){
  const league=GG_LEAGUES[leagueId];if(league?.sport!=="soccer")throw Error("Not a soccer league");
  const range=ggSoccerDateRange(day),query="?dates="+range+"&limit=200";
  const urls=[league.scoreboard+query,league.scoreboard.replace("site.api.espn.com","site.web.api.espn.com")+query,league.scoreboard+"?dates="+day.replace(/-/g,"")];
  const errors=[];
  for(const url of urls){
    try{const raw=await request(url);if(!Array.isArray(raw?.events))throw Error("Invalid ESPN response: missing events");return ggSoccerNormalize(raw,leagueId).filter(g=>ggLocalDateKey(g.dateTime)===day);}
    catch(e){errors.push(url.split("/")[2]+": "+(e?.message||String(e)));}
  }
  throw Error(errors.join(" | "));
}
function ggSoccerProviders(game){
  const names=game.broadcasts||[],out=new Map();
  for(const name of names){
    let p=null;
    if(/apple tv|mls season pass/i.test(name))p=["Apple TV","https://tv.apple.com/"];
    else if(/peacock/i.test(name))p=["Peacock","https://www.peacocktv.com/"];
    else if(/usa net|^usa$|\bnbc\b|universo|telemundo/i.test(name))p=[name,"https://www.nbc.com/live"];
    else if(/fox|\bfs[12]\b/i.test(name))p=[name,"https://www.foxsports.com/live"];
    else if(/espn\+/i.test(name))p=["ESPN+","https://www.espn.com/watch/"];
    if(p)out.set(p[0],{label:p[0],url:p[1]});
  }return [...out.values()];
}
