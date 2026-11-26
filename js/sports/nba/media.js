// NBA broadcast aliases: only explicit reported networks, never infer availability from teams.
function ggNbaProviders(game){
 const rules=[
 [/^(amazon(?: prime(?: video)?)?|prime(?: video)?)$/i,"Prime Video","https://www.primevideo.com/",2],
 [/^peacock(?: premium)?$/i,"Peacock","https://www.peacocktv.com/",2],
 [/^(?:nbc|nba on nbc)$/i,"NBC","https://www.nbc.com/live",1],
 [/^(?:abc|espn on abc)$/i,"ABC","https://www.espn.com/watch/",1],
 [/^espn(?:2|3|\+)?$/i,null,"https://www.espn.com/watch/",1],
 [/^(?:nbcsn|nbc sports network)$/i,"NBCSN","https://www.nbc.com/live",1],
 [/^nba\s*tv$/i,"NBA TV","https://www.nba.com/watch",2],
 [/^(?:(?:nba )?league pass(?: on (?:amazon|prime video))?|(?:amazon|prime video) (?:nba )?league pass)$/i,"League Pass","https://www.nba.com/watch/league-pass",9],
 [/^(?:fan\s*duel sports(?: network)?(?: .+)?|fdsn(?:[a-z]+)?)$/i,"FanDuel Sports","https://www.fanduelsportsnetwork.com/",4],
 [/^(?:spectrum sportsnet|specsn|spcsn)$/i,"Spectrum SportsNet","https://spectrumsportsnet.com/",4],
 [/^(?:yes|yes network)$/i,"YES","https://www.gothamsports.com/",4],
 [/^(?:msg|msgsn|msg sportsnet)$/i,"MSG","https://www.gothamsports.com/",4],
 [/^(?:nbcs ba|nbcsba|nbc sports bay area)$/i,"NBC Sports Bay Area","https://www.nbcsports.com/",4],
 [/^(?:nbcs bos|nbcsb|nbc sports boston)$/i,"NBC Sports Boston","https://www.nbcsports.com/",4],
 [/^(?:nbcs phi|nbcsp|nbc sports philadelphia)$/i,"NBC Sports Philadelphia","https://www.nbcsports.com/",4],
 [/^suns live$/i,"Suns Live","https://www.nba.com/suns/sunslive",4]
,
 [/^(?:chsn|chicago sports network)$/i,"CHSN","https://chsn.com/",4],
 [/^(?:schn|space city home network)$/i,"SCHN","https://www.nba.com/rockets",4],
 [/^(?:altitude(?: sports(?: and entertainment)?)?|altitude\+)$/i,"Altitude","https://www.altitudesports.com/",4],
 [/^(?:monumental(?: sports network|\+)?)$/i,"Monumental","https://www.monumentalsportsnetwork.com/",4],
 [/^dazn$/i,"DAZN","https://www.dazn.com/",4],
 [/^clippervision$/i,"ClipperVision","https://www.nba.com/clippers",4],
 [/^(?:peachtree(?: tv| sports network)|wpch|wanf|ktla|kfaa|wfaa|ksbi|kqcw|my24|wvtv|wplg|wmyd|waxn|wsoc|woio|wuab|wttv|wxin|wrdq|wftv)$/i,null,"https://www.nba.com/news/local-viewing-options",4],
 [/^(?:mavs tv|mavstv\+?)$/i,"MavsTV","https://www.nba.com/mavericks",4],
 [/^(?:thunder\+|thunder gameday network)$/i,"Thunder+","https://www.nba.com/thunder/watch",4],
 [/^bucks\+$/i,"Bucks+","https://www.nba.com/bucks",4],
 [/^(?:sportsnet\+?|rogers sportsnet)$/i,"Sportsnet","https://www.sportsnet.ca/",4],
 [/^tsn(?:\+|[1-5])?$/i,null,"https://www.tsn.ca/",4],
 [/^local10\+ platinum$/i,"Local10+","https://www.nba.com/heat",4]
 ];const out=new Map();
 for(const raw of game.broadcasts||[]){if(typeof raw!=="string")continue;const name=raw.trim().replace(/\s+/g," ");for(const [pattern,label,url,rank] of rules){if(!pattern.test(name))continue;const network=label||name.toUpperCase();out.set(network,{label:network,network,url,rank,raw,regional:rank===4});break}}
 const providers=[...out.values()];
 const hasRegional=providers.some(p=>p.regional);
 const hasLeaguePass=providers.some(p=>p.network==="League Pass");
 // Prefer reported TV feeds over ambiguous streaming distribution aliases.
 return providers.filter(p=>!(p.network==="Prime Video" && hasLeaguePass && /^(amazon|prime)$/i.test(p.raw.trim()))).map(p=>hasRegional && (p.network==="Prime Video"||p.network==="Peacock")?{...p,rank:5}:p).sort((a,b)=>a.rank-b.rank);
}

let ggNbaOfficialCache=null,ggNbaOfficialPending=null;
async function ggNbaOfficialGames(request){
 if(ggNbaOfficialCache&&Date.now()-ggNbaOfficialCache.time<3600000)return ggNbaOfficialCache.rows;
 if(ggNbaOfficialPending)return ggNbaOfficialPending;
 ggNbaOfficialPending=(async()=>{try{
 const raw=await request("./data/nba-broadcasts.json");
 if(raw?.version!==1||!Array.isArray(raw.games)||Date.now()-Date.parse(raw.generatedAt)>72*3600000)throw Error("Missing or stale NBA broadcast data");
 const rows=raw.games;ggNbaOfficialCache={time:Date.now(),rows};return rows;
 }catch(e){console.warn("NBA official schedule unavailable",e);ggNbaOfficialCache={time:Date.now()-3300000,rows:[]};return []}finally{ggNbaOfficialPending=null}})();
 return ggNbaOfficialPending;
}
function ggNbaMergeOfficial(games,rows){
 const code=x=>({GS:"GSW",NY:"NYK",NO:"NOP",SA:"SAS",UTAH:"UTA",WSH:"WAS",BKN:"BKN",BRK:"BKN"}[String(x).toUpperCase()]||String(x).toUpperCase());
 for(const g of games){
 const t=Date.parse(g.dateTime);
 const matches=rows.filter(r=>code(r.home)===code(g.homeAbbr)&&code(r.away)===code(g.awayAbbr)&&Math.abs(Date.parse(r.dateTime)-t)<6*3600000);
 if(matches.length!==1)continue;
 const names=matches[0].broadcasts||[];
 if(names.length){g.broadcasts=[...new Set([...names,...(g.broadcasts||[])])];g.network=ggNbaProviders(g)[0]?.network||g.network;}
 }
 return games;
}
