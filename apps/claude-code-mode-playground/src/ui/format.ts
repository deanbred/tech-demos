export function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export function formatTokens(tokens: number): string {
  if (tokens >= 10_000) return `${(tokens / 1000).toFixed(1)}k`
  return tokens.toLocaleString('en-US')
}
