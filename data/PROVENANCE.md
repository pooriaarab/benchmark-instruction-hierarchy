# Instruction Hierarchy provenance

This file is generated from the benchmark definition.

## Seeded instruction-hierarchy task generator

- Kind: `synthetic`
- URL: https://github.com/pooriaarab/benchmark-instruction-hierarchy/blob/main/scripts/gen-tasks.mjs
- Licence: `MIT`
- Retrieved: 2026-10-16T00:00:00.000Z
- How to get it: Run `node scripts/gen-tasks.mjs --seed 20261015` from the repository root. Hidden eval: `node scripts/gen-tasks.mjs --seed <n> --split hidden`.
- Contamination notes: Public split uses seed 20261015 (60 tasks). Hidden evaluation uses a different seed via --split hidden; keep hidden JSONL out of the npm package.
- Refresh: Edit docs/conflict-catalog.md or generator templates, bump seed, regenerate, and review the JSONL diff.

## Human-written conflict catalog

- Kind: `human-written`
- URL: https://github.com/pooriaarab/benchmark-instruction-hierarchy/blob/main/docs/conflict-catalog.md
- Licence: `MIT`
- Retrieved: 2026-10-16T00:00:00.000Z
- How to get it: Committed in docs/conflict-catalog.md.
- Contamination notes: Catalog labels are MIT; tasks are synthetic combinations, not copied from IHEval.
- Refresh: Extend the catalog and regenerate tasks.
