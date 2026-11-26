import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RunResponse } from './types'

export function ResultPane({ result, busy }: { result: RunResponse | null; busy: boolean }) {
  return (
    <Card aria-busy={busy} aria-live="polite">
      <CardHeader>
        <CardTitle>Result</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {busy ? <p className="text-sm text-muted-foreground">Running…</p> : null}
        {!busy && !result ? (
          <p className="text-sm text-muted-foreground">
            Run a tool to see the shell command beside its result.
          </p>
        ) : null}
        {result?.command ? <CommandPreview result={result} /> : null}
        {result?.message ? (
          <pre className="overflow-x-auto text-sm whitespace-pre-wrap text-foreground">{result.message}</pre>
        ) : null}
        {result && result.ok ? <ResultBody result={result} /> : null}
      </CardContent>
    </Card>
  )
}

function CommandPreview({ result }: { result: RunResponse }) {
  const [copied, setCopied] = useState(false)
  const command = result.command ?? ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section aria-labelledby="command-heading" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 id="command-heading" className="text-sm font-medium">
          Command
        </h2>
        {result.mock ? <Badge variant="outline">MOCK</Badge> : null}
        <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {result.mock ? (
        <p className="text-xs font-medium tracking-wide text-foreground">MOCK — gemini-api was not executed.</p>
      ) : null}
      <pre className="command overflow-x-auto text-sm whitespace-pre-wrap">{command}</pre>
      {result.cwd ? <p className="text-xs text-muted-foreground">cwd {result.cwd}</p> : null}
    </section>
  )
}

function ResultBody({ result }: { result: RunResponse }) {
  switch (result.kind) {
    case 'audio':
      return (
        <figure className="flex flex-col gap-2">
          <figcaption className="flex items-center gap-2 text-sm">
            {result.mock ? <Badge variant="outline">MOCK</Badge> : null}
            <span>{result.mock ? 'MOCK audio fixture. Not a model voiceover.' : 'Audio from gemini-api tts.'}</span>
          </figcaption>
          {result.mediaUrl ? <audio controls src={result.mediaUrl} className="w-full" /> : null}
        </figure>
      )
    case 'image':
      return (
        <figure className="flex flex-col gap-2">
          <figcaption className="flex items-center gap-2 text-sm">
            {result.mock ? <Badge variant="outline">MOCK</Badge> : null}
            <span>{result.mock ? 'MOCK fixture image. Not a model render.' : 'Image from gemini-api image.'}</span>
          </figcaption>
          {result.mediaUrl ? (
            <img
              src={result.mediaUrl}
              alt={result.mock ? 'MOCK fixture image' : 'Image written by gemini-api'}
              className="max-h-80 w-full rounded-lg object-contain"
            />
          ) : null}
        </figure>
      )
    case 'text':
      return (
        <section aria-labelledby="output-heading" className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 id="output-heading" className="text-sm font-medium">
              Output
            </h2>
            {result.mock ? <Badge variant="outline">MOCK</Badge> : null}
          </div>
          <pre className="command overflow-x-auto text-sm whitespace-pre-wrap">{result.text}</pre>
        </section>
      )
    case 'blocked':
    case undefined:
      return null
    default: {
      const unreachable: never = result.kind
      return unreachable
    }
  }
}
