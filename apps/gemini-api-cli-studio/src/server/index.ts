import { copyFile, mkdir, mkdtemp, readFile, realpath, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  isTabId,
  OUTPUTS,
  PROMPTS,
  SAMPLE_INPUTS,
  type TabId,
} from '../commands/defaults'
import type { CommandInput } from '../commands/build'
import { executeRun, type ExecuteResult, type FixtureKind } from '../runner/execute'
import { missingBinaryHelp, missingKeyHelp } from '../runner/install-help'
import { keyIsConfigured, parseApiKeySource, redactSecrets, type KeySource } from '../runner/secrets'

const PORT = Number(process.env.PORT ?? 8787)
const INLINE_LIMIT = 14 * 1024 * 1024
const appRoot = path.resolve(new URL('../..', import.meta.url).pathname)

const JSON_HEADERS = { 'Content-Type': 'application/json' }

type SampleId = 'video' | 'image' | 'pdf'
type MediaRecord = { file: string; contentType: string }

const media = new Map<string, MediaRecord>()

const SAMPLE_FILES: Record<SampleId, { from: string; name: string }> = {
  video: { from: 'public/fixtures/sample-clip.mp4', name: SAMPLE_INPUTS.video },
  image: { from: 'public/fixtures/sample-brief.png', name: SAMPLE_INPUTS.image },
  pdf: { from: 'public/fixtures/sample-brief.pdf', name: SAMPLE_INPUTS.pdf },
}

function isSampleId(value: string): value is SampleId {
  return value === 'video' || value === 'image' || value === 'pdf'
}

function safeBasename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'upload'
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '')
  return cleaned.length > 0 ? cleaned.slice(0, 120) : 'upload'
}

function fixtureFor(tab: TabId): FixtureKind {
  switch (tab) {
    case 'video':
      return 'video'
    case 'document':
      return 'document'
    case 'tts':
      return 'tts'
    case 'image':
      return 'image'
    default: {
      const unreachable: never = tab
      return unreachable
    }
  }
}

function commandFor(tab: TabId, action: string, prompt: string, inputName: string): CommandInput {
  const question = prompt.trim()
  switch (tab) {
    case 'video':
      if (action === 'transcribe') {
        return { tool: 'transcribe', inputPath: inputName, outputPath: OUTPUTS.transcribe }
      }
      return { tool: 'analyze', inputPath: inputName, prompt: question || PROMPTS.video }
    case 'document':
      return { tool: 'analyze', inputPath: inputName, prompt: question || PROMPTS.ocr }
    case 'tts':
      return { tool: 'tts', prompt: question || PROMPTS.tts, outputPath: OUTPUTS.tts }
    case 'image':
      return { tool: 'image', prompt: question || PROMPTS.image, outputPath: OUTPUTS.image }
    default: {
      const unreachable: never = tab
      throw new Error(`Unknown tab ${String(unreachable)}`)
    }
  }
}

function needsInput(tab: TabId): boolean {
  switch (tab) {
    case 'video':
    case 'document':
      return true
    case 'tts':
    case 'image':
      return false
    default: {
      const unreachable: never = tab
      return unreachable
    }
  }
}

function contentTypeFor(file: string): string {
  switch (path.extname(file).toLowerCase()) {
    case '.wav':
      return 'audio/wav'
    case '.mp3':
      return 'audio/mpeg'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.srt':
    case '.txt':
    case '.md':
      return 'text/plain; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

function inside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

async function resolveWritten(work: string, stdout: string, fallbackRelative: string): Promise<string | null> {
  const workReal = await realpath(work)
  const candidates = [
    ...stdout.split('\n').map((line) => line.trim()).filter(Boolean),
    fallbackRelative,
  ]
  for (const candidate of candidates) {
    const absolute = path.resolve(workReal, candidate)
    if (!inside(workReal, absolute)) continue
    try {
      const info = await stat(absolute)
      if (info.isFile()) return absolute
    } catch {
      // Try the next candidate.
    }
  }
  return null
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

async function binaryVersion(binary: string): Promise<string | null> {
  try {
    const proc = Bun.spawn([binary, 'version'], {
      stdout: 'pipe',
      stderr: 'ignore',
      stdin: 'ignore',
    })
    const timer = setTimeout(() => proc.kill(), 4000)
    const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
    clearTimeout(timer)
    if (exitCode !== 0) return null
    return stdout.match(/gemini-api\s+(\S+)/)?.[1] ?? stdout.trim().split('\n')[0] ?? null
  } catch {
    return null
  }
}

async function readWhoami(binary: string): Promise<string | null> {
  try {
    const proc = Bun.spawn([binary, 'whoami', '--no-interactive', '--color', 'never'], {
      stdout: 'pipe',
      stderr: 'ignore',
      stdin: 'ignore',
    })
    const timer = setTimeout(() => proc.kill(), 4000)
    const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
    clearTimeout(timer)
    if (exitCode !== 0) return null
    return stdout
  } catch {
    return null
  }
}

async function statusPayload() {
  const binaryPath = Bun.which('gemini-api')
  const envPresent = Boolean(process.env.GEMINI_API_KEY?.trim())
  let source: KeySource = envPresent ? 'env' : 'unset'
  let version: string | null = null
  if (binaryPath) {
    version = await binaryVersion(binaryPath)
    const whoami = await readWhoami(binaryPath)
    if (whoami) source = parseApiKeySource(whoami)
  }
  const present = keyIsConfigured(source, envPresent)
  return {
    binary: binaryPath ? { found: true, path: binaryPath, version } : { found: false },
    key: { name: 'GEMINI_API_KEY', present, source },
    liveReady: Boolean(binaryPath) && present,
    help: {
      missingBinary: missingBinaryHelp(),
      missingKey: missingKeyHelp(),
    },
  }
}

async function handleRun(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null)
  if (!form) return json({ ok: false, message: 'Expected a form submission.' }, 400)

  const modeField = form.get('mode')
  const tabField = form.get('tab')
  const mode = modeField === 'live' ? 'live' : modeField === 'mock' ? 'mock' : null
  const tab = typeof tabField === 'string' && isTabId(tabField) ? tabField : null
  if (!mode || !tab) return json({ ok: false, message: 'Choose a mode and a tool.' }, 400)

  const action = form.get('action') === 'transcribe' ? 'transcribe' : 'analyze'
  if (action === 'transcribe' && tab !== 'video') {
    return json({ ok: false, message: 'Transcribe is only available on the Video tab.' }, 400)
  }

  const promptField = form.get('prompt')
  const prompt = typeof promptField === 'string' ? promptField : ''
  if (prompt.length > 8000) return json({ ok: false, message: 'Prompt is too long.' }, 400)

  const sampleField = form.get('sample')
  const sample = typeof sampleField === 'string' && isSampleId(sampleField) ? sampleField : null
  const upload = form.get('file')
  const file = upload instanceof File && upload.size > 0 ? upload : null

  if (needsInput(tab) && !sample && !file) {
    return json({ ok: false, message: 'Choose a sample or drop a file first.' }, 400)
  }
  if (file && file.size > INLINE_LIMIT) {
    return json({
      ok: false,
      message:
        'This file is over the ~14 MB inline limit. Upload it once with `gemini-api files upload --wait` and pass the files/... URI. This studio does not call the Files API.',
    }, 400)
  }
  if (tab === 'document' && sample === 'video') {
    return json({ ok: false, message: 'The Image/PDF tab takes an image or a PDF.' }, 400)
  }
  if (tab === 'video' && sample && sample !== 'video') {
    return json({ ok: false, message: 'The Video tab takes a video sample.' }, 400)
  }

  const work = await mkdtemp(path.join(tmpdir(), 'gemini-api-cli-studio-'))
  let inputName = ''
  if (sample && needsInput(tab)) {
    const spec = SAMPLE_FILES[sample]
    inputName = spec.name
    await copyFile(path.join(appRoot, spec.from), path.join(work, inputName))
  } else if (file && needsInput(tab)) {
    inputName = safeBasename(file.name)
    await Bun.write(path.join(work, inputName), file)
  }

  const command = commandFor(tab, action, prompt, inputName)
  if (command.tool === 'tts' || command.tool === 'image') {
    await mkdir(path.join(work, 'assets'), { recursive: true })
  }

  const secret = process.env.GEMINI_API_KEY
  const result = await executeRun(
    { mode, fixture: fixtureFor(tab), command },
    {
      which: () => Bun.which('gemini-api'),
      keyPresent: keyIsConfigured(
        secret?.trim() ? 'env' : 'unset',
        Boolean(secret?.trim()),
      ),
      spawn: (argv) => spawnGemini(argv, work),
    },
  )

  // whoami can see a keychain credential when GEMINI_API_KEY is empty.
  // Re-check only when live was blocked for a missing key and the binary exists.
  const finished = await allowKeychain(result, mode, command, tab, work)
  return json(await present(finished, work, command))
}

async function allowKeychain(
  result: ExecuteResult,
  mode: 'mock' | 'live',
  command: CommandInput,
  tab: TabId,
  work: string,
): Promise<ExecuteResult> {
  if (mode !== 'live' || result.ok || result.message == null) return result
  if (!result.message.includes('this server has no API key')) return result
  const binary = Bun.which('gemini-api')
  if (!binary) return result
  const whoami = await readWhoami(binary)
  if (!whoami) return result
  const source = parseApiKeySource(whoami)
  if (!keyIsConfigured(source, false)) return result
  return executeRun(
    { mode: 'live', fixture: fixtureFor(tab), command },
    {
      which: () => binary,
      keyPresent: true,
      spawn: (argv) => spawnGemini(argv, work),
    },
  )
}

async function spawnGemini(argv: string[], cwd: string) {
  const secret = process.env.GEMINI_API_KEY
  if (secret && secret.trim().length >= 8 && argv.some((arg) => arg === secret.trim())) {
    return { exitCode: 2, stdout: '', stderr: 'Refusing to pass the API key as an argument.' }
  }
  const proc = Bun.spawn(argv, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
    env: { ...process.env, NO_COLOR: '1' },
  })
  const timer = setTimeout(() => proc.kill(), 240_000)
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    return {
      exitCode,
      stdout: redactSecrets(stdout, secret),
      stderr: redactSecrets(stderr, secret),
    }
  } finally {
    clearTimeout(timer)
  }
}

async function present(result: ExecuteResult, work: string, command: CommandInput) {
  const secret = process.env.GEMINI_API_KEY
  let text = result.text ? redactSecrets(result.text, secret) : result.text
  let mediaUrl = result.mediaHref

  if (!result.mock && result.ok) {
    const fallback = outputRelative(command)
    if (fallback) {
      const written = await resolveWritten(work, result.text ?? '', fallback)
      if (written && (command.tool === 'transcribe' || command.tool === 'tts' || command.tool === 'image')) {
        if (command.tool === 'transcribe') {
          text = redactSecrets(await readFile(written, 'utf8'), secret)
        } else {
          const id = crypto.randomUUID()
          media.set(id, { file: written, contentType: contentTypeFor(written) })
          mediaUrl = `/api/media/${id}`
          text = result.text
        }
      }
    }
  }

  return {
    ok: result.ok,
    mock: result.mock,
    command: redactSecrets(result.command, secret),
    cwd: work,
    kind: result.kind,
    text,
    mediaUrl,
    message: result.message ? redactSecrets(result.message, secret) : undefined,
  }
}

function outputRelative(command: CommandInput): string | null {
  switch (command.tool) {
    case 'analyze':
      return null
    case 'transcribe':
    case 'tts':
    case 'image':
      return command.outputPath
    default: {
      const unreachable: never = command
      return unreachable
    }
  }
}

async function serveMedia(id: string): Promise<Response> {
  const record = media.get(id)
  if (!record) return new Response('Not found', { status: 404 })
  const file = Bun.file(record.file)
  if (!(await file.exists())) return new Response('Not found', { status: 404 })
  return new Response(file, {
    headers: { 'Content-Type': record.contentType, 'Cache-Control': 'no-store' },
  })
}

const server = Bun.serve({
  port: PORT,
  hostname: '127.0.0.1',
  idleTimeout: 255,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/api/status' && request.method === 'GET') {
      return json(await statusPayload())
    }
    if (url.pathname === '/api/run' && request.method === 'POST') {
      return handleRun(request)
    }
    if (url.pathname.startsWith('/api/media/') && request.method === 'GET') {
      return serveMedia(url.pathname.slice('/api/media/'.length))
    }
    return new Response('Not found', { status: 404 })
  },
})

console.log(`[gemini-api-cli-studio] API listening on http://127.0.0.1:${server.port}`)
