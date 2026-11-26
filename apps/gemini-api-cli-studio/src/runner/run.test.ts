import { describe, expect, test } from 'bun:test'
import { buildArgv } from '../commands/build'
import { OUTPUTS, PROMPTS, SAMPLE_INPUTS } from '../commands/defaults'
import { formatShell } from '../commands/shell'
import { executeRun, type ExecuteDeps } from './execute'
import { parseApiKeySource } from './secrets'

const silent: ExecuteDeps = {
  which: () => {
    throw new Error('which should not run in mock mode')
  },
  spawn: () => {
    throw new Error('spawn should not run in mock mode')
  },
  keyPresent: false,
}

describe('gemini-api command builder', () => {
  test('emits the documented argv for each tab', () => {
    expect(
      buildArgv({
        tool: 'analyze',
        inputPath: SAMPLE_INPUTS.video,
        prompt: PROMPTS.video,
      }),
    ).toEqual([
      'gemini-api',
      'analyze',
      '--input',
      'interview.mp4',
      'List the key action items with timestamps',
    ])

    expect(
      buildArgv({
        tool: 'analyze',
        inputPath: SAMPLE_INPUTS.pdf,
        prompt: PROMPTS.ocr,
      }),
    ).toEqual([
      'gemini-api',
      'analyze',
      '--input',
      'product-brief.pdf',
      'Extract all visible text, preserving structure.',
    ])

    expect(
      buildArgv({
        tool: 'tts',
        prompt: PROMPTS.tts,
        outputPath: OUTPUTS.tts,
      }),
    ).toEqual([
      'gemini-api',
      'tts',
      "Welcome. Let's build something together.",
      '--out',
      './assets/welcome.wav',
    ])

    expect(
      buildArgv({
        tool: 'image',
        prompt: PROMPTS.image,
        outputPath: OUTPUTS.image,
      }),
    ).toEqual([
      'gemini-api',
      'image',
      'A friendly robot mascot, soft studio lighting',
      '--out',
      './assets/mascot.jpg',
    ])

    expect(
      buildArgv({
        tool: 'transcribe',
        inputPath: SAMPLE_INPUTS.video,
        outputPath: OUTPUTS.transcribe,
      }),
    ).toEqual([
      'gemini-api',
      'transcribe',
      '--input',
      'interview.mp4',
      '--format',
      'srt',
      '--out',
      'interview.srt',
    ])

    const tts = formatShell(
      buildArgv({ tool: 'tts', prompt: PROMPTS.tts, outputPath: OUTPUTS.tts }),
    )
    expect(tts).toBe(
      'gemini-api tts "Welcome. Let\'s build something together." --out ./assets/welcome.wav',
    )
    expect(tts).not.toContain('GEMINI_API_KEY')
  })

  test('mock mode never shells out and labels MOCK', async () => {
    const result = await executeRun(
      {
        mode: 'mock',
        fixture: 'video',
        command: {
          tool: 'analyze',
          inputPath: SAMPLE_INPUTS.video,
          prompt: PROMPTS.video,
        },
      },
      silent,
    )
    expect(result.ok).toBe(true)
    expect(result.mock).toBe(true)
    expect(result.text).toContain('MOCK')
    expect(result.command).toBe(
      'gemini-api analyze --input interview.mp4 "List the key action items with timestamps"',
    )

    const image = await executeRun(
      {
        mode: 'mock',
        fixture: 'image',
        command: { tool: 'image', prompt: PROMPTS.image, outputPath: OUTPUTS.image },
      },
      silent,
    )
    expect(image.mediaHref).toBe('/fixtures/mock-mascot.png')
    expect(image.text).toContain('MOCK')

    const speech = await executeRun(
      {
        mode: 'mock',
        fixture: 'tts',
        command: { tool: 'tts', prompt: PROMPTS.tts, outputPath: OUTPUTS.tts },
      },
      silent,
    )
    expect(speech.kind).toBe('audio')
    expect(speech.mediaHref).toBe('/fixtures/mock-welcome.wav')
    expect(speech.text).toContain('MOCK')
  })

  test('a missing binary returns install help instead of throwing', async () => {
    let spawned = 0
    const result = await executeRun(
      {
        mode: 'live',
        fixture: 'image',
        command: { tool: 'image', prompt: PROMPTS.image, outputPath: OUTPUTS.image },
      },
      {
        which: () => null,
        spawn: async () => {
          spawned += 1
          return { exitCode: 0, stdout: '', stderr: '' }
        },
        keyPresent: true,
      },
    )
    expect(spawned).toBe(0)
    expect(result.ok).toBe(false)
    expect(result.kind).toBe('blocked')
    expect(result.message).toContain('install.sh')
    expect(result.message).toContain('v0.5.0')
    expect(result.message).toContain('GEMINI_API_KEY')
    expect(result.command).toContain('gemini-api image')
  })

  test('a missing key does not spawn', async () => {
    let spawned = 0
    const result = await executeRun(
      {
        mode: 'live',
        fixture: 'tts',
        command: { tool: 'tts', prompt: PROMPTS.tts, outputPath: OUTPUTS.tts },
      },
      {
        which: () => '/usr/local/bin/gemini-api',
        spawn: async () => {
          spawned += 1
          return { exitCode: 0, stdout: '', stderr: '' }
        },
        keyPresent: false,
      },
    )
    expect(spawned).toBe(0)
    expect(result.message).toContain('export GEMINI_API_KEY=')
    expect(result.message).toContain('gemini-api configure --api-key')
    expect(result.message).toContain('gemini-api whoami')
  })

  test('whoami source tags parse without treating unset as configured', () => {
    const unset = parseApiKeySource('  --api-key                   [unset  ] (not set)')
    expect(unset).toBe('unset')
    expect(parseApiKeySource('  --api-key                   [keyring] ')).toBe('keyring')
    expect(parseApiKeySource('  --api-key                   [env    ] ')).toBe('env')
  })
})
