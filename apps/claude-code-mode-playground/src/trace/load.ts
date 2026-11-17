import samplePairJson from '../../traces/sample/todo-triage.json'
import type { TracePair } from './types'

export const samplePairs: TracePair[] = [samplePairJson as TracePair]

/**
 * Fetches live trace pairs recorded with `bun run record` from the dev-server
 * API. Returns an empty list when the API is unavailable (e.g. a static
 * build), leaving the bundled sample traces as the only option.
 */
export async function loadLivePairs(): Promise<TracePair[]> {
  try {
    const listResponse = await fetch('/api/traces')
    if (!listResponse.ok) return []
    const files = (await listResponse.json()) as string[]
    const pairs = await Promise.all(
      files.map(async (file) => {
        const response = await fetch(`/api/traces/${encodeURIComponent(file)}`)
        if (!response.ok) return null
        return (await response.json()) as TracePair
      }),
    )
    return pairs.filter((pair): pair is TracePair => pair !== null)
  } catch {
    return []
  }
}
