import path from 'node:path'
import { BUILTIN_COMMANDS, SESSION_STEPS, type InvocationRecord, type SessionEvent, type StatusResponse } from '../shared/api'
import { describeLive, probeLive, readSdkToken } from '../gadget/live'
import { loadRegistry } from '../gadget/registry'
import { readLight, stateFilePath } from '../gadget/state'

const PORT = Number(process.env.PORT ?? 8787)
const appRoot = path.resolve(import.meta.dir, '../..')
const commandsDir = process.env.MUSEGADGET_COMMANDS_DIR?.trim() || path.join(appRoot, 'commands')
const registry = loadRegistry(commandsDir, appRoot)
const invocations: InvocationRecord[] = []
let sessionRunning = false

const sdkToken = readSdkToken()
const live = await probeLive(sdkToken).catch(() =>
  describeLive({
    token: sdkToken,
    apiReachable: false,
    pairingStorePresent: false,
    serviceInstalled: false,
  }),
)

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function status(): StatusResponse {
  return {
    live,
    lightOn: readLight(stateFilePath(appRoot)),
    commands: registry.commands,
    skipped: registry.skipped,
    builtins: BUILTIN_COMMANDS,
    invocations,
  }
}

function remember(invocation: InvocationRecord): void {
  invocations.push(invocation)
  if (invocations.length > 50) invocations.shift()
}

async function handleInvoke(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { command?: unknown; params?: unknown } | null
  const command = typeof body?.command === 'string' ? body.command : ''
  if (!command) {
    return Response.json({ error: 'command is required' }, { status: 400 })
  }
  const invocation = await registry.invoke(command, body?.params ?? {})
  remember(invocation)
  return Response.json({ invocation, lightOn: readLight(stateFilePath(appRoot)) })
}

function handleSession(): Response {
  if (sessionRunning) {
    return Response.json({ error: 'a Muse session is already running' }, { status: 409 })
  }
  sessionRunning = true
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SessionEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }
      try {
        for (let index = 0; index < SESSION_STEPS.length; index += 1) {
          const step = SESSION_STEPS[index]
          if (!step) continue
          const invocation = await registry.invoke(step.command, step.params)
          remember(invocation)
          send({ type: 'invocation', invocation, lightOn: readLight(stateFilePath(appRoot)) })
          if (index < SESSION_STEPS.length - 1) await Bun.sleep(900)
        }
        send({ type: 'done' })
      } catch (error) {
        send({ type: 'error', message: error instanceof Error ? error.message : 'session failed' })
      } finally {
        sessionRunning = false
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  })
}

Bun.serve({
  hostname: '127.0.0.1',
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/api/status') {
      return Response.json(status())
    }
    if (request.method === 'POST' && url.pathname === '/api/invoke') {
      return handleInvoke(request)
    }
    if (request.method === 'POST' && url.pathname === '/api/session') {
      return handleSession()
    }
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: JSON_HEADERS })
  },
})

console.log(`gadget api http://127.0.0.1:${PORT} (${live.mode}, token ${live.tokenPresent ? 'set' : 'unset'})`)
