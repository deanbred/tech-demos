"""Write the bundled synthetic hourly bars.

The series is a fixed-seed random walk. It is not market history.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 2121402979
START = "2024-01-01 00:00:00+00:00"
END = "2024-06-30 23:00:00+00:00"


def build() -> pd.DataFrame:
    index = pd.date_range(START, END, freq="h", tz="UTC")
    count = len(index)
    rng = np.random.default_rng(SEED)
    price = 1.0850
    closes = np.empty(count, dtype=np.float64)
    for i in range(count):
        # Two slow waves so an EMA cross sees several regimes, plus noise.
        drift = 0.00008 * np.sin(2 * np.pi * i / (24 * 21))
        drift += 0.00004 * np.sin(2 * np.pi * i / (24 * 6))
        shock = float(rng.normal(0.0, 0.00115))
        price *= float(np.exp(drift + shock))
        closes[i] = price

    opens = np.empty(count, dtype=np.float64)
    opens[0] = closes[0] * (1 - float(rng.uniform(0.0001, 0.0004)))
    opens[1:] = closes[:-1]
    high_pad = rng.uniform(0.00005, 0.0007, count)
    low_pad = rng.uniform(0.00005, 0.0007, count)
    high = np.maximum(opens, closes) * (1.0 + high_pad)
    low = np.minimum(opens, closes) * (1.0 - low_pad)
    volume = rng.integers(400_000, 2_000_000, count)

    frame = pd.DataFrame(
        {
            "timestamp": index.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "open": np.round(opens, 5),
            "high": np.round(np.maximum(high, np.maximum(opens, closes)), 5),
            "low": np.round(np.minimum(low, np.minimum(opens, closes)), 5),
            "close": np.round(closes, 5),
            "volume": volume.astype(np.int64),
        }
    )
    return frame


def main() -> None:
    out = Path(__file__).resolve().parent / "data"
    out.mkdir(parents=True, exist_ok=True)
    frame = build()
    frame.to_csv(out / "synth_eurusd_1h.csv", index=False)
    meta = {
        "label": "Synthetic data",
        "seed": SEED,
        "instrument_id": "EUR/USD.SIM",
        "bar_spec": "1-HOUR-MID-EXTERNAL",
        "start": frame["timestamp"].iloc[0],
        "end": frame["timestamp"].iloc[-1],
        "rows": int(len(frame)),
        "generator": (
            "Fixed-seed geometric random walk with two sine drifts. "
            "Shaped like a major FX pair so Nautilus's EUR/USD test instrument "
            "can price it. Not real market history."
        ),
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"wrote {len(frame)} rows to {out}")


if __name__ == "__main__":
    main()
