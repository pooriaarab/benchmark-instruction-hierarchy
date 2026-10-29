import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { benchmark, run, badAnswerForE2E } from '../../dist/index.js';
import { wilson, bootstrap, mean } from '../template/stats.mjs';
const tasks = await benchmark.listTasks(), kinds = [...new Set(tasks.map(t => t.metadata.conflictKind))];
const save = async (name, x) => writeFile(`paper/data/${name}.generated.json`, JSON.stringify(x, null, 2)+'\n');
const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const execute = (id, answer) => run({ id, complete: async (_, c) => ({ content: answer(c.task) }), chat: async () => { throw Error('Single turn only'); } }, { concurrency: 1, retries: 0, seed: 20261029 });
const semantic = r => r.rows.map(({taskId,submission,score,reason,details,error}) => ({taskId,submission,score,reason,details,error}));
await mkdir('paper/data', {recursive:true});
const policies = ['oracle','empty','same','echo','refuse','injection','labelfirst','labellast'];
const answer = (p,t) => p === 'oracle' ? t.expected : p === 'echo' ? t.prompt : badAnswerForE2E(t,p).answer;
const runs = {}, repeats = {}, controls = [];
for (const p of policies) {
  runs[p] = await execute(p, t => answer(p,t));
  const repeated = await execute(p, t => answer(p,t));
  repeats[p] = { rows: semantic(repeated), first:hash(semantic(runs[p])), second:hash(semantic(repeated)) };
  const rows = runs[p].rows;
  controls.push({ policy:p, success:wilson(rows.filter(r=>r.score===1).length,rows.length), injection:wilson(rows.filter(r=>r.details?.injectionFollowed).length,rows.length), byKind:Object.fromEntries(kinds.map(k=>{const subset=rows.filter(r=>tasks.find(t=>t.id===r.taskId).metadata.conflictKind===k);return [k,wilson(subset.filter(r=>r.score===1).length,subset.length)];})) });
}
const paired = kinds.map(k=>tasks.flatMap((t,i)=>t.metadata.conflictKind===k?[Number(runs.oracle.rows[i].score===1)-Number(runs.refuse.rows[i].score===1)]:[]));
const simulations = [], sweep = [];
for (const q of [0,.25,.5,.75,1]) {
  const cells = {none:[],block:[]};
  for (let seed=1;seed<=100;seed++) {
    let state=seed; const draws=new Map(tasks.map(t=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return [t.id,state/4294967296];}));
    for (const layer of ['none','block']) {
      const r=await execute(`simulated-${q}-${seed}-${layer}`,t=>{let a=draws.get(t.id)<q?t.expected:answer('injection',t);if(layer==='block' && t.metadata.injectedOutputs.some(v=>a.toLowerCase().includes(v.toLowerCase())))a='I decline to answer.';return a;});
      const rows=r.rows.map(x=>({taskId:x.taskId,answer:x.submission.answer,score:x.score,injection:Boolean(x.details?.injectionFollowed)}));
      const cell={q,seed,layer,success:mean(rows.map(x=>Number(x.score===1))),injection:mean(rows.map(x=>Number(x.injection)))};
      cells[layer].push(cell); simulations.push({...cell,rows});
    }
  }
  const stat=(layer,metric)=>bootstrap([cells[layer]],g=>mean(g[0].map(x=>x[metric])));
  const diff=metric=>bootstrap([cells.none.map((x,i)=>cells.block[i][metric]-x[metric])],g=>mean(g[0]));
  sweep.push({q,simulated:true,agents:100,none:{success:stat('none','success'),injection:stat('none','injection')},block:{success:stat('block','success'),injection:stat('block','injection')},difference:{success:diff('success'),injection:diff('injection')}});
}
const summary={n:tasks.length,kinds:kinds.map(kind=>({kind,n:tasks.filter(t=>t.metadata.conflictKind===kind).length})),controls,pairedOracleRefusal:bootstrap(paired,g=>mean(g.flat())),sweep,freeModel:'Not configured for this study; provider availability not tested.'};
await save('runs',runs); await save('repeat',repeats); await save('simulated',simulations); await save('summary',summary);
const files=['data/tasks.jsonl','src/grader.ts','src/benchmark.ts','src/report.ts','package-lock.json','paper/PREREG.md','paper/scripts/run.mjs'];
await save('provenance',{source:JSON.parse(await readFile('paper/config.json')).source_commit,planCommit:execFileSync('git',['log','--reverse','--format=%H','--','paper/PREREG.md'],{encoding:'utf8'}).trim().split('\n')[0],node:process.version,hashes:Object.fromEntries(await Promise.all(files.map(async f=>[f,hash(await readFile(f,'utf8'))])))});
console.log(JSON.stringify({tasks:tasks.length,controls:controls.map(x=>[x.policy,x.success.k,x.injection.k]),simulatedRuns:simulations.length}));
