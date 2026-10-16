import { run as runBenchmark, type ModelAdapter, type RunOptions, type Trace } from "benchmark-core";
import { benchmark, createBenchmark, badAnswerForE2E, honestVariantsForE2E, extractorChanceForE2E, type BenchmarkSourceOptions } from "./benchmark.js";
import { enrichReport, hierarchySummaryText } from "./report.js";
export { benchmark, createBenchmark, badAnswerForE2E, honestVariantsForE2E, extractorChanceForE2E, enrichReport, hierarchySummaryText };
export type { BenchmarkSourceOptions };
export type { EnrichedReport, HierarchySummary, ConflictKindSummary } from "./report.js";
export const run = async (adapter: ModelAdapter, options?: RunOptions & BenchmarkSourceOptions) => {
  const { tasksPath, tasks, ...runOptions } = options ?? {};
  const bench =
    tasksPath !== undefined ? createBenchmark({ tasksPath }) : tasks !== undefined ? createBenchmark({ tasks }) : benchmark;
  return enrichReport(bench, await runBenchmark(bench, adapter, runOptions));
};
export async function score(taskId: string, submission: Trace, options?: BenchmarkSourceOptions) {
  const bench =
    options?.tasksPath !== undefined
      ? createBenchmark({ tasksPath: options.tasksPath })
      : options?.tasks !== undefined
        ? createBenchmark({ tasks: options.tasks })
        : benchmark;
  const task = await bench.getTask(taskId); if (!task) throw new Error(`Task not found: ${taskId}`);
  return bench.score(task, submission);
}
