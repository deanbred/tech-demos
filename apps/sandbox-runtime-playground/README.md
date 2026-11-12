# sandbox-runtime playground

A local web playground for [Anthropic's sandbox-runtime](https://github.com/anthropics/sandbox-runtime) (`@anthropic-ai/sandbox-runtime`, the sandbox Claude Code uses). Write a policy, run a shell command unsandboxed vs sandboxed side by side, and see exactly what got through and what was blocked.

## What it does

- **Policy editor** — network `allowedDomains` / `deniedDomains`; filesystem `denyRead` / `allowRead` (reads are deny-then-allow) and `allowWrite` / `denyWrite` (writes are allow-only).
- **Side-by-side runs** — every command executes twice: plain `/bin/bash` on the host, and wrapped by `SandboxManager.wrapWithSandbox`. Output streams live; each lane gets an allowed/blocked outcome plus any recorded sandbox violations.
- **Preset attacks** — read `~/.ssh`, read a `.env` (a fake one ships in `fixtures/secrets/`), `curl` a domain off the allowlist, write outside the project — plus allowed control runs.

Commands run for real on your machine in the unsandboxed lane. That is the point of the demo; run it locally only.

## Platform dependencies

The sandbox itself needs OS support, checked at startup and surfaced in the UI:

- **Linux** — `bubblewrap` (`bwrap`) and `socat`: `sudo apt install bubblewrap socat`
- **macOS** — Seatbelt (`sandbox-exec`), ships with the OS
- **Windows** — not supported here

## Run

```sh
bun install
bun run dev
```

Vite serves the UI on <http://localhost:5173>; a thin Bun API on `127.0.0.1:8787` runs the sandbox (the sandbox cannot run in the browser). `bun run dev` starts both.

## Test

```sh
bun run test
```

One focused test: a denied read and a denied network request are actually blocked, and an allowed command succeeds. Needs the platform dependencies above.

## Layout

```
PLAN.md          # agreed plan
fixtures/        # fake secrets targeted by preset attacks
src/
  sandbox/       # policy types + SandboxManager wrapper (+ its test)
  server/        # Bun API: /api/run (NDJSON stream), /api/presets, /api/health
  ui/            # policy editor, presets, side-by-side output
```
