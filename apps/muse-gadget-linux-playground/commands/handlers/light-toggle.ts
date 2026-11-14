import { readLight, writeLight } from '../../src/gadget/state.ts'

try {
  await new Response(Bun.stdin).text()
  const file = process.env.GADGET_STATE_PATH?.trim()
  if (!file) throw new Error('GADGET_STATE_PATH is not set')
  const on = !readLight(file)
  writeLight(file, on)
  process.stdout.write(JSON.stringify({ on }))
} catch (error) {
  const message = error instanceof Error ? error.message : 'light toggle failed'
  process.stderr.write(message)
  process.exit(1)
}
