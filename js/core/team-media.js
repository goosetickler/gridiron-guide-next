// Shared broadcast classification and provider selection for team sports.
function ggBroadcastType(p){return p.network==="League Pass"?"pass":p.regional?"regional":"national"}
function ggTeamSportProviders(league,g){return league==="nba"?ggNbaProviders(g):league==="nhl"?ggNhlProviders(g):ggSoccerProviders(g)}
function ggTeamSportRadio(league,g){return league==="nba"?ggNbaRadioOptions(g):league==="nhl"?[{label:"SiriusXM",detail:"NHL schedule / subscription",url:"https://www.siriusxm.com/sports/nhl"},{label:"NHL Gamecenter",detail:"Game audio availability varies",url:"https://www.nhl.com/scores"}]:league==="mls"||league==="epl"?[{label:"XM FC",detail:"Soccer schedule / subscription; match coverage varies",url:"https://www.siriusxm.com/sports/soccer"}]:league==="f1"?[{label:"XM F1",detail:"Channel 835 / subscription; session coverage varies",url:"https://www.siriusxm.com/channels/f1-on-siriusxm"}]:[]}
function ggNhlProviders(g){const out=new Map();for(const raw of g.broadcasts||[]){const n=raw.trim();let label=n,url="",regional=false;
if(/^ESPN\+$/i.test(n)){url="https://www.espn.com/watch/";regional=true}
else if(/^(ESPN|ESPN2|ABC)$/i.test(n))url="https://www.espn.com/watch/";
else if(/^(TNT|TBS|truTV)$/i.test(n))url="https://www.hbomax.com/";
else if(/^Hulu$/i.test(n))url="https://www.hulu.com/";
else if(/^NHL Network$/i.test(n))url="https://www.nhl.com/network";
else if(/fan.?duel|^FDSN/i.test(n)){url="https://www.fanduelsportsnetwork.com/";regional=true}
else if(/^MSG|Gotham/i.test(n)){url="https://www.gothamsports.com/";regional=true}
else if(/NBC Sports|^NBCS/i.test(n)){url="https://www.nbcsports.com/";regional=true}
else if(/Altitude|^ALT$/i.test(n)){url="https://www.altitudesports.com/";regional=true}
else if(/^NESN/i.test(n)){url="https://nesn.com/";regional=true}
else if(/Sportsnet|^SN[0-9WEP]?$/i.test(n)){url="https://www.sportsnet.ca/";regional=true}
else if(/^TSN/i.test(n)){url="https://www.tsn.ca/";regional=true}
else if(/^(Victory\+|Victory Plus)$/i.test(n)){url="https://victoryplus.com/";regional=true}
else if(/^(Scripps Sports|Utah 16|KONG|KCAL|KCOP|CHSN|Monumental|MNMT|SNP|SNO|ROOT Sports)$/i.test(n)){url="https://www.nhl.com/info/where-to-watch";regional=true}
if(url)out.set(label.toUpperCase(),{label,network:label,url,regional});}return [...out.values()].sort((a,b)=>Number(a.regional)-Number(b.regional))}
