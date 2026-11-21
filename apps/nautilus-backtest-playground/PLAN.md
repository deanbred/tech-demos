# nautilus-backtest-playground

## Goal

A one-page playground that runs a real NautilusTrader `BacktestEngine` on bundled bar data with an EMA-cross strategy whose parameters you set in the browser, then shows the equity curve, trades on the price chart, stats and the engine log.

## Verify first
Check the current NautilusTrader docs (https://nautilustrader.io/docs/) for the latest stable pip version, Python version support, and the current BacktestEngine / EMACross example API. Pin the version in pyproject.toml and follow the docs where they differ from this plan.

## Single-user MVP

**In:**
- Left panel: EMA fast/slow sliders (fast < slow enforced), trade size, date range within the bundled data, "Run backtest" button.
- Bun server endpoint that spawns `uv run python backtest/run.py` with params as JSON, with a timeout; the Python script builds a BacktestEngine with a simulated venue, loads bundled bars, runs an EMA-cross strategy (based on Nautilus's own example), and prints a JSON result: equity series, fills (time, side, price, qty), stats (total PnL, return %, Sharpe, max drawdown, win rate, trade count, taken from Nautilus's portfolio analyzer where available), and captured log lines.
- Bundled data: a small CSV of real historical bars from a free source with a permissive license (e.g. Nautilus's own test data, or a public dataset), noted in README with source and license. If no suitably licensed real data is available, generate synthetic bars with a fixed seed and label them "Synthetic data" in the UI.
- Right panel: price chart with buy/sell markers, equity curve, stats table, collapsible raw engine log. Use lightweight-charts (TradingView, open source) or shadcn charts/Recharts.
- Clear error states (uv missing, Python error).
- README: what NautilusTrader is, how to run, requirements (Bun, uv), data source.

**Out:** live trading, broker/exchange keys, multiple strategies, QuantLib, auth, changing anything outside the folder except tracking.

## Tasks (vertical slices)
1. Scaffold with `bunx create-vite` (react-ts, skip install), bunfig.toml, `bun install`, shadcn/ui minimalist preset. Python project via `uv init` with pinned nautilus_trader.
2. Python backtest script producing the JSON result from a CLI run.
3. Bun API to spawn it; UI controls and results.
4. Validation: capture at least one screenshot AND one video (change sliders, run two backtests with different params, show markers and stats change) and attach both to the PR.

## Stack
- Bun + Vite + React + shadcn/ui (one-screen tool)
- NautilusTrader (Python, Rust core) via uv
- lightweight-charts or Recharts for charts

## Testing and hooks
- One focused test: running the Python script with default params on the bundled data returns valid JSON with a non-empty equity series and stats fields.
- No git hooks.

## Deferred
- Strategy picker, real data download, QuantLib options pricing, parameter sweeps/heatmap.
