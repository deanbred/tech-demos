import { TooltipProvider } from '@/components/ui/tooltip'
import { loadLivePairs, samplePairs } from '@/trace/load'
import type { TracePair } from '@/trace/types'
import { ComparisonChart } from '@/ui/ComparisonChart'
import { Lane } from '@/ui/Lane'
import { SourceBadge } from '@/ui/SourceBadge'
import { TracePicker } from '@/ui/TracePicker'
import { useEffect, useMemo, useState } from 'react'

export default function App() {
  const [livePairs, setLivePairs] = useState<TracePair[]>([])
  const [selectedId, setSelectedId] = useState(samplePairs[0].id)

  useEffect(() => {
    let cancelled = false
    loadLivePairs().then((pairs) => {
      if (cancelled || pairs.length === 0) return
      setLivePairs(pairs)
      setSelectedId(pairs[0].id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const pairs = useMemo(() => [...samplePairs, ...livePairs], [livePairs])
  const pair = pairs.find((candidate) => candidate.id === selectedId) ?? pairs[0]

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Claude Code · Code Mode playground
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            The same repo task ("{pair.task}") run twice in Claude Code: once normally, once with
            the experimental{' '}
            <a
              href="https://code.claude.com/docs/en/code-mode"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Code Mode
            </a>{' '}
            (<code className="font-mono text-xs">CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1</code>, Claude
            Code v2.1.323+), in which Claude writes one JavaScript script that batches several tool
            calls instead of making one call per turn.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <TracePicker pairs={pairs} selectedId={pair.id} onSelect={setSelectedId} />
          <SourceBadge source={pair.source} />
        </div>

        {pair.note && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {pair.note}
          </p>
        )}

        <div className="grid grid-cols-2 items-start gap-4 max-[900px]:grid-cols-1">
          <Lane trace={pair.off} />
          <Lane trace={pair.on} />
        </div>

        <ComparisonChart pair={pair} />

        <footer className="pb-4 text-xs text-muted-foreground">
          Code Mode is experimental and off by default; per the{' '}
          <a
            href="https://code.claude.com/docs/en/code-mode"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            official docs
          </a>{' '}
          it currently requires an interactive terminal session and does not work with headless{' '}
          <code className="font-mono">claude -p</code>, which is what `bun run record` uses. See the
          README for details.
        </footer>
      </div>
    </TooltipProvider>
  )
}
