    function extractFantasyLeadersFromEspnSummary(summary){
      const playersById = new Map();
      // ESPN receiving stat groups include both WRs and TEs. Prefer actual
      // athlete/roster positions over the stat group when assigning filters.
      const rosterPositions = new Map();
      (summary?.rosters || []).forEach(teamRoster => {
        (teamRoster?.roster || teamRoster?.athletes || []).forEach(item => {
          const athlete = item?.athlete || item;
          const position = normalizeFantasyPosition(athlete?.position || item?.position);
          if(position && athlete?.id) rosterPositions.set(String(athlete.id), position);
        });
      });
      const teamGroups = summary?.boxscore?.players || [];
      teamGroups.forEach(teamBlock => {
        const teamAbbr = teamBlock?.team?.abbreviation || "";
        (teamBlock?.statistics || []).forEach(statGroup => {
          const groupName = String(statGroup?.name || statGroup?.displayName || "").toLowerCase();
          const labels = (statGroup?.labels || []).map(label => String(label).toLowerCase());
          (statGroup?.athletes || []).forEach(row => {
            const athlete = row?.athlete || {};
            const id = athlete.id || athlete.uid || athlete.displayName || athlete.name;
            const name = athlete.displayName || athlete.shortName || athlete.name;
            if(!id || !name) return;
            const stats = row?.stats || [];
            const rosterPosition = rosterPositions.get(String(athlete.id || id)) || "";
            const actualPosition = normalizeFantasyPosition(athlete.position || row?.position) || rosterPosition;
            const inferredPosition = actualPosition || inferFantasyPosition(groupName, "");
            const entry = playersById.get(id) || { id, name, teamAbbr, position:inferredPosition, points:0, receptions:0, line:[] };
            // A real position must override an earlier group-based inference.
            if(actualPosition) entry.position = actualPosition;
            else if(!entry.position && inferredPosition) entry.position = inferredPosition;
            if(teamAbbr && !entry.teamAbbr) entry.teamAbbr = teamAbbr;
            if(groupName.includes("kicking")){
              // ESPN kicking lines use made/attempted strings (e.g. FG 2/3, XP 3/3).
              const made=(key)=>{const i=labels.findIndex(l=>l===key||l.startsWith(key+"/"));if(i<0)return 0;return parseStat(String(stats[i]).split("/")[0]);};
              const fg=made("fg"), xp=made("xp");
              entry.position="K";
              entry.points+=fg*3+xp;
              if(fg)entry.line.push(`${fg} FG`);
              if(xp)entry.line.push(`${xp} XP`);
            }
            if(groupName.includes("passing")){
              const passYds = statValue(labels, stats, "yds");
              const passTd = statValue(labels, stats, "td");
              const interceptions = statValue(labels, stats, "int");
              entry.points += passYds / 25 + passTd * 4 - interceptions * 2;
              if(passYds) entry.line.push(`${Math.round(passYds)} pass yds`);
              if(passTd) entry.line.push(`${passTd} pass TD`);
              if(interceptions) entry.line.push(`${interceptions} INT`);
            }
            if(groupName.includes("rushing")){
              const rushYds = statValue(labels, stats, "yds");
              const rushTd = statValue(labels, stats, "td");
              entry.points += rushYds / 10 + rushTd * 6;
              if(rushYds) entry.line.push(`${Math.round(rushYds)} rush yds`);
              if(rushTd) entry.line.push(`${rushTd} rush TD`);
            }
            if(groupName.includes("receiving")){
              const rec = statValue(labels, stats, "rec");
              const recYds = statValue(labels, stats, "yds");
              const recTd = statValue(labels, stats, "td");
              entry.points += rec + recYds / 10 + recTd * 6;
              entry.receptions += rec;
              if(rec) entry.line.push(`${rec} rec`);
              if(recYds) entry.line.push(`${Math.round(recYds)} rec yds`);
              if(recTd) entry.line.push(`${recTd} rec TD`);
            }
            playersById.set(id, entry);
          });
        });
      });
      return Array.from(playersById.values())
        .filter(player => player.points > 0)
        .map(player => ({...player, points:Number(player.points.toFixed(1)), line:uniqueList(player.line).slice(0,3).join(" · ")}))
        .sort((a,b) => b.points - a.points);
    }

    function normalizeFantasyPosition(raw){
      const value = typeof raw === "object" && raw !== null
        ? (raw.abbreviation || raw.name || raw.displayName || "") : raw;
      const position = String(value || "").trim().toUpperCase();
      const names = {"QUARTERBACK":"QB","RUNNING BACK":"RB","WIDE RECEIVER":"WR","TIGHT END":"TE","KICKER":"K","PLACE KICKER":"K"};
      return names[position] || (position==="PK"?"K":["QB","RB","WR","TE","K"].includes(position) ? position : "");
    }

    function inferFantasyPosition(groupName, rawPosition){
      const value = String(rawPosition || "").toUpperCase();
      if(value && value.length <= 3) return value;
      if(groupName.includes("passing")) return "QB";
      if(groupName.includes("rushing")) return value || "RB";
      if(groupName.includes("receiving")) return value || "WR";
      if(groupName.includes("kicking")) return "K";
      return value || "";
    }

    function uniqueList(list){
      const seen = new Set();
      return list.filter(item => item && !seen.has(item) && seen.add(item));
    }

    function statValue(labels, stats, label){
      const index = labels.findIndex(item => item === label || item.includes(label));
      if(index < 0) return 0;
      return parseStat(stats[index]);
    }

    function parseStat(value){
      if(value === undefined || value === null) return 0;
      const match = String(value).match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : 0;
    }

    function fantasyRosterEntries(payload){
      const result=[];
      const visit=(node,depth=0)=>{
        if(!node||depth>7)return;
        if(Array.isArray(node)){node.forEach(item=>visit(item,depth+1));return;}
        if(typeof node!=="object")return;
        const athlete=node.athlete || (node.id && (node.displayName||node.fullName) ? node : null);
        if(athlete){
          const pos=normalizeFantasyPosition(athlete.position || node.position);
          if(pos)result.push({id:String(athlete.id||""),name:String(athlete.displayName||athlete.fullName||athlete.name||"").trim().toLowerCase(),position:pos});
        }
        for(const key of ["athletes","roster","items","groups","entries"]){if(node[key])visit(node[key],depth+1);}
      };
      visit(payload);
      return result;
    }
function ggNflFantasyScore(player,receptionBonus){return Number(player.points||0)-Number(player.receptions||0)*(1-receptionBonus);}
