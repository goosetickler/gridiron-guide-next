// NFL adapter: legacy normalized game shape and schedule semantics preserved.
// Helpers in app.js remain available to classic scripts at invocation time.
    function buildEspnUrls(){
      const season = getSeasonYear();
      const urls = [`${ESPN_BASE}?limit=1000&dates=${season}`];
      for(const type of [1,2,3]){
        const maxWeek = type === 2 ? 18 : 5;
        for(let week = 1; week <= maxWeek; week++){
          urls.push(`${ESPN_BASE}?limit=1000&dates=${season}&seasontype=${type}&week=${week}`);
        }
      }
      return urls;
    }

    function normalizeEspn(raw, seen){
      const events = Array.isArray(raw?.events) ? raw.events : [];
      return events.map(event => {
        const competition = event.competitions?.[0] || {};
        const competitors = competition.competitors || [];
        const home = competitors.find(c => c.homeAway === "home") || {};
        const away = competitors.find(c => c.homeAway === "away") || {};
        const broadcastEntries = Array.isArray(competition.broadcasts) ? competition.broadcasts : [];
        const broadcasts = broadcastEntries.flatMap(entry => {
          const names = Array.isArray(entry?.names) && entry.names.length ? entry.names : [entry?.shortName || entry?.name || ""];
          return names.filter(Boolean).map(name => ({name:String(name),shortName:String(entry?.shortName||""),market:String(entry?.market||entry?.type?.name||""),type:String(entry?.type?.name||"")}));
        });
        const broadcast = broadcasts[0]?.name || "TBD";
        const id = event.id || event.uid || `${away.team?.abbreviation}-${home.team?.abbreviation}-${event.date}`;
        if(seen.has(id)) return null;
        const game = ggNormalizeGame({
          id,
          dateTime: event.date || competition.date,
          homeTeam: home.team?.displayName || home.team?.name || "Home Team",
          awayTeam: away.team?.displayName || away.team?.name || "Away Team",
          homeAbbr: home.team?.abbreviation || "HOME",
          awayAbbr: away.team?.abbreviation || "AWAY",
          homeLogo: getLogo(home.team),
          awayLogo: getLogo(away.team),
          homeScore: home.score,
          awayScore: away.score,
          homeRecord:home.records?.[0]?.summary || "",
          awayRecord: away.records?.[0]?.summary || "",
          network: broadcast,
          broadcasts,
          sourceLinks: normalizeEspnSourceLinks(event,competition),
          status: (event.status?.type?.state || event.status?.type?.name || "scheduled").toLowerCase(),
          statusDetail: event.status?.type?.shortDetail || event.status?.type?.detail || "",
          period: event.status?.period || event.status?.type?.period || "",
          clock: event.status?.displayClock || event.status?.clock || "",
          possessionAbbr: getPossessionAbbr(competition, home, away),
          homeTimeouts: getTimeouts(competition, home, "home"),
          awayTimeouts: getTimeouts(competition, away, "away"),
          venue: competition.venue?.fullName || "",
          seasonYear:Number(event.season?.year||raw?.season?.year||getSeasonYear()),
          seasonType:Number(event.season?.type||raw?.season?.type||0),
          weekNumber:Number(event.week?.number||raw?.week?.number||0)
        },"nfl");
        if(game)seen.add(id);
        return game;
      }).filter(Boolean);
    }

    function getLogo(team){
      return team?.logos?.[0]?.href || team?.logo || team?.logos?.find?.(l => l.href)?.href || "";
    }
    function getPossessionAbbr(competition, home, away){
      const situation = competition?.situation || {};
      const raw = situation.possession || situation.possessionText || situation.team?.abbreviation || situation.possessionTeam?.abbreviation || situation.lastPlay?.team?.abbreviation || "";
      if(!raw) return "";
      const value = String(raw).toUpperCase();
      if(value === String(home?.team?.id || "").toUpperCase()) return home?.team?.abbreviation || "";
      if(value === String(away?.team?.id || "").toUpperCase()) return away?.team?.abbreviation || "";
      if(value === String(home?.team?.abbreviation || "").toUpperCase()) return home?.team?.abbreviation || "";
      if(value === String(away?.team?.abbreviation || "").toUpperCase()) return away?.team?.abbreviation || "";
      return value.length <= 4 ? value : "";
    }
    function getTimeouts(competition, competitor, side){
      const situation = competition?.situation || {};
      const direct = competitor?.timeouts ?? competitor?.timeout ?? competitor?.timeoutsRemaining;
      const bySide = side === "home"
        ? (situation.homeTimeoutsRemaining ?? situation.homeTimeouts)
        : (situation.awayTimeoutsRemaining ?? situation.awayTimeouts);
      const value = direct ?? bySide;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.max(0, Math.min(3, parsed)) : null;
    }


    function normalizeEspnSourceLinks(event, competition){
      const rows=[...(Array.isArray(event?.links)?event.links:[]),...(Array.isArray(competition?.links)?competition.links:[])];
      const seen=new Set();
      return rows.map(link=>{
        const href=String(link?.href||link?.url||"").trim();
        if(!href||seen.has(href))return null;
        seen.add(href);
        const rel=Array.isArray(link?.rel)?link.rel.map(String):[];
        return {href,text:String(link?.text||link?.shortText||""),rel};
      }).filter(Boolean);
    }


    async function fetchEspnSchedule(){
      const urls = buildEspnUrls();
      const seen = new Set();
      let games = [];

      const first = await fetchJson(urls[0]);
      games = normalizeEspn(first, seen);

      // Only fan out week-by-week when the season-level response itself is truly
      // sparse. Using the active UI filter here can accidentally trigger ~28 requests
      // (for example when the selected week is complete or RESULTS is active).
      if(games.length < 40){
        const weekResults = await Promise.allSettled(urls.slice(1).map(fetchJson));
        for(const result of weekResults){
          if(result.status === "fulfilled") games.push(...normalizeEspn(result.value, seen));
        }
      }
      const currentPreseasonStart = new Date(`${getSeasonYear()}-08-01T00:00:00`);
      return games
        .filter(game => new Date(game.dateTime) >= currentPreseasonStart)
        .sort((a,b) => new Date(a.dateTime) - new Date(b.dateTime));
    }

