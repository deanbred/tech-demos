import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { snapshot, type AssetClass, type StrategyKind } from "./catalog/snapshot.ts"
import { DATA_LABEL, loadPriceBook, type PriceBook } from "./data/book.ts"
import { runBacktest } from "./engine/backtest.ts"
import { COSTS, INITIAL_CAPITAL } from "./engine/types.ts"
import { portedStrategy } from "./strategies/index.ts"
import { CatalogPanel } from "./ui/CatalogPanel.tsx"
import { EquityChart } from "./ui/EquityChart.tsx"
import { MetricsTable } from "./ui/MetricsTable.tsx"
import type { RunView } from "./ui/types.ts"

const MAX_SELECTED = 3
const MIN_BARS = 60

type KindFilter = StrategyKind | "all"

export default function App() {
  const [book, setBook] = useState<PriceBook | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState<KindFilter>("all")
  const [asset, setAsset] = useState<"all" | AssetClass>("all")
  const [selected, setSelected] = useState<string[]>([])
  const [symbol, setSymbol] = useState("SPY")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [runs, setRuns] = useState<RunView[] | null>(null)

  useEffect(() => {
    let cancelled = false
    loadPriceBook()
      .then((loaded) => {
        if (cancelled) return
        setBook(loaded)
        setStart(loaded.start)
        setEnd(loaded.end)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : "Could not load prices")
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggle(id: string) {
    setRuns(null)
    setSelected((current) => {
      if (current.includes(id)) {
        setNotice(null)
        return current.filter((item) => item !== id)
      }
      if (current.length >= MAX_SELECTED) {
        setNotice("Three strategies is the limit for one comparison.")
        return current
      }
      setNotice(null)
      return [...current, id]
    })
  }

  function run() {
    if (!book) return
    const bars = (book.symbols[symbol] ?? []).filter(
      (bar) => bar.date >= start && bar.date <= end,
    )
    if (selected.length === 0) {
      setNotice("Select at least one runnable strategy.")
      setRuns(null)
      return
    }
    if (start > end) {
      setNotice("The start date is after the end date.")
      setRuns(null)
      return
    }
    if (bars.length < MIN_BARS) {
      setNotice(`This range has ${bars.length} bars. Use at least ${MIN_BARS}.`)
      setRuns(null)
      return
    }
    const next: RunView[] = []
    for (const id of selected) {
      const strategy = portedStrategy(id)
      const entry = snapshot.strategies.find((item) => item.id === id)
      if (!strategy || !entry) continue
      const targets = strategy.targets(bars)
      next.push({
        entry,
        result: runBacktest({
          bars,
          initialCapital: INITIAL_CAPITAL,
          costs: COSTS,
          targetAt: (index) => targets[index] ?? 0,
        }),
      })
    }
    setNotice(null)
    setRuns(next)
  }

  const symbols = book ? Object.keys(book.symbols) : []

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-4">
          <div className="max-w-2xl space-y-1">
            <p className="text-xs text-muted-foreground">
              <a className="underline underline-offset-2" href={snapshot.source}>
                quants.md
              </a>
              {" · "}
              snapshot {snapshot.snapshotDate}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Quants explorer</h1>
            <p className="text-sm text-muted-foreground">
              Browse the QuantJourney strategy library, then run up to three
              ported rules on bundled daily bars. Educational demo, not trading
              advice. Backtests only.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{DATA_LABEL}</Badge>
            <Badge variant="outline">Apache-2.0</Badge>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <CatalogPanel
          libraryUrl={snapshot.libraryUrl}
          snapshotDate={snapshot.snapshotDate}
          query={query}
          kind={kind}
          asset={asset}
          selected={selected}
          entries={snapshot.strategies}
          onQuery={setQuery}
          onKind={setKind}
          onAsset={setAsset}
          onToggle={toggle}
        />
        <section className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="symbol">Symbol</Label>
                <Select
                  value={symbol}
                  onValueChange={(value) => {
                    setSymbol(value)
                    setRuns(null)
                  }}
                >
                  <SelectTrigger id="symbol" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {symbols.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name} · synthetic
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="date"
                  value={start}
                  min={book?.start}
                  max={book?.end}
                  onChange={(event) => {
                    setStart(event.target.value)
                    setRuns(null)
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="date"
                  value={end}
                  min={book?.start}
                  max={book?.end}
                  onChange={(event) => {
                    setEnd(event.target.value)
                    setRuns(null)
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  className="w-full"
                  disabled={!book || selected.length === 0}
                  onClick={run}
                >
                  Run backtest
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {selected.length} of {MAX_SELECTED} selected. Starting capital $
              {INITIAL_CAPITAL.toLocaleString("en-US")}. Slippage {COSTS.slippageBps}{" "}
              bps and a {COSTS.feeBps} bp fee, both fixed. Long or flat, one
              symbol. {book ? book.seedNote : DATA_LABEL}
            </p>
            {loadError ? (
              <p className="mt-2 text-sm text-destructive">{loadError}</p>
            ) : null}
            {notice ? <p className="mt-2 text-sm">{notice}</p> : null}
          </div>
          {runs && runs.length > 0 ? (
            <div className="space-y-4 rounded-lg border p-4">
              <EquityChart runs={runs} />
              <MetricsTable runs={runs} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Select Market SMA Cross, Market RSI Reversion, or Bollinger
              Reversion in the catalog, then run. Other strategies stay in the
              catalog with their published figures and source links.
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
