export type CommandInput =
  | { tool: 'analyze'; inputPath: string; prompt: string }
  | { tool: 'transcribe'; inputPath: string; outputPath: string }
  | { tool: 'tts'; prompt: string; outputPath: string }
  | { tool: 'image'; prompt: string; outputPath: string }

/**
 * Argv for the four studio tools. Flag order follows `gemini-api` 0.5.0
 * `--help` examples and the CLI README. The API key is never an argument.
 */
export function buildArgv(input: CommandInput): string[] {
  switch (input.tool) {
    case 'analyze':
      return ['gemini-api', 'analyze', '--input', input.inputPath, input.prompt]
    case 'transcribe':
      return [
        'gemini-api',
        'transcribe',
        '--input',
        input.inputPath,
        '--format',
        'srt',
        '--out',
        input.outputPath,
      ]
    case 'tts':
      return ['gemini-api', 'tts', input.prompt, '--out', input.outputPath]
    case 'image':
      return ['gemini-api', 'image', input.prompt, '--out', input.outputPath]
    default: {
      const unreachable: never = input
      return unreachable
    }
  }
}
