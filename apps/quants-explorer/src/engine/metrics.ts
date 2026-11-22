import { TRADING_DAYS_PER_YEAR, type Metrics } from "./types.ts"

function mean(values: readonly number[]): number {
  let sum = 0
  for (const value of values) sum += value
  return sum / values.length
}

function sampleStdev(values: readonly number[]): number | null {
  if (values.length < 2) return null
  const center = mean(values)
  let acc = 0
  for (const value of values) {
    const delta = value - center
    acc += delta * delta
  }
  return Math.sqrt(acc / (values.length - 1))
}

export function computeMetrics(
  levels: readonly number[],
  closedPnls: readonly number[],
): Metrics {
  const trades = closedPnls.length
  const wins = closedPnls.filter((pnl) => pnl > 0).length
  const winRate = trades === 0 ? null : wins / trades

  const periods = levels.length - 1
  const first = levels[0]
  const last = levels[levels.length - 1]
  if (
    periods < 1 ||
    first === undefined ||
    last === undefined ||
    first <= 0 ||
    last <= 0
  ) {
    return {
      cagr: null,
      sharpe: null,
      maxDrawdown: null,
      winRate,
      trades,
    }
  }

  const cagr = (last / first) ** (TRADING_DAYS_PER_YEAR / periods) - 1

  const returns: number[] = []
  for (let i = 1; i < levels.length; i++) {
    const prev = levels[i - 1]
    const next = levels[i]
    if (prev === undefined || next === undefined || prev <= 0) {
      return {
        cagr: null,
        sharpe: null,
        maxDrawdown: null,
        winRate,
        trades,
      }
    }
    returns.push(next / prev - 1)
  }

  const deviation = sampleStdev(returns)
  const sharpe =
    deviation === null || deviation === 0
      ? null
      : (mean(returns) / deviation) * Math.sqrt(TRADING_DAYS_PER_YEAR)

  let peak = first
  let maxDrawdown = 0
  for (const level of levels) {
    if (level > peak) peak = level
    const drawdown = level / peak - 1
    if (drawdown < maxDrawdown) maxDrawdown = drawdown
  }

  return { cagr, sharpe, maxDrawdown, winRate, trades }
}
