"""Run one NautilusTrader backtest and print a JSON result to stdout.

Params come from a JSON object on stdin. With no input, defaults are used.
`--meta` prints dataset metadata and the installed NautilusTrader version.
"""

from __future__ import annotations

import json
import math
import shutil
import sys
import tempfile
import traceback
import warnings
from decimal import Decimal
from pathlib import Path

warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "synth_eurusd_1h.csv"
META_PATH = ROOT / "data" / "meta.json"

FAST_MIN = 2
SLOW_MAX = 200
TRADE_MIN = 1_000
TRADE_MAX = 1_000_000
TRADE_STEP = 1_000


def clean(value):
    if value is None:
        return None
    if isinstance(value, dict):
        return {str(key): clean(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(item) for item in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (float, np.floating)):
        number = float(value)
        if math.isnan(number) or math.isinf(number):
            return None
        return number
    if isinstance(value, (int,)):
        return value
    return value


def load_meta() -> dict:
    meta = json.loads(META_PATH.read_text())
    import nautilus_trader

    meta["nautilus_version"] = nautilus_trader.__version__
    return meta


def load_frame() -> pd.DataFrame:
    frame = pd.read_csv(DATA_PATH)
    frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
    frame = frame.set_index("timestamp").sort_index()
    for column in ("open", "high", "low", "close", "volume"):
        frame[column] = frame[column].astype("float64")
    return frame


def parse_bound(value: str, is_end: bool) -> pd.Timestamp:
    stamp = pd.Timestamp(value)
    if stamp.tzinfo is None:
        stamp = stamp.tz_localize("UTC")
    else:
        stamp = stamp.tz_convert("UTC")
    if is_end and len(value) <= 10:
        stamp = stamp + pd.Timedelta(hours=23)
    return stamp


def resolve_params(raw: dict, frame: pd.DataFrame) -> dict:
    fast = int(raw.get("fast_ema", 10))
    slow = int(raw.get("slow_ema", 30))
    trade_size = int(raw.get("trade_size", 100_000))
    if fast < FAST_MIN or slow > SLOW_MAX or fast >= slow:
        raise ValueError(
            f"Need {FAST_MIN} <= fast_ema < slow_ema <= {SLOW_MAX} (got {fast}, {slow})."
        )
    if trade_size < TRADE_MIN or trade_size > TRADE_MAX or trade_size % TRADE_STEP != 0:
        raise ValueError(
            f"trade_size must be a multiple of {TRADE_STEP} between {TRADE_MIN} and {TRADE_MAX}."
        )

    start_raw = raw.get("start")
    end_raw = raw.get("end")
    start = parse_bound(str(start_raw), False) if start_raw else frame.index[0]
    end = parse_bound(str(end_raw), True) if end_raw else frame.index[-1]
    if start > end:
        raise ValueError("start must be on or before end.")
    window = frame.loc[(frame.index >= start) & (frame.index <= end)]
    if len(window) <= slow:
        raise ValueError(
            f"The date range has {len(window)} bars; the slow EMA needs more than {slow}."
        )
    return {
        "fast_ema": fast,
        "slow_ema": slow,
        "trade_size": trade_size,
        "start": start,
        "end": end,
        "window": window,
    }


def read_logs(log_dir: Path) -> list[str]:
    files = sorted(log_dir.glob("*.log")) + sorted(log_dir.glob("*.jsonl"))
    lines: list[str] = []
    for path in files:
        text = path.read_text(errors="replace")
        lines.extend(line.rstrip() for line in text.splitlines() if line.strip())
    if len(lines) <= 400:
        return lines
    omitted = len(lines) - 320
    return lines[:20] + [f"... {omitted} earlier log lines omitted ..."] + lines[-300:]


def max_drawdown(engine) -> float | None:
    from nautilus_trader.analysis import MaxDrawdown

    analyzer = getattr(engine.portfolio, "analyzer", None)
    if analyzer is None:
        return None
    returns = analyzer.returns()
    if returns is None or len(returns) == 0:
        return None
    # MaxDrawdown wants timestamp-nanosecond keys, which is what the analyzer stores.
    raw = {}
    for stamp, value in returns.items():
        number = clean(value)
        if number is None:
            continue
        raw[int(pd.Timestamp(stamp).value)] = number
    if not raw:
        return None
    return clean(MaxDrawdown().calculate_from_returns(raw))


def execute(raw: dict) -> dict:
    from nautilus_trader.analysis.reporter import ReportProvider
    from nautilus_trader.backtest.engine import BacktestEngine
    from nautilus_trader.config import BacktestEngineConfig
    from nautilus_trader.config import LoggingConfig
    from nautilus_trader.examples.strategies.ema_cross import EMACross
    from nautilus_trader.examples.strategies.ema_cross import EMACrossConfig
    from nautilus_trader.model.currencies import USD
    from nautilus_trader.model.data import BarType
    from nautilus_trader.model.enums import AccountType
    from nautilus_trader.model.enums import OmsType
    from nautilus_trader.model.identifiers import Venue
    from nautilus_trader.model.objects import Money
    from nautilus_trader.persistence.wranglers import BarDataWrangler
    from nautilus_trader.test_kit.providers import TestInstrumentProvider

    meta = load_meta()
    frame = load_frame()
    params = resolve_params(raw, frame)
    window: pd.DataFrame = params["window"]

    instrument = TestInstrumentProvider.default_fx_ccy("EUR/USD")
    bar_type = BarType.from_str(f"{instrument.id}-1-HOUR-MID-EXTERNAL")
    bars = BarDataWrangler(bar_type, instrument).process(window)

    log_dir = Path(tempfile.mkdtemp(prefix="nautilus-backtest-"))
    engine = BacktestEngine(
        config=BacktestEngineConfig(
            logging=LoggingConfig(
                log_level="ERROR",
                log_level_file="INFO",
                log_directory=str(log_dir),
                log_file_name="engine",
                log_colors=False,
                clear_log_file=True,
                log_component_levels={"EMACross-000": "WARNING"},
            ),
        )
    )
    try:
        venue = Venue("SIM")
        engine.add_venue(
            venue=venue,
            oms_type=OmsType.NETTING,
            account_type=AccountType.MARGIN,
            base_currency=USD,
            starting_balances=[Money(1_000_000, USD)],
        )
        engine.add_instrument(instrument)
        engine.add_data(bars)
        engine.add_strategy(
            EMACross(
                config=EMACrossConfig(
                    instrument_id=instrument.id,
                    bar_type=bar_type,
                    trade_size=Decimal(params["trade_size"]),
                    fast_ema_period=params["fast_ema"],
                    slow_ema_period=params["slow_ema"],
                    request_bars=False,
                    subscribe_trade_ticks=False,
                    subscribe_quote_ticks=False,
                    close_positions_on_stop=True,
                )
            )
        )
        engine.run()
        result = engine.get_result()
        orders = list(engine.cache.orders())
        fills_frame = ReportProvider.generate_fills_report(orders)
        account = engine.cache.account_for_venue(venue)
        account_frame = ReportProvider.generate_account_report(account)
        drawdown = max_drawdown(engine)
        logs = read_logs(log_dir)
    finally:
        engine.dispose()
        shutil.rmtree(log_dir, ignore_errors=True)

    usd = (result.stats_pnls or {}).get("USD", {})
    returns = result.stats_returns or {}
    stats = {
        "total_pnl": clean(usd.get("PnL (total)")),
        "return_pct": clean(usd.get("PnL% (total)")),
        "sharpe": clean(returns.get("Sharpe Ratio (252 days)")),
        "max_drawdown": drawdown,
        "win_rate": clean(usd.get("Win Rate")),
        "trade_count": int(result.total_positions),
        "order_count": int(result.total_orders),
    }
    sources = {
        "total_pnl": "BacktestResult.stats_pnls['USD']['PnL (total)']",
        "return_pct": "BacktestResult.stats_pnls['USD']['PnL% (total)'] — engine units, already scaled like a percent",
        "sharpe": "BacktestResult.stats_returns['Sharpe Ratio (252 days)']",
        "max_drawdown": "nautilus_trader.analysis.MaxDrawdown.calculate_from_returns on the portfolio analyzer returns. Negative fraction.",
        "win_rate": "BacktestResult.stats_pnls['USD']['Win Rate'] — fraction",
        "trade_count": "BacktestResult.total_positions (closed slices, including netting snapshots)",
        "order_count": "BacktestResult.total_orders",
    }

    fills = []
    if not fills_frame.empty:
        for _, row in fills_frame.iterrows():
            fills.append(
                {
                    "time": int(pd.Timestamp(row["ts_event"]).timestamp()),
                    "side": str(row["order_side"]),
                    "price": float(row["last_px"]),
                    "qty": float(row["last_qty"]),
                }
            )

    equity_by_time: dict[int, float] = {}
    for stamp, row in account_frame.iterrows():
        equity_by_time[int(pd.Timestamp(stamp).timestamp())] = float(row["total"])
    equity = [{"time": stamp, "value": equity_by_time[stamp]} for stamp in sorted(equity_by_time)]

    bar_points = [
        {
            "time": int(stamp.timestamp()),
            "open": float(row.open),
            "high": float(row.high),
            "low": float(row.low),
            "close": float(row.close),
        }
        for stamp, row in window.iterrows()
    ]

    starting = equity[0]["value"] if equity else None
    return {
        "data_label": meta["label"],
        "data_note": meta["generator"],
        "nautilus_version": meta["nautilus_version"],
        "instrument_id": str(instrument.id),
        "bar_type": str(bar_type),
        "fast_ema": params["fast_ema"],
        "slow_ema": params["slow_ema"],
        "trade_size": params["trade_size"],
        "start": params["start"].strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end": params["end"].strftime("%Y-%m-%dT%H:%M:%SZ"),
        "account": {
            "venue": "SIM",
            "type": "MARGIN",
            "currency": "USD",
            "starting_balance": starting,
        },
        "bars": bar_points,
        "equity": equity,
        "fills": fills,
        "stats": stats,
        "sources": sources,
        "engine_stats": {
            "stats_pnls": clean(result.stats_pnls),
            "stats_returns": clean(result.stats_returns),
        },
        "logs": logs,
    }


def main() -> None:
    if "--meta" in sys.argv:
        json.dump(load_meta(), sys.stdout)
        return
    text = sys.stdin.read().strip()
    raw = json.loads(text) if text else {}
    if not isinstance(raw, dict):
        json.dump({"error": "Request body must be a JSON object."}, sys.stdout)
        sys.exit(2)
    try:
        payload = execute(raw)
    except ValueError as exc:
        json.dump({"error": str(exc)}, sys.stdout)
        sys.exit(2)
    except Exception:
        traceback.print_exc(file=sys.stderr)
        json.dump({"error": "The backtest engine failed. See the server log."}, sys.stdout)
        sys.exit(1)
    json.dump(payload, sys.stdout)


if __name__ == "__main__":
    main()
