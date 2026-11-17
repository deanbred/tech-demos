import { describe, expect, test } from 'bun:test'
import samplePair from '../../traces/sample/todo-triage.json'
import { parseStreamLines, type StreamLine } from './parser'
import type { TracePair } from './types'

function line(json: unknown, atMs: number): StreamLine {
  return { json, atMs }
}

describe('parseStreamLines', () => {
  test('parses a small hand-written stream into a normalized trace', () => {
    const lines: StreamLine[] = [
      line({ type: 'system', subtype: 'init', model: 'claude-opus-5-5' }, 0),
      line(
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Scanning for TODOs.' },
              {
                type: 'tool_use',
                id: 'toolu_1',
                name: 'Bash',
                input: { command: 'grep -rn "TODO" src/' },
              },
            ],
          },
        },
        100,
      ),
      line(
        {
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'src/math.ts:2' }],
          },
        },
        1300,
      ),
      line(
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'toolu_2',
                name: 'Read',
                input: { file_path: 'src/math.ts' },
              },
              {
                type: 'tool_use',
                id: 'toolu_3',
                name: 'Edit',
                input: { file_path: 'src/math.ts' },
              },
            ],
          },
        },
        2000,
      ),
      line(
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 'toolu_2', content: 'file contents' },
              { type: 'tool_result', tool_use_id: 'toolu_3', content: 'ok' },
            ],
          },
        },
        2800,
      ),
      line(
        {
          type: 'assistant',
          message: { role: 'assistant', content: [{ type: 'text', text: 'Done.' }] },
        },
        3000,
      ),
      line(
        {
          type: 'result',
          subtype: 'success',
          duration_ms: 3100,
          num_turns: 3,
          usage: { input_tokens: 1200, output_tokens: 340 },
        },
        3100,
      ),
    ]

    const trace = parseStreamLines(lines, { codeMode: false })

    expect(trace.model).toBe('claude-opus-5-5')
    expect(trace.totals.turns).toBe(3)
    expect(trace.totals.toolCalls).toBe(3)
    expect(trace.totals.inputTokens).toBe(1200)
    expect(trace.totals.outputTokens).toBe(340)
    expect(trace.totals.durationMs).toBe(3100)

    expect(trace.turns).toHaveLength(2)
    const [grep] = trace.turns[0].toolCalls
    expect(grep.name).toBe('Bash')
    expect(grep.argsSummary).toBe('grep -rn "TODO" src/')
    expect(grep.durationMs).toBe(1200)
    const [read, edit] = trace.turns[1].toolCalls
    expect(read.argsSummary).toBe('src/math.ts')
    expect(read.durationMs).toBe(800)
    expect(edit.durationMs).toBe(800)
  })

  test('falls back to observed values when no result event arrives', () => {
    const lines: StreamLine[] = [
      line(
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls' } }],
          },
        },
        50,
      ),
      line(
        {
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: 't1', content: '' }],
          },
        },
        250,
      ),
    ]
    const trace = parseStreamLines(lines, { codeMode: true })
    expect(trace.totals.turns).toBe(1)
    expect(trace.totals.toolCalls).toBe(1)
    expect(trace.totals.durationMs).toBe(200)
    expect(trace.totals.inputTokens).toBe(0)
  })
})

describe('sample traces', () => {
  test('the bundled sample pair matches the TracePair shape', () => {
    const pair = samplePair as TracePair
    expect(pair.source).toBe('sample')
    expect(pair.off.codeMode).toBe(false)
    expect(pair.on.codeMode).toBe(true)
    for (const trace of [pair.off, pair.on]) {
      expect(trace.totals.turns).toBeGreaterThan(0)
      expect(trace.totals.toolCalls).toBe(
        trace.turns.reduce((sum, turn) => sum + turn.toolCalls.length, 0),
      )
      for (const turn of trace.turns) {
        for (const call of turn.toolCalls) {
          expect(call.name.length).toBeGreaterThan(0)
        }
      }
    }
    const scriptCalls = pair.on.turns
      .flatMap((turn) => turn.toolCalls)
      .filter((call) => call.children && call.children.length > 0)
    expect(scriptCalls.length).toBeGreaterThan(0)
  })
})
