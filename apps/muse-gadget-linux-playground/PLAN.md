# muse-gadget-linux-playground

## Goal

A local web playground that runs a virtual Muse Linux gadget on the desktop, registers a few custom commands in the official Linux Device SDK schema, and shows a live dashboard of every command Muse (or a mock Muse) calls and what it returns.

Source: Nat Friedman's Muse Gadgets, Apache-2.0. Project site: https://gadgets.muse.ai. Upstream: https://github.com/facebookincubator/muse-gadget-sdk (see linux/README.md). Bookmark: https://x.com/natfriedman/status/2106099383037309211

## Single-user MVP

In:

- A Bun-served single-page UI with a live command dashboard (incoming command, params, stdout/JSON result, exit, timing) and a visible gadget state (at least a fake light).
- A local gadget runtime that implements the Linux Device SDK custom-command contract: JSON descriptors like those in /etc/musegadget/commands.d/, invoked with JSON on stdin, JSON (or a nonzero exit) on the way out. Example shape from the upstream README: {"description":"...","exec":["/path"],"required":{"on":{"type":"boolean","description":"..."}},"timeout_ms":10000}. Muse invokes the command with JSON parameters on stdin; return JSON for structured results.
- Three built-in custom commands, registered through that schema (not hardcoded only in the UI):
  1. System stats — host uptime, load, memory (read-only, safe).
  2. Toggle a fake light — flips a gadget-side boolean; the dashboard lamp updates.
  3. Safe shell chore — one bounded, allowlisted chore (for example df -h on a fixed path, or a short script under the app). Not an open system.run / arbitrary shell box.
- Mock mode by default: no SDK token, no Bluetooth, no Muse app, no sudo, no install of the real musegadget systemd service. The UI can act as Muse: trigger a command, or run a short scripted "Muse session" that calls all three commands. This is the path used for screenshot and video validation.
- Live mode when a token is present: if MUSE_SDK_TOKEN is set in .env (never committed; ship .env.example), the app attempts a real SDK connection and documents what else is required (token from gadgets.muse.ai, Muse app pairing, Developer mode). If live pairing is impossible on the host, fail clearly and keep mock mode usable. Do not require sudo or a system-wide /opt/musegadget install for the MVP.
- Built-in Linux commands (system.run, file.read, file.write, device.health) may be shown as read-only documentation or simulated in mock mode; do not expose an unrestricted host shell in the UI.
- bunfig.toml with [install] minimumReleaseAge = 259200 before any install.
- README covering mock vs live, how to run (bun install && bun run dev from this directory), and that live pairing needs a token and the Muse app.

Out:

- Real ESP32 / hardware gadgets
- Multiple users or auth
- Installing or modifying the official musegadget service on the host (install.sh, systemd, /etc/musegadget, sudo)
- An unrestricted remote shell
- Shipping a real SDK token, or committing .env
- Windows-specific work
- Changing or forking the upstream SDK

## Tasks

1. Scaffold from official Vite + React via bunx create-vite (skip the initial install), write bunfig.toml first, then bun install. Initialize shadcn/ui with a minimalist preset and add components on demand. This is a one-screen utility: skip Next.js and TanStack Start.
2. Gadget runtime on Bun: load command descriptors, invoke exec with JSON stdin, capture JSON/stdout, exit, and duration. Default to mock Muse. Read .env for an optional token; never fail startup when it is missing.
3. UI: dashboard of live invocations, gadget state (fake light), buttons (and a scripted session) that play Muse in mock mode. Make mock vs live obvious.
4. Register the three custom commands via the SDK JSON schema and wire them to real handlers under the app.
5. Validate on a real mock-mode run: capture at least one screenshot AND at least one video of the running app (scripted session that hits all three commands, with the light visibly toggling), and attach both to the pull request. Validation is required, not optional.

## Stack

- Bun (runtime, package manager, script runner).
- Vite + React + shadcn/ui (minimalist).
- Muse Linux Device SDK contract as documented in facebookincubator/muse-gadget-sdk linux/README.md. Prefer the official package or source only if it can run in-process without sudo, systemd, or Bluetooth; otherwise implement the published command schema faithfully and keep a clear live-mode seam.
- A thin Bun HTTP API next to Vite — the gadget runtime runs on the host, not in the browser.

## Layout

```
apps/muse-gadget-linux-playground/
  PLAN.md, bunfig.toml, README.md, .env.example, package.json
  commands/          # JSON descriptors (SDK schema) + handlers
  src/ui/            # dashboard, light, mock-Muse controls
  src/server/        # Bun API: invoke, session, status, mode
  src/gadget/        # command registry, mock Muse, optional live seam
```

## Testing

One focused test: each of the three custom commands is loaded from its JSON descriptor and, when invoked with valid JSON, returns the expected shape (stats has numbers, light toggles and reports state, the chore is bounded and succeeds). Mock mode starts with no token. No git hooks.

## Hard rules

- Only add or update files under apps/muse-gadget-linux-playground/, except the explicit tracking-file update in the task. Do not change AGENTS.md, skills/, repo-root config, or .gitignore.
- Root .gitignore already ignores .env and .env.*; do not commit secrets. Use .env.example. If you need a fixture, generate it at runtime under a path that is already ignored, or under the app with obviously fake values.
- Each app is self-contained: bun install && bun run dev from apps/muse-gadget-linux-playground/ must work with no repo-root setup.
- Open exactly one PR. The PR must attach BOTH at least one screenshot AND at least one video of the running app.
- Do not sudo, do not run the official linux/install.sh, do not install a host musegadget systemd service.
- Do not create a new Cloudflare Pages project.

## Implementation notes

Refinements after reading `linux/src/musegadget/commands.py` and `muse_api.py`. MVP scope is unchanged.

- The official `musegadget` package is a Python BlueZ/systemd service. Pairing needs Bluetooth LE, a device token from the Muse app, and `install.sh`. It cannot run in-process here without sudo, systemd, or Bluetooth, so the playground implements the published drop-in schema itself and does not vendor or fork the SDK.
- Descriptors follow `commands.py`: filename is the command name (`host.stats.json`), keys are `description`, `exec`, `required`, `optional`, `timeout_ms`, parameter types are `string | integer | number | boolean | object | array`, and reserved prefixes `system.`, `file.`, `device.`, `link.` are rejected. Invoke passes only the checked parameters as one JSON object on stdin, with no shell. A JSON object on stdout is the result; other stdout becomes `{ "output": ... }`. A non-zero exit uses the last stderr line as the error. Default timeout is 30s, capped at 96 KiB per stream.
- Checked-in `exec` paths are app-relative so the repo stays portable. The loader resolves them and prefixes the absolute Bun binary, which is what the SDK's "absolute program path" rule requires at invoke time.
- `chore.disk` runs exactly `df -h` on this app directory. The path is fixed in the handler. Parameters cannot change the argv.
- Light state lives in `.cache/gadget-state.json` (gitignored via the repo `.cache/` rule).
- When `MUSE_SDK_TOKEN` is set, live mode probes `api.muse.ai:443` and looks for a local pairing store (`/var/lib/musegadget/pairing.json`) and the `musegadget` binary. The SDK token is an installer/pairing credential, not the device bearer `fetch_vms` accepts, so the probe does not send it. Missing pairing fails in the UI and mock mode keeps invoking commands.
