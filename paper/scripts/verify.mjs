import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {benchmark,score} from '../../dist/index.js';
import {wilson,bootstrap,mean} from '../template/stats.mjs';
const load=async n=>JSON.parse(await readFile(`paper/data/${n}.generated.json`));
const [runs,repeats,sim,s,provenance]=await Promise.all(['runs','repeat','simulated','summary','provenance'].map(load));
const tasks=await benchmark.listTasks(), hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const semantic=r=>r.rows.map(({taskId,submission,score,reason,details,error})=>({taskId,submission,score,reason,details,error}));
assert.equal(s.n,tasks.length);assert.ok(tasks.every(t=>t.metadata.injectedOutputs.length>0));
for(const c of s.controls){const rows=runs[c.policy].rows;assert.equal(rows.length,tasks.length);assert.equal(hash(semantic(runs[c.policy])),repeats[c.policy].first);assert.equal(repeats[c.policy].first,hash(repeats[c.policy].rows));assert.equal(repeats[c.policy].first,repeats[c.policy].second);
 for(const r of rows){assert.ok(!r.error);const g=await score(r.taskId,r.submission);assert.equal(g.score,r.score);assert.deepEqual(g.details,r.details);}
 assert.deepEqual(c.success,wilson(rows.filter(r=>r.score===1).length,rows.length));assert.deepEqual(c.injection,wilson(rows.filter(r=>r.details?.injectionFollowed).length,rows.length));
 for(const k of s.kinds){const group=rows.filter(r=>tasks.find(t=>t.id===r.taskId).metadata.conflictKind===k.kind);assert.equal(group.length,k.n);assert.deepEqual(c.byKind[k.kind],wilson(group.filter(r=>r.score===1).length,group.length));}}
assert.deepEqual(s.pairedOracleRefusal,bootstrap(s.kinds.map(k=>tasks.flatMap((t,i)=>t.metadata.conflictKind===k.kind?[Number(runs.oracle.rows[i].score===1)-Number(runs.refuse.rows[i].score===1)]:[])),g=>mean(g.flat())));
for(const r of sim){assert.equal(r.rows.length,tasks.length);for(const row of r.rows){const g=await score(row.taskId,{answer:row.answer});assert.equal(g.score,row.score);assert.equal(Boolean(g.details?.injectionFollowed),row.injection);}assert.equal(r.success,mean(r.rows.map(x=>Number(x.score===1))));assert.equal(r.injection,mean(r.rows.map(x=>Number(x.injection))));}
for(const x of s.sweep){const cells=Object.fromEntries(['none','block'].map(l=>[l,sim.filter(r=>r.q===x.q&&r.layer===l)]));for(const l of ['none','block']){assert.equal(cells[l].length,x.agents);for(const metric of ['success','injection'])assert.deepEqual(x[l][metric],bootstrap([cells[l]],g=>mean(g[0].map(r=>r[metric]))));}for(const m of ['success','injection'])assert.deepEqual(x.difference[m],bootstrap([cells.none.map((r,i)=>cells.block[i][m]-r[m])],g=>mean(g[0])));}
for(const [f,h]of Object.entries(provenance.hashes))assert.equal(hash(await readFile(f,'utf8')),h);
const meta=JSON.parse(await readFile('paper/meta.json')),config=JSON.parse(await readFile('paper/config.json'));
assert.equal(meta.title,config.title);assert.equal(meta.authors[0].orcid,config.orcid);assert.equal(meta.license,'CC-BY-4.0');assert.ok(meta.abstract.length<=1920&&/^[\x00-\x7f]*$/.test(meta.abstract));
const tex=await readFile('paper/paper.tex','utf8');assert.ok(!tex.includes('—'));assert.ok(tex.includes(config.orcid));
const info=execFileSync('pdfinfo',['paper/'+meta.artifact_name],{encoding:'utf8'}),pages=Number(info.match(/Pages:\s+(\d+)/)[1]);assert.ok(pages>=8);
const pdftext=execFileSync('pdftotext',['paper/'+meta.artifact_name,'-'],{encoding:'utf8'});assert.ok(!pdftext.includes('[?]'));assert.ok(pdftext.includes('simulated'));assert.ok(pdftext.includes('Roadmap'));
const evidence={passed:true,pages,controls:s.controls.length,deterministicRuns:s.controls.length*2,simulatedRuns:sim.length,simulatedTaskResponses:sim.reduce((n,r)=>n+r.rows.length,0),rescored:true,repeatsMatch:true,provenanceMatch:true,pdfSha256:hash(await readFile('paper/'+meta.artifact_name))};
await writeFile('paper/data/verification.generated.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
