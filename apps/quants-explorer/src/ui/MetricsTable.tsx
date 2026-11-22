import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPct, formatSharpe, formatWinRate, publishedCell } from "./format.ts"
import type { RunView } from "./types.ts"

const published = "bg-muted/80"

export function MetricsTable(props: { runs: readonly RunView[] }) {
  const stillOpen = props.runs.filter((run) => run.result.openAtEnd)
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">Metrics</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2}>Strategy</TableHead>
            <TableHead colSpan={5} className="text-center">
              This run · Synthetic data
            </TableHead>
            <TableHead colSpan={4} className={`text-center ${published}`}>
              As published by quants.md
            </TableHead>
          </TableRow>
          <TableRow>
            <TableHead>CAGR</TableHead>
            <TableHead>Sharpe</TableHead>
            <TableHead>Max DD</TableHead>
            <TableHead>Win rate</TableHead>
            <TableHead>Trades</TableHead>
            <TableHead className={published}>CAGR</TableHead>
            <TableHead className={published}>Sharpe</TableHead>
            <TableHead className={published}>Max DD</TableHead>
            <TableHead className={published}>Win rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.runs.map((run) => (
            <TableRow key={run.entry.id}>
              <TableCell className="min-w-36 align-top font-medium whitespace-nowrap">
                {run.entry.code} {run.entry.name}
              </TableCell>
              <TableCell className="align-top">{formatPct(run.result.metrics.cagr)}</TableCell>
              <TableCell className="align-top">{formatSharpe(run.result.metrics.sharpe)}</TableCell>
              <TableCell className="align-top">{formatPct(run.result.metrics.maxDrawdown)}</TableCell>
              <TableCell className="align-top">{formatWinRate(run.result.metrics.winRate)}</TableCell>
              <TableCell className="align-top">{run.result.metrics.trades}</TableCell>
              <TableCell className={published}>
                {publishedCell(run.entry.published.cagr)}
              </TableCell>
              <TableCell className={published}>
                {publishedCell(run.entry.published.sharpe)}
              </TableCell>
              <TableCell className={published}>
                {publishedCell(run.entry.published.maxDrawdown)}
              </TableCell>
              <TableCell className={published}>
                {publishedCell(run.entry.published.winRate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {stillOpen.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {stillOpen.map((run) => run.entry.name).join(", ")}{" "}
          {stillOpen.length === 1 ? "is" : "are"} still long at the last bar.
          That open trade is not in the win rate.
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        This run annualizes Sharpe with a 0% risk-free rate and a sample
        standard deviation over 252 sessions. Win rate counts closed round
        trips with profit above zero. The shaded columns are copied from the
        quants.md library table (results generated 11 Jul 2026). quants.md
        describes its Sharpe as using a 2% risk-free rate, on the original
        multi-asset yfinance backtests. Those figures are not this demo&apos;s
        results.
      </p>
    </div>
  )
}
