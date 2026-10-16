import { createHandler, type JsonValue } from "benchmark-core";
import { createBenchmark, selectBenchmark, resolveAllowedTasksPath, type BenchmarkSourceOptions } from "./benchmark.js";
import { scoreBreakdown } from "./mcp.js";

function forbidden(message: string): Response {
  return Response.json({ error: { code: "TASKS_NOT_ALLOWED", message } }, { status: 403 });
}

/**
 * Hosted handler. `?tasks=<path>` swaps the task file, but only for paths
 * inside the package data directory or listed in IH_TASKS_PATHS.
 * POST /v1/score responses carry the grader breakdown on top of details.
 */
export function createApiHandler(source: BenchmarkSourceOptions = {}) {
  const base = createHandler(selectBenchmark(source));
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const requested = url.searchParams.get("tasks");
    let inner = base;
    if (requested !== null) {
      try {
        inner = createHandler(createBenchmark({ tasksPath: resolveAllowedTasksPath(requested) }));
      } catch (error) {
        return forbidden(error instanceof Error ? error.message : String(error));
      }
    }
    const response = await inner(request);
    if (request.method !== "POST" || url.pathname !== "/v1/score" || !response.ok) return response;
    const payload = (await response.json()) as Record<string, JsonValue>;
    const breakdown = scoreBreakdown(payload.details);
    return Response.json(breakdown ? { ...payload, breakdown } : payload, { status: response.status });
  };
}

export const handler = createApiHandler();
