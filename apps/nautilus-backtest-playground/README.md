# Nautilus backtest playground

A one-page playground for [NautilusTrader](https://nautilustrader.io/), an open-source backtesting and live-trading engine (Rust core, Python API). This demo only runs a simulated backtest. It does not connect to a broker and it has no live-trading path.

You set an EMA-cross (Nautilus's own `EMACross` example), a trade size, and a date window. The page asks a Bun server to run `BacktestEngine` and then draws the price bars, fill markers, equity curve, engine statistics, and the engine log.

## Requirements

- [Bun](https://bun.sh/)
- [uv](https://docs.astral.sh/uv/) (the dev script runs `uv sync` for you)

uv installs Python 3.12–3.14 if needed. NautilusTrader 1.231.0 requires Python `>=3.12,<3.15`.

## Run

From this directory:

```bash
bun install && bun run dev
```

Open http://127.0.0.1:5173. The API listens on http://127.0.0.1:8787.

```bash
bun run test
```

runs the bundled series through `backtest/run.py` and checks that the engine returns an equity series and statistics.

## Data

The bars in `backtest/data/synth_eurusd_1h.csv` are **synthetic**. They are a fixed-seed geometric random walk (seed `2121402979`) with two slow sine drifts, written as hourly OHLC from 2024-01-01 through 2024-06-30. The instrument id is `EUR/USD.SIM` only so Nautilus's FX test instrument can price the series. These are not historical EUR/USD prices.

Real OHLC series that are fine to redistribute were not available: exchange and vendor histories (including the fixtures in the NautilusTrader repo) come with terms that do not allow republishing. The UI labels the series "Synthetic data". Every statistic on the page is read from a NautilusTrader `BacktestEngine` run on that series.

Regenerate the file with:

```bash
uv run --directory backtest python generate_data.py
```

## Engine

- Package: `nautilus_trader==1.231.0` (pinned in `backtest/pyproject.toml`)
- Venue: simulated `SIM`, margin account, 1,000,000 USD starting balance
- Strategy: `nautilus_trader.examples.strategies.ema_cross.EMACross`
- Bars: `EUR/USD.SIM-1-HOUR-MID-EXTERNAL`

`pandas` is pinned to `>=2.3.3,<3` because pandas 3 hands `BarDataWrangler` a read-only buffer it cannot read.
