# self-fixing-harness-playground

## Goal

A local playground that recreates the "self-fixing harness" idea from https://x.com/undefinedKi/status/2123526647152353309: a tiny 4-file agent harness (memory, turn loop, tools, stop-checks) that a second "fixer" model improves by patching ONE file at a time from failed-run logs, keeping a patch only if held-out score doesn't drop and tokens stay under budget. It compares this against a "rewrite everything at once" mode.

## Verify first

Read the X post and its thread, and look for the underlying writeup/paper/repo by the Google engineers. Confirm the 4-file split, the accept rule (held-out score and token budget), and the four fixes that stuck (compress old turns into notes, truncate long terminal output, no "done" without a code change, stop only after compile + tests pass). Follow the source where it differs and note differences in the README. If no source beyond the post can be found, build anyway and label the method "as described on X, unverified".

## Single-user MVP

**In:**
- Task suite: about 20 small "fix the function" TS tasks (buggy function + unit tests), split into train and held-out halves. The fixer only sees train failure logs; held-out gives only scores.
- Harness: exactly 4 editable files under `harness/` (memory.ts, loop.ts, tools.ts, stop.ts) starting deliberately minimal (~150 lines total). The agent runs tasks through this harness; tests run in a Bun subprocess with a timeout.
- Optimizer loop: N rounds (default 10). Each round: collect train failure logs, fixer proposes a patch to ONE harness file, evaluate on held-out, accept if score >= previous and tokens <= budget, else reject and revert. Keep a JSON history of every round (file, diff, score before/after, tokens before/after, accepted/rejected, reason).
- Rewrite-all mode: same budget and seed, but the fixer rewrites all 4 files each round. Shown side by side for score and tokens.
- UI (one page): controls (rounds, seed, token budget, mode, model mode), a round timeline with the diff for each round and a kept/rejected pill, a line chart of held-out pass rate per round for both modes, a token bar chart, and a final scoreboard. A "current harness" viewer shows the 4 files as they stand.
- Model modes: **Mock (default, no keys)**: deterministic seeded simulator for the agent and fixer so the full loop runs offline, labeled "Mock model (simulated)" everywhere results show. **Real**: optional API key in `.env` (ship `.env.example`, never commit keys); if the build VM has a working key, record one real run and prefer it in the screenshot/video, labeled "Real model".
- Progress streamed to the UI via SSE from a thin Bun server.
- README: what the idea is (post link plus any source found), how the demo maps to it, how to run, mock vs real.

**Out:** auth/multiple users; large benchmarks; running generated code without a timeout; anything outside this folder except the tracking update.

## Tasks (vertical slices)
1. Scaffold with `bunx create-vite` (react-ts, skip install), write bunfig.toml, `bun install`, init shadcn/ui; shadcn charts (Recharts); a diff viewer component.
2. Task suite + sandboxed test runner (Bun subprocess, timeout) + scoring and token accounting.
3. The 4-file harness + agent runner, mock model first.
4. Optimizer loop (one-file patches, accept/reject, revert) + rewrite-all mode + history JSON.
5. Bun server API + SSE; UI: controls, timeline with diffs and pills, charts, scoreboard, harness viewer.
6. Real-model adapter behind the env key.
7. Validation: capture at least one screenshot AND one video (start a run, watch rounds get kept/rejected, chart climb, compare to rewrite-all) and attach both to the PR.

## Stack
- Bun (runtime, scripts, test subprocesses)
- Vite + React + shadcn/ui + Recharts
- Thin Bun HTTP server for runs and SSE

## Testing and hooks
- One focused test: with the mock model and a fixed seed the optimizer is deterministic, each one-file round changes only one harness file, rejected patches are fully reverted, and the fixer never sees held-out logs.
- No git hooks.

## Deferred
- Merging with the self-improvement-memory playground into one "self-improvement lab"; repeated runs with variance; cost tracking; hosted preview.
