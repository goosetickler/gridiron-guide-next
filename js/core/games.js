// Shared game identity and date validation. Legacy IDs remain unchanged.
function ggGameIdentity(leagueId,id){
  if(!Object.hasOwn(GG_LEAGUES,leagueId))throw new Error("Unknown league: "+leagueId);
  return leagueId+":"+String(id);
}
function ggNormalizeGame(game,leagueId){
  if(!game||!game.dateTime||!Number.isFinite(new Date(game.dateTime).getTime()))return null;
  return {...game,leagueId,sportId:GG_LEAGUES[leagueId].sport,gameKey:ggGameIdentity(leagueId,game.id)};
}
// Date navigation uses the viewer's local calendar, not UTC midnight.
function ggLocalDateKey(value){
  const d=new Date(value);
  if(!Number.isFinite(d.getTime()))return "";
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
function ggGroupGamesByDate(games){
  const groups=new Map();
  for(const game of games){const key=ggLocalDateKey(game.dateTime);if(!key)continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(game);}
  return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([key,games])=>({key,games}));
}
