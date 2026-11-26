// 2026-27 flagship directory; team websites are information links, not guaranteed live streams.
// Sources: https://teamradiostations.com/league/nba and https://www.channeltonight.com/guides/team-radio-stations
const ggNbaRadioRegistry={
  "ATL": [
    "WZGC",
    "92.9 FM",
    "hawks"
  ],
  "BOS": [
    "WBZ-FM",
    "98.5 FM",
    "celtics"
  ],
  "BKN": [
    "WFAN",
    "101.9 FM / 660 AM",
    "nets"
  ],
  "CHA": [
    "WFNZ",
    "92.7 FM",
    "hornets"
  ],
  "CHI": [
    "WSCR",
    "104.3 FM",
    "bulls"
  ],
  "CLE": [
    "WTAM / WMMS",
    "1100 AM / 100.7 FM",
    "cavaliers"
  ],
  "DAL": [
    "KRLD-FM",
    "105.3 FM",
    "mavericks"
  ],
  "DEN": [
    "KKSE-FM",
    "92.5 FM",
    "nuggets"
  ],
  "DET": [
    "WXYT-FM",
    "97.1 FM",
    "pistons"
  ],
  "GSW": [
    "KGMZ-FM",
    "95.7 FM",
    "warriors"
  ],
  "HOU": [
    "KBME",
    "790 AM",
    "rockets"
  ],
  "IND": [
    "Pacers Radio",
    "93.5 / 107.5 FM",
    "pacers"
  ],
  "LAC": [
    "KLAC",
    "570 AM",
    "clippers"
  ],
  "LAL": [
    "KSPN",
    "710 AM",
    "lakers"
  ],
  "MEM": [
    "WMFS",
    "92.9 FM / 680 AM",
    "grizzlies"
  ],
  "MIA": [
    "WQAM",
    "104.3 FM / 560 AM",
    "heat"
  ],
  "MIL": [
    "WTMJ",
    "620 AM",
    "bucks"
  ],
  "MIN": [
    "WCCO",
    "830 AM",
    "timberwolves"
  ],
  "NOP": [
    "WWL",
    "870 AM / 105.3 FM",
    "pelicans"
  ],
  "NYK": [
    "WHSQ",
    "880 AM",
    "knicks"
  ],
  "OKC": [
    "WWLS",
    "98.1 FM",
    "thunder"
  ],
  "ORL": [
    "WYGM",
    "96.9 FM / 740 AM",
    "magic"
  ],
  "PHI": [
    "WPEN",
    "97.5 FM",
    "sixers"
  ],
  "PHX": [
    "KMVP-FM",
    "98.7 FM",
    "suns"
  ],
  "POR": [
    "KPOJ",
    "620 AM",
    "blazers"
  ],
  "SAC": [
    "Kings Radio",
    "",
    "kings"
  ],
  "SAS": [
    "WOAI",
    "1200 AM",
    "spurs"
  ],
  "TOR": [
    "CJCL / CHUM",
    "590 / 1050 AM",
    "raptors"
  ],
  "UTA": [
    "Jazz Radio",
    "97.5 FM",
    "jazz"
  ],
  "WAS": [
    "WJFK-FM",
    "106.7 FM",
    "wizards"
  ]
};
function ggNbaRadioOptions(g){
 const aliases={GS:"GSW",NY:"NYK",NO:"NOP",SA:"SAS",UTAH:"UTA",WSH:"WAS",BKN:"BKN",BRK:"BKN",PHO:"PHX"};
 const out=[{label:"SiriusXM",detail:"NBA schedule / subscription",url:"https://www.siriusxm.com/sports/nba"},{label:"League Pass Audio",detail:"Subscription",url:"https://www.nba.com/league-pass-purchase"}];
 for(const side of ["away","home"]){const key=String(g[side+"Abbr"]||"").toUpperCase();const r=ggNbaRadioRegistry[aliases[key]||key];if(r)out.push({label:r[0]+(r[1]?" · "+r[1]:""),detail:(side==="home"?"Home":"Away")+" radio · team site",url:"https://www.nba.com/"+r[2]})}
 return out;
}
