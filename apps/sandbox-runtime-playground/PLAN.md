# sandbox-runtime-playground

## Goal

A local web playground where you write an Anthropic sandbox-runtime (`srt`) policy, run a shell command or a toy agent script under that policy, and see exactly what got through and what was blocked.

## Single-user MVP

**In:**

- A Bun-served single-page UI with a policy editor (read/write paths, domain allowlist) and a command box
- Commands run through `@anthropic-ai/sandbox-runtime` (`SandboxManager.initialize` + `wrapWithSandbox`); fall back to the `srt` CLI only if the library cannot load under Bun
- Streamed stdout/stderr plus a clear allowed/denied outcome
- Preset "attacks": read `~/.ssh/id_rsa` or `~/.ssh/id_ed25519`, read a `.env`, `curl` a domain not on the allowlist, write outside the project
- Side-by-side unsandboxed vs sandboxed results for the same command
- Startup check for platform dependencies: `bubblewrap` (and `socat` if required) on Linux, Seatbelt / `sandbox-exec` on macOS; a clear on-screen error if missing
- `bunfig.toml` with `[install] minimumReleaseAge = 259200` before any install
- README covering platform deps and how to run (`bun install && bun run dev` from this directory)

**Out:**

- Multiple users or auth
- Remote execution
- Real MCP server wiring
- Windows support
- Saved history beyond localStorage
- Changing or forking the sandbox itself

## Tasks (vertical slices)

1. Scaffold this app from an official Vite + React template via `bunx create-vite` (skip the initial install), write `bunfig.toml` first, then `bun install`. Initialize shadcn/ui with a minimalist preset and add components on demand.
2. Sandbox runner API on Bun: apply a `SandboxRuntimeConfig` (`network.allowedDomains` / `deniedDomains`; `filesystem.denyRead` / `allowRead` / `allowWrite` / `denyWrite`), wrap and execute a command, stream output, report exit code and violations. Check platform deps at startup.
3. UI: policy editor + command box + live output. Running a command shows what succeeded and what was blocked.
4. Preset attacks and a side-by-side unsandboxed vs sandboxed comparison.
5. Validate on a real run: capture at least one screenshot AND at least one video of the running app, and attach both to the pull request.

## Stack

- **Bun** — runtime, package manager, and script runner (monorepo default).
- **Vite + React** — official scaffold via `bunx create-vite`. This is a one-screen utility, so skip Next.js and TanStack Start.
- **shadcn/ui** — minimalist preset, components pulled in on demand.
- **`@anthropic-ai/sandbox-runtime`** — official library (`SandboxManager`). Policy matches the published API: reads are deny-then-allow; writes and network are allow-only. The `srt` CLI is fallback only.
- **A thin Bun HTTP API** next to Vite — the sandbox must run on the host, not in the browser.

## Layout

```
apps/sandbox-runtime-playground/
  PLAN.md
  bunfig.toml
  README.md
  package.json
  src/
    ui/          # policy editor, command box, results
    server/      # Bun API: run, presets, dependency check
    sandbox/     # SandboxManager wrapper, policy types
```

Single screen; no further domain folders needed.

## Testing and hooks

- One focused test around policy application: a denied read and a denied network request are actually blocked, and an allowed command succeeds. Run it on the host with sandbox-runtime available.
- No git hooks for this MVP.

## Deferred

- Real MCP server wrapping — interesting, but not needed to prove the sandbox.
- Windows (WFP / `srt-sandbox` account) — out of this first cut.
- Persistent history, multi-user, and hosted execution of unsandboxed commands. A Cloudflare Pages preview of the UI is fine; command execution in preview/CI should be disabled or clearly marked local-only.
