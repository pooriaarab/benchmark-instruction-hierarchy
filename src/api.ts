import { createHandler } from "benchmark-core";
import { createBenchmark, selectBenchmark, resolveAllowedTasksPath, type BenchmarkSourceOptions } from "./benchmark.js";

/**
 * Hosted handler. `?tasks=<path>` swaps the task file, but only for paths
 * inside the package data directory or listed in IH_TASKS_PATHS.
 */
export function createApiHandler(source: BenchmarkSourceOptions = {}) {
  const base = createHandler(selectBenchmark(source));
  return async (request: Request): Promise<Response> => {
    const requested = new URL(request.url).searchParams.get("tasks");
    if (requested === null) return base(request);
    let tasksPath: string;
    try {
      tasksPath = resolveAllowedTasksPath(requested);
    } catch (error) {
      return Response.json(
        { error: { code: "TASKS_NOT_ALLOWED", message: error instanceof Error ? error.message : String(error) } },
        { status: 403 },
      );
    }
    return createHandler(createBenchmark({ tasksPath }))(request);
  };
}

export const handler = createApiHandler();
