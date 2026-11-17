import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import type { TracePair } from '@/trace/types'
import { formatDuration, formatTokens } from '@/ui/format'
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'

const chartConfig = {
  value: { label: 'Value' },
  off: { label: 'Code Mode OFF', color: 'var(--chart-1)' },
  on: { label: 'Code Mode ON', color: 'var(--chart-2)' },
} satisfies ChartConfig

interface Metric {
  key: string
  label: string
  off: number
  on: number
  format: (value: number) => string
}

function buildMetrics(pair: TracePair): Metric[] {
  const plain = (value: number) => String(value)
  return [
    { key: 'turns', label: 'Turns', off: pair.off.totals.turns, on: pair.on.totals.turns, format: plain },
    {
      key: 'toolCalls',
      label: 'Tool calls',
      off: pair.off.totals.toolCalls,
      on: pair.on.totals.toolCalls,
      format: plain,
    },
    {
      key: 'tokens',
      label: 'Tokens (in + out)',
      off: pair.off.totals.inputTokens + pair.off.totals.outputTokens,
      on: pair.on.totals.inputTokens + pair.on.totals.outputTokens,
      format: formatTokens,
    },
    {
      key: 'duration',
      label: 'Wall-clock time',
      off: pair.off.totals.durationMs,
      on: pair.on.totals.durationMs,
      format: (ms) => formatDuration(ms),
    },
  ]
}

function deltaLabel(off: number, on: number): string {
  if (off === 0) return ''
  const delta = ((on - off) / off) * 100
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(0)}% with Code Mode on`
}

function MetricChart({ metric }: { metric: Metric }) {
  const data = [
    { run: 'OFF', value: metric.off, fill: 'var(--color-off)' },
    { run: 'ON', value: metric.on, fill: 'var(--color-on)' },
  ]
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">{metric.label}</p>
      <p className="text-xs text-muted-foreground">{deltaLabel(metric.off, metric.on)}</p>
      <ChartContainer config={chartConfig} className="h-36 w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 64 }}>
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="run" width={36} tickLine={false} axisLine={false} />
          <Bar dataKey="value" radius={6} barSize={28}>
            {data.map((entry) => (
              <Cell key={entry.run} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              className="fill-foreground text-xs tabular-nums"
              formatter={(value) => metric.format(Number(value))}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export function ComparisonChart({ pair }: { pair: TracePair }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">OFF vs ON comparison</CardTitle>
        <CardDescription>
          {pair.source === 'sample'
            ? 'Sample data: these bars illustrate the UI, they are not measurements.'
            : 'Measured from the recorded live run pair.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-[640px]:grid-cols-1">
          {buildMetrics(pair).map((metric) => (
            <MetricChart key={metric.key} metric={metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
