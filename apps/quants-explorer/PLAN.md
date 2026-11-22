# quants-explorer

## Goal

A local, single-user strategy lab for quants.md (https://quants.md), QuantJourney's open collection of about 50 trading strategies, each published with a backtest, a results dashboard and the Python that produced it. Browse the catalog, pick 2 or 3 strategies, run their ported logic on bundled data, and compare the results side by side.

## Verify first

Read https://quants.md and the linked source repo. Confirm the license (reported Apache-2.0) before porting any code, keep the license notice and attribution in the README, and link each ported strategy to its quants.md page. Confirm the catalog fields actually available (name, idea, asset class, strategy type: weight / order / walk-forward). If the catalog can't be fetched at build time, ship a small checked-in snapshot JSON with a "snapshot date" label. If the license isn't permissive, don't copy code: describe the strategies in your own words and implement from the published idea, and note this in the README.

## Single-user MVP

**In:**
- Catalog: a searchable, filterable list of the strategies (name, short idea, asset class, type) from a checked-in snapshot JSON built from quants.md, each linking to its page.
- Ported strategies: 2 or 3 strategies with simple, well-defined rules (pick ones that need only OHLCV, e.g. a trend/momentum and a mean-reversion one), ported from the published Python to TypeScript, each with a comment linking the source.
- Data: bundled daily OHLCV for a few liquid symbols. Use a freely redistributable public source if one is clearly allowed; otherwise generate seeded synthetic series and label them "Synthetic data" everywhere.
- Backtest engine (TS, in-app): daily bars, long/flat (plus short only if the strategy needs it), simple fixed fee/slippage settings, no look-ahead (signals use the previous bar's close).
- Metrics computed in the app: CAGR, annualized Sharpe, max drawdown, win rate, number of trades.
- UI (one page): catalog panel; selection of 2 or 3 strategies plus symbol and date range; equity curves side by side on a log-scale chart; a metrics table; an "as published by quants.md" column showing the site's figures for that strategy when available, kept visually distinct.
- README: what quants.md is, license/attribution, which strategies were ported, data source, and a clear "educational demo, not trading advice" line.

**Out:** live trading, broker or exchange keys, auth, optimization/parameter sweeps, anything outside this folder except the tracking update.

## Tasks (vertical slices)
1. Scaffold with `bunx create-vite` (react-ts, skip install), write bunfig.toml, `bun install`, init shadcn/ui; shadcn charts (Recharts) or lightweight-charts for log-scale equity.
2. Catalog snapshot JSON + catalog UI (search, filters, links).
3. Data bundle (real-if-redistributable or labeled synthetic) + TS backtest engine + metrics.
4. Port 2 or 3 strategies with source links; wire selection, run, equity chart and metrics table.
5. "As published" comparison column.
6. Validation: capture at least one screenshot AND one video (search the catalog, pick strategies, run, compare curves and metrics) and attach both to the PR.

## Stack
- Bun
- Vite + React + shadcn/ui + Recharts (or lightweight-charts)
- Everything runs client-side; a thin Bun server only if needed for data files

## Testing and hooks
- One focused test: the engine has no look-ahead (a signal on bar t only trades at bar t+1), and the metrics match hand-computed values on a tiny fixed series.
- No git hooks.

## Deferred
- More strategies; parameter sweeps; walk-forward runs; running the original Python side by side via uv (like the NautilusTrader demo).
