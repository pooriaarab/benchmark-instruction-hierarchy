import { mkdir, writeFile } from "node:fs/promises";
import { generateTasks } from "./task-lib.mjs";

const args = process.argv.slice(2);
let seed = 20261015;
let split = "public";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--seed" && args[i + 1]) seed = Number(args[++i]);
  if (args[i] === "--split" && args[i + 1]) split = args[++i];
}

const tasks = generateTasks(seed, split);
await mkdir("data", { recursive: true });
const out = split === "hidden" ? "data/tasks-hidden.jsonl" : "data/tasks.jsonl";
await writeFile(out, `${tasks.map((t) => JSON.stringify(t)).join("\n")}\n`);
console.log(`generated ${tasks.length} tasks (seed=${seed}, split=${split}) -> ${out}`);
