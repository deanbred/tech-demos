import { cp, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseStreamLines, type StreamLine } from '../src/trace/parser'
import type { Trace, TracePair } from '../src/trace/types'

/**
 * Records a live trace pair: the same task run in headless Claude Code with
 * Code Mode off and with CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1.
 *
 * Caveat from the official docs (https://code.claude.com/docs/en/code-mode):
 * Code Mode requires an interactive terminal session and does not work with
 * `claude -p`. The ON run therefore very likely executes without Code Mode
 * and exists to make that limitation observable; the trace is annotated
 * accordingly. If a later Claude Code release lifts the restriction, this
 * recorder will pick it up unchanged.
 */

const APP_DIR = path.resolve(import.meta.dir, '..')
const FIXTURE_DIR = path.join(APP_DIR, 'fixtures', 'sample-repo')
const TRACES_DIR = path.join(APP_DIR, 'traces')
const TASK =
  'Find every TODO comment in this repo, count them by file, and fix three of them.'

function fail(message: string): never {
  console.error(`error: ${message}`)
  process.exit(1)
}

async function runOnce(codeMode: boolean): Promise<Trace> {
  const workDir = await mkdtemp(path.join(tmpdir(), 'code-mode-playground-'))
  await cp(FIXTURE_DIR, workDir, { recursive: true })

  const label = codeMode ? 'ON' : 'OFF'
  console.log(`\n--- Code Mode ${label} run (cwd: ${workDir}) ---`)

  const proc = Bun.spawn(
    [
      'claude',
      '-p',
      TASK,
      '--output-format',
      'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
    ],
    {
      cwd: workDir,
      env: {
        ...process.env,
        CLAUDE_CODE_EXPERIMENTAL_CODE_MODE: codeMode ? '1' : '0',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )

  const lines: StreamLine[] = []
  const decoder = new TextDecoder()
  let buffered = ''
  for await (const chunk of proc.stdout) {
    buffered += decoder.decode(chunk, { stream: true })
    let newline = buffered.indexOf('\n')
    while (newline !== -1) {
      const raw = buffered.slice(0, newline).trim()
      buffered = buffered.slice(newline + 1)
      newline = buffered.indexOf('\n')
      if (!raw) continue
      try {
        lines.push({ json: JSON.parse(raw), atMs: Date.now() })
      } catch {
        console.warn(`skipping non-JSON line: ${raw.slice(0, 120)}`)
      }
    }
  }

  const stderrText = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  await rm(workDir, { recursive: true, force: true })

  if (stderrText.trim()) console.error(stderrText.trim())
  if (exitCode !== 0 && lines.length === 0) {
    fail(`claude exited with code ${exitCode} and produced no stream output`)
  }

  let note: string | undefined
  if (codeMode) {
    const sawScriptTool = lines.some((line) => {
      const json = line.json as { type?: string; message?: { content?: unknown } }
      if (json?.type !== 'assistant' || !Array.isArray(json.message?.content)) return false
      return json.message.content.some(
        (block) =>
          typeof block === 'object' &&
          block !== null &&
          (block as { type?: string }).type === 'tool_use' &&
          ['REPL', 'Eval'].includes((block as { name?: string }).name ?? ''),
      )
    })
    if (!sawScriptTool) {
      note =
        'Recorded with CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1, but no REPL/Eval script tool was observed. Per the docs, Code Mode does not work with headless `claude -p`, so this run most likely executed without Code Mode.'
      console.warn(`warning: ${note}`)
    }
  }

  const trace = parseStreamLines(lines, { codeMode, note })
  console.log(
    `parsed: ${trace.totals.turns} turns, ${trace.totals.toolCalls} tool calls, ` +
      `${trace.totals.inputTokens} in / ${trace.totals.outputTokens} out tokens, ` +
      `${(trace.totals.durationMs / 1000).toFixed(1)}s`,
  )
  return trace
}

if (!Bun.which('claude')) {
  fail(
    'the `claude` CLI is not installed or not on PATH. Install Claude Code first: https://code.claude.com/docs/en/quickstart',
  )
}
if (!process.env.ANTHROPIC_API_KEY) {
  fail(
    'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key (Bun loads .env automatically).',
  )
}

const off = await runOnce(false)
const on = await runOnce(true)

const recordedAt = new Date().toISOString()
const pair: TracePair = {
  id: `live-${recordedAt.replace(/[:.]/g, '-')}`,
  label: `Recorded live: TODO triage (${recordedAt.slice(0, 16)}Z)`,
  source: 'live',
  task: TASK,
  recordedAt,
  note: on.note,
  off,
  on,
}

await mkdir(TRACES_DIR, { recursive: true })
const outFile = path.join(TRACES_DIR, `${pair.id}.json`)
await Bun.write(outFile, JSON.stringify(pair, null, 2))
console.log(`\nsaved trace pair to ${path.relative(APP_DIR, outFile)}`)
console.log('restart or refresh the dev server UI to see it in the trace picker.')
