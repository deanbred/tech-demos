import type { CatalogEntry } from "../catalog/snapshot.ts"
import type { BacktestResult } from "../engine/types.ts"

export type RunView = {
  entry: CatalogEntry
  result: BacktestResult
}
