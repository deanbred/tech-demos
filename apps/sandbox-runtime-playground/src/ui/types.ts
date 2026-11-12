export type Lane = 'sandboxed' | 'unsandboxed'

export type RunEvent =
  | { type: 'start'; lane: Lane; command: string }
  | { type: 'stdout'; lane: Lane; data: string }
  | { type: 'stderr'; lane: Lane; data: string }
  | { type: 'violation'; lane: Lane; line: string }
  | { type: 'exit'; lane: Lane; code: number; violations: string[]; durationMs: number }
  | { type: 'error'; lane: Lane; message: string }
  | { type: 'done' }

export interface Preset {
  id: string
  name: string
  description: string
  command: string
  expectation: 'blocked' | 'allowed'
}

export interface HealthStatus {
  ok: boolean
  platform: string
  supported: boolean
  errors: string[]
  warnings: string[]
}

export interface OutputChunk {
  kind: 'stdout' | 'stderr' | 'violation' | 'error'
  text: string
}

export interface LaneState {
  status: 'idle' | 'running' | 'exited'
  chunks: OutputChunk[]
  exitCode: number | null
  violations: string[]
  durationMs: number | null
}

export const EMPTY_LANE: LaneState = {
  status: 'idle',
  chunks: [],
  exitCode: null,
  violations: [],
  durationMs: null,
}
