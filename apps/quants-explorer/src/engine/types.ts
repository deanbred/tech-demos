export type Bar = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type Target = 0 | 1

export type Costs = {
  slippageBps: number
  feeBps: number
}

export type Fill = {
  date: string
  side: "buy" | "sell"
  price: number
  shares: number
}

export type ClosedTrade = {
  entryDate: string
  exitDate: string
  entryPrice: number
  exitPrice: number
  shares: number
  pnl: number
}

export type EquityPoint = {
  date: string
  equity: number
}

export type Metrics = {
  cagr: number | null
  sharpe: number | null
  maxDrawdown: number | null
  winRate: number | null
  trades: number
}

export type BacktestResult = {
  equity: EquityPoint[]
  fills: Fill[]
  trades: ClosedTrade[]
  metrics: Metrics
  openAtEnd: boolean
}

export const TRADING_DAYS_PER_YEAR = 252

export const INITIAL_CAPITAL = 100_000

export const COSTS: Costs = {
  slippageBps: 5,
  feeBps: 1,
}
