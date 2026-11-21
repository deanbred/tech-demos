# self-improvement-memory-playground

## Goal

A local playground that recreates the core loop of the Self-Improvement Memory (SIM) paper (arXiv 2611.18856): an editor model improves an agent's prompt and tools over rounds, keeping a JSON ledger of every edit, and the app compares held-out scores with the ledger on vs off.

## Verify first

Read the paper (https://arxiv.org/abs/2611.18856). Confirm the ledger fields (problem, change, predicted passes, observed passes), the round/candidate structure (reported: 10 rounds, 5 candidates per round), and the "retry an old idea only with new evidence" rule. Follow the paper where it differs and note differences in the README. Cite the paper's reported gain (reported +2.36 average) only as the paper's claim, never as this demo's result. If the arXiv id doesn't resolve, search for the paper by title; if it can't be found, build anyway and label the method "as described on X, unverified".

## Single-user MVP

**In:**
- Task suite: about 20 small coding tasks (pure TS functions) with unit tests, split into a train half and a held-out half. The editor only ever sees train results; held-out gives only the final score.
- Agent: a "solver" that, given its current system prompt + tool config, produces a solution per task; solutions are run against the tests in a sandboxed Bun subprocess with a timeout.
- Editor loop: "Run rounds" runs N rounds (default 10). Each round the editor proposes K candidate edits (default 5) to the prompt/tools; each candidate is evaluated on train; the best is kept and written to `sim-ledger.json` with problem, change, predicted passes, observed passes, round, and accepted/rejected.
- Two conditions: SIM (editor sees the full ledger each round) vs no-ledger baseline (editor sees only the latest scores). Same seed and budget.
- UI (one page): controls (rounds, candidates, seed, model mode), a live ledger viewer (table/timeline, predicted vs observed diff highlighted), a held-out score line chart for both conditions per round, and a final scoreboard.
- Model modes: **Mock (default, no keys)**: a deterministic seeded simulator for solver and editor so the full loop runs offline, clearly labeled "Mock model (simulated)" everywhere results show. **Real**: optional API key in `.env` (ship `.env.example`, never commit keys) to use a real LLM for solver and editor; if the build VM has a working key, record one real run and prefer it in the screenshot/video, labeled "Real model".
- Progress streamed to the UI (SSE or polling from a thin Bun server).
- README: what SIM is (paper link), how the demo maps to it, how to run, mock vs real.

**Out:** auth/multiple users; large benchmarks; running untrusted code without a timeout; changing anything outside this folder except the tracking update.

## Tasks (vertical slices)
1. Scaffold with `bunx create-vite` (react-ts, skip install), write bunfig.toml, `bun install`, init shadcn/ui minimalist preset; shadcn charts (Recharts).
2. Task suite + test runner (Bun subprocess, timeout) + scoring.
3. Ledger type + editor loop + both conditions, mock model first.
4. Bun server API + SSE progress; UI: controls, ledger viewer, chart, scoreboard.
5. Real-model adapter behind the env key.
6. Validation: capture at least one screenshot AND one video (start a run, watch ledger rows appear, chart fill, toggle conditions) and attach both to the PR.

## Stack
- Bun (runtime, scripts, test runner subprocesses)
- Vite + React + shadcn/ui + Recharts (one-screen tool, no meta-framework)
- Thin Bun HTTP server for runs and SSE

## Testing and hooks
- One focused test: the ledger loop with the mock model is deterministic for a seed, writes valid ledger entries, and never lets the editor see held-out results.
- No git hooks.

## Deferred
- SQL/regex task domains; repeated runs with variance; cost tracking; Cloudflare Pages preview (mock only).
