import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const jobs=['collect-nba-broadcasts.mjs','collect-nhl-broadcasts.mjs','collect-combat-events.mjs'];
let failed=0;
for(const job of jobs){console.log('\n=== '+job+' ===');const p=spawnSync(process.execPath,[resolve(root,'scripts',job),...process.argv.slice(2)],{cwd:root,stdio:'inherit'});if(p.status!==0){failed++;console.error('FAILED: '+job);}}
console.log('\nCollectors finished: '+(jobs.length-failed)+'/'+jobs.length);
console.log('Pending source integrations: X Games, Surfing, Dog Shows. NFL local coverage and waivers remain separate.');
process.exitCode=failed?1:0;
