export interface AppConfig {
  name: string
  retries: number
  timeoutMs: number
}

// TODO: read overrides from environment variables instead of hardcoding
export const defaultConfig: AppConfig = {
  name: 'sample-app',
  retries: 3,
  timeoutMs: 5_000,
}

export function mergeConfig(overrides: Partial<AppConfig>): AppConfig {
  // TODO: validate that retries >= 0 and timeoutMs > 0
  return { ...defaultConfig, ...overrides }
}
