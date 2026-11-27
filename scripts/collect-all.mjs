import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {mkdir,cp} from 'node:fs/promises';
import {homedir} from 'node:os';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(process.env.GG_OUTPUT_DIR||resolve(homedir(),'Downloads','gridiron-guide-collector'));
if(out===resolve(root)||out.startsWith(resolve(root)+'/'))throw Error('Choose an output directory outside the repository');
await mkdir(out,{recursive:true});
await cp(resolve(root,'scripts'),resolve(out,'scripts'),{recursive:true});
await cp(resolve(root,'js'),resolve(out,'js'),{recursive:true});
await mkdir(resolve(out,'data'),{recursive:true});
await cp(resolve(root,'data'),resolve(out,'data'),{recursive:true,force:false,errorOnExist:false});
const jobs=['collect-nba-broadcasts.mjs','collect-nhl-broadcasts.mjs','collect-major-events.mjs','collect-tennis.mjs'];
let failed=0;
for(const job of jobs){console.log('\n=== '+job+' ===');const p=spawnSync(process.execPath,[resolve(out,'scripts',job),...process.argv.slice(2)],{cwd:out,stdio:'inherit'});if(p.status!==0){failed++;console.error('FAILED: '+job);}}
console.log('\nCollectors finished: '+(jobs.length-failed)+'/'+jobs.length);
console.log('Upload JSON files from '+resolve(out,'data'));
process.exitCode=failed?1:0;
