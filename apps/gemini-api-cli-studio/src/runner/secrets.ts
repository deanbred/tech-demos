export type KeySource = 'unset' | 'env' | 'keyring' | 'config' | 'flag' | 'default' | 'unknown'

const KEY_SOURCES = ['unset', 'env', 'keyring', 'config', 'flag', 'default'] as const

export function parseApiKeySource(whoami: string): KeySource {
  const line = whoami.split('\n').find((entry) => entry.includes('--api-key'))
  const tag = line?.match(/\[(\w+)/)?.[1]
  if (!tag) return 'unknown'
  if ((KEY_SOURCES as readonly string[]).includes(tag)) return tag as KeySource
  return 'unknown'
}

export function keyIsConfigured(source: KeySource, envPresent: boolean): boolean {
  if (envPresent) return true
  switch (source) {
    case 'env':
    case 'keyring':
    case 'config':
    case 'flag':
      return true
    case 'unset':
    case 'default':
    case 'unknown':
      return false
    default: {
      const unreachable: never = source
      return unreachable
    }
  }
}

/** Hide a configured key if a command or model reply echoes it. */
export function redactSecrets(text: string, secret: string | undefined): string {
  const value = secret?.trim()
  if (!value || value.length < 8) return text
  return text.split(value).join('[redacted]')
}
