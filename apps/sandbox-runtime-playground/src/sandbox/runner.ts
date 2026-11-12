import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'
import { toRuntimeConfig, type Policy } from './policy'

export type Lane = 'sandboxed' | 'unsandboxed'

export type RunEvent =
  | { type: 'start'; lane: Lane; command: string }
  | { type: 'stdout'; lane: Lane; data: string }
  | { type: 'stderr'; lane: Lane; data: string }
  | { type: 'violation'; lane: Lane; line: string }
  | { type: 'exit'; lane: Lane; code: number; violations: string[]; durationMs: number }
  | { type: 'error'; lane: Lane; message: string }

export interface RunResult {
  code: number
  violations: string[]
}

export interface DependencyStatus {
  platform: NodeJS.Platform
  supported: boolean
  errors: string[]
  warnings: string[]
}

const RUN_TIMEOUT_MS = 30_000

export async function checkSandboxDependencies(): Promise<DependencyStatus> {
  const supported = SandboxManager.isSupportedPlatform()
  if (!supported) {
    return {
      platform: process.platform,
      supported,
      errors: [`Platform ${process.platform} is not supported by sandbox-runtime (Linux and macOS only here).`],
      warnings: [],
    }
  }
  const check = await SandboxManager.checkDependenciesAsync()
  return {
    platform: process.platform,
    supported,
    errors: [...check.errors],
    warnings: [...check.warnings],
  }
}

/**
 * SandboxManager holds global state (proxy servers, violation store), so
 * runs are serialized: each sandboxed run resets and re-initializes with
 * its own policy.
 */
let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task)
  queue = next.catch(() => {})
  return next
}

function spawnAndStream(
  command: string,
  lane: Lane,
  onEvent: (event: RunEvent) => void,
): Promise<number> {
  return new Promise(resolve => {
    const child = spawn(command, { shell: '/bin/bash', cwd: process.cwd() })
    let settled = false
    const timer = setTimeout(() => {
      onEvent({ type: 'stderr', lane, data: `\n[playground] timed out after ${RUN_TIMEOUT_MS / 1000}s, killing process\n` })
      child.kill('SIGKILL')
    }, RUN_TIMEOUT_MS)

    child.stdout.on('data', (chunk: Buffer) => onEvent({ type: 'stdout', lane, data: chunk.toString() }))
    child.stderr.on('data', (chunk: Buffer) => onEvent({ type: 'stderr', lane, data: chunk.toString() }))
    const finish = (code: number) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(code)
    }
    child.on('error', err => {
      onEvent({ type: 'error', lane, message: err.message })
      finish(-1)
    })
    child.on('close', code => finish(code ?? -1))
  })
}

export function runUnsandboxed(command: string, onEvent: (event: RunEvent) => void): Promise<RunResult> {
  return enqueue(async () => {
    const started = Date.now()
    onEvent({ type: 'start', lane: 'unsandboxed', command })
    const code = await spawnAndStream(command, 'unsandboxed', onEvent)
    onEvent({ type: 'exit', lane: 'unsandboxed', code, violations: [], durationMs: Date.now() - started })
    return { code, violations: [] }
  })
}

export function runSandboxed(
  command: string,
  policy: Policy,
  onEvent: (event: RunEvent) => void,
): Promise<RunResult> {
  return enqueue(async () => {
    const started = Date.now()
    // Fresh session per run so the policy from the editor fully applies.
    await SandboxManager.reset()
    await SandboxManager.initialize(toRuntimeConfig(policy))

    // reset() tears the proxies down but keeps the in-memory violation
    // tail, and a new subscriber is immediately handed that whole tail.
    // Drop it so one run cannot inherit the previous run's denies.
    const store = SandboxManager.getSandboxViolationStore()
    store.clear()

    const commandId = randomUUID()
    const seen = new Set<string>()
    const seenLines: string[] = []
    // The client resets the lane on start, so this precedes every violation
    // event the subscriber streams.
    onEvent({ type: 'start', lane: 'sandboxed', command })
    const unsubscribe = store.subscribe(violations => {
      for (const violation of violations) {
        const key = `${violation.timestamp?.toISOString?.() ?? ''}|${violation.line}`
        if (seen.has(key)) continue
        seen.add(key)
        seenLines.push(violation.line)
        onEvent({ type: 'violation', lane: 'sandboxed', line: violation.line })
      }
    })

    try {
      const wrapped = await SandboxManager.wrapWithSandbox(
        command,
        '/bin/bash',
        undefined,
        undefined,
        { commandId, commandText: command },
      )
      const code = await spawnAndStream(wrapped, 'sandboxed', onEvent)
      // Give async violation reporters (proxy denies) a beat to land.
      await new Promise(r => setTimeout(r, 150))
      const attributed = store.getViolationsForCommand(commandId).map(v => v.line)
      const violations = attributed.length > 0 ? attributed : seenLines
      onEvent({ type: 'exit', lane: 'sandboxed', code, violations, durationMs: Date.now() - started })
      return { code, violations }
    } finally {
      unsubscribe()
      SandboxManager.cleanupAfterCommand()
    }
  })
}
