"""The default backtest on the bundled series returns real engine stats."""

from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path


class DefaultBacktestTest(unittest.TestCase):
    def test_default_params_return_engine_stats(self) -> None:
        script = Path(__file__).resolve().parent / "run.py"
        completed = subprocess.run(
            [sys.executable, str(script)],
            input=b"{}",
            capture_output=True,
            check=False,
            timeout=180,
        )
        self.assertEqual(
            completed.returncode,
            0,
            completed.stderr.decode(errors="replace"),
        )
        payload = json.loads(completed.stdout)
        self.assertEqual(payload["data_label"], "Synthetic data")
        self.assertGreater(len(payload["equity"]), 0)
        self.assertGreater(len(payload["bars"]), 0)
        stats = payload["stats"]
        for key in (
            "total_pnl",
            "return_pct",
            "sharpe",
            "max_drawdown",
            "win_rate",
            "trade_count",
        ):
            self.assertIn(key, stats)
        self.assertIsInstance(stats["total_pnl"], (int, float))
        self.assertIsInstance(stats["trade_count"], int)
        self.assertGreater(stats["trade_count"], 0)
        self.assertGreater(len(payload["fills"]), 0)


if __name__ == "__main__":
    unittest.main()
