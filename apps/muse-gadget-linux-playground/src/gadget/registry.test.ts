import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, test } from 'bun:test'
import { describeLive } from './live'
import { loadRegistry } from './registry'

const appRoot = path.resolve(import.meta.dir, '../..')
const commandsDir = path.join(appRoot, 'commands')
let stateDir: string | null = null

afterEach(() => {
  delete process.env.GADGET_STATE_PATH
  if (stateDir) rmSync(stateDir, { recursive: true, force: true })
  stateDir = null
})

test('custom commands load from JSON descriptors and mock mode starts with no token', async () => {
  const live = describeLive({
    token: null,
    apiReachable: null,
    pairingStorePresent: false,
    serviceInstalled: false,
  })
  expect(live.mode).toBe('mock')
  expect(live.connected).toBe(false)
  expect(live.attempted).toBe(false)
  expect(live.tokenPresent).toBe(false)

  stateDir = mkdtempSync(path.join(tmpdir(), 'muse-gadget-'))
  process.env.GADGET_STATE_PATH = path.join(stateDir, 'state.json')
  const registry = loadRegistry(commandsDir, appRoot)
  expect(registry.skipped).toEqual([])
  expect(registry.commands.map(command => command.name)).toEqual(['chore.disk', 'host.stats', 'light.toggle'])
  for (const command of registry.commands) {
    expect(command.exec[0]?.endsWith('.ts')).toBe(true)
    expect(path.isAbsolute(command.argv[0] ?? '')).toBe(true)
  }

  const stats = await registry.invoke('host.stats', {})
  expect(stats.ok).toBe(true)
  expect(stats.exitCode).toBe(0)
  const statsResult = stats.result as {
    uptime_seconds: number
    load: number[]
    memory: { total_bytes: number; available_bytes: number; used_bytes: number }
  }
  expect(typeof statsResult.uptime_seconds).toBe('number')
  expect(statsResult.load).toHaveLength(3)
  expect(statsResult.load.every(value => typeof value === 'number' && Number.isFinite(value))).toBe(true)
  expect(typeof statsResult.memory.total_bytes).toBe('number')
  expect(statsResult.memory.total_bytes).toBeGreaterThan(0)
  expect(typeof statsResult.memory.available_bytes).toBe('number')
  expect(typeof statsResult.memory.used_bytes).toBe('number')

  const firstLight = await registry.invoke('light.toggle', {})
  expect(firstLight.ok).toBe(true)
  expect(firstLight.exitCode).toBe(0)
  expect(firstLight.result).toEqual({ on: true })
  const secondLight = await registry.invoke('light.toggle', {})
  expect(secondLight.result).toEqual({ on: false })

  const chore = await registry.invoke('chore.disk', { path: '/etc', command: 'rm -rf /' })
  expect(chore.ok).toBe(true)
  expect(chore.exitCode).toBe(0)
  expect(chore.params).toEqual({})
  const choreResult = chore.result as {
    command: string[]
    path: string
    bounded: boolean
    exit_code: number
    output: string
  }
  expect(choreResult.bounded).toBe(true)
  expect(choreResult.exit_code).toBe(0)
  expect(choreResult.command.slice(0, 2)).toEqual(['df', '-h'])
  expect(choreResult.command).toHaveLength(3)
  expect(choreResult.path).toBe(appRoot)
  expect(choreResult.output).toContain('Filesystem')
}, 20_000)
