# Self-Improvement Memory playground

A one-page demo of the editor loop from [Self-Improvement Memory Enables Continual Recursive Self-Improvement](https://arxiv.org/abs/2611.18856) (arXiv 2611.18856).

SIM is a memory for the **harness optimizer**, not for the task-solving agent. It groups edits by the harness problem they address and keeps each attempt's rationale, what the edit was predicted to fix, what it actually fixed, and the evaluation context. Later rounds read that history. The paper's guideline 6 is: revisit a tested direction only when new evidence justifies it.

This playground runs that loop on 20 small TypeScript functions. It is not a reproduction of the paper's Terminal-Bench runs.

## What the paper reported

Across ten paired coding continuations, the paper reports that SIM improved final scores by an average of **+2.36** points over harness-only continuation (paired p = 0.003). That figure is the paper's claim about their benchmark. Nothing in this app measures it. The scoreboard states the same thing.

The paper's source and target runs use **N = 10 rounds** and **k = 5 candidates** per round. Those are the defaults here.

## How this demo maps

| Paper | This app |
| --- | --- |
| Evolve set (the only feedback the optimizer sees) | 10 train tasks |
| Held-out score | 10 held-out tasks, scored after each round, never passed to the editor |
| Proposer + selector | Editor proposes K prompt/tool edits; the selector keeps the one with the best train score if it strictly improves |
| SIM vs harness-only continuation | SIM (full ledger) vs no-ledger (latest train scores only), same seed and budget |
| Figure 8 problem entry `{id, name, opened_round, attempts[]}` | `problems` in `sim-ledger.json` |
| Attempt `{round, sample, accepted, backfilled, what, files, predicted, fixed, missed, passed, total, domain}` | Each accepted attempt, and each candidate row in the UI |

`predicted` is fixed before the candidate is scored. `fixed` and `missed` split that list after the tests run. `passed` / `total` count train tasks (one trial per task). Rows where a prediction was missed are highlighted.

The solver writes a function per task. Those files run in a fresh Bun subprocess with a 5 second timeout. The parent process does not eval the solution.

## Differences from the paper

Confirmed from the paper (arXiv HTML, id 2611.18856):

- Figure 8 records **only the selected edit** on a problem. This demo does that in `problems`. It also stores every rejected candidate under `rounds`, because the viewer needs accepted vs rejected and the retry rule needs to know a direction was tested. The paper's optimizer memory does not include proposals that lost the round.
- Section 3.2 stores provenance (domain, benchmark, policy, round) and evaluation context. Figure 8's printed attempt has no separate context object, so this demo adds `evaluation_context` (`benchmark`, `policy`, train tasks failing before the attempt). `backfilled` is always false.
- The paper continues an evolved harness across a benchmark or model change (`carried_from`, merged `aliases`). This is a single run from a seed harness, so those fields are absent.
- The paper's selector is a model. This selector is deterministic: keep the candidate with the highest train score when it strictly improves, otherwise accept nothing.
- "New evidence" here means a train task fails now that was not failing when that `what` was last tried. An edit that already fixed a predicted task stays eligible until it is selected. An edit that missed every prediction is not retried without that new failure. The no-ledger editor does not see the history, so it proposes the same missed edits again.

## Mock and real

**Mock model (simulated)** is the default. No API key. The solver and the editor are a seeded simulator: lessons in the harness flip specific tasks, and overconfident edits predict many fixes but change no code. Every results surface says `Mock model (simulated)`. The gap on the chart is this simulator's gap, not the paper's +2.36.

**Real model** uses `SIM_API_KEY` (or `OPENAI_API_KEY`) from `.env`. See `.env.example`. The solver is asked for the functions, the editor is asked for K JSON edits, and the same sandbox scores them. Results are labeled `Real model`. If the key is missing, the run stops with an error. It does not silently fall back to the mock.

## Run

From this directory:

```bash
bun install
bun run dev
```

Open http://127.0.0.1:5173. The API listens on http://127.0.0.1:8787 and Vite proxies `/api`.

`bun test` checks that the mock loop is deterministic for a seed, writes Figure 8 fields, and does not show held-out results to the editor.

Ledgers from the latest run are written to `sim-ledger.json` and `baseline-ledger.json` (gitignored), and copied under `runs/<id>/`.
