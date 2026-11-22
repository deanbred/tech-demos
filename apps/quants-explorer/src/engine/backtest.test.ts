import { describe, expect, test } from "bun:test"
import { runBacktest } from "./backtest.ts"
import { computeMetrics } from "./metrics.ts"
import type { Bar } from "./types.ts"
import { bollingerTargets } from "../strategies/bollinger.ts"
import { rsiReversionTargets } from "../strategies/rsi-reversion.ts"
import { smaCrossTargets } from "../strategies/sma-cross.ts"

function bar(date: string, open: number, close: number): Bar {
  const high = Math.max(open, close)
  const low = Math.min(open, close)
  return { date, open, high, low, close, volume: 1 }
}

describe("backtest engine", () => {
  test("a signal on bar t fills at the next bar, and metrics match a hand series", () => {
    const bars = [
      bar("2020-01-02", 10, 10),
      bar("2020-01-03", 10, 50),
      bar("2020-01-06", 40, 40),
      bar("2020-01-07", 30, 30),
    ]
    const seen: string[][] = []
    const result = runBacktest({
      bars,
      initialCapital: 1000,
      costs: { slippageBps: 0, feeBps: 0 },
      targetAt: (_index, history) => {
        seen.push(history.map((item) => item.date))
        return history.some((item) => item.close >= 50) ? 1 : 0
      },
    })

    expect(seen).toEqual([
      ["2020-01-02"],
      ["2020-01-02", "2020-01-03"],
      ["2020-01-02", "2020-01-03", "2020-01-06"],
      ["2020-01-02", "2020-01-03", "2020-01-06", "2020-01-07"],
    ])
    expect(result.fills).toEqual([
      { date: "2020-01-06", side: "buy", price: 40, shares: 25 },
    ])
    expect(result.trades).toHaveLength(0)
    expect(result.equity.map((point) => point.equity)).toEqual([
      1000, 1000, 1000, 750,
    ])
    expect(result.metrics.maxDrawdown).toBeCloseTo(-0.25, 12)
    expect(result.metrics.winRate).toBeNull()

    const priced = runBacktest({
      bars: [
        bar("2020-01-02", 10, 10),
        bar("2020-01-03", 10, 50),
        bar("2020-01-06", 10, 11),
        bar("2020-01-07", 11, 9),
        bar("2020-01-08", 12, 12),
      ],
      initialCapital: 1000,
      costs: { slippageBps: 0, feeBps: 100 },
      targetAt: (index) => (index >= 1 && index < 3 ? 1 : 0),
    })
    expect(priced.fills[0]?.price).toBe(10)
    expect(priced.fills[1]?.price).toBe(12)
    expect(priced.trades).toHaveLength(1)
    expect(priced.trades[0]?.pnl).toBeCloseTo(176.237623762376, 8)

    const levels = [100, 200, 100]
    const metrics = computeMetrics(levels, [10, -4])
    expect(metrics.cagr).toBe(0)
    expect(metrics.sharpe).toBeCloseTo(Math.sqrt(14), 10)
    expect(metrics.maxDrawdown).toBeCloseTo(-0.5, 12)
    expect(metrics.winRate).toBe(0.5)
    expect(metrics.trades).toBe(2)
  })

  test("strategy targets ignore a later bar", () => {
    const bars: Bar[] = []
    for (let i = 0; i < 80; i++) {
      const close = 100 + Math.sin(i / 4) * 8 + i * 0.05
      bars.push(bar(`2020-01-${String(i + 1).padStart(2, "0")}`, close, close))
    }
    const builders = [smaCrossTargets, rsiReversionTargets, bollingerTargets]
    for (const build of builders) {
      const original = build(bars)
      const last = bars[bars.length - 1]
      if (!last) throw new Error("expected a bar")
      const mutated = bars.slice(0, -1).concat({ ...last, close: last.close * 5 })
      const changed = build(mutated)
      expect(changed.slice(0, -1)).toEqual(original.slice(0, -1))
    }
  })
})
