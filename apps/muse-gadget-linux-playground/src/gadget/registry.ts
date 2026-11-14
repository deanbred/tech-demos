import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { CommandSummary, InvocationRecord } from '../shared/api'
import { checkParams, InvalidCommand, parseCommand } from './schema'
import { stateFilePath } from './state'

const MAX_FILE_BYTES = 64 * 1024
const MAX_OUTPUT_BYTES = 96 * 1024

export type SkippedFile = {
  file: string
  reason: string
}

export type Registry = {
  commands: CommandSummary[]
  skipped: SkippedFile[]
  invoke: (name: string, params: unknown) => Promise<InvocationRecord>
}

export function loadRegistry(commandsDir: string, appRoot: string): Registry {
  const skipped: SkippedFile[] = []
  const commands: CommandSummary[] = []
  let names: string[] = []
  try {
    names = readdirSync(commandsDir)
      .filter(name => name.endsWith('.json'))
      .sort()
  } catch {
    return { commands, skipped, invoke: (name, params) => invokeMissing(name, params) }
  }

  for (const fileName of names) {
    const filePath = path.join(commandsDir, fileName)
    try {
      const raw = readFileSync(filePath)
      if (raw.byteLength > MAX_FILE_BYTES) {
        throw new InvalidCommand(`larger than ${MAX_FILE_BYTES} bytes`)
      }
      const data = JSON.parse(raw.toString('utf8')) as unknown
      const parsed = parseCommand(fileName.slice(0, -'.json'.length), data)
      commands.push({ ...parsed, argv: resolveExec(parsed.exec, appRoot) })
    } catch (error) {
      const reason = error instanceof InvalidCommand || error instanceof SyntaxError ? error.message : error instanceof Error ? error.name : 'Error'
      skipped.push({ file: fileName, reason })
    }
  }

  return {
    commands,
    skipped,
    invoke: (name, params) => invokeCommand(commands, name, params, appRoot),
  }
}

export function resolveExec(exec: string[], appRoot: string): string[] {
  const [program, ...rest] = exec
  if (!program) throw new InvalidCommand('exec must be a list of strings: the program and its arguments')
  const absolute = path.isAbsolute(program) ? program : path.resolve(appRoot, program)
  if (/\.(?:ts|tsx|js|mjs|cjs)$/.test(absolute)) {
    return [process.execPath, absolute, ...rest]
  }
  if (!path.isAbsolute(program)) {
    return [absolute, ...rest]
  }
  return [program, ...rest]
}

async function invokeCommand(
  commands: CommandSummary[],
  name: string,
  params: unknown,
  appRoot: string,
): Promise<InvocationRecord> {
  const started = performance.now()
  const command = commands.find(entry => entry.name === name)
  if (!command) {
    return record(name, {}, started, {
      stdout: '',
      stderr: '',
      result: null,
      exitCode: null,
      ok: false,
      error: `unknown command ${name}`,
    })
  }

  let checked: Record<string, unknown>
  try {
    checked = checkParams(command, params ?? {})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid parameters'
    return record(name, {}, started, {
      stdout: '',
      stderr: message,
      result: null,
      exitCode: null,
      ok: false,
      error: message,
    })
  }

  const proc = Bun.spawn(command.argv, {
    cwd: appRoot,
    stdin: new TextEncoder().encode(`${JSON.stringify(checked)}\n`),
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      LANG: process.env.LANG ?? 'C.UTF-8',
      GADGET_STATE_PATH: stateFilePath(appRoot),
      GADGET_APP_ROOT: appRoot,
    },
  })

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    proc.kill()
  }, command.timeoutMs)

  const [stdoutRaw, stderrRaw, exitCode] = await Promise.all([
    readStream(proc.stdout),
    readStream(proc.stderr),
    proc.exited,
  ])
  clearTimeout(timer)

  const stdout = cap(stdoutRaw)
  const stderr = cap(stderrRaw)
  if (timedOut) {
    return record(command.name, checked, started, {
      stdout,
      stderr,
      result: null,
      exitCode,
      ok: false,
      error: `timed out after ${command.timeoutMs} ms`,
    })
  }
  return record(command.name, checked, started, interpret(exitCode, stdout, stderr))
}

function invokeMissing(name: string, params: unknown): Promise<InvocationRecord> {
  const checked = params !== null && typeof params === 'object' && !Array.isArray(params) ? (params as Record<string, unknown>) : {}
  return Promise.resolve(
    record(name, checked, performance.now(), {
      stdout: '',
      stderr: '',
      result: null,
      exitCode: null,
      ok: false,
      error: `unknown command ${name}`,
    }),
  )
}

type Outcome = {
  stdout: string
  stderr: string
  result: unknown
  exitCode: number | null
  ok: boolean
  error: string | null
}

function interpret(exitCode: number, stdout: string, stderr: string): Outcome {
  if (exitCode !== 0) {
    const error = lastLine(stderr) || lastLine(stdout) || `exit ${exitCode}`
    return { stdout, stderr, result: null, exitCode, ok: false, error }
  }
  const trimmed = stdout.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { stdout, stderr, result: parsed, exitCode, ok: true, error: null }
      }
    } catch {
      // Non-JSON stdout is returned as text, matching the Linux SDK.
    }
  }
  return { stdout, stderr, result: { output: trimmed }, exitCode, ok: true, error: null }
}

function record(command: string, params: Record<string, unknown>, started: number, outcome: Outcome): InvocationRecord {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    source: 'mock',
    command,
    params,
    stdout: outcome.stdout,
    stderr: outcome.stderr,
    result: outcome.result,
    exitCode: outcome.exitCode,
    durationMs: Math.round(performance.now() - started),
    ok: outcome.ok,
    error: outcome.error,
  }
}

async function readStream(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return ''
  return new Response(stream).text()
}

function cap(text: string): string {
  const bytes = new TextEncoder().encode(text)
  if (bytes.byteLength <= MAX_OUTPUT_BYTES) return text
  return new TextDecoder().decode(bytes.slice(0, MAX_OUTPUT_BYTES))
}

function lastLine(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
  return lines.at(-1) ?? ''
}
