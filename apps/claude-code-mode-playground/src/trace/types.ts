export type TraceSource = 'sample' | 'live'

export interface ToolCall {
  id: string
  /** Tool name as reported by Claude Code, e.g. Bash, Read, Edit, REPL. */
  name: string
  /** Short human-readable summary of the tool input. */
  argsSummary: string
  /** Wall-clock duration from request to tool result, when known. */
  durationMs: number | null
  /**
   * Calls batched inside this call. Used for Code Mode script calls
   * (REPL/Eval), where one script performs several operations.
   */
  children?: ToolCall[]
}

export interface Turn {
  index: number
  toolCalls: ToolCall[]
}

export interface TraceTotals {
  turns: number
  /** Top-level tool calls, i.e. API round trips that carried a tool use. */
  toolCalls: number
  inputTokens: number
  outputTokens: number
  durationMs: number
}

export interface Trace {
  codeMode: boolean
  model?: string
  turns: Turn[]
  totals: TraceTotals
  note?: string
}

export interface TracePair {
  id: string
  label: string
  source: TraceSource
  task: string
  recordedAt?: string
  note?: string
  off: Trace
  on: Trace
}

export function countBatchedOps(trace: Trace): number {
  let n = 0
  for (const turn of trace.turns) {
    for (const call of turn.toolCalls) {
      n += call.children?.length ?? 0
    }
  }
  return n
}
