    function getProviderKeysForGame(game){
      // Do not manufacture a watch destination for late-season games whose
      // kickoff time and distribution have not been assigned yet.
      if(game?.kickoffTbd && (!game.network || game.network==="TBD"))return [];
      const {networkClass,providers}=baseProvidersForNetwork(game);
      let keys=[...providers];

      // Streaming exclusives / special eligibility are independent additions.
      if(isParamountPlusGame(game) && networkClass!=="CBS") keys.push("paramount");
      if(isPeacockGame(game) && !keys.includes("peacock")) keys.push("peacock");
      if(isNetflixGame(game) && !keys.includes("netflix")) keys.push("netflix");

      // Provider-owned schedule validation. These caches refresh weekly and
      // exist only to validate stream availability, not scores or game state.
      if(providerValidationAllows(game,"peacock")) keys.push("peacock");
      if(providerValidationAllows(game,"paramount")) keys.push("paramount");
            if(providerValidationAllows(game,"prime")) keys.push("prime");

      // DIRECTV is enrichment-only and requires separate verification.

      // NFL+ is limited to live local/primetime regular-season/postseason games
      // on mobile/tablet plus NFL Network. Do not expose it as a live option for
      // ordinary Sunday-afternoon CBS/FOX games.
      if(!keys.includes("nflplus") && ["NBC","ESPN","ABC","NFL_NETWORK","PRIME","NETFLIX","PEACOCK_EXCLUSIVE"].includes(networkClass)){
        keys.push("nflplus");
      }

      // Unknown broadcasts retain a conservative fallback rather than manufacturing
      // a full distribution set from a loose substring.
      if(!keys.length){
        const fallback=providerFromNetwork(game.network);
        if(fallback && fallback!=="nflplus") keys.push(fallback);
      }

      if(getDirectvEligibility(game).eligible) keys.push("directv");
      if(getSundayTicketEligibility(game).eligible) keys.push("sundayticket");

      const seen=new Set();
      return keys.filter(key=>PROVIDER_LINKS[key]&&!seen.has(key)&&seen.add(key));
    }

    function radioOptionsForGame(game){
      const teams=[
        {abbr:game.homeAbbr,team:teamShortName(game.homeTeam,game.homeAbbr),side:'Home'},
        {abbr:game.awayAbbr,team:teamShortName(game.awayTeam,game.awayAbbr),side:'Away'}
      ];
      const options=teams.map(t=>{
        const s=radioStationForAbbr(t.abbr);
        return s?{label:s.short,name:s.name,url:s.url,team:t.team,side:t.side,
          type:s.type,caption:s.type==='radio-info'?'AM/FM info ↗':'Station ↗',note:s.note||''}:null;
      }).filter(Boolean);
      const nflAudio={label:'NFL+ Audio',name:'NFL+ · Home & Away Audio',url:'https://www.nfl.com/plus',
        team:'NFL+',side:'Any market',type:'subscription',caption:'Subscription ↗'};
      // Don't send a Jaguars listener to a station player that explicitly mutes games.
      // Put NFL+ first when the home station is information-only.
      if(options[0]?.type==='radio-info')options.unshift(nflAudio);
      else options.push(nflAudio);
      return options;
    }
    // Compact on-card radio identifier; the expanded list retains full station
    // names and the original links. Never label NFL+ as SiriusXM unless the
    // selected destination actually points to SiriusXM.


    function classifyBroadcastNetwork(game){
      const names=getBroadcastNames(game);
      const s=names.join(" | ").replace(/\s+/g," ").trim();
      if(/\bnetflix\b/i.test(s))return "NETFLIX";
      if(/\b(?:amazon\s+)?prime(?:\s+video)?\b/i.test(s))return "PRIME";
      if(/\bpeacock\b/i.test(s)&&!/\bnbc/i.test(s))return "PEACOCK_EXCLUSIVE";
      if(/\bnfl\s*(?:network|net)\b|\bnfln\b/i.test(s))return "NFL_NETWORK";
      if(/\bespn(?:2|news|u)?\b/i.test(s))return "ESPN";

      // Parent-network token matching intentionally ignores channel numbers:
      // FOX30 / FOX 5, ABC7, CBS2, NBC4, etc.
      if(/\bcbs\s*\d*\b/i.test(s))return "CBS";
      if(/\bnbc\s*\d*\b/i.test(s))return "NBC";
      if(/\babc\s*\d*\b/i.test(s))return "ABC";
      if(isRegionalFoxBroadcast(game))return "FOX_REGIONAL";
      if(isNationalFoxBroadcast(game))return "FOX_NATIONAL";
      if(/\bfox\s*\d*\b/i.test(s))return "FOX_LOCAL";

      const affiliateParent=classifyLocalAffiliate(names);
      return affiliateParent||"UNKNOWN";
    }

    function baseProvidersForNetwork(game){
      // Compatibility wrapper retained so all existing filtering/eligibility callers
      // continue to receive the exact same {networkClass, providers} shape.
      const context=getBroadcastContext(game);
      return {
        networkClass:context.networkClass,
        providers:context.providers
      };
    }


    function isNetflixGame(g){
      const d=localGameDate(g), fixed=[["2026-09-10","SF","LAR"],["2026-11-25","GB","LAR"],["2026-12-25","GB","CHI"],["2026-12-25","BUF","DEN"]];
      return fixed.some(x=>d===x[0]&&matchup(g,x[1],x[2]))||String(g.network||"").toLowerCase().includes("netflix");
      // Fifth Netflix game is Week 18, Jan 9 2027; ESPN network metadata will identify it once flexed.
    }
    function isPeacockGame(g){
      const n=String(g.network||"").toLowerCase();
      return n.includes("peacock")||n.includes("nbc")||(localGameDate(g)==="2026-12-27"&&matchup(g,"BAL","GB"));
    }

    function isParamountPlusGame(game){
      const names=getBroadcastNames(game);
      // Paramount+ carries the local NFL on CBS feed. CBS metadata is therefore
      // a useful inferred signal; explicit Paramount+ metadata remains stronger.
      return names.some(name=>/\bparamount\s*\+?\b/i.test(String(name))) ||
             names.some(name=>/\bcbs\s*\d*\b/i.test(String(name)));
    }

    function getBroadcastNames(game){
      const names=Array.isArray(game.broadcasts)?game.broadcasts.map(x=>String(x?.name||x?.shortName||"")).filter(Boolean):[];
      if(game.network)names.push(String(game.network));
      return Array.from(new Set(names));
    }

    function isRegionalFoxBroadcast(game){
      const names=getBroadcastNames(game).map(name=>String(name).trim()).filter(Boolean);
      const fox=names.some(name=>/\bfox(?:\s+one|\s+network|\s+sports)?\b/i.test(name));
      if(!fox)return false;
      const d=new Date(game.dateTime);
      if(Number.isNaN(d.getTime()))return false;
      // Regular-season Sunday afternoon FOX is a regional distribution even when
      // ESPN labels the parent network simply as "FOX" or "FOX One".
      const localDay=d.getDay();
      const h=d.getHours();
      const sundayAfternoon=localDay===0 && h>=9 && h<18;
      const status=String(game.seasonType||game.season?.type||"").toLowerCase();
      const looksPostseason=/post|playoff|wild|division|conference|super/.test(status);
      return sundayAfternoon && !looksPostseason;
    }

    function isNationalFoxBroadcast(game){
      const names=getBroadcastNames(game).map(name=>String(name).trim()).filter(Boolean);
      if(isRegionalFoxBroadcast(game))return false;
      // Reserve NATIONAL for explicit national wording or non-regional FOX windows
      // (playoffs, special Saturday windows, etc.). Bare Sunday-afternoon FOX is regional.
      return names.some(name=>/\bfox\b/i.test(name));
    }

    function isSundayTicketWindow(game){
      const networkClass=classifyBroadcastNetwork(game);
      const d=new Date(game?.dateTime);
      if(Number.isNaN(d.getTime())||d.getDay()!==0)return false;
      if(Number(game?.seasonType||0)!==2)return false;
      return ["CBS","FOX_LOCAL","FOX_REGIONAL"].includes(networkClass);
    }

    function getSundayTicketEligibility(game){
      if(!sundayTicketEnabled)return {eligible:false,type:"DISABLED",reason:"NFL Sunday Ticket setting is off."};
      if(!isSundayTicketWindow(game))return {eligible:false,type:"NOT_ELIGIBLE",reason:"Sunday Ticket is for out-of-market regular-season Sunday afternoon CBS/FOX games."};
      const local=getLocalAvailabilityStatus(game);
      if(local.state==="OUT OF MARKET")return {eligible:true,type:"OUT_OF_MARKET",reason:"This Sunday CBS/FOX game is confirmed out of market for your detected TV market."};
      if(local.state==="CONFIRMED LOCAL"||local.state==="LOCAL EXPECTED")return {eligible:false,type:"LOCAL",reason:"This game is local or expected locally, so Sunday Ticket is not needed."};
      return {eligible:false,type:"UNVERIFIED",reason:"Local coverage is not confirmed yet; Sunday Ticket is not shown until the game is verified out of market."};
    }

