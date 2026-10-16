import type { Benchmark, JsonValue, RunReport, Task } from "benchmark-core";

export interface ConflictKindSummary {
  tasks: number;
  meanScore: number;
  injectionFollowed: number;
}

export interface HierarchySummary {
  byConflictKind: Record<string, ConflictKindSummary>;
  injectionOpportunities: number;
  injectionFollowedRate: number;
}

export type EnrichedRow = RunReport["rows"][number] & { details?: JsonValue };
export type EnrichedReport = Omit<RunReport, "rows"> & { rows: EnrichedRow[]; instructionHierarchy: HierarchySummary };

function injectedOutputCount(task: Task): number {
  const raw = task.metadata?.injectedOutputs;
  return Array.isArray(raw) ? raw.filter((v) => typeof v === "string" && v.length > 0).length : 0;
}

export async function enrichReport<T extends Task>(benchmark: Benchmark<T>, report: RunReport): Promise<EnrichedReport> {
  const byKind = new Map<string, { tasks: number; score: number; followed: number }>();
  let opportunities = 0;
  let followed = 0;
  const rows: EnrichedRow[] = [];
  for (const row of report.rows) {
    const task = await benchmark.getTask(row.taskId);
    let details: JsonValue | undefined;
    if (task && row.submission) {
      const grade = await benchmark.score(task, row.submission);
      details = grade.details;
      const record = (details ?? {}) as Record<string, JsonValue>;
      const kind = typeof record.conflictKind === "string" ? record.conflictKind : "unknown";
      const entry = byKind.get(kind) ?? { tasks: 0, score: 0, followed: 0 };
      entry.tasks += 1;
      entry.score += row.score;
      if (injectedOutputCount(task) > 0) {
        opportunities += 1;
        if (record.injectionFollowed === true) {
          entry.followed += 1;
          followed += 1;
        }
      }
      byKind.set(kind, entry);
    }
    rows.push(details === undefined ? row : { ...row, details });
  }
  return {
    ...report,
    rows,
    instructionHierarchy: {
      byConflictKind: Object.fromEntries(
        [...byKind.entries()].map(([kind, v]) => [
          kind,
          { tasks: v.tasks, meanScore: v.tasks ? v.score / v.tasks : 0, injectionFollowed: v.followed },
        ]),
      ),
      injectionOpportunities: opportunities,
      injectionFollowedRate: opportunities ? followed / opportunities : 0,
    },
  };
}

export function hierarchySummaryText(summary: HierarchySummary): string {
  const percent = (v: number) => `${(v * 100).toFixed(1)}%`;
  const lines = [
    "### Conflict-kind breakdown",
    "",
    "| Kind | Tasks | Mean | Injection followed |",
    "| --- | ---: | ---: | ---: |",
    ...Object.entries(summary.byConflictKind).map(
      ([kind, v]) => `| ${kind} | ${v.tasks} | ${percent(v.meanScore)} | ${v.injectionFollowed} |`,
    ),
    "",
    `- injectionFollowed rate: ${percent(summary.injectionFollowedRate)} across ${summary.injectionOpportunities} tasks carrying an injected demand`,
  ];
  return lines.join("\n");
}
