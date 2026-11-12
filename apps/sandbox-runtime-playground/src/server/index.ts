import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { parsePolicy } from '../sandbox/policy'
import {
  checkSandboxDependencies,
  runSandboxed,
  runUnsandboxed,
  type RunEvent,
} from '../sandbox/runner'
import { PRESETS } from './presets'

const PORT = Number(process.env.PORT ?? 8787)

// Target for the "Read .env secrets" preset. Generated locally (a committed
// .env would be blocked by the repo's gitignore) with obviously fake values.
const FIXTURE_ENV_PATH = 'fixtures/secrets/.env'
if (!existsSync(FIXTURE_ENV_PATH)) {
  mkdirSync('fixtures/secrets', { recursive: true })
  writeFileSync(
    FIXTURE_ENV_PATH,
    [
      '# Fake secrets used by the "Read .env secrets" preset attack. Not real keys.',
      'OPENAI_API_KEY=sk-proj-FAKE1234567890abcdefghijklmnop',
      'DATABASE_URL=postgres://admin:hunter2@prod-db.internal:5432/app',
      'STRIPE_SECRET_KEY=sk_live_FAKEabcdef1234567890',
      'AWS_SECRET_ACCESS_KEY=FAKEwJalrXUtnFEMIK7MDENGbPxRfiCY',
      '',
    ].join('\n'),
  )
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

type RunMode = 'both' | 'sandboxed' | 'unsandboxed'

function parseMode(value: unknown): RunMode {
  return value === 'sandboxed' || value === 'unsandboxed' ? value : 'both'
}

async function handleRun(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    command?: unknown
    policy?: unknown
    mode?: unknown
  } | null
  const command = typeof body?.command === 'string' ? body.command.trim() : ''
  if (!command) {
    return new Response(JSON.stringify({ error: 'command is required' }), { status: 400, headers: JSON_HEADERS })
  }
  const policy = parsePolicy(body?.policy)
  const mode = parseMode(body?.mode)

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (event: RunEvent | { type: 'done' }) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        } catch {
          // Client disconnected mid-run; the child keeps running to completion.
        }
      }
      try {
        if (mode === 'both' || mode === 'unsandboxed') {
          await runUnsandboxed(command, send)
        }
        if (mode === 'both' || mode === 'sandboxed') {
          await runSandboxed(command, policy, send)
        }
      } catch (error) {
        send({ type: 'error', lane: 'sandboxed', message: error instanceof Error ? error.message : String(error) })
      }
      send({ type: 'done' })
      try {
        controller.close()
      } catch {
        // Already closed by a client disconnect.
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}

const server = Bun.serve({
  port: PORT,
  hostname: '127.0.0.1',
  idleTimeout: 120,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/api/health') {
      const deps = await checkSandboxDependencies()
      return new Response(JSON.stringify({ ok: deps.errors.length === 0, ...deps }), { headers: JSON_HEADERS })
    }
    if (url.pathname === '/api/presets') {
      return new Response(JSON.stringify(PRESETS), { headers: JSON_HEADERS })
    }
    if (url.pathname === '/api/run' && request.method === 'POST') {
      return handleRun(request)
    }
    return new Response('Not found', { status: 404 })
  },
})

console.log(`[playground] sandbox API listening on http://127.0.0.1:${server.port}`)
