import { useEffect, useRef, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { InvocationRecord, SessionEvent, StatusResponse } from '@/shared/api'
import { cn } from '@/lib/utils'

const LABELS: Record<string, string> = {
  'host.stats': 'Read system stats',
  'light.toggle': 'Toggle light',
  'chore.disk': 'Run disk chore',
}

export function Dashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [invocations, setInvocations] = useState<InvocationRecord[]>([])
  const [lightOn, setLightOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const logScroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/status')
        .then(response => {
          if (!response.ok) throw new Error(`status ${response.status}`)
          return response.json() as Promise<StatusResponse>
        })
        .then(next => {
          if (cancelled) return
          setStatus(next)
          setLightOn(next.lightOn)
          setLoadError(null)
          setInvocations(current => (current.length === 0 ? next.invocations : current))
        })
        .catch(() => {
          if (!cancelled) setLoadError('Could not reach the gadget API. Start it with bun run dev from this app.')
        })
    }
    load()
    const timer = setInterval(load, 2000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const scroller = logScroller.current
    if (!scroller) return
    scroller.scrollTop = scroller.scrollHeight
  }, [invocations.length])

  const note = (invocation: InvocationRecord) => {
    const outcome = invocation.ok ? 'ok' : 'failed'
    setAnnouncement(`${invocation.command} ${outcome}, exit ${invocation.exitCode ?? 'none'}, ${invocation.durationMs} ms`)
  }

  const invoke = async (command: string) => {
    setBusy(true)
    setActionError(null)
    try {
      const response = await fetch('/api/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, params: {} }),
      })
      const body = (await response.json()) as { invocation?: InvocationRecord; lightOn?: boolean; error?: string }
      const invocation = body.invocation
      if (!response.ok || !invocation) {
        setActionError(body.error ?? `invoke failed (${response.status})`)
        return
      }
      setInvocations(current => [...current, invocation])
      if (typeof body.lightOn === 'boolean') setLightOn(body.lightOn)
      note(invocation)
    } catch {
      setActionError('The gadget API did not answer.')
    } finally {
      setBusy(false)
    }
  }

  const runSession = async () => {
    setBusy(true)
    setActionError(null)
    try {
      const response = await fetch('/api/session', { method: 'POST' })
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        setActionError(body?.error ?? `session failed (${response.status})`)
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        buffer += decoder.decode(chunk.value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line) as SessionEvent
          if (event.type === 'invocation') {
            setInvocations(current => [...current, event.invocation])
            setLightOn(event.lightOn)
            note(event.invocation)
          } else if (event.type === 'error') {
            setActionError(event.message)
          }
        }
      }
    } catch {
      setActionError('The Muse session stopped before it finished.')
    } finally {
      setBusy(false)
    }
  }

  const live = status?.live

  return (
    <div className="bg-background text-foreground min-h-svh">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 lg:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 id="content" tabIndex={-1} className="text-xl font-semibold tracking-tight">
              Muse Linux gadget
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              A virtual gadget on this machine. Commands are registered from JSON descriptors, then mock Muse calls them with JSON on stdin.
            </p>
          </div>
          {live && (
            <Badge className={live.attempted ? 'bg-destructive text-white' : 'bg-emerald-700 text-white'}>
              {live.attempted ? 'Live failed · mock running' : 'Mock mode'}
            </Badge>
          )}
        </header>

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>

        {loadError && (
          <Alert variant="destructive">
            <AlertTitle>Gadget API unreachable</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}
        {live?.attempted && (
          <Alert variant="destructive">
            <AlertTitle>Live SDK connection failed</AlertTitle>
            <AlertDescription>
              <p>{live.message}</p>
              <ul className="mt-2 list-disc pl-4">
                {live.requirements.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {live && !live.attempted && (
          <p className="text-muted-foreground text-sm">{live.message}</p>
        )}
        {actionError && (
          <Alert variant="destructive">
            <AlertTitle>Command failed to start</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <h2 className="font-heading text-base leading-snug font-medium">Gadget</h2>
                <CardDescription>Fake light on the device side. Toggling it does not touch a real lamp.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <figure className="flex flex-col items-center gap-3">
                  <div
                    aria-hidden="true"
                    className={cn(
                      'flex size-36 items-center justify-center rounded-full border-2 transition-colors duration-300 motion-reduce:transition-none',
                      lightOn
                        ? 'border-amber-700 bg-amber-400 text-amber-950 shadow-[0_0_36px_10px_rgba(251,191,36,0.9)]'
                        : 'border-border bg-muted text-muted-foreground',
                    )}
                  >
                    <Lightbulb className="size-16" />
                  </div>
                  <figcaption className="text-sm font-medium">{lightOn ? 'Light is on' : 'Light is off'}</figcaption>
                </figure>
                <Separator />
                <div className="flex w-full flex-col gap-2" aria-busy={busy}>
                  <Button type="button" onClick={() => void runSession()} disabled={busy || !status}>
                    Run Muse session
                  </Button>
                  {(status?.commands ?? []).map(command => (
                    <Button
                      key={command.name}
                      type="button"
                      variant="outline"
                      onClick={() => void invoke(command.name)}
                      disabled={busy}
                    >
                      {LABELS[command.name] ?? command.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-heading text-base leading-snug font-medium">Registered commands</h2>
                <CardDescription>Loaded from commands/*.json. The UI does not invent these.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {(status?.commands ?? []).map(command => (
                    <li key={command.name}>
                      <p className="font-mono text-sm font-medium">{command.name}</p>
                      <p className="text-muted-foreground text-sm">{command.description}</p>
                    </li>
                  ))}
                </ul>
                {status && status.skipped.length > 0 && (
                  <p className="text-destructive mt-3 text-sm">
                    Skipped {status.skipped.map(item => item.file).join(', ')}.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-heading text-base leading-snug font-medium">Built-in Linux commands</h2>
                <CardDescription>Documented from the SDK. None of these run on this host.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {(status?.builtins ?? []).map(command => (
                    <li key={command.name}>
                      <p className="flex items-center gap-2 font-mono text-sm">
                        {command.name}
                        <Badge variant="outline">not exposed</Badge>
                      </p>
                      <p className="text-muted-foreground text-sm">{command.description}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="font-heading text-base leading-snug font-medium">Invocations</h2>
              <CardDescription>Each row is one mock Muse call: parameters in, JSON result out, exit, and time.</CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={logScroller} className="max-h-[32rem] overflow-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Mock Muse command invocations</caption>
                <thead>
                  <tr className="border-b text-xs">
                    <th scope="col" className="py-2 pr-3 font-medium">Time</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Command</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Params</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Result</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Exit</th>
                    <th scope="col" className="py-2 font-medium">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {invocations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-muted-foreground py-6">
                        No commands yet. Run one, or play the Muse session.
                      </td>
                    </tr>
                  )}
                  {invocations.map(invocation => (
                    <tr key={invocation.id} className="border-b align-top">
                      <td className="py-2 pr-3 font-mono text-xs whitespace-nowrap">
                        {new Date(invocation.at).toLocaleTimeString()}
                      </td>
                      <th scope="row" className="py-2 pr-3 font-mono text-xs font-medium">
                        {invocation.command}
                      </th>
                      <td className="py-2 pr-3 font-mono text-xs">{JSON.stringify(invocation.params)}</td>
                      <td className="max-w-md py-2 pr-3 font-mono text-xs">
                        <pre className="whitespace-pre-wrap break-words">
                          {invocation.ok ? JSON.stringify(invocation.result, null, 2) : invocation.error}
                        </pre>
                      </td>
                      <td className={cn('py-2 pr-3 font-mono text-xs', invocation.ok ? '' : 'text-destructive')}>
                        {invocation.exitCode ?? '—'}
                      </td>
                      <td className="py-2 font-mono text-xs">{invocation.durationMs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
