import type { ToolCall, Trace, Turn } from './types'

/**
 * Parser from Claude Code headless stream-json output
 * (`claude -p ... --output-format stream-json --verbose`, one JSON event per
 * line) into the normalized Trace shape the UI renders.
 *
 * Event timestamps are not part of the stream format, so the recorder stamps
 * each line as it arrives; per-call durations are only filled in when those
 * arrival times are provided.
 */

export interface StreamLine {
  json: unknown
  /** Arrival time of the line, stamped by the recorder. */
  atMs?: number
}

interface ParseOptions {
  codeMode: boolean
  note?: string
}

const SCRIPT_TOOL_NAMES = new Set(['REPL', 'Eval'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function firstLine(text: string, max = 90): string {
  const line = text.split('\n')[0].trim()
  return line.length > max ? line.slice(0, max - 1) + '…' : line
}

export function summarizeToolInput(name: string, input: unknown): string {
  if (!isRecord(input)) return ''
  const command = asString(input.command)
  const filePath = asString(input.file_path) ?? asString(input.path)
  const code = asString(input.code)
  const description = asString(input.description)
  if (name === 'Bash' && command) return firstLine(command)
  if ((name === 'Read' || name === 'Write' || name === 'Edit') && filePath) {
    return filePath
  }
  if (SCRIPT_TOOL_NAMES.has(name)) {
    if (description) return firstLine(description)
    if (code) return firstLine(code)
  }
  if (description) return firstLine(description)
  try {
    return firstLine(JSON.stringify(input))
  } catch {
    return ''
  }
}

export function parseStreamLines(lines: StreamLine[], opts: ParseOptions): Trace {
  const turns: Turn[] = []
  const pendingCalls = new Map<string, { call: ToolCall; startedAtMs?: number }>()
  let model: string | undefined
  let resultDurationMs: number | undefined
  let resultTurns: number | undefined
  let inputTokens = 0
  let outputTokens = 0
  let firstAtMs: number | undefined
  let lastAtMs: number | undefined
  let assistantMessages = 0

  for (const { json, atMs } of lines) {
    if (!isRecord(json)) continue
    if (atMs !== undefined) {
      firstAtMs ??= atMs
      lastAtMs = atMs
    }
    const type = asString(json.type)

    if (type === 'system' && asString(json.subtype) === 'init') {
      model ??= asString(json.model)
      continue
    }

    if (type === 'assistant' && isRecord(json.message)) {
      assistantMessages += 1
      const content = Array.isArray(json.message.content) ? json.message.content : []
      const toolCalls: ToolCall[] = []
      for (const block of content) {
        if (!isRecord(block) || asString(block.type) !== 'tool_use') continue
        const id = asString(block.id) ?? `call-${pendingCalls.size}`
        const name = asString(block.name) ?? 'Unknown'
        const call: ToolCall = {
          id,
          name,
          argsSummary: summarizeToolInput(name, block.input),
          durationMs: null,
        }
        toolCalls.push(call)
        pendingCalls.set(id, { call, startedAtMs: atMs })
      }
      if (toolCalls.length > 0) {
        turns.push({ index: turns.length, toolCalls })
      }
      continue
    }

    if (type === 'user' && isRecord(json.message)) {
      const content = Array.isArray(json.message.content) ? json.message.content : []
      for (const block of content) {
        if (!isRecord(block) || asString(block.type) !== 'tool_result') continue
        const toolUseId = asString(block.tool_use_id)
        if (!toolUseId) continue
        const pending = pendingCalls.get(toolUseId)
        if (pending && pending.startedAtMs !== undefined && atMs !== undefined) {
          pending.call.durationMs = atMs - pending.startedAtMs
        }
        pendingCalls.delete(toolUseId)
      }
      continue
    }

    if (type === 'result') {
      resultDurationMs = asNumber(json.duration_ms)
      resultTurns = asNumber(json.num_turns)
      if (isRecord(json.usage)) {
        inputTokens = asNumber(json.usage.input_tokens) ?? 0
        outputTokens = asNumber(json.usage.output_tokens) ?? 0
      }
    }
  }

  const toolCallCount = turns.reduce((sum, turn) => sum + turn.toolCalls.length, 0)
  const observedDuration =
    firstAtMs !== undefined && lastAtMs !== undefined ? lastAtMs - firstAtMs : 0

  return {
    codeMode: opts.codeMode,
    model,
    turns,
    totals: {
      turns: resultTurns ?? assistantMessages,
      toolCalls: toolCallCount,
      inputTokens,
      outputTokens,
      durationMs: resultDurationMs ?? observedDuration,
    },
    note: opts.note,
  }
}

/** Convenience wrapper for raw stream text without arrival timestamps. */
export function parseStreamText(text: string, opts: ParseOptions): Trace {
  const lines: StreamLine[] = []
  for (const raw of text.split('\n')) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    try {
      lines.push({ json: JSON.parse(trimmed) })
    } catch {
      // Non-JSON lines (warnings, partial writes) are skipped.
    }
  }
  return parseStreamLines(lines, opts)
}
