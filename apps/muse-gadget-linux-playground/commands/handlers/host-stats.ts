import { readFileSync } from 'node:fs'

try {
  await new Response(Bun.stdin).text()
  const uptime = Number(readFileSync('/proc/uptime', 'utf8').trim().split(/\s+/)[0])
  const loadFields = readFileSync('/proc/loadavg', 'utf8').trim().split(/\s+/)
  const load = [Number(loadFields[0]), Number(loadFields[1]), Number(loadFields[2])]
  const meminfo = readFileSync('/proc/meminfo', 'utf8')
  const total = kilobytes(meminfo, 'MemTotal')
  const available = kilobytes(meminfo, 'MemAvailable')
  if (![uptime, ...load, total, available].every(value => Number.isFinite(value))) {
    throw new Error('could not parse /proc stats')
  }
  process.stdout.write(
    JSON.stringify({
      uptime_seconds: uptime,
      load,
      memory: {
        total_bytes: total,
        available_bytes: available,
        used_bytes: total - available,
      },
    }),
  )
} catch (error) {
  const message = error instanceof Error ? error.message : 'stats failed'
  process.stderr.write(message)
  process.exit(1)
}

function kilobytes(meminfo: string, name: string): number {
  const match = meminfo.match(new RegExp(`^${name}:\\s+(\\d+)`, 'm'))
  if (!match?.[1]) throw new Error(`missing ${name}`)
  return Number(match[1]) * 1024
}
