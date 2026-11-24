export type RunMode = 'mock' | 'live'

export type KeySource = 'unset' | 'env' | 'keyring' | 'config' | 'flag' | 'default' | 'unknown'

export type StatusResponse = {
  binary: { found: true; path: string; version: string | null } | { found: false }
  key: { name: 'GEMINI_API_KEY'; present: boolean; source: KeySource }
  liveReady: boolean
  help: { missingBinary: string; missingKey: string }
}

export type RunResponse = {
  ok: boolean
  mock?: boolean
  command?: string
  cwd?: string
  kind?: 'text' | 'audio' | 'image' | 'blocked'
  text?: string
  mediaUrl?: string
  message?: string
}
