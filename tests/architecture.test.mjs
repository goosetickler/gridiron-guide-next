import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
function setup(fetchJson=async()=>({events:[]})){
  const ctx=vm.createContext({fetchJson,getSeasonYear:()=>2026});
  vm.runInContext(source('js/core/leagues.js')+'\nconst ESPN_BASE=GG_ACTIVE_LEAGUE.scoreboard;\n'+source('js/core/games.js')+'\n'+source('js/core/card-motion.js')+'\n'+source('js/sports/nfl/adapter.js'),ctx);
  return ctx;
}
const run=(ctx,code)=>vm.runInContext(code,ctx);
const event=(id,date='2026-09-10T00:20:00Z')=>({id,date,week:{number:1},season:{year:2026,type:2},status:{type:{state:'in'},period:2,displayClock:'4:32'},competitions:[{competitors:[{homeAway:'home',team:{id:'1',abbreviation:'SEA'},score:'7'},{homeAway:'away',team:{id:'2',abbreviation:'NE'},score:'0'}],broadcasts:[{names:['NBC']}],situation:{possession:'1',homeTimeouts:2}}]});
test('only NFL enabled; every league has unique endpoint',()=>{const c=setup();assert.equal(run(c,'Object.values(GG_LEAGUES).filter(x=>x.enabled).map(x=>x.id).join()'),'nfl');assert.equal(run(c,'new Set(Object.values(GG_LEAGUES).map(x=>x.scoreboard)).size'),6)});
test('cache keys preserve NFL and isolate other leagues',()=>{const c=setup();assert.equal(run(c,'ggLeagueCacheKey("nfl","gridironGuide.seasonSchedule.v1")'),'gridironGuide.seasonSchedule.v1');assert.equal(run(c,'ggLeagueCacheKey("mls","gridironGuide.seasonSchedule.v1")'),'gridironGuide.mls.seasonSchedule.v1');assert.throws(()=>run(c,'ggLeagueCacheKey("unknown","x")'),/Unknown league/)});
test('NFL schedule has season request and 28 distinct weekly fallbacks',()=>{const c=setup();const urls=run(c,'buildEspnUrls()');assert.equal(urls.length,29);assert.equal(new Set(urls).size,29);assert.match(urls[0],/dates=2026$/);assert.ok(urls.some(u=>u.endsWith('seasontype=2&week=18')))});
test('normalization preserves zero scores, clock, broadcast and possession',()=>{const c=setup();const g=c.normalizeEspn({events:[event('1')]},new Set())[0];assert.equal(g.awayScore,'0');assert.equal(g.homeScore,'7');assert.equal(g.clock,'4:32');assert.equal(g.network,'NBC');assert.equal(g.possessionAbbr,'SEA');assert.equal(g.homeTimeouts,2);assert.equal(g.weekNumber,1)});
test('duplicates and invalid dates are excluded',()=>{const c=setup();assert.equal(c.normalizeEspn({events:[event('1'),event('1'),event('2','bad')]},new Set()).length,1);assert.equal(c.normalizeEspn(null,new Set()).length,0)});
test('source links are deduplicated',()=>{const c=setup();assert.equal(c.normalizeEspnSourceLinks({links:[{href:'https://example.com'}]},{links:[{href:'https://example.com'}]}).length,1)});
test('full season avoids weekly requests',async()=>{let calls=0;const c=setup(async()=>{calls++;return {events:Array.from({length:40},(_,i)=>event(String(i)))}});assert.equal((await c.fetchEspnSchedule()).length,40);assert.equal(calls,1)});
test('sparse season tolerates failed weeks and deduplicates',async()=>{let calls=0;const c=setup(async()=>{calls++;if(calls===2)throw Error('offline');return {events:[event('1')]}});assert.equal((await c.fetchEspnSchedule()).length,1);assert.equal(calls,29)});

test('shared game identity preserves legacy ID and isolates leagues',()=>{const c=setup();const g=c.normalizeEspn({events:[event('1')]},new Set())[0];assert.equal(g.id,'1');assert.equal(g.gameKey,'nfl:1');assert.equal(g.sportId,'football');assert.equal(run(c,'ggGameIdentity("mls","1")'),'mls:1')});
test('invalid first occurrence does not suppress valid game',()=>{const c=setup();assert.equal(c.normalizeEspn({events:[event('1','bad'),event('1')]},new Set()).length,1)});
test('daily groups sort local calendar dates and ignore invalid dates',()=>{const c=setup();assert.equal(run(c,'ggGroupGamesByDate([{dateTime:new Date(2026,8,11,12)},{dateTime:new Date(2026,8,10,12)},{dateTime:"bad"}]).map(g=>g.key).join()'),'2026-09-10,2026-09-11')});
test('FLIP skips offscreen and subpixel movements',()=>{const c=setup();assert.equal(c.ggVisibleFlipOffset({top:100,bottom:200},{top:150,bottom:250},800),-50);assert.equal(c.ggVisibleFlipOffset({top:900,bottom:1000},{top:950,bottom:1050},800),null);assert.equal(c.ggVisibleFlipOffset({top:100,bottom:200},{top:100.5,bottom:200.5},800),null)});
test('FLIP animates only displaced visible siblings',()=>{const c=setup();const calls=[];const active={animate(){throw Error('active card animated')}};const sibling={animate(frames,timing){calls.push({frames,timing});return 'animation'}};const animations=[];c.ggAnimateDisplacedCards([{el:active,old:{top:10,bottom:50},next:{top:20,bottom:60}},{el:sibling,old:{top:100,bottom:200},next:{top:150,bottom:250}}],active,800,{duration:240},animations);assert.equal(calls.length,1);assert.equal(calls[0].frames[0].transform,'translateY(-50px)');assert.equal(animations[0],'animation')});
