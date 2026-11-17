import { Badge } from '@/components/ui/badge'
import type { TraceSource } from '@/trace/types'

export function SourceBadge({ source }: { source: TraceSource }) {
  switch (source) {
    case 'sample':
      return (
        <Badge className="border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Sample data — illustrative only, not real measurements
        </Badge>
      )
    case 'live':
      return (
        <Badge className="border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
          Recorded live
        </Badge>
      )
    default: {
      const exhaustive: never = source
      throw new Error(`Unknown trace source: ${String(exhaustive)}`)
    }
  }
}
