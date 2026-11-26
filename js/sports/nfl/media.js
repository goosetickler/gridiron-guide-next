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

