# Claude Code · Code Mode playground

A local web playground that compares the same multi-step repo task run in
headless Claude Code with the experimental **Code Mode** off and on, side by
side: a tool-call timeline per run plus a comparison of turns, tokens,
tool-call count and wall-clock time.

## What Code Mode is (verified against the official docs)

The claims that motivated this playground came from X posts. Each one was
checked against Anthropic's official documentation on 2026-11-17:

| Claim from X | Verified? | Source |
| --- | --- | --- |
| Code Mode exists, is experimental, and is off by default | Yes | [Code Mode docs](https://code.claude.com/docs/en/code-mode): "Code Mode is experimental and off by default. It may change or be removed in any release." |
| Enabled with `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1` | Yes | Same page: set the variable in your shell or in `~/.claude/settings.json` under `env`. Claude Code deliberately ignores the variable in project settings, so a cloned repo can't switch it on for you. |
| Available since Claude Code v2.1.323 | Yes | [Changelog](https://code.claude.com/docs/en/changelog), entry for 2.1.323 (November 12, 2026): "Added Code Mode, an experimental opt-in in which Claude writes JavaScript to call its tools". The docs require v2.1.323 or later. |
| Claude writes one JS script that runs several Bash/Read/Edit tool calls together instead of one call per turn | Yes | Docs: "Claude writes a piece of JavaScript that makes the tool calls... One piece of code can run commands in parallel, use one result in the next call, and return the part of the output that Claude needs to read." Internally the script runs through a `REPL` (also `Eval`) tool. |

**One important difference the X posts did not mention:** per the docs'
requirements, Code Mode currently works only in an **interactive `claude`
terminal session**. It does **not** work with headless `claude -p`, the Agent
SDK, the VS Code panel, the Desktop app, or cloud sessions. That directly
affects this playground's recorder (see below). Code Mode also requires a
Claude subscription or Console account (no gateways/Bedrock/Vertex), an
eligible model, and the native build.

### About the "37% fewer tokens" figure

The number widely shared on X comes from Anthropic's earlier engineering
article about [code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp),
which measured a different (MCP tool-calling) setup — it is not a Claude Code
Code Mode benchmark. This playground does not repeat that figure as a
measurement; it either shows clearly labeled sample data or numbers you record
yourself.

## Run it

```bash
cd apps/claude-code-mode-playground
bun install
bun run dev
```

Open the printed URL (default `http://localhost:5173`). With no API key or
recorded traces, the UI shows the bundled **sample trace pair**, visibly
badged "Sample data — illustrative only, not real measurements". Every number
in the sample traces is invented to demonstrate the UI; none of it is a real
Code Mode measurement.

## Record live traces

```bash
cp .env.example .env   # add your ANTHROPIC_API_KEY
bun run record
```

Requirements: the [`claude` CLI](https://code.claude.com/docs/en/quickstart)
on PATH and `ANTHROPIC_API_KEY` in `.env` (gitignored). The recorder copies
`fixtures/sample-repo/` (a tiny TypeScript library with 12 `TODO` comments) to
a fresh temp directory, then runs the task

> Find every TODO comment in this repo, count them by file, and fix three of them.

twice via `claude -p ... --output-format stream-json --verbose`: once with
`CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=0` and once with `=1`. Both streams are
parsed into a normalized trace pair saved under `traces/` (gitignored), which
the dev server exposes to the UI; live pairs appear in the trace picker with a
green "Recorded live" badge.

**Known limitation:** because Code Mode does not work with `claude -p` (see
above), the ON run currently executes without Code Mode. The recorder detects
the absence of any `REPL`/`Eval` script call and annotates the trace with a
visible warning instead of pretending the comparison is meaningful. If a later
Claude Code release enables Code Mode in headless mode, the recorder picks it
up unchanged. Until then, the grouped-script view is demonstrated by the
sample traces.

## Sample vs live

- **Sample** (`traces/sample/`, committed): hand-written, illustrative only.
  Amber badge in the UI, warning notes in the JSON itself. Never cite these
  numbers as Code Mode results.
- **Live** (`traces/*.json`, gitignored): recorded on your machine by
  `bun run record`, with per-call durations stamped from stream arrival times
  and token totals taken from the stream's `result` event. Green badge.

## Tests

```bash
bun test
```

Covers the stream-json parser (turn/tool-call counts, token totals, durations,
fallbacks) and validates that the bundled sample traces match the `TracePair`
shape.

## Layout

```
PLAN.md                 # the plan this app was built from
fixtures/sample-repo/   # TODO-filled mini repo (never modified; runs use a temp copy)
traces/sample/          # illustrative sample traces (committed, clearly labeled)
traces/                 # recorded live traces (gitignored)
scripts/record.ts       # headless OFF/ON runner -> trace pair JSON
src/trace/              # Trace types + stream-json parser (+ tests)
src/ui/                 # lanes, timeline items, comparison chart, picker, badges
src/server/             # Vite dev middleware serving recorded traces
```
