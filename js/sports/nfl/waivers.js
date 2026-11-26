    function validWaiverPlayer(p){
      return p&&typeof p.name==="string"&&typeof p.team==="string"&&
        ["QB","RB","WR","TE","K"].includes(p.position)&&
        (["High","Medium","Low"].includes(p.rostered)||["High","Medium","Low"].includes(p.availability))&&
        (p.summary===undefined||(typeof p.summary==="string"&&p.summary.length<=700));
    }
    function validWaiverPayload(data,season=2026){
      return data&&Number(data.season)===season&&data.weeks&&
        typeof data.weeks==="object"&&!Array.isArray(data.weeks)&&
        Object.keys(data.weeks).length>0&&
        Object.entries(data.weeks).every(([week,entry])=>
          /^(?:[1-9]|1[0-8])$/.test(week)&&entry&&Array.isArray(entry.players)&&
          entry.players.every(validWaiverPlayer));
    }
    function ggNflWaiverWeek(selectedScheduleWeek){
      const [type,week]=String(selectedScheduleWeek||"").split(":").map(Number);
      return type===2&&Number.isInteger(week)&&week>=1&&week<=18?week:null;
    }
