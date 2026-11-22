// Port of Bollinger Band Mean Reversion.
// Copyright (c) 2026 QuantJourney. Apache License 2.0.
// Source: https://github.com/QuantJourneyOrg/quantjourney-bt/blob/main/strategies/example_weights_21_bollinger_reversion.py
// Library: https://quants.md/#library
// Dashboard: https://backtester.quantjourney.cloud/strategies/example-weights-21-bollinger-reversion
// Changed: one symbol instead of an equal-weight sector book, long/flat,
// and the fill waits until the next bar. Band math matches the source:
// SMA(20) and a 2-standard-deviation lower band, sample standard deviation.

import type { Bar, Target } from "../engine/types.ts"

const WINDOW = 20
const WIDTH = 2

function sampleStdev(values: readonly number[]): number {
  const count = values.length
  let sum = 0
  for (const value of values) sum += value
  const mean = sum / count
  let acc = 0
  for (const value of values) {
    const delta = value - mean
    acc += delta * delta
  }
  return Math.sqrt(acc / (count - 1))
}

export function bollingerTargets(bars: readonly Bar[]): Target[] {
  const targets: Target[] = []
  let holding = false
  for (let t = 0; t < bars.length; t++) {
    const close = bars[t]?.close ?? 0
    if (t + 1 < WINDOW) {
      holding = false
      targets.push(0)
      continue
    }
    const window: number[] = []
    for (let i = t - WINDOW + 1; i <= t; i++) window.push(bars[i]?.close ?? 0)
    let sum = 0
    for (const value of window) sum += value
    const mid = sum / WINDOW
    const lower = mid - WIDTH * sampleStdev(window)
    if (!holding && close < lower) holding = true
    else if (holding && close > mid) holding = false
    targets.push(holding ? 1 : 0)
  }
  return targets
}
