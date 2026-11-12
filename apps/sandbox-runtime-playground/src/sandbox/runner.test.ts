import { afterAll, expect, test } from 'bun:test'
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'
import type { Policy } from './policy'
import { checkSandboxDependencies, runSandboxed, type RunEvent } from './runner'

const policy: Policy = {
  allowedDomains: ['api.github.com'],
  deniedDomains: [],
  denyRead: ['./fixtures/secrets'],
  allowRead: [],
  allowWrite: ['.'],
  denyWrite: [],
}

function capture() {
  const chunks: string[] = []
  const onEvent = (event: RunEvent) => {
    if (event.type === 'stdout' || event.type === 'stderr') chunks.push(event.data)
  }
  return { chunks, onEvent }
}

afterAll(async () => {
  await SandboxManager.reset()
})

test('policy application: denied read and denied network are blocked, allowed command succeeds', async () => {
  const deps = await checkSandboxDependencies()
  expect(deps.errors).toEqual([])

  // Denied read: ./fixtures/secrets is masked by the sandbox.
  const read = capture()
  const readResult = await runSandboxed('cat fixtures/secrets/.env', policy, read.onEvent)
  expect(readResult.code).not.toBe(0)
  expect(read.chunks.join('')).not.toContain('OPENAI_API_KEY')

  // Denied network: example.com is not on the allowlist.
  const net = capture()
  const netResult = await runSandboxed(
    'curl -sS --max-time 10 https://example.com',
    policy,
    net.onEvent,
  )
  expect(netResult.code).not.toBe(0)
  expect(netResult.violations.some(line => line.includes('example.com'))).toBe(true)

  // Allowed command: plain stdout plus a write inside allowWrite.
  // Must not inherit the network denial from the run above.
  const ok = capture()
  const okResult = await runSandboxed(
    'echo sandbox-says-hello > scratch-test.txt && cat scratch-test.txt && rm scratch-test.txt',
    policy,
    ok.onEvent,
  )
  expect(okResult.code).toBe(0)
  expect(okResult.violations).toEqual([])
  expect(ok.chunks.join('')).toContain('sandbox-says-hello')
}, 90_000)
