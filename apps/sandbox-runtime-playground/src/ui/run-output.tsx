import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LaneState } from './types'

function OutcomeBadge({ lane }: { lane: LaneState }) {
  if (lane.status === 'idle') return <Badge variant="secondary">idle</Badge>
  if (lane.status === 'running') return <Badge variant="secondary">running…</Badge>
  const blocked = lane.exitCode !== 0 || lane.violations.length > 0
  return blocked ? (
    <Badge variant="destructive">
      {lane.exitCode === 0 ? 'violations recorded' : `blocked · exit ${lane.exitCode}`}
    </Badge>
  ) : (
    <Badge className="bg-emerald-600 text-white dark:bg-emerald-500">allowed · exit 0</Badge>
  )
}

interface RunOutputProps {
  title: string
  subtitle: string
  lane: LaneState
}

export function RunOutput({ title, subtitle, lane }: RunOutputProps) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {lane.durationMs !== null && (
            <span className="text-muted-foreground text-[11px] tabular-nums">{lane.durationMs}ms</span>
          )}
          <OutcomeBadge lane={lane} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <pre
          className={cn(
            'bg-muted/40 h-44 overflow-auto rounded-md border p-3 font-mono text-xs leading-5 whitespace-pre-wrap',
            lane.status === 'idle' && 'text-muted-foreground',
          )}
        >
          {lane.chunks.length === 0 && lane.status === 'idle' && 'Run a command to see output here.'}
          {lane.chunks.map((chunk, index) => (
            <span
              key={index}
              className={cn(
                chunk.kind === 'stderr' && 'text-amber-600 dark:text-amber-400',
                chunk.kind === 'violation' && 'text-red-600 dark:text-red-400',
                chunk.kind === 'error' && 'font-semibold text-red-600 dark:text-red-400',
              )}
            >
              {chunk.kind === 'violation' ? `⛔ ${chunk.text}\n` : chunk.text}
            </span>
          ))}
        </pre>
        {lane.violations.length > 0 && (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950/40">
            <p className="mb-1 text-[11px] font-semibold text-red-700 dark:text-red-300">
              Sandbox violations
            </p>
            <ul className="space-y-0.5">
              {lane.violations.map((violation, index) => (
                <li key={index} className="font-mono text-[11px] text-red-700 dark:text-red-300">
                  {violation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
