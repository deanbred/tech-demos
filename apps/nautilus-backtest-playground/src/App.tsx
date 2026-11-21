import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { EquityChart } from "@/components/equity-chart";
import { PriceChart } from "@/components/price-chart";
import type { ApiError, BacktestResult, Dataset } from "@/types";

type Params = {
  fast: number;
  slow: number;
  tradeSize: number;
  start: string;
  end: string;
};

function day(iso: string): string {
  return iso.slice(0, 10);
}

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatFixed(value: number | null, digits: number): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercentFromFraction(value: number | null, digits: number): string {
  if (value === null) return "—";
  return `${(value * 100).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [params, setParams] = useState<Params | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [running, setRunning] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const requestId = useRef(0);

  const run = useCallback(async (next: Params) => {
    const id = ++requestId.current;
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fast_ema: next.fast,
          slow_ema: next.slow,
          trade_size: next.tradeSize,
          start: next.start,
          end: next.end,
        }),
      });
      const body = (await response.json()) as BacktestResult | ApiError;
      if (id !== requestId.current) return;
      if (!response.ok || ("error" in body && body.error)) {
        const failure = body as ApiError;
        setError({
          error: failure.error || "The backtest failed.",
          detail: failure.detail,
        });
        return;
      }
      setResult(body as BacktestResult);
    } catch {
      if (id !== requestId.current) return;
      setError({
        error: "Could not reach the backtest server. Start it with bun run dev from this app folder.",
      });
    } finally {
      if (id === requestId.current) setRunning(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const response = await fetch("/api/dataset");
        if (!response.ok) {
          throw new Error("dataset request failed");
        }
        const meta = (await response.json()) as Dataset;
        if (cancelled) return;
        const initial: Params = {
          fast: 10,
          slow: 30,
          tradeSize: 100_000,
          start: day(meta.start),
          end: day(meta.end),
        };
        setDataset(meta);
        setParams(initial);
        await run(initial);
      } catch {
        if (!cancelled) {
          setBootError(
            "Could not load the dataset. The API server may still be starting, or uv failed to sync.",
          );
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [run]);

  function update(patch: Partial<Params>) {
    setParams((current) => (current ? { ...current, ...patch } : current));
  }

  const version = result?.nautilus_version ?? dataset?.nautilus_version;

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Nautilus backtest playground</h1>
            <Badge variant="outline">Synthetic data</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            EMA-cross strategy on NautilusTrader{version ? ` ${version}` : ""}’s BacktestEngine.
            Simulated SIM venue only — no broker keys and no live orders.
          </p>
        </div>
      </header>

      {bootError ? (
        <Alert variant="destructive">
          <AlertTitle>Server unavailable</AlertTitle>
          <AlertDescription>{bootError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Parameters</CardTitle>
            <CardDescription>
              Fast EMA stays below the slow EMA. Bars are hourly and synthetic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <SliderField
              label="Fast EMA"
              value={params?.fast ?? 10}
              min={2}
              max={80}
              disabled={!params || running}
              onChange={(value) => {
                if (!params) return;
                const slow = value >= params.slow ? Math.min(200, value + 1) : params.slow;
                update({ fast: value, slow });
              }}
            />
            <SliderField
              label="Slow EMA"
              value={params?.slow ?? 30}
              min={3}
              max={120}
              disabled={!params || running}
              onChange={(value) => {
                if (!params) return;
                const fast = params.fast >= value ? Math.max(2, value - 1) : params.fast;
                update({ slow: value, fast });
              }}
            />
            <SliderField
              label="Trade size"
              value={params?.tradeSize ?? 100_000}
              min={10_000}
              max={500_000}
              step={10_000}
              disabled={!params || running}
              format={(value) => value.toLocaleString("en-US")}
              onChange={(value) => update({ tradeSize: value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="date"
                  value={params?.start ?? ""}
                  min={dataset ? day(dataset.start) : undefined}
                  max={params?.end}
                  disabled={!params || running}
                  onChange={(event) => update({ start: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="date"
                  value={params?.end ?? ""}
                  min={params?.start}
                  max={dataset ? day(dataset.end) : undefined}
                  disabled={!params || running}
                  onChange={(event) => update({ end: event.target.value })}
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!params || running}
              onClick={() => {
                if (params) void run(params);
              }}
            >
              {running ? "Running backtest…" : "Run backtest"}
            </Button>
            {dataset ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {dataset.rows.toLocaleString("en-US")} hourly bars, seed {dataset.seed}.{" "}
                {dataset.generator}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Loading dataset…</p>
            )}
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{error.error}</AlertTitle>
              {error.detail ? (
                <AlertDescription>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap">{error.detail}</pre>
                </AlertDescription>
              ) : null}
            </Alert>
          ) : null}

          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4 xl:grid-cols-7">
            <Stat
              label="Total PnL"
              value={formatMoney(result?.stats.total_pnl ?? null)}
              hint="stats_pnls USD"
            />
            <Stat
              label="Return"
              value={
                result?.stats.return_pct == null
                  ? "—"
                  : `${formatFixed(result.stats.return_pct, 4)}%`
              }
              hint="PnL% (total)"
            />
            <Stat
              label="Sharpe"
              value={formatFixed(result?.stats.sharpe ?? null, 3)}
              hint="252-day"
            />
            <Stat
              label="Max drawdown"
              value={formatPercentFromFraction(result?.stats.max_drawdown ?? null, 2)}
              hint="analyzer fraction"
            />
            <Stat
              label="Win rate"
              value={formatPercentFromFraction(result?.stats.win_rate ?? null, 1)}
              hint="engine fraction"
            />
            <Stat
              label="Position slices"
              value={result ? String(result.stats.trade_count ?? "—") : "—"}
              hint="total_positions"
            />
            <Stat
              label="Orders"
              value={result ? String(result.stats.order_count ?? "—") : "—"}
              hint="total_orders"
            />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>
                {result ? result.instrument_id : "EUR/USD.SIM"} · price
              </CardTitle>
              <CardDescription>
                Synthetic data. Buy and sell markers are fills from this engine run
                {result ? ` (${result.fills.length.toLocaleString("en-US")} fills).` : "."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result && result.bars.length > 0 ? (
                <PriceChart bars={result.bars} fills={result.fills} />
              ) : (
                <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
                  {running ? "Running the engine…" : "Run a backtest to plot price and fills."}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Equity</CardTitle>
              <CardDescription>
                {result?.account.starting_balance != null
                  ? `SIM margin account, starting ${formatMoney(result.account.starting_balance)} from the account report.`
                  : "Account balance after each fill, from the engine account report."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result && result.equity.length > 0 ? (
                <EquityChart points={result.equity} />
              ) : (
                <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                  No equity series yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Collapsible className="rounded-xl border">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
              Engine log
              <span className="text-xs font-normal text-muted-foreground">
                {result ? `${result.logs.length} lines` : "empty"}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t px-4 py-3">
              <pre className="max-h-72 overflow-auto font-mono text-xs leading-relaxed text-muted-foreground">
                {result?.logs.join("\n") || "Run a backtest to capture the engine log."}
              </pre>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible className="rounded-xl border">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
              Unmodified engine statistics
              <span className="text-xs font-normal text-muted-foreground">stats_pnls, stats_returns</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t px-4 py-3">
              <pre className="max-h-72 overflow-auto font-mono text-xs leading-relaxed text-muted-foreground">
                {result
                  ? JSON.stringify(
                      { sources: result.sources, engine_stats: result.engine_stats },
                      null,
                      2,
                    )
                  : "Run a backtest to read the analyzer output."}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card px-3 py-2.5">
      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-sm font-medium tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <Label>{label}</Label>
        <span className="tabular-nums text-muted-foreground">{format ? format(value) : value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={[value]}
        onValueChange={(next) => {
          const resolved = next[0];
          if (resolved !== undefined) onChange(resolved);
        }}
      />
    </div>
  );
}
