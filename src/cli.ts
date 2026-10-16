#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createCli, renderMarkdown, serve, type RunReport } from "benchmark-core";
import { selectBenchmark } from "./benchmark.js";
import { createApiHandler } from "./api.js";
import { startMcp } from "./mcp.js";
import { enrichReport, hierarchySummaryText } from "./report.js";

const BIN = "benchmark-instruction-hierarchy";

function asReport(value: string): RunReport | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed !== null && typeof parsed === "object" && Array.isArray(Reflect.get(parsed, "rows"))) {
      return parsed as RunReport;
    }
  } catch {
    // not JSON output
  }
  return undefined;
}

/** Pull `--tasks <path>` / `--tasks=<path>` out of argv before core's strict parser sees it. */
function splitTasksArg(argv: string[]): { tasksPath: string | undefined; rest: string[] } {
  const rest: string[] = [];
  let tasksPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tasks") {
      const value = argv[i + 1];
      if (value === undefined) throw new Error("--tasks needs a JSONL path.");
      tasksPath = value;
      i++;
    } else if (arg !== undefined && arg.startsWith("--tasks=")) {
      tasksPath = arg.slice("--tasks=".length);
      if (!tasksPath) throw new Error("--tasks needs a JSONL path.");
    } else if (arg !== undefined) {
      rest.push(arg);
    }
  }
  return { tasksPath, rest };
}

function serveCommand(rest: string[], tasksPath: string | undefined): number | Promise<number> {
  const args = rest.slice(1).filter((arg) => arg !== "--json");
  const parsed = parseArgs({ args, options: { host: { type: "string" } }, allowPositionals: true, strict: true });
  if (parsed.positionals.length > 1) {
    console.error("serve accepts at most one port.");
    return 1;
  }
  const port = Number(parsed.positionals[0] ?? process.env.PORT ?? 3000);
  const hostname = parsed.values.host ?? "127.0.0.1";
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error("serve port must be an integer from 0 to 65535.");
    return 1;
  }
  if (!hostname.trim()) {
    console.error("--host must not be empty.");
    return 1;
  }
  return serve(createApiHandler(tasksPath !== undefined ? { tasksPath } : {}), { port, hostname }).then(() => {
    console.log(
      rest.includes("--json")
        ? JSON.stringify({ listening: port, host: hostname })
        : `Listening on http://${hostname}:${port}`,
    );
    return 0;
  });
}

async function main(argv: string[]): Promise<number> {
  const { tasksPath, rest } = splitTasksArg(argv);
  const command = rest[0];
  if (command === "serve") return serveCommand(rest, tasksPath);
  if (command === "mcp") {
    await startMcp(tasksPath !== undefined ? { tasksPath } : {});
    return 0;
  }
  const bench = selectBenchmark(tasksPath !== undefined ? { tasksPath } : {});
  const cli = createCli(bench, { bin: BIN });
  if (command !== "run" && command !== "score") return cli.main(rest);
  const wantsJson = rest.includes("--json");
  const captured: string[] = [];
  const original = console.log;
  console.log = (...parts: unknown[]) => captured.push(parts.map(String).join(" "));
  let code: number;
  try {
    code = await cli.main(wantsJson ? rest : [...rest, "--json"]);
  } finally {
    console.log = original;
  }
  const output = captured.join("\n");
  const report = asReport(output);
  if (!report) {
    if (output) console.log(output);
    return code;
  }
  const enriched = await enrichReport(bench, report);
  console.log(
    wantsJson
      ? JSON.stringify(enriched)
      : `${renderMarkdown(enriched).trimEnd()}\n\n${hierarchySummaryText(enriched.instructionHierarchy)}`,
  );
  return code;
}

process.exitCode = await main(process.argv.slice(2));
