import type { Bar } from "../engine/types.ts"

export const DATA_LABEL = "Synthetic data"

export type PriceBook = {
  label: typeof DATA_LABEL
  seedNote: string
  start: string
  end: string
  symbols: Record<string, Bar[]>
}

function isBar(value: unknown): value is Bar {
  if (typeof value !== "object" || value === null) return false
  const bar = value as Bar
  return (
    typeof bar.date === "string" &&
    typeof bar.open === "number" &&
    typeof bar.high === "number" &&
    typeof bar.low === "number" &&
    typeof bar.close === "number" &&
    typeof bar.volume === "number"
  )
}

export function parsePriceBook(value: unknown): PriceBook {
  if (typeof value !== "object" || value === null || !("symbols" in value)) {
    throw new Error("Price bundle is missing symbols")
  }
  const book = value as PriceBook
  if (book.label !== DATA_LABEL) {
    throw new Error("Price bundle is not labeled Synthetic data")
  }
  const names = Object.keys(book.symbols)
  if (names.length === 0) throw new Error("Price bundle has no symbols")
  for (const name of names) {
    const bars = book.symbols[name]
    if (!bars || bars.length === 0 || !isBar(bars[0])) {
      throw new Error(`Price bundle is missing bars for ${name}`)
    }
  }
  return book
}

export async function loadPriceBook(): Promise<PriceBook> {
  const response = await fetch("/bars.json")
  if (!response.ok) throw new Error("Could not load the synthetic price bundle")
  return parsePriceBook(await response.json())
}
