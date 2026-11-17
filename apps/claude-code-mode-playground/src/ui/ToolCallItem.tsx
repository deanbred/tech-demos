import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ToolCall } from '@/trace/types'
import { formatDuration } from '@/ui/format'

const TOOL_DOT_CLASSES: Record<string, string> = {
  Bash: 'bg-emerald-500',
  Read: 'bg-sky-500',
  Edit: 'bg-amber-500',
  Write: 'bg-violet-500',
  REPL: 'bg-fuchsia-500',
  Eval: 'bg-fuchsia-500',
}

function dotClass(name: string): string {
  return TOOL_DOT_CLASSES[name] ?? 'bg-neutral-400'
}

function CallRow({ call }: { call: ToolCall }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent">
          <span className={`size-2 shrink-0 rounded-full ${dotClass(call.name)}`} />
          <span className="w-12 shrink-0 text-xs font-semibold">{call.name}</span>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {call.argsSummary}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatDuration(call.durationMs)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <p className="font-mono text-xs break-all">
          {call.name}: {call.argsSummary}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

export function ToolCallItem({ call }: { call: ToolCall }) {
  const children = call.children ?? []
  return (
    <div>
      <CallRow call={call} />
      {children.length > 0 && (
        <div className="mt-0.5 mb-1 ml-3 border-l-2 border-fuchsia-300 pl-2 dark:border-fuchsia-800">
          <p className="px-2 pt-0.5 text-[10px] font-medium tracking-wide text-fuchsia-600 uppercase dark:text-fuchsia-400">
            {children.length} operations batched in one script
          </p>
          {children.map((child) => (
            <CallRow key={child.id} call={child} />
          ))}
        </div>
      )}
    </div>
  )
}
