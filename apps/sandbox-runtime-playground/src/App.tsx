import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_POLICY, type Policy } from '@/sandbox/policy'
import { PolicyEditor } from '@/ui/policy-editor'
import { PresetsPanel } from '@/ui/presets-panel'
import { RunOutput } from '@/ui/run-output'
import type { HealthStatus, Preset } from '@/ui/types'
import { useRun } from '@/ui/use-run'

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [policy, setPolicy] = useState<Policy>(DEFAULT_POLICY)
  const [command, setCommand] = useState('cat ~/.ssh/id_*')
  const { lanes, running, run } = useRun()

  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then(setHealth)
      .catch(() => setHealthError('Could not reach the sandbox API on :8787. Is `bun run dev` running?'))
    fetch('/api/presets')
      .then(response => response.json())
      .then(setPresets)
      .catch(() => {})
  }, [])

  const depsBroken = healthError !== null || (health !== null && !health.ok)

  const onRun = () => {
    if (!command.trim() || running || depsBroken) return
    void run(command, policy)
  }

  return (
    <div className="bg-background text-foreground min-h-svh">
      <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-mono text-lg font-semibold tracking-tight">
              sandbox-runtime playground
            </h1>
            <p className="text-muted-foreground text-xs">
              Write a policy, run a command unsandboxed vs under Anthropic's{' '}
              <code className="font-mono">srt</code> sandbox, and see what gets blocked.
            </p>
          </div>
          {health && health.ok && (
            <Badge className="bg-emerald-600 text-white dark:bg-emerald-500">
              sandbox ready · {health.platform === 'linux' ? 'bubblewrap + socat' : 'Seatbelt'} ·{' '}
              {health.platform}
            </Badge>
          )}
          {health && !health.ok && <Badge variant="destructive">sandbox unavailable</Badge>}
        </header>

        {healthError && (
          <Alert variant="destructive">
            <AlertTitle>Sandbox API unreachable</AlertTitle>
            <AlertDescription>{healthError}</AlertDescription>
          </Alert>
        )}
        {health && !health.ok && (
          <Alert variant="destructive">
            <AlertTitle>Missing sandbox dependencies</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {health.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
              <p className="mt-1">
                On Linux install <code>bubblewrap</code> and <code>socat</code> (e.g.{' '}
                <code>sudo apt install bubblewrap socat</code>); on macOS, Seatbelt ships with the
                OS.
              </p>
            </AlertDescription>
          </Alert>
        )}
        {health && health.ok && health.warnings.length > 0 && (
          <Alert>
            <AlertTitle>Sandbox warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {health.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <PolicyEditor policy={policy} onChange={setPolicy} />
            <PresetsPanel
              presets={presets}
              selectedId={selectedPreset}
              onSelect={preset => {
                setSelectedPreset(preset.id)
                setCommand(preset.command)
              }}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                value={command}
                spellCheck={false}
                placeholder="shell command, e.g. curl -sS https://example.com"
                className="flex-1 font-mono text-xs"
                onChange={event => {
                  setCommand(event.target.value)
                  setSelectedPreset(null)
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') onRun()
                }}
              />
              <Button onClick={onRun} disabled={running || depsBroken || !command.trim()}>
                {running ? 'Running…' : 'Run both'}
              </Button>
            </div>

            <div className="grid items-start gap-4 md:grid-cols-2">
              <RunOutput
                title="Unsandboxed"
                subtitle="plain /bin/bash on the host"
                lane={lanes.unsandboxed}
              />
              <RunOutput
                title="Sandboxed"
                subtitle="wrapped by SandboxManager (srt)"
                lane={lanes.sandboxed}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
