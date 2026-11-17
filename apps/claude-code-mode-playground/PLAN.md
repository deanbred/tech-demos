# claude-code-mode-playground

## Goal

A local web playground that runs the same multi-step repo task in headless Claude Code twice, once with the experimental Code Mode off and once with it on, and shows the two runs side by side: a tool-call timeline per run and a comparison of turns, tokens and wall-clock time.

## Verify first (before building)

The facts below come from X posts, not docs. Check each one against Anthropic's official Claude Code docs or changelog and record what you find in the README:

- Code Mode exists, is experimental, and is off by default
- It is enabled with `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1` (reportedly since Claude Code v2.1.323)
- In Code Mode, Claude writes one JS script that runs several Bash/Read/Edit tool calls together instead of one call per turn

If the flag name or behavior differs, follow the docs and note the difference. If Code Mode can't be found in the docs at all, build the playground anyway, but label the toggle "as reported on X, unverified".

## Single-user MVP

**In:**

- A Bun-served single page with:
  - Two lanes side by side (Code Mode OFF / ON). Each lane is a vertical timeline or sequence view of tool calls (tool name, short args, duration). In the ON lane, any script-batched calls are grouped visibly under the single script call
  - A comparison bar chart of turns, input+output tokens, tool-call count and wall-clock time
  - A trace picker, so you can switch between sample traces and any recorded live traces
- **Fixture repo:** a tiny bundled sample repo under `fixtures/sample-repo/` with a dozen or so `TODO` comments across several files. The task is: "Find every TODO, count them by file, and fix three of them." Every run works on a fresh temp copy, so the fixture is never changed
- **Live recorder:** `bun run record` runs headless Claude Code (`claude -p ... --output-format stream-json`, or whatever the docs currently use for headless JSON output) on the temp copy, once without the env flag and once with it. It parses the stream into a normalized trace JSON (turns, tool calls with timing, token usage from the result/usage events, total time) and saves it to `traces/`. It needs `ANTHROPIC_API_KEY` in `.env` (never committed; ship `.env.example`) and the `claude` CLI. If either is missing it exits with a clear message
- **Mock mode by default:** with no key, the UI loads sample traces from `traces/sample/` so the app runs and can be screenshotted and recorded on video. **Sample traces must be clearly labeled in the UI as illustrative example data, not measurements** (a visible "Sample data" badge). Never present invented numbers as real Code Mode savings. If the build VM happens to have a working key and CLI, record one real pair, label it "Recorded live", and prefer it in the screenshot/video
- `bunfig.toml` with `[install] minimumReleaseAge = 259200` before any install
- A README covering what Code Mode is (with doc links), how to run (`bun install && bun run dev` from this directory), how to record live traces, and the sample-vs-live distinction. It should also say that the widely shared "37% fewer tokens" figure comes from an older Anthropic API article and that this playground measures savings directly

**Out:**

- Running Claude Code from the browser or exposing a shell in the UI (recording is a CLI script only)
- Multiple tasks or a benchmark suite (one task, one pair of runs at a time; repeat runs can come later)
- Auth or multiple users
- Committing an API key or `.env`
- Changing anything outside this app folder

## Tasks (vertical slices)

1. Scaffold from the official Vite + React template with `bunx create-vite` (skip the initial install), write `bunfig.toml` first, then run `bun install`. Initialize shadcn/ui with a minimalist preset and add components as needed. Use shadcn's chart component (Recharts) for the bar chart.
2. Trace format and parser: define a normalized `Trace` type and write a parser from Claude Code stream-json to `Trace`. Add sample traces that match the type.
3. UI: a two-lane timeline, the comparison chart, the trace picker, and the sample/live badge.
4. Recorder: copy the fixture to a temp dir, do the OFF run and the ON run, parse both, and save a trace pair. Expose saved traces to the UI through a thin Bun API (or static JSON served by Vite).
5. Validation: on a real run of the app, capture at least one screenshot AND at least one video (switching traces, hovering timeline items, showing the chart) and attach both to the pull request.

## Stack

- **Bun**: runtime, package manager and script runner (the monorepo default)
- **Vite + React**: official scaffold. This is a one-screen tool, so no Next.js or TanStack Start
- **shadcn/ui** with a minimalist preset, plus shadcn charts (Recharts) for the comparison
- **Claude Code CLI in headless mode** for live recording only, with the docs as the source of truth for flags and output format
- **A thin Bun HTTP API** (optional) to list and serve traces

## Layout

```
apps/claude-code-mode-playground/
  PLAN.md
  bunfig.toml
  README.md
  .env.example
  package.json
  fixtures/sample-repo/   # TODO-filled mini repo (read-only source)
  traces/sample/          # illustrative sample traces (labeled as such)
  traces/                 # recorded live traces (gitignored except sample/)
  scripts/record.ts       # headless OFF/ON runner -> trace JSON
  src/
    trace/                # Trace type + stream-json parser
    ui/                   # lanes, chart, picker, badges
    server/               # optional: list/serve traces
```

## Testing and hooks

- One focused test: the stream-json parser turns a small captured or hand-written stream fixture into a `Trace` with the right turn count, tool-call count, token totals and duration. Sample traces must validate against the type.
- No git hooks for this MVP.

## Deferred

- Repeated runs with averages and variance; more tasks
- A cost estimate in dollars
- A Cloudflare Pages preview (it can show the UI with sample traces only)
