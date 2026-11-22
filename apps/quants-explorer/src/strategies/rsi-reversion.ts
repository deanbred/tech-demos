// Port of Market RSI Reversion.
// Copyright (c) 2026 QuantJourney. Apache License 2.0.
// Source: https://github.com/QuantJourneyOrg/quantjourney-bt/blob/main/strategies/example_orders_02_market_rsi_reversion.py
// Library: https://quants.md/#library
// Dashboard: https://backtester.quantjourney.cloud/strategies/example-orders-02-market-rsi-reversion
// Changed: one symbol, long/flat, Wilder RSI(14), fill on the next bar.
// Enter below 35 and exit above 60, matching the published thresholds.
// The original indicator implementation lives in the QuantJourney engine,
// which this file does not copy. The original buys 12% of NAV per ETF.

import type { Bar, Target } from "../engine/types.ts"

const PERIOD = 14
const ENTRY = 35
const EXIT = 60

export function rsiReversionTargets(bars: readonly Bar[]): Target[] {
  const targets: Target[] = []
  let avgGain = 0
  let avgLoss = 0
  let holding = false

  for (let t = 0; t < bars.length; t++) {
    const close = bars[t]?.close ?? 0
    if (t === 0) {
      targets.push(0)
      continue
    }
    const change = close - (bars[t - 1]?.close ?? close)
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0

    if (t < PERIOD) {
      targets.push(0)
      continue
    }
    if (t === PERIOD) {
      let seedGain = 0
      let seedLoss = 0
      for (let i = 1; i <= PERIOD; i++) {
        const delta = (bars[i]?.close ?? 0) - (bars[i - 1]?.close ?? 0)
        if (delta >= 0) seedGain += delta
        else seedLoss -= delta
      }
      avgGain = seedGain / PERIOD
      avgLoss = seedLoss / PERIOD
    } else {
      avgGain = (avgGain * (PERIOD - 1) + gain) / PERIOD
      avgLoss = (avgLoss * (PERIOD - 1) + loss) / PERIOD
    }

    const rsi =
      avgLoss === 0
        ? avgGain === 0
          ? 50
          : 100
        : 100 - 100 / (1 + avgGain / avgLoss)

    if (!holding && rsi < ENTRY) holding = true
    else if (holding && rsi > EXIT) holding = false
    targets.push(holding ? 1 : 0)
  }

  return targets
}
