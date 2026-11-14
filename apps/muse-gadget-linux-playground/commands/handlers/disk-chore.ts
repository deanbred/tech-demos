import path from 'node:path'

const FIXED_ARGV = ['df', '-h'] as const

try {
  await new Response(Bun.stdin).text()
  const root = process.env.GADGET_APP_ROOT?.trim()
  if (!root) throw new Error('GADGET_APP_ROOT is not set')
  const target = path.resolve(root)
  const argv = [...FIXED_ARGV, target]
  const proc = Bun.spawn(argv, { stdout: 'pipe', stderr: 'pipe' })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    process.stderr.write(lastLine(stderr) || lastLine(stdout) || 'df failed')
    process.exit(exitCode || 1)
  }
  process.stdout.write(
    JSON.stringify({
      command: argv,
      path: target,
      bounded: true,
      exit_code: 0,
      output: stdout.trim(),
    }),
  )
} catch (error) {
  const message = error instanceof Error ? error.message : 'disk chore failed'
  process.stderr.write(message)
  process.exit(1)
}

function lastLine(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
  return lines.at(-1) ?? ''
}
