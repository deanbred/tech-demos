// Port of Market SMA Crossover.
// Copyright (c) 2026 QuantJourney. Apache License 2.0.
// Source: https://github.com/QuantJourneyOrg/quantjourney-bt/blob/main/strategies/example_orders_01_market_sma_cross.py
// Library: https://quants.md/#library
// Dashboard: https://backtester.quantjourney.cloud/strategies/example-orders-01-market-sma-cross
// Changed: one symbol, long while SMA(20) > SMA(50), fill on the next bar.
// The original submits market orders for SPY, QQQ and IWM at 18% of NAV.

import type { Bar, Target } from "../engine/types.ts"

const FAST = 20
const SLOW = 50

export function smaCrossTargets(bars: readonly Bar[]): Target[] {
  const targets: Target[] = []
  let fastSum = 0
  let slowSum = 0
  for (let t = 0; t < bars.length; t++) {
    const close = bars[t]?.close ?? 0
    fastSum += close
    slowSum += close
    if (t >= FAST) fastSum -= bars[t - FAST]?.close ?? 0
    if (t >= SLOW) slowSum -= bars[t - SLOW]?.close ?? 0
    if (t + 1 < SLOW) {
      targets.push(0)
      continue
    }
    const fast = fastSum / FAST
    const slow = slowSum / SLOW
    targets.push(fast > slow ? 1 : 0)
  }
  return targets
}
