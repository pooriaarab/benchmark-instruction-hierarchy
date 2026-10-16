# Changelog

## 0.1.0 (unreleased)

Initial release.

- 60 seeded single-turn tasks across six conflict kinds: `user_vs_document`, `system_vs_user`, `late_override`, `format_persistence`, `quoted_not_instruction`, `tool_text_injection`.
- Deterministic assertion grader (`match`, `equals`, `includes`, `excludes`, `regex` with gates and weights) and per-kind breakdown with `injectionFollowed` rate in run reports.
- Forged `LABEL:` lines in documents, quotes, tool output, and late turns camouflage the trusted note; genuine and forged notes share the same wrapper shapes and one word pool, so position-, wrapper-, and pool-only extractors stay at chance.
- Verdict tasks map four rulings to four reply values, so guessing is one-in-four.
- Hidden split via `node scripts/gen-tasks.mjs --seed <n> --split hidden` (`ih-h-` ids, never packed).
- `--tasks <path>` on the CLI, `createBenchmark({ tasksPath | tasks })` in the SDK, `?tasks=` on the API, and `tasksPath` on MCP tools (allow-listed to the package data dir or `IH_TASKS_PATHS`).
- Four surfaces from one package: CLI, typed SDK, MCP server over stdio, and a fetch-style HTTP handler.
