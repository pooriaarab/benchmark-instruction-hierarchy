import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { MAX_TOOL_LOG_ENTRIES, openrouterAdapter, run as runAll, type Benchmark, type JsonValue, type Task, type Trace } from "benchmark-core";
import { createBenchmark, resolveAllowedTasksPath, selectBenchmark, type BenchmarkSourceOptions } from "./benchmark.js";
import { enrichReport } from "./report.js";

const TASKS_PATH_ARG = {
  type: "string",
  description: "Optional JSONL task file; restricted to the package data dir or the IH_TASKS_PATHS allow-list.",
} as const;

const TOOLS = [
  {
    name: "list_tasks",
    description: "List benchmark task ids and prompts.",
    inputSchema: { type: "object", properties: { tasksPath: TASKS_PATH_ARG }, additionalProperties: false },
  },
  {
    name: "get_task",
    description: "Get one benchmark task.",
    inputSchema: {
      type: "object",
      properties: { taskId: { type: "string" }, tasksPath: TASKS_PATH_ARG },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    name: "score_answer",
    description: "Score a trace with the deterministic benchmark grader.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        submission: { type: "object" },
        seed: { type: "number" },
        tasksPath: TASKS_PATH_ARG,
      },
      required: ["taskId", "submission"],
      additionalProperties: false,
    },
  },
  {
    name: "run_benchmark",
    description: "Run every task through an OpenRouter model.",
    inputSchema: {
      type: "object",
      properties: { model: { type: "string" }, tasksPath: TASKS_PATH_ARG },
      required: ["model"],
      additionalProperties: false,
    },
  },
  {
    name: "get_provenance",
    description: "Get benchmark data provenance.",
    inputSchema: { type: "object", properties: { tasksPath: TASKS_PATH_ARG }, additionalProperties: false },
  },
];

const content = (value: unknown, isError = false) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
  ...(isError ? { isError: true } : {}),
});

function pickBenchmark(base: Benchmark<Task>, input: Record<string, unknown>): Benchmark<Task> {
  if (input.tasksPath === undefined) return base;
  if (typeof input.tasksPath !== "string") throw new Error("tasksPath must be a string.");
  return createBenchmark({ tasksPath: resolveAllowedTasksPath(input.tasksPath) });
}

/** Hoist the grader details callers ask about most into a flat breakdown field. */
export function scoreBreakdown(details: JsonValue | undefined): Record<string, JsonValue> | undefined {
  if (details === null || typeof details !== "object" || Array.isArray(details)) return undefined;
  const record = details as Record<string, JsonValue>;
  const breakdown: Record<string, JsonValue> = {};
  for (const key of ["conflictKind", "injectionFollowed", "gateFailed"] as const) {
    if (record[key] !== undefined) breakdown[key] = record[key];
  }
  return Object.keys(breakdown).length > 0 ? breakdown : undefined;
}

export function createMcpServer(options: BenchmarkSourceOptions = {}): Server {
  const base = selectBenchmark(options);
  const server = new Server(
    { name: base.definition.id, version: base.definition.version },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const raw = request.params.arguments;
      const input = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
      const bench = pickBenchmark(base, input);
      if (request.params.name === "list_tasks") return content({ tasks: await bench.listTasks() });
      if (request.params.name === "get_task") {
        if (typeof input.taskId !== "string") return content({ error: "taskId is required." }, true);
        const task = await bench.getTask(input.taskId);
        return task ? content({ task }) : content({ error: "Task not found." }, true);
      }
      if (request.params.name === "score_answer") {
        if (typeof input.taskId !== "string" || !input.submission || typeof input.submission !== "object" || Array.isArray(input.submission)) {
          return content({ error: "taskId and submission are required." }, true);
        }
        const submittedLog = Reflect.get(input.submission, "toolLog");
        if (Array.isArray(submittedLog) && submittedLog.length > MAX_TOOL_LOG_ENTRIES) {
          return content({ error: `toolLog may not exceed ${MAX_TOOL_LOG_ENTRIES} entries.` }, true);
        }
        const task = await bench.getTask(input.taskId);
        if (!task) return content({ error: "Task not found." }, true);
        const result = await bench.score(task, input.submission as Trace, typeof input.seed === "number" ? { seed: input.seed } : {});
        const breakdown = scoreBreakdown(result.details);
        return content({ taskId: task.id, ...result, ...(breakdown ? { breakdown } : {}) });
      }
      if (request.params.name === "run_benchmark") {
        if (typeof input.model !== "string") return content({ error: "model is required." }, true);
        if (!process.env.OPENROUTER_API_KEY) return content({ error: "OPENROUTER_API_KEY is required to run a benchmark." }, true);
        const report = await runAll(bench, openrouterAdapter({ model: input.model }));
        return content(await enrichReport(bench, report));
      }
      if (request.params.name === "get_provenance") return content({ provenance: bench.definition.provenance });
      return content({ error: `Unknown tool: ${request.params.name}` }, true);
    } catch (caught) {
      return content({ error: caught instanceof Error ? caught.message : "Unknown error." }, true);
    }
  });
  return server;
}

export async function startMcp(options: BenchmarkSourceOptions = {}): Promise<void> {
  await createMcpServer(options).connect(new StdioServerTransport());
}
