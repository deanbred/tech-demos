import { buildArgv, type CommandInput } from '../commands/build'
import { formatShell } from '../commands/shell'
import { missingBinaryHelp, missingKeyHelp } from './install-help'

export type FixtureKind = 'video' | 'document' | 'tts' | 'image'

export type ExecuteInput = {
  mode: 'mock' | 'live'
  fixture: FixtureKind
  command: CommandInput
}

export type SpawnResult = {
  exitCode: number
  stdout: string
  stderr: string
}

export type ExecuteDeps = {
  which: () => string | null
  spawn: (argv: string[]) => Promise<SpawnResult>
  keyPresent: boolean
}

export type ExecuteResult = {
  ok: boolean
  mock: boolean
  argv: string[]
  command: string
  kind: 'text' | 'audio' | 'image' | 'blocked'
  text?: string
  mediaHref?: string
  message?: string
}

const VIDEO_TEXT = [
  'MOCK',
  '',
  '0:00 — Title slate reads "SAMPLE CLIP".',
  '0:02 — The frame holds on the slate. This fixture has no speech.',
  '',
  'MOCK fixture. Not a model response.',
].join('\n')

const DOCUMENT_TEXT = [
  'MOCK',
  '',
  'SAMPLE BRIEF',
  'Gemini API CLI Studio',
  'Build the studio first.',
  '',
  'MOCK fixture. Not a model response.',
].join('\n')

const TRANSCRIPT_TEXT = [
  'MOCK',
  '',
  '1',
  '00:00:00,000 --> 00:00:02,000',
  'SAMPLE CLIP',
  '',
  'MOCK fixture. Not a model transcript.',
].join('\n')

const TTS_TEXT = 'MOCK\n\nAudio fixture. Not a model voiceover.'
const IMAGE_TEXT = 'MOCK\n\nImage fixture. Not a model image.'

function kindFor(tool: CommandInput['tool']): 'text' | 'audio' | 'image' {
  switch (tool) {
    case 'analyze':
    case 'transcribe':
      return 'text'
    case 'tts':
      return 'audio'
    case 'image':
      return 'image'
    default: {
      const unreachable: never = tool
      return unreachable
    }
  }
}

function mockResult(input: ExecuteInput, argv: string[], command: string): ExecuteResult {
  const base = { ok: true as const, mock: true as const, argv, command }
  switch (input.command.tool) {
    case 'analyze':
      return {
        ...base,
        kind: 'text',
        text: input.fixture === 'document' ? DOCUMENT_TEXT : VIDEO_TEXT,
      }
    case 'transcribe':
      return { ...base, kind: 'text', text: TRANSCRIPT_TEXT }
    case 'tts':
      return {
        ...base,
        kind: 'audio',
        text: TTS_TEXT,
        mediaHref: '/fixtures/mock-welcome.wav',
      }
    case 'image':
      return {
        ...base,
        kind: 'image',
        text: IMAGE_TEXT,
        mediaHref: '/fixtures/mock-mascot.png',
      }
    default: {
      const unreachable: never = input.command
      return unreachable
    }
  }
}

export async function executeRun(input: ExecuteInput, deps: ExecuteDeps): Promise<ExecuteResult> {
  const argv = buildArgv(input.command)
  const command = formatShell(argv)

  if (input.mode === 'mock') {
    return mockResult(input, argv, command)
  }

  if (deps.which() === null) {
    return {
      ok: false,
      mock: false,
      argv,
      command,
      kind: 'blocked',
      message: missingBinaryHelp(),
    }
  }

  if (!deps.keyPresent) {
    return {
      ok: false,
      mock: false,
      argv,
      command,
      kind: 'blocked',
      message: missingKeyHelp(),
    }
  }

  let spawned: SpawnResult
  try {
    spawned = await deps.spawn(argv)
  } catch (error) {
    return {
      ok: false,
      mock: false,
      argv,
      command,
      kind: 'blocked',
      message: error instanceof Error ? error.message : 'gemini-api failed to start',
    }
  }

  if (spawned.exitCode !== 0) {
    const detail = [spawned.stderr.trim(), spawned.stdout.trim()].filter(Boolean).join('\n')
    return {
      ok: false,
      mock: false,
      argv,
      command,
      kind: kindFor(input.command.tool),
      message: detail || `gemini-api exited ${spawned.exitCode}`,
    }
  }

  return {
    ok: true,
    mock: false,
    argv,
    command,
    kind: kindFor(input.command.tool),
    text: spawned.stdout.trim(),
  }
}
