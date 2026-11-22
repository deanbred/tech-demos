import snapshotJson from "./snapshot.json" with { type: "json" }

export type StrategyKind = "weight" | "order" | "walk-forward"

export type PublishedFigures = {
  totalReturn: string | null
  cagr: string | null
  sharpe: string | null
  maxDrawdown: string | null
  winRate: string | null
  profitFactor: string | null
  note: string | null
}

export type CatalogEntry = {
  id: string
  code: string
  name: string
  idea: string
  assetClass: string
  type: StrategyKind
  styles: string[]
  bars: string
  pageUrl: string
  sourceUrl: string
  ported: boolean
  published: PublishedFigures
}

export type Snapshot = {
  snapshotDate: string
  resultsGenerated: string
  source: string
  libraryUrl: string
  license: string
  licenseUrl: string
  upstream: string
  note: string
  strategies: CatalogEntry[]
}

function isKind(value: string): value is StrategyKind {
  return value === "weight" || value === "order" || value === "walk-forward"
}

function loadSnapshot(value: unknown): Snapshot {
  if (typeof value !== "object" || value === null || !("strategies" in value)) {
    throw new Error("Catalog snapshot is missing strategies")
  }
  const snapshot = value as Snapshot
  if (snapshot.strategies.length !== 50) {
    throw new Error(`Catalog snapshot has ${snapshot.strategies.length} strategies`)
  }
  for (const strategy of snapshot.strategies) {
    if (!isKind(strategy.type)) {
      throw new Error(`Unknown strategy type for ${strategy.code}`)
    }
  }
  return snapshot
}

export const snapshot = loadSnapshot(snapshotJson)

export const assetClasses = [
  "Equity ETFs",
  "Multi-asset",
  "Stocks",
  "FX",
  "Futures",
] as const

export type AssetClass = (typeof assetClasses)[number]
