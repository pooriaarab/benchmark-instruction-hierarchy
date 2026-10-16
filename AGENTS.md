# Working on benchmark-instruction-hierarchy

## Commands

- Install with `npm ci`.
- Run the full gate with `npm run ci:local`.
- Generate tasks with `npm run generate:tasks`.
- Generate provenance after building with `npm run provenance`.
- Add no unit tests. Extend `scripts/e2e.mjs` through a public surface.

## Contracts

Keep tasks, deterministic grading, and provenance in sync. All v0.1.0 tasks are single-turn; assertions live in `metadata.assertions`. Document failure modes in `docs/grading.md` before changing the grader.

Regenerate tasks with `node scripts/gen-tasks.mjs --seed 20261015`. Hidden split: `--split hidden` (output is gitignored).

Never read provider keys from repository files. OpenRouter uses `OPENROUTER_API_KEY`. OpenAI-compatible providers use `OPENAI_BASE_URL` and `OPENAI_API_KEY`.

Open an issue before a branch. Use `bihr-<issue>-<slug>` and `[bihr-<issue>] Imperative subject`. Keep pull requests below 500 counted lines. Do not merge your own pull request or push `release`.
