    function ggNflWeekKey(g){
      const type=Number(g.seasonType||0),week=Number(g.weekNumber||0);
      if(type&&week)return `${type}:${week}`;
      const d=new Date(g.dateTime);
      if(!Number.isFinite(d.getTime()))return "";
      const season=Number(g.seasonYear)|| (d.getUTCMonth()<=1?d.getUTCFullYear()-1:d.getUTCFullYear());
      // Approximate fallback only; ESPN week metadata always takes precedence.
      const rs=new Date(Date.UTC(season,8,1));
      rs.setUTCDate(rs.getUTCDate()+(7-rs.getUTCDay())%7);
      if(d<rs)return `1:${Math.max(1,Math.min(3,Math.floor((d-new Date(Date.UTC(season,7,1)))/604800000)+1))}`;
      return `2:${Math.max(1,Math.min(18,Math.floor((d-rs)/604800000)+1))}`;
    }
    function ggNflScheduleWeeks(games){
      const groups=new Map();
      games.forEach(g=>{const k=ggNflWeekKey(g);if(k){if(!groups.has(k))groups.set(k,[]);groups.get(k).push(g)}});
      [1,2,3].forEach(w=>groups.has(`1:${w}`)||groups.set(`1:${w}`,[]));
      for(let w=1;w<=18;w++)groups.has(`2:${w}`)||groups.set(`2:${w}`,[]);
      [1,2,3,4,5].forEach(w=>groups.has(`3:${w}`)||groups.set(`3:${w}`,[]));
      return [...groups].sort((a,b)=>{const A=a[0].split(":").map(Number),B=b[0].split(":").map(Number);return A[0]*100+A[1]-B[0]*100-B[1]}).map(([key,games])=>{const [type,week]=key.split(":").map(Number),ds=games.map(g=>new Date(g.dateTime));return{key,type,week,hasGames:!!games.length,min:ds.length?new Date(Math.min(...ds)):null,max:ds.length?new Date(Math.max(...ds)):null}});
    }
    function ggNflCurrentWeek(scheduleWeeks,allGames,now=Date.now()){
      const populated=scheduleWeeks.filter(w=>w.hasGames);
      if(!populated.length)return null;

      // A week remains current through the expected end of its last game. After
      // that window, advance to the next populated week—even before its first
      // kickoff. This avoids Thursday launches incorrectly reopening the prior
      // week because its Monday-night game happened less than four days ago.
      const GAME_COMPLETION_WINDOW_MS=6*60*60*1000;
      return populated.find(w=>{
        const lastKickoff=allGames
          .filter(g=>ggNflWeekKey(g)===w.key)
          .reduce((latest,g)=>Math.max(latest,new Date(g.dateTime).getTime()||0),0);
        return lastKickoff+GAME_COMPLETION_WINDOW_MS>now;
      })||populated[populated.length-1];
    }

function ggScheduleGroups(leagueId,games){
  const league=GG_LEAGUES[leagueId];
  if(!league)throw new Error("Unknown league: "+leagueId);
  return league.scheduleMode==="week"?ggNflScheduleWeeks(games):ggGroupGamesByDate(games);
}
