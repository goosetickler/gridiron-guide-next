// Shared broadcast classification and provider selection for team sports.
function ggBroadcastType(p){return p.network==="League Pass"?"pass":p.regional?"regional":"national"}
function ggTeamSportProviders(league,g){return league==="nba"?ggNbaProviders(g):league==="nhl"?ggNhlProviders(g):ggSoccerProviders(g)}
function ggTeamSportRadio(league,g){return league==="cfb"?ggCfbRadio(g):league==="nba"?ggNbaRadioOptions(g):league==="nhl"?[{label:"SiriusXM",detail:"NHL schedule / subscription",url:"https://www.siriusxm.com/sports/nhl"},{label:"NHL Gamecenter",detail:"Game audio availability varies",url:"https://www.nhl.com/scores"}]:league==="mls"||league==="epl"?ggSoccerRadio(league,g):league==="f1"?[{label:"XM F1",detail:"Channel 835 / subscription; session coverage varies",url:"https://www.siriusxm.com/channels/f1-on-siriusxm"}]:[]}
function ggNhlProviders(g){const out=new Map();for(const feed of (g.nhlFeeds|| (g.broadcasts||[]).map(network=>({network})))){const n=feed.network.trim();let label=n,url="",regional=false;
const extra=/^(Mammoth\+|Utah16|SCRIPPS|BN\+|STLNHL|The Spot|DSN|CBJHN|CBJNHL|Wild\+|MINNHL|ABTV|FOXLA\+|SN-PIT|HHN|CARNHL|MNMT2|WWHO|KTVD)$/i;
if(extra.test(n)){url="https://www.nhl.com/info/where-to-watch";regional=true}
else if(/^NHLN$/i.test(n)){label="NHL Network";url="https://www.nhl.com/network"}
else if(/^HBO MAX$/i.test(n)){label="HBO Max";url="https://www.hbomax.com/"}
else if(/^Disney\+$/i.test(n)){url="https://www.disneyplus.com/"}
else if(/^Prime Video$/i.test(n)){url="https://www.primevideo.com/";regional=true}
else if(/^ESPN\+$/i.test(n)){url="https://www.espn.com/watch/";regional=true}
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
if(feed.market){regional=feed.market!=="N";if(!url)url="https://www.nhl.com/info/where-to-watch";}if(url){const key=label.toUpperCase();const prior=out.get(key);out.set(key,{label,network:label,url,regional:prior?prior.regional&&regional:regional});}}return [...out.values()].sort((a,b)=>Number(a.regional)-Number(b.regional))}

// Free station directories and official streams; no guarantee of match-level rights.
function ggSoccerRadio(league,g){
 const options=[];
 const add=(label,detail,url)=>options.push({label,detail,url});
 if(league==="mls"){
 add("Radio.net","Free · MLS match radio directory; availability varies","https://www.radio.net/sport/mls");
 if([g?.homeAbbr,g?.awayAbbr].some(x=>["SJ","SJE"].includes(String(x).toUpperCase()))){
 add("KSFO 810","Free · San Jose English radio; selected matches","https://www.ksfo.com/");
 add("La Kaliente 1370","Free · San Jose Spanish radio","https://lakaliente1370am.com/");
 }
 }else{
 add("Radio.net","Free · Premier League match radio directory; regional restrictions","https://www.radio.net/sport/premier-league");
 add("talkSPORT","Free · selected matches; regional restrictions","https://www.radio.net/s/talksport");
 add("BBC 5 Live","Free · selected matches; UK rights restrictions","https://www.bbc.co.uk/5live");
 }
 add("XM FC","Subscription · soccer schedule; match coverage varies","https://www.siriusxm.com/sports/soccer");
 return options;
}

let ggNhlOfficialCache=null,ggNhlOfficialAt=0,ggNhlOfficialPending=null;
async function ggNhlOfficialGames(request){
 if(ggNhlOfficialCache&&Date.now()-ggNhlOfficialAt<3600000)return ggNhlOfficialCache;
 if(ggNhlOfficialPending)return ggNhlOfficialPending;
 ggNhlOfficialPending=(async()=>{try{const j=await request("./data/nhl-broadcasts.json");if(j.version!==1||!Array.isArray(j.games)||!Number.isFinite(Date.parse(j.generatedAt))||Date.now()-Date.parse(j.generatedAt)>7*86400000)return [];ggNhlOfficialCache=j.games;ggNhlOfficialAt=Date.now();return j.games}catch{return []}finally{ggNhlOfficialPending=null}})();return ggNhlOfficialPending;
}
function ggNhlMergeOfficial(games,rows){
 const norm=x=>{const a=String(x||"").toUpperCase();return ({NJ:"NJD",LA:"LAK",SJ:"SJS",TB:"TBL",WSH:"WSH",WAS:"WSH",UTAH:"UTA",MON:"MTL",VEG:"VGK"})[a]||a};
 for(const g of games){const matches=rows.filter(r=>norm(r.home)===norm(g.homeAbbr)&&norm(r.away)===norm(g.awayAbbr)&&Math.abs(Date.parse(r.dateTime)-Date.parse(g.dateTime))<3*3600000);if(matches.length!==1)continue;const feeds=(matches[0].feeds||[]).filter(b=>b.country==="US"&&["N","H","A"].includes(b.market)&&typeof b.network==="string");if(!feeds.length)continue;g.nhlFeeds=feeds;g.network=ggNhlProviders(g)[0]?.network||g.network;}
}

function ggCfbShort(name,abbr){
 const aliases={"Mississippi State":"Miss St","Ohio State":"Ohio St","Michigan State":"Mich St","Florida State":"FSU","Penn State":"Penn St","Kansas State":"K-State","Oklahoma State":"OK State","Arizona State":"ASU","Iowa State":"Iowa St","Oregon State":"Oregon St","Washington State":"Wash St","North Carolina":"UNC","South Carolina":"S Carolina","North Carolina State":"NC State","West Virginia":"WVU","Virginia Tech":"Va Tech","Georgia Tech":"Ga Tech","Boston College":"BC","Notre Dame":"N Dame","Texas A&M":"Texas A&M","Texas Tech":"Tex Tech","Wake Forest":"Wake","Mississippi":"Ole Miss","Louisiana State":"LSU","Southern California":"USC","California":"Cal","Chattanooga":"Chatt","Connecticut":"UConn","Massachusetts":"UMass","San Diego State":"SDSU","Boise State":"Boise St","Miami (FL)":"Miami","Miami (OH)":"Miami OH"};
 return aliases[name]||(name.length>10&&abbr?abbr:name);
}
function ggCfbRadio(g){
 const sites={ALA:"https://rolltide.com",UGA:"https://georgiadogs.com",TEX:"https://texaslonghorns.com",OSU:"https://ohiostatebuckeyes.com",MICH:"https://mgoblue.com",ND:"https://fightingirish.com",ORE:"https://goducks.com",USC:"https://usctrojans.com",UCLA:"https://uclabruins.com",UTAH:"https://utahutes.com",BYU:"https://byucougars.com",TENN:"https://utsports.com",FLA:"https://floridagators.com",IOWA:"https://hawkeyesports.com",NEB:"https://huskers.com",OU:"https://soonersports.com",MISS:"https://olemisssports.com",MSST:"https://hailstate.com",LSU:"https://lsusports.net","TA&M":"https://12thman.com",TTU:"https://texastech.com",WASH:"https://gohuskies.com",IND:"https://iuhoosiers.com",MIA:"https://miamihurricanes.com",FSU:"https://seminoles.com",LOU:"https://gocards.com",MIZ:"https://mutigers.com",ARIZ:"https://arizonawildcats.com",HOU:"https://uhcougars.com",WAKE:"https://godeacs.com"};
 const out=[{label:"SiriusXM",detail:"Subscription · college football schedule",url:"https://www.siriusxm.com/sports/college-football"}];
 for(const side of ["away","home"]){const abbr=g[side+"Abbr"],name=g[side+"Team"];if(sites[abbr])out.push({label:ggCfbShort(name||abbr,abbr)+" Radio",detail:"Official school audio / availability varies",url:sites[abbr]});}
 out.push({label:"Radio.net",detail:"Free station directory · game rights vary",url:"https://www.radio.net/sport/college-football"});
 return out;
}
