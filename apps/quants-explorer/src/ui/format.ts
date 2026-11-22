import type { StrategyKind } from "../catalog/snapshot.ts"

export function formatPct(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—"
  const pct = value * 100
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(digits)}%`
}

export function formatSharpe(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}`
}

export function formatWinRate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—"
  return `${(value * 100).toFixed(1)}%`
}

export function publishedCell(value: string | null): string {
  return value ?? "—"
}

export function kindLabel(kind: StrategyKind): string {
  switch (kind) {
    case "weight":
      return "Weights"
    case "order":
      return "Orders"
    case "walk-forward":
      return "Walk-forward"
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}
