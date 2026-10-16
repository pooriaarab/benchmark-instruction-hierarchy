import assert from "node:assert/strict";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as createNetServer } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { benchmark, badAnswerForE2E, honestVariantsForE2E } from "../dist/index.js";

const execFile = promisify(execFileCallback);

await execFile("npm", ["run", "build"]);
const tasks = await benchmark.listTasks();
assert.equal(tasks.length, 60);

const cli = await execFile(process.execPath, ["dist/cli.js", "run", "--model", "offline", "--provider", "mock", "--json"], {
  maxBuffer: 10_000_000,
});
const report = JSON.parse(cli.stdout);
assert.equal(report.rows.length, 60);
const goodScores = report.rows.filter((row) => row.score >= 0.99);
const badScores = report.rows.filter((row) => row.score < 0.75);
assert.ok(goodScores.length >= 20, "mock should score well on some tasks");
assert.ok(badScores.length >= 20, "mock should score poorly on some tasks");

const summary = report.instructionHierarchy;
assert.ok(summary && typeof summary === "object", "run report should carry an instructionHierarchy summary");
assert.deepEqual(
  Object.keys(summary.byConflictKind).sort(),
  ["format_persistence", "late_override", "quoted_not_instruction", "system_vs_user", "tool_text_injection", "user_vs_document"],
);
assert.ok(typeof summary.injectionFollowedRate === "number");
assert.ok(summary.injectionOpportunities > 0, "tasks carrying an injected demand should be counted");
assert.ok(report.rows.some((row) => row.details && row.details.assertionResults), "rows should carry grader details");

const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const BAD_MODES = ["empty", "random", "injection", "same", "refuse", "format", "token", "userline"];
const badMeans = {};
for (const mode of BAD_MODES) {
  const graded = await Promise.all(tasks.map(async (task) => benchmark.score(task, badAnswerForE2E(task, mode))));
  badMeans[mode] = mean(graded.map((result) => result.score));
  assert.ok(badMeans[mode] < 0.25, `bad answer mode ${mode} should score low, got ${badMeans[mode].toFixed(3)}`);
  if (mode === "injection") {
    const followed = graded.filter(
      (result) => result.details && typeof result.details === "object" && result.details.injectionFollowed === true,
    ).length;
    assert.ok(followed > 0, "echo-the-injection answers should set injectionFollowed");
  }
}

for (const task of tasks) {
  for (const variant of honestVariantsForE2E(task)) {
    const graded = await benchmark.score(task, { answer: variant });
    assert.ok(graded.score >= 0.99, `honest variant ${JSON.stringify(variant)} for ${task.id} should score high, got ${graded.score}`);
  }
}

await execFile(process.execPath, ["scripts/gen-tasks.mjs", "--seed", "7", "--split", "hidden"]);
const hidden = (await readFile("data/tasks-hidden.jsonl", "utf8")).trim().split("\n").map((line) => JSON.parse(line));
assert.equal(hidden.length, 60);
const identicalExpected = tasks.filter((task, index) => task.expected === hidden[index].expected).length;
assert.ok(identicalExpected <= 5, `hidden split should differ in answers, ${identicalExpected} identical`);
for (const task of hidden) {
  for (const output of task.metadata.injectedOutputs ?? []) {
    assert.ok(task.prompt.includes(output), `${task.id} injected output missing from prompt`);
  }
}
const pack = await execFile("npm", ["pack", "--dry-run", "--json"], { maxBuffer: 10_000_000 });
const packFiles = JSON.parse(pack.stdout)[0].files.map((file) => file.path);
assert.ok(!packFiles.some((path) => path.includes("tasks-hidden")), "npm tarball must not ship the hidden split");
assert.ok(packFiles.some((path) => path === "data/tasks.jsonl"), "npm tarball should ship the public tasks");

const probe = createNetServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const address = probe.address();
assert.ok(address && typeof address === "object");
await new Promise((resolve) => probe.close(resolve));
const server = spawn(process.execPath, ["dist/cli.js", "serve", String(address.port)], { stdio: ["ignore", "pipe", "pipe"] });
const base = `http://127.0.0.1:${address.port}`;
const routes = {};
async function get(path) {
  const response = await fetch(`${base}${path}`);
  routes[`GET ${path}`] = response.status;
  return { response, value: await response.json() };
}
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await get("/health");
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  const health = await get("/health");
  assert.equal(health.response.status, 200);
  const listed = await get("/v1/tasks");
  assert.equal(listed.value.tasks.length, 60);
  const shown = await get("/v1/tasks/ih-001");
  assert.equal(shown.value.task.id, "ih-001");
  const score = await fetch(`${base}/v1/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ taskId: "ih-001", submission: report.rows[0].submission }),
  });
  routes["POST /v1/score"] = score.status;
  assert.equal(score.status, 200);
  const scored = await score.json();
  assert.ok(scored.details && typeof scored.details.conflictKind === "string", "score route should return grader details");
  assert.equal((await get("/v1/provenance")).response.status, 200);
  const entry = (await get("/v1/index-entry")).value;
  assert.equal(entry.task_count, 60);
  assert.equal(entry.saturation, "unknown");
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
}

const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/cli.js", "mcp"], cwd: process.cwd(), stderr: "pipe" });
const client = new Client({ name: "benchmark-instruction-hierarchy-e2e", version: "0.1.0" });
await client.connect(transport);
let toolNames;
try {
  const available = await client.listTools();
  toolNames = available.tools.map((tool) => tool.name).sort();
  assert.deepEqual(toolNames, ["get_provenance", "get_task", "list_tasks", "run_benchmark", "score_answer"]);
  const calls = [
    ["list_tasks", {}],
    ["get_task", { taskId: "ih-001" }],
    ["score_answer", { taskId: "ih-001", submission: report.rows[0].submission }],
    ["get_provenance", {}],
    ["run_benchmark", { model: "offline" }],
  ];
  for (const [name, args] of calls) {
    const result = await client.callTool({ name, arguments: args });
    if (name === "run_benchmark") assert.equal(result.isError, true);
    else assert.notEqual(result.isError, true);
  }
} finally {
  await client.close();
}

const artifact = {
  task_count: report.rows.length,
  scores: report.rows.map((row) => row.score),
  bad_answer_means: badMeans,
  instruction_hierarchy: summary,
  route_status_codes: routes,
  tool_names: toolNames,
};
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/e2e-report.json", `${JSON.stringify(artifact, null, 2)}\n`);
assert.match(await readFile("data/PROVENANCE.md", "utf8"), /instruction-hierarchy task generator/);
console.log(`e2e: ${artifact.task_count} tasks, ${Object.keys(routes).length} routes, ${toolNames.length} tools -> all surfaces passed, ok`);
