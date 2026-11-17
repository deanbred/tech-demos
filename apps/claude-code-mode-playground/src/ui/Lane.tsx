import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Trace } from '@/trace/types'
import { formatDuration, formatTokens } from '@/ui/format'
import { ToolCallItem } from '@/ui/ToolCallItem'

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-md bg-muted px-2.5 py-1.5">
      <span className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function Lane({ trace }: { trace: Trace }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            Code Mode {trace.codeMode ? 'ON' : 'OFF'}
          </CardTitle>
          {trace.codeMode ? (
            <Badge className="border-fuchsia-300 bg-fuchsia-100 text-fuchsia-900 dark:border-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-200">
              CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1
            </Badge>
          ) : (
            <Badge variant="secondary">default behavior</Badge>
          )}
        </div>
        {trace.model && <CardDescription>model: {trace.model}</CardDescription>}
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-3">
        <div className="grid grid-cols-5 gap-2 max-[480px]:grid-cols-2">
          <StatChip label="Turns" value={String(trace.totals.turns)} />
          <StatChip label="Tool calls" value={String(trace.totals.toolCalls)} />
          <StatChip label="Tokens in" value={formatTokens(trace.totals.inputTokens)} />
          <StatChip label="Tokens out" value={formatTokens(trace.totals.outputTokens)} />
          <StatChip label="Time" value={formatDuration(trace.totals.durationMs)} />
        </div>
        {trace.note && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {trace.note}
          </p>
        )}
        <Separator />
        <div className="flex flex-col gap-2">
          {trace.turns.map((turn) => (
            <div key={turn.index}>
              <p className="px-2 pb-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Turn {turn.index + 1}
              </p>
              {turn.toolCalls.map((call) => (
                <ToolCallItem key={call.id} call={call} />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
