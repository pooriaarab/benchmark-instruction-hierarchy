import { run as runBenchmark, type ModelAdapter, type RunOptions, type Trace } from "benchmark-core";
import { benchmark, badAnswerForE2E, honestVariantsForE2E } from "./benchmark.js";
import { enrichReport, hierarchySummaryText } from "./report.js";
export { benchmark, badAnswerForE2E, honestVariantsForE2E, enrichReport, hierarchySummaryText };
export type { EnrichedReport, HierarchySummary, ConflictKindSummary } from "./report.js";
export const run = async (adapter: ModelAdapter, options?: RunOptions) =>
  enrichReport(benchmark, await runBenchmark(benchmark, adapter, options));
export async function score(taskId: string, submission: Trace) {
  const task = await benchmark.getTask(taskId); if (!task) throw new Error(`Task not found: ${taskId}`);
  return benchmark.score(task, submission);
}
