#!/usr/bin/env node
import { createCli, renderMarkdown, type RunReport } from "benchmark-core";
import { benchmark } from "./benchmark.js";
import { enrichReport, hierarchySummaryText } from "./report.js";

const cli = createCli(benchmark, { bin: "benchmark-instruction-hierarchy" });

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

async function main(argv: string[]): Promise<number> {
  const command = argv[0];
  if (command !== "run" && command !== "score") return cli.main(argv);
  const wantsJson = argv.includes("--json");
  const captured: string[] = [];
  const original = console.log;
  console.log = (...parts: unknown[]) => captured.push(parts.map(String).join(" "));
  let code: number;
  try {
    code = await cli.main(wantsJson ? argv : [...argv, "--json"]);
  } finally {
    console.log = original;
  }
  const output = captured.join("\n");
  const report = asReport(output);
  if (!report) {
    if (output) console.log(output);
    return code;
  }
  const enriched = await enrichReport(benchmark, report);
  console.log(
    wantsJson
      ? JSON.stringify(enriched)
      : `${renderMarkdown(enriched).trimEnd()}\n\n${hierarchySummaryText(enriched.instructionHierarchy)}`,
  );
  return code;
}

process.exitCode = await main(process.argv.slice(2));
