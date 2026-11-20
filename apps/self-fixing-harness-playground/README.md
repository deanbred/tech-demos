# Self-fixing harness playground

A one-page demo of the harness optimizer in [Harnesses That Improve Themselves](https://arxiv.org/abs/2611.22299) (arXiv 2611.22299, Deep Shah and Nehal Kathrotia, Google, 17 Nov 2026). The X post that pointed here is [this summary](https://x.com/undefinedKi/status/2123526647152353309).

The paper's agent harness is four runtime pieces: context and state, agent control, the action interface, and verification. An outer loop reads failure traces, edits one module, and keeps the edit only when it does not regress on a validation split and stays under a token cap. Rewriting all four modules at once, with no gate, solved a similar share of SWE-bench Lite tasks and spent many more tokens.

This playground runs that loop on 20 small TypeScript functions. It is not a reproduction of the paper's SWE-bench runs.

## Claimed in the source post

The post says the setup went from solving 5% of tasks to 40%, used 2.5× fewer tokens, and that full rewrites used about 10× the tokens. The paper's Table IV is the source of those figures: on Gemini 3.8 Flash the seed harness solved 5.0% (2/40) at 114.8k tokens per task, modular gated evolution solved 40.0% (16/40) at 46.7k (2.5× fewer than the seed), and the unconstrained full rewrite solved 42.5% at 451.6k (about 10× the modular run). Those numbers are the paper's claims. This app does not measure them. The scoreboard is whatever the current run just did.

## How this demo maps

| Paper | This app |
| --- | --- |
| `context_mgr.py`, `control.py`, `action_aci.py`, `verify.py` (142-line Python seed) | `harness/memory.ts`, `loop.ts`, `tools.ts`, `stop.ts` |
| Development traces for the optimizer | 10 train tasks. The fixer sees their failure logs only |
| Validation gate, separate from the final held-out test | The 10 held-out tasks are the gate. There is no third split |
| Keep the edit when validation does not regress and tokens stay under `B_tok` (110k in the paper) | Keep the edit when held-out passes do not drop and average held-out tokens stay under the budget (default 500 in this simulator) |
| One module per step | One file per round |
| Unconstrained full-harness rewrite, no validation and no token cap | Rewrite-all, same score gate and same token budget, so the comparison is the edit scope |
| Tests graded outside the agent sandbox | Bun subprocess, 5 second timeout |

The four behaviors the post says stayed in the harness, and where the paper actually put them:

1. Old turns compressed into notes. Paper: accepted edit to `context_mgr.py` (observations older than two turns become head-tail summaries, plus a status footer). Here: a kept edit to `memory.ts`.
2. Long terminal output cut. Paper: part of the accepted `action_aci.py` edit. Here: a kept edit to `tools.ts`.
3. No "done" without a code change. Paper: the empty-diff guard landed in `action_aci.py`, and `verify.py` also requires a non-empty diff. Here: a kept edit to `stop.ts`.
4. Stop only after the code compiles and the tests pass. Paper: accepted edit to `verify.py`. Here: a later kept edit to `stop.ts`. The mock's first try at this check is rejected for tokens, which matches the paper's rule, and it sticks only after truncation is already in the harness.

The paper also tried raising the turn cap from 12 to 18 in `control.py` and rejected it: development accuracy rose, validation accuracy fell, and tokens passed 110k. The post does not mention that rejection. This demo's mock proposes a turn-cap increase that also dumps a debug trace, and the gate rejects it. A later truncation that cuts the failure text too far is rejected because the held-out score drops.

The TypeScript seed is shorter than 142 lines. The test runner and the model adapter live outside the four files.

## Mock and real

**Mock model (simulated)** is the default. No API key. The task agent and the fixer are a seeded simulator: the agent quits early, gets lost in long tool output, and only applies a second fix when it can still see the failure text. Every results surface says `Mock model (simulated)`. The chart is this simulator's curve.

**Real model** uses `HARNESS_API_KEY` (or `OPENAI_API_KEY`) from `.env`. See `.env.example`. The task agent returns tool actions and the fixer returns replacement file text. The same sandbox scores them. Results are labeled `Real model`. If the key is missing, the run stops with an error. It does not fall back to the mock.

## Run

From this directory:

```bash
bun install
bun run dev
```

Open http://127.0.0.1:5174. The API listens on http://127.0.0.1:8788 and Vite proxies `/api`.

`bun test` checks that a fixed mock seed is deterministic, that each one-file round changes only one harness file, that a rejected patch is restored byte for byte, and that the fixer is not shown held-out task logs.

The latest run is written to `history.json` (gitignored) and copied under `runs/<id>/`.
