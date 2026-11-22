import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { INITIAL_CAPITAL } from "../engine/types.ts"
import type { RunView } from "./types.ts"

const COLORS = [
  "oklch(0.45 0.14 255)",
  "oklch(0.52 0.14 55)",
  "oklch(0.46 0.1 160)",
]

function thin<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max) return [...items]
  const step = Math.ceil(items.length / max)
  const sampled: T[] = []
  for (let index = 0; index < items.length; index += step) {
    const item = items[index]
    if (item !== undefined) sampled.push(item)
  }
  const last = items[items.length - 1]
  if (last !== undefined && sampled[sampled.length - 1] !== last) sampled.push(last)
  return sampled
}

export function EquityChart(props: { runs: readonly RunView[] }) {
  const first = props.runs[0]
  if (!first) return null

  const config: ChartConfig = {}
  props.runs.forEach((run, index) => {
    config[run.entry.id] = {
      label: run.entry.name,
      color: COLORS[index] ?? COLORS[0],
    }
  })

  const points = first.result.equity.map((point, index) => {
    const row: Record<string, string | number> = { date: point.date }
    for (const run of props.runs) {
      const equity = run.result.equity[index]?.equity
      if (equity !== undefined && equity > 0) {
        row[run.entry.id] = Math.round((equity / INITIAL_CAPITAL) * 10_000) / 10_000
      }
    }
    return row
  })
  const rows = thin(points, 420)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Equity curves</h2>
        <p className="text-xs font-medium">Synthetic data</p>
      </div>
      <ChartContainer config={config} className="aspect-auto h-80 w-full">
        <LineChart data={rows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={48}
            tickFormatter={(value: string) => value.slice(0, 4)}
          />
          <YAxis
            scale="log"
            domain={["auto", "auto"]}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(value: number) => value.toFixed(2)}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {props.runs.map((run) => (
            <Line
              key={run.entry.id}
              type="monotone"
              dataKey={run.entry.id}
              stroke={`var(--color-${run.entry.id})`}
              dot={false}
              strokeWidth={1.8}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground">
        Growth of $1 on a log scale. A signal seen on a bar is filled at the
        next bar&apos;s open. The chart is sampled for drawing; the table uses
        every bar.
      </p>
    </div>
  )
}
