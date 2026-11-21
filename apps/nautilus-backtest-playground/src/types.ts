export type Dataset = {
  label: string;
  seed: number;
  instrument_id: string;
  bar_spec: string;
  start: string;
  end: string;
  rows: number;
  generator: string;
  nautilus_version?: string;
};

export type BarPoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type EquityPoint = {
  time: number;
  value: number;
};

export type Fill = {
  time: number;
  side: string;
  price: number;
  qty: number;
};

export type Stats = {
  total_pnl: number | null;
  return_pct: number | null;
  sharpe: number | null;
  max_drawdown: number | null;
  win_rate: number | null;
  trade_count: number | null;
  order_count: number | null;
};

export type BacktestResult = {
  data_label: string;
  data_note: string;
  nautilus_version: string;
  instrument_id: string;
  bar_type: string;
  fast_ema: number;
  slow_ema: number;
  trade_size: number;
  start: string;
  end: string;
  account: {
    venue: string;
    type: string;
    currency: string;
    starting_balance: number | null;
  };
  bars: BarPoint[];
  equity: EquityPoint[];
  fills: Fill[];
  stats: Stats;
  sources: Record<string, string>;
  engine_stats: {
    stats_pnls: unknown;
    stats_returns: unknown;
  };
  logs: string[];
};

export type ApiError = {
  error: string;
  detail?: string;
};
