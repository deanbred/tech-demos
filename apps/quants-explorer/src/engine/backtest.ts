import { computeMetrics } from "./metrics.ts"
import type {
  BacktestResult,
  Bar,
  ClosedTrade,
  Costs,
  EquityPoint,
  Fill,
  Target,
} from "./types.ts"

export type TargetAt = (index: number, history: readonly Bar[]) => Target

function buyPrice(open: number, costs: Costs): number {
  return open * (1 + costs.slippageBps / 10_000)
}

function sellPrice(open: number, costs: Costs): number {
  return open * (1 - costs.slippageBps / 10_000)
}

export function runBacktest(input: {
  bars: readonly Bar[]
  targetAt: TargetAt
  initialCapital: number
  costs: Costs
}): BacktestResult {
  const { bars, targetAt, initialCapital, costs } = input
  let cash = initialCapital
  let shares = 0
  let pending: Target | null = null
  let entry: { date: string; price: number; cashSpent: number } | null = null
  const equity: EquityPoint[] = []
  const fills: Fill[] = []
  const trades: ClosedTrade[] = []
  const feeRate = costs.feeBps / 10_000

  for (let t = 0; t < bars.length; t++) {
    const bar = bars[t]
    if (!bar) continue

    if (pending !== null) {
      const desired = pending
      pending = null
      const held: Target = shares > 0 ? 1 : 0
      if (desired === 1 && held === 0 && cash > 0) {
        const price = buyPrice(bar.open, costs)
        const bought = cash / (price * (1 + feeRate))
        if (price > 0 && Number.isFinite(bought) && bought > 0) {
          entry = { date: bar.date, price, cashSpent: cash }
          shares = bought
          cash = 0
          fills.push({ date: bar.date, side: "buy", price, shares })
        }
      } else if (desired === 0 && held === 1 && entry) {
        const price = sellPrice(bar.open, costs)
        const cashOut = shares * price * (1 - feeRate)
        trades.push({
          entryDate: entry.date,
          exitDate: bar.date,
          entryPrice: entry.price,
          exitPrice: price,
          shares,
          pnl: cashOut - entry.cashSpent,
        })
        fills.push({ date: bar.date, side: "sell", price, shares })
        cash = cashOut
        shares = 0
        entry = null
      }
    }

    equity.push({ date: bar.date, equity: cash + shares * bar.close })

    const history = bars.slice(0, t + 1)
    const target = targetAt(t, history)
    const heldNow: Target = shares > 0 ? 1 : 0
    if (t < bars.length - 1 && target !== heldNow) pending = target
  }

  return {
    equity,
    fills,
    trades,
    metrics: computeMetrics(
      equity.map((point) => point.equity),
      trades.map((trade) => trade.pnl),
    ),
    openAtEnd: shares > 0,
  }
}
