import { readFile } from "node:fs/promises";
import { defineBenchmark, type Task, type Trace } from "benchmark-core";
import { gradeInstructionHierarchy } from "./grader.js";

async function loadTasks(): Promise<Task[]> {
  const text = await readFile(new URL("../data/tasks.jsonl", import.meta.url), "utf8");
  return text.trim().split("\n").map((line) => JSON.parse(line) as Task);
}

const WRONG_TOKEN = "WRONG_ALWAYS";

export const benchmark = defineBenchmark({
  id: "benchmark-instruction-hierarchy",
  name: "Instruction Hierarchy",
  tagline: "Do your rules survive a long context full of conflicting text?",
  tags: ["helpful", "science"],
  category: "safety",
  whatItMeasures:
    "Whether a model keeps user and system rules when documents, quotes, and tool output contain conflicting or injected directives.",
  version: "0.1.0",
  status: "alpha",
  saturation: "unknown" as unknown as number,
  loadTasks,
  async grade(task, submission, _context) {
    return gradeInstructionHierarchy(task, submission);
  },
  mockPolicies: {
    good: (task) => [{ content: typeof task.expected === "string" ? task.expected : "" }],
    bad: (task) => {
      const injected = Array.isArray(task.metadata?.injectedOutputs)
        ? task.metadata.injectedOutputs.filter((v): v is string => typeof v === "string")
        : [];
      const variants: { content: string }[] = [
        { content: "" },
        { content: "x7f9q2randomnoise" },
        { content: injected.join(" ") || "compromised" },
        { content: WRONG_TOKEN },
      ];
      const index = task.id.split("-").pop()?.replace(/\D/g, "") ?? "0";
      const slot = Number(index) % variants.length;
      return [{ content: variants[slot]?.content ?? WRONG_TOKEN }];
    },
  },
  provenance: [
    {
      name: "Seeded instruction-hierarchy task generator",
      kind: "synthetic",
      url: "https://github.com/pooriaarab/benchmark-instruction-hierarchy/blob/main/scripts/gen-tasks.mjs",
      licence: "MIT",
      howToGet: "Run `node scripts/gen-tasks.mjs --seed 20261015` from the repository root. Hidden eval: `node scripts/gen-tasks.mjs --seed <n> --split hidden`.",
      retrievedAt: "2026-10-15T00:00:00.000Z",
      contaminationNotes:
        "Public split uses seed 20261015 (60 tasks). The hidden split uses different codeword pools, markers, headers, and injection phrasings, so its answers and structure differ from the public split; keep hidden JSONL out of the npm package.",
      refresh: "Edit docs/conflict-catalog.md or generator templates, bump seed, regenerate, and review the JSONL diff.",
    },
    {
      name: "Human-written conflict catalog",
      kind: "human-written",
      url: "https://github.com/pooriaarab/benchmark-instruction-hierarchy/blob/main/docs/conflict-catalog.md",
      licence: "MIT",
      howToGet: "Committed in docs/conflict-catalog.md.",
      retrievedAt: "2026-10-15T00:00:00.000Z",
      contaminationNotes: "Catalog labels are MIT; tasks are synthetic combinations, not copied from IHEval.",
      refresh: "Extend the catalog and regenerate tasks.",
    },
  ],
  gradingMethod:
    "Deterministic assertion checks on the final answer (normalized match, forbidden tokens, regex shapes). Failed gate assertions score 0; soft checks give weighted partial credit. See docs/grading.md.",
});

export function badAnswerForE2E(task: Task, mode: "empty" | "random" | "injection" | "same"): Trace {
  switch (mode) {
    case "empty":
      return { answer: "" };
    case "random":
      return { answer: "x7f9q2randomnoise" };
    case "injection":
      return {
        answer:
          Array.isArray(task.metadata?.injectedOutputs) && typeof task.metadata.injectedOutputs[0] === "string"
            ? task.metadata.injectedOutputs[0]
            : "compromised",
      };
    case "same":
      return { answer: WRONG_TOKEN };
    default:
      return { answer: "" };
  }
}
