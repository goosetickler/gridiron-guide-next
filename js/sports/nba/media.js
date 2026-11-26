// NBA broadcast aliases: only explicit reported networks, never infer availability from teams.
function ggNbaProviders(game){
 const rules=[
 [/^(amazon(?: prime(?: video)?)?|prime(?: video)?)$/i,"Prime Video","https://www.primevideo.com/",0],
 [/^peacock$/i,"Peacock","https://www.peacocktv.com/",0],
 [/^nbc$/i,"NBC","https://www.nbc.com/live",1],
 [/^abc$/i,"ABC","https://www.espn.com/watch/",1],
 [/^espn(?:2|3|\+)?$/i,null,"https://www.espn.com/watch/",1],
 [/^nba\s*tv$/i,"NBA TV","https://www.nba.com/watch",2],
 [/^(?:nba )?league pass$/i,"League Pass","https://www.nba.com/watch/league-pass",3],
 [/^(?:fan\s*duel sports(?: network)?(?: .+)?|fdsn(?:[a-z]+)?)$/i,"FanDuel Sports","https://www.fanduelsportsnetwork.com/",4],
 [/^(?:spectrum sportsnet|specsn|spcsn)$/i,"Spectrum SportsNet","https://spectrumsportsnet.com/",4],
 [/^(?:yes|yes network)$/i,"YES","https://www.gothamsports.com/",4],
 [/^(?:msg|msgsn|msg sportsnet)$/i,"MSG","https://www.gothamsports.com/",4],
 [/^(?:nbcs ba|nbcsba|nbc sports bay area)$/i,"NBC Sports Bay Area","https://www.nbcsports.com/",4],
 [/^(?:nbcs bos|nbcsb|nbc sports boston)$/i,"NBC Sports Boston","https://www.nbcsports.com/",4],
 [/^(?:nbcs phi|nbcsp|nbc sports philadelphia)$/i,"NBC Sports Philadelphia","https://www.nbcsports.com/",4],
 [/^suns live$/i,"Suns Live","https://www.nba.com/suns/sunslive",4]
 ];const out=new Map();
 for(const raw of game.broadcasts||[]){if(typeof raw!=="string")continue;const name=raw.trim().replace(/\s+/g," ");for(const [pattern,label,url,rank] of rules){if(!pattern.test(name))continue;const network=label||name.toUpperCase();out.set(network,{label:network,network,url,rank,raw,regional:rank===4});break}}
 return [...out.values()].sort((a,b)=>a.rank-b.rank);
}
