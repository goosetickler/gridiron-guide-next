// League capabilities are declarative; only NFL is enabled until adapters are ready.
const GG_SPORTS = Object.freeze({
  football: Object.freeze({label:"Football",leagues:["nfl"]}),
  soccer: Object.freeze({label:"Soccer",leagues:["mls","epl"]}),
  basketball: Object.freeze({label:"Basketball",leagues:["nba"]}),
  hockey: Object.freeze({label:"Hockey",leagues:["nhl"]}),
  racing: Object.freeze({label:"Racing",leagues:["f1"]}),
  baseball: Object.freeze({label:"Baseball",leagues:["mlb"]})
});
const GG_LEAGUES = Object.freeze(Object.fromEntries([
  ["nfl","football","NFL","football/nfl","week",true],
  ["mls","soccer","MLS","soccer/usa.1","date",false],
  ["epl","soccer","Premier League","soccer/eng.1","date",false],
  ["nba","basketball","NBA","basketball/nba","date",false],
  ["f1","racing","F1","racing/f1","date",false],
  ["nhl","hockey","NHL","hockey/nhl","date",false],
  ["mlb","baseball","MLB","baseball/mlb","date",false]
].map(([id,sport,label,espnPath,scheduleMode,enabled])=>[id,Object.freeze({
  id,sport,label,espnPath,scheduleMode,enabled,
  scoreboard:"https://site.api.espn.com/apis/site/v2/sports/"+espnPath+"/scoreboard",
  summary:"https://site.web.api.espn.com/apis/site/v2/sports/"+espnPath+"/summary",
  teams:"https://site.api.espn.com/apis/site/v2/sports/"+espnPath+"/teams"
})])));
const GG_ACTIVE_LEAGUE = GG_LEAGUES.nfl;
// Preserve existing NFL cache keys. New leagues receive isolated keys.
function ggLeagueCacheKey(leagueId,legacyKey){
  if(!Object.hasOwn(GG_LEAGUES,leagueId))throw new Error("Unknown league: "+leagueId);
  return leagueId==="nfl"?legacyKey:"gridironGuide."+leagueId+"."+legacyKey.replace(/^gridironGuide\./,"");
}
