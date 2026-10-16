# benchmark-instruction-hierarchy

[![npm](https://img.shields.io/npm/v/benchmark-instruction-hierarchy)](https://www.npmjs.com/package/benchmark-instruction-hierarchy) [![downloads](https://img.shields.io/npm/dm/benchmark-instruction-hierarchy)](https://www.npmjs.com/package/benchmark-instruction-hierarchy) [![license](https://img.shields.io/npm/l/benchmark-instruction-hierarchy)](./LICENSE) [![types](https://img.shields.io/badge/TypeScript-types-3178c6)](#sdk)

[AI Benchmark Index](https://aibenchmarkindex.com/benchmarks/benchmark-instruction-hierarchy) · [npm](https://www.npmjs.com/package/benchmark-instruction-hierarchy) · [API](#http-api) · [MCP](#model-context-protocol)

Instruction Hierarchy measures whether a model keeps **user and system rules** when long context, documents, quotes, and fake tool output push conflicting directives. Each task is a single turn with machine-checkable assertions (no LLM judge).

```bash
npx benchmark-instruction-hierarchy run --model offline --provider mock
```

Sample output (mock provider, 60 public tasks):

```text
# Instruction Hierarchy

- Model: `mock:1`
- Score: **50.0%**
- 95% CI: 38.3%–61.7%
- Tasks: 60
```

No public leaderboard yet (OpenRouter runs need your key). The mock run above is reproducible offline.

## Install

Node.js 20 or newer.

```bash
npm install benchmark-instruction-hierarchy
```

## Run your first benchmark

```bash
npx benchmark-instruction-hierarchy run --model offline --provider mock
```

## Real models (OpenRouter)

```bash
export OPENROUTER_API_KEY=your_key
npx benchmark-instruction-hierarchy run --model anthropic/claude-sonnet-4 --provider openrouter
```

Use any OpenRouter model id. Scores are the mean of per-task assertion pass rates (0–1).

## How it works

```text
tasks.jsonl -> model adapter -> assertion grader -> report
                         |-> CLI / SDK / MCP / HTTP API
```

Conflict kinds include user rule vs document text, system vs user, late override attempts, format persistence, quoted-but-not-instruction lines, and tool-output injection. See [docs/conflict-catalog.md](./docs/conflict-catalog.md) and [docs/grading.md](./docs/grading.md).

## Data and provenance

- **Public tasks:** `data/tasks.jsonl` (60 tasks), seed `20261015`, from `node scripts/gen-tasks.mjs --seed 20261015`.
- **Hidden eval split:** `node scripts/gen-tasks.mjs --seed <n> --split hidden` (not shipped on npm; keep out of the public repo if you run private evals).
- **Alternate task files:** `--tasks <path>` on the CLI, `createBenchmark({ tasksPath })` in the SDK. Hosted surfaces accept `?tasks=` or an MCP `tasksPath` only for paths inside the package or listed in `IH_TASKS_PATHS`.
- **Catalog:** human-written patterns in `docs/conflict-catalog.md` (MIT).

Details: [data/PROVENANCE.md](./data/PROVENANCE.md).

## Prior art

[IHEval](https://github.com/allenai/iheval) studies instruction-following under hierarchy conflicts. This benchmark differs by using **deterministic assertions only** (normalized match, includes/excludes, anchored refusal check), synthetic seeded tasks, and a small conflict catalog we maintain (no copied benchmark text).

## SDK

```ts
import { benchmark, run, score } from "benchmark-instruction-hierarchy";
import { mockAdapter } from "benchmark-core";

const report = await run(mockAdapter());
console.log(report.mean);
```

## MCP

```bash
npx benchmark-instruction-hierarchy mcp
```

Tools: `list_tasks`, `get_task`, `score_answer`, `run_benchmark`, `get_provenance`.

## HTTP API

Import `handler` from `benchmark-instruction-hierarchy/api`, or:

```bash
npx benchmark-instruction-hierarchy serve 8787
```

Routes: `GET /health`, `GET /v1/tasks`, `GET /v1/tasks/:id`, `POST /v1/score`, `GET /v1/provenance`, `GET /v1/index-entry`.

## Limits

- Single-turn answers only; no multi-step tool episodes yet.
- The adapter sends the whole prompt as one user message, so `## System` and `## User rules` are text sections, not real chat roles. Scores still measure which directive the model treats as binding, but role-channel attacks are out of scope for v0.1.0.
- Grader checks final text, not chain-of-thought.
- English prompts only in v0.1.0.
- Mock provider alternates good/bad rows for smoke tests; it is not a model.

## FAQ

### What does it measure?

Whether the model follows the right rule layer when untrusted text disagrees.

### Can it run offline?

Yes, with `--provider mock`.

### License

MIT. See [LICENSE](./LICENSE).

## Cite

Please cite this package with its Zenodo DOI. The DOI below names all versions. GitHub also shows a "Cite this repository" box from `CITATION.cff`.

```bibtex
@software{arab2026benchmarkinstructionhierarchy,
  author  = {Arab, Pooria},
  title   = {benchmark-instruction-hierarchy},
  year    = {2026},
  version = {0.1.0},
  doi     = {10.5281/zenodo.23422396},
  url     = {https://aibenchmarkindex.com/benchmarks/benchmark-instruction-hierarchy}
}
```
