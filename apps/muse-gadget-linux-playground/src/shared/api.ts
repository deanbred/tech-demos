export const PARAM_TYPES = ['string', 'integer', 'number', 'boolean', 'object', 'array'] as const

export type ParamType = (typeof PARAM_TYPES)[number]

export type ParamSpec = {
  type: ParamType
  description: string
}

export type CommandSummary = {
  name: string
  description: string
  exec: string[]
  argv: string[]
  required: Record<string, ParamSpec>
  optional: Record<string, ParamSpec>
  timeoutMs: number
}

export type InvocationSource = 'mock'

export type InvocationRecord = {
  id: string
  at: string
  source: InvocationSource
  command: string
  params: Record<string, unknown>
  stdout: string
  stderr: string
  result: unknown
  exitCode: number | null
  durationMs: number
  ok: boolean
  error: string | null
}

export type LiveStatus = {
  mode: 'mock' | 'live'
  connected: boolean
  tokenPresent: boolean
  attempted: boolean
  apiHost: 'api.muse.ai'
  apiReachable: boolean | null
  pairingStorePresent: boolean
  serviceInstalled: boolean
  message: string
  requirements: string[]
}

export type BuiltinCommand = {
  name: string
  description: string
}

export type SkippedCommand = {
  file: string
  reason: string
}

export type StatusResponse = {
  live: LiveStatus
  lightOn: boolean
  commands: CommandSummary[]
  skipped: SkippedCommand[]
  builtins: BuiltinCommand[]
  invocations: InvocationRecord[]
}

export type SessionEvent =
  | { type: 'invocation'; invocation: InvocationRecord; lightOn: boolean }
  | { type: 'done' }
  | { type: 'error'; message: string }

export const BUILTIN_COMMANDS: BuiltinCommand[] = [
  {
    name: 'system.run',
    description: 'Runs a shell command and returns its output and exit code. Not exposed in this playground.',
  },
  {
    name: 'file.read',
    description: 'Reads a file, 64 KB at a time. Not exposed in this playground.',
  },
  {
    name: 'file.write',
    description: 'Writes a file, 64 KB at a time. Not exposed in this playground.',
  },
  {
    name: 'device.health',
    description: 'Reports uptime, load, memory, disk, and temperature. Documented only; host.stats is the safe read.',
  },
]

export const SESSION_STEPS: { command: string; params: Record<string, unknown> }[] = [
  { command: 'host.stats', params: {} },
  { command: 'light.toggle', params: {} },
  { command: 'chore.disk', params: {} },
]
