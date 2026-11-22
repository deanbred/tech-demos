import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

type Spec = {
  seed: number
  start: number
}

const symbols: Record<string, Spec> = {
  SPY: { seed: 211616933, start: 100 },
  QQQ: { seed: 340580144, start: 80 },
  IWM: { seed: 801294411, start: 60 },
}

const process = {
  upDrift: 0.00035,
  downDrift: -0.00035,
  downProb: 0.4,
  vol: 0.007,
  dipProbability: 0.01,
  dipSize: 0.025,
  minRun: 80,
  runSpan: 140,
  initialRun: 200,
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randn(rng: () => number): number {
  const u = Math.max(rng(), 1e-12)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function weekdays(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cursor <= last) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

const dates = weekdays("2014-01-02", "2025-12-31")
const book: Record<string, unknown[]> = {}

for (const [symbol, spec] of Object.entries(symbols)) {
  const rng = mulberry32(spec.seed)
  let logPrice = Math.log(spec.start)
  let previous = spec.start
  let drift = process.upDrift
  let runLeft = process.initialRun
  book[symbol] = dates.map((date) => {
    if (runLeft <= 0) {
      drift = rng() > process.downProb ? process.upDrift : process.downDrift
      runLeft = Math.floor(process.minRun + rng() * process.runSpan)
    }
    runLeft -= 1
    if (rng() < process.dipProbability) logPrice -= process.dipSize
    logPrice += drift + process.vol * randn(rng)
    const close = Math.exp(logPrice)
    const open = previous
    const wick = Math.abs(randn(rng)) * process.vol * close * 0.6
    const high = Math.max(open, close) + wick
    const low = Math.max(0.5, Math.min(open, close) - wick)
    previous = close
    return {
      date,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: Math.round(800_000 + rng() * 1_400_000),
    }
  })
}

const payload = {
  label: "Synthetic data",
  seedNote:
    "Seeded paths for symbols named SPY, QQQ and IWM. These are not market prices and are not the yfinance series used by quants.md.",
  start: dates[0],
  end: dates[dates.length - 1],
  symbols: book,
}

const out = path.resolve(import.meta.dirname, "../public/bars.json")
mkdirSync(path.dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(payload))
console.log(`wrote ${out} (${dates.length} bars × ${Object.keys(symbols).length} symbols)`)
