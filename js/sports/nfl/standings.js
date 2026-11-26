    function ggNflDivisionStandings(allGames,NFL_TEAMS,NFL_DIVISIONS,seasonYear,isFinalGame,hasScore){
      const teams=new Map(NFL_TEAMS.map(t=>[t.id,{...t,overall:[0,0,0],division:[0,0,0],games:0}]));
      const membership=new Map();
      for(const [conf,divisions] of Object.entries(NFL_DIVISIONS))for(const [division,ids] of Object.entries(divisions))for(const id of ids)membership.set(id,conf+" "+division);
      const seen=new Set();
      for(const g of allGames){
        if(Number(g.seasonType)!==2||Number(g.seasonYear||seasonYear)!==seasonYear||!isFinalGame(g)||!hasScore(g))continue;
        const away=teams.get(String(g.awayAbbr||"").toUpperCase());
        const home=teams.get(String(g.homeAbbr||"").toUpperCase());
        if(!away||!home||away.id===home.id||seen.has(String(g.id)))continue;
        const a=Number(g.awayScore),h=Number(g.homeScore);
        if(!Number.isFinite(a)||!Number.isFinite(h))continue;
        seen.add(String(g.id));
        const indexA=a>h?0:a<h?1:2,indexH=h>a?0:h<a?1:2;
        away.overall[indexA]++;home.overall[indexH]++;away.games++;home.games++;
        if(membership.get(away.id)===membership.get(home.id)){
          away.division[indexA]++;home.division[indexH]++;
        }
      }
      const pct=t=>(t.overall[0]+t.overall[2]/2)/Math.max(1,t.games);
      const groups=[];
      for(const [conf,divisions] of Object.entries(NFL_DIVISIONS))for(const [direction,ids] of Object.entries(divisions)){
        const entries=ids.map(id=>teams.get(id)).sort((a,b)=>pct(b)-pct(a)||(b.division[0]+b.division[2]/2)/Math.max(1,b.division.reduce((x,y)=>x+y,0))-(a.division[0]+a.division[2]/2)/Math.max(1,a.division.reduce((x,y)=>x+y,0))||a.name.localeCompare(b.name));
        groups.push({conference:conf,name:conf+" "+direction,entries});
      }
      return {groups,completed:seen.size,seasonGames:allGames.filter(g=>Number(g.seasonType)===2&&Number(g.seasonYear||seasonYear)===seasonYear).length};
    }
