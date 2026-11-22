# quants-explorer

A local, single-user lab for [quants.md](https://quants.md), the open library of trading strategies published by [QuantJourney](https://github.com/QuantJourneyOrg/quantjourney-bt). Each strategy on that site has a plain-language idea, a backtest dashboard, and the Python that produced it. This demo lets you browse that catalog and run three of the rules, rewritten in TypeScript, on bundled daily bars.

Educational demo, not trading advice. Backtests only. There is no broker, no exchange, and no API key.

## Run

From this directory:

```bash
bun install
bun run dev
```

`bun test` checks two things: a signal on bar t is filled at bar t+1, and CAGR, Sharpe, and max drawdown match a hand-computed series.

## What quants.md is

quants.md is a public page of about 50 example strategies from the QuantJourney Backtester. The page groups them as weight strategies (portfolio targets), order strategies (explicit market, limit, stop, and bracket orders), and walk-forward examples. Cards link to a results dashboard and to the Python file. The page states that the first 50 strategies are published under Apache-2.0, that the headline results were generated on 11 Jul 2026, and that the original runs used yfinance via the QuantJourney API with $100,000 of starting capital.

The site itself says these are research examples, not recommendations.

## License and attribution

The upstream repository [QuantJourneyOrg/quantjourney-bt](https://github.com/QuantJourneyOrg/quantjourney-bt) is Apache License 2.0. Confirmed from the repository `LICENSE` file and the README badge:

- Copyright 2024-2026 Jakub Polec / QuantJourney
- Strategy file headers: Copyright (c) 2026 QuantJourney
- https://www.apache.org/licenses/LICENSE-2.0

A copy of that license is in `LICENSES/Apache-2.0.txt`. `NOTICE` describes what this demo changed. The three ported files repeat the copyright line and link to the source file.

## Strategies ported

All three are linked from the [quants.md library](https://quants.md/#library). The per-strategy dashboards are the pages quants.md uses for the published figures.

| Code | Name | Rule, as published | Source |
| --- | --- | --- | --- |
| O01 | Market SMA Cross | Buy when SMA(20) crosses above SMA(50), sell on the reverse cross. Orders example on SPY, QQQ, and IWM. | [Python](https://github.com/QuantJourneyOrg/quantjourney-bt/blob/main/strategies/example_orders_01_market_sma_cross.py) · [dashboard](https://backtester.quantjourney.cloud/strategies/example-orders-01-market-sma-cross) |
| O02 | Market RSI Reversion | Buy when RSI(14) is below 35, sell when RSI is above 60. Same three ETFs. | [Python](https://github.com/QuantJourneyOrg/quantjourney-bt/blob/main/strategies/example_orders_02_market_rsi_reversion.py) · [dashboard](https://backtester.quantjourney.cloud/strategies/example-orders-02-market-rsi-reversion) |
| W21 | Bollinger Reversion | Enter when the close is below the lower Bollinger band (SMA(20) minus 2 sample standard deviations) and exit when the close is back above the midline. Originally an equal-weight book of US sector ETFs. | [Python](https://github.com/QuantJourneyOrg/quantjourney-bt/blob/main/strategies/example_weights_21_bollinger_reversion.py) · [dashboard](https://backtester.quantjourney.cloud/strategies/example-weights-21-bollinger-reversion) |

This demo runs each rule on one symbol, long or flat, with the whole account in or out. The original SMA example buys about 18% of NAV per ETF, and the RSI example buys about 12%. Bollinger weights the names that are inside the band. A signal is computed from closes through bar t and filled at the open of bar t+1. Slippage is 5 bps (the order examples use `FixedBpsSlippage(bps=5.0)`). The fee is 1 bp (the RSI example uses `FixedBpsCommission(bps=1.0)`).

RSI here is Wilder's smoothing. The published file asks the QuantJourney engine for `RSI_14_close` and does not include the indicator formula, so that part is the usual definition rather than a line-by-line copy.

## Data

`public/bars.json` is **synthetic data**. Seeded paths use the ticker names SPY, QQQ, and IWM so the ported rules have something to run on. They are not market prices, not Yahoo Finance history, and not the sample data shipped with QuantJourney.

quants.md says its published runs used yfinance. Yahoo's terms are not a clear grant to redistribute those prices, so this demo does not ship them. Every screen that shows a curve or a metric from this engine is labeled **Synthetic data**.

## Catalog snapshot

`src/catalog/snapshot.json` was copied from the quants.md library table on **2026-11-22**. It has the 50 strategies on that page: name, idea, asset class, type (weight, order, or walk-forward), and the headline figures. The GitHub README also lists a 51st example, W26, which was not on the quants.md page at snapshot time, so it is not in the catalog.

Figures in the shaded table column and on each catalog card are labeled **as published by quants.md**. They describe the original runs. They are not this demo's results. quants.md describes its Sharpe as using a 2% risk-free rate. This demo's Sharpe uses a 0% risk-free rate and a sample standard deviation.

`scripts/build-catalog.ts` rewrites the snapshot from the transcribed fields. `scripts/generate-bars.ts` rewrites the synthetic bars from the fixed seeds.

## Engine

Daily bars. The book is long or flat. Metrics are CAGR, annualized Sharpe, max drawdown, win rate, and the number of closed trades. An open position at the last bar stays in the equity curve and is left out of the win rate.
