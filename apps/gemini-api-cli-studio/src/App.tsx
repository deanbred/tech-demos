import { useEffect, useState, type FocusEvent, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { isTabId, PROMPTS, type TabId } from '@/commands/defaults'
import { ResultPane } from '@/ui/result-pane'
import type { RunMode, RunResponse, StatusResponse } from '@/ui/types'

const INLINE_LIMIT = 14 * 1024 * 1024

const TAB_LIST = [
  { id: 'video', label: '🎞️ Video' },
  { id: 'document', label: '📄 Image/PDF' },
  { id: 'tts', label: '🔊 Text → TTS' },
  { id: 'image', label: '🖼️ Prompt → image' },
] as const satisfies readonly { id: TabId; label: string }[]

type DocumentSample = 'image' | 'pdf'

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [mode, setMode] = useState<RunMode>('mock')
  const [tab, setTab] = useState<TabId>('video')
  const [prompts, setPrompts] = useState<{ video: string; document: string; tts: string; image: string }>({
    video: PROMPTS.video,
    document: PROMPTS.ocr,
    tts: PROMPTS.tts,
    image: PROMPTS.image,
  })
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoSample, setVideoSample] = useState(false)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentSample, setDocumentSample] = useState<DocumentSample | null>(null)
  const [result, setResult] = useState<RunResponse | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.getElementById(`${tab}-tab`)?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      container: 'nearest',
    } as ScrollIntoViewOptions)
  }, [tab])

  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/status', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Status request failed (${response.status})`)
        setStatus((await response.json()) as StatusResponse)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStatusError(error instanceof Error ? error.message : 'Status unavailable')
      })
    return () => controller.abort()
  }, [])

  function selectTabFromFocus(event: FocusEvent<HTMLDivElement>) {
    const id = (event.target as HTMLElement).dataset.tab
    if (id && isTabId(id)) setTab(id)
  }

  async function run(action: 'analyze' | 'transcribe') {
    if (busy) return
    const body = new FormData()
    body.set('mode', mode)
    body.set('tab', tab)
    body.set('action', action)
    body.set('prompt', prompts[tab])

    if (tab === 'video') {
      if (videoSample) body.set('sample', 'video')
      else if (videoFile) {
        if (videoFile.size > INLINE_LIMIT) {
          setResult({
            ok: false,
            message:
              'This file is over the ~14 MB inline limit. Upload it once with `gemini-api files upload --wait` and pass the files/... URI.',
          })
          return
        }
        body.set('file', videoFile)
      }
    }
    if (tab === 'document') {
      if (documentSample) body.set('sample', documentSample)
      else if (documentFile) {
        if (documentFile.size > INLINE_LIMIT) {
          setResult({
            ok: false,
            message:
              'This file is over the ~14 MB inline limit. Upload it once with `gemini-api files upload --wait` and pass the files/... URI.',
          })
          return
        }
        body.set('file', documentFile)
      }
    }

    setBusy(true)
    try {
      const response = await fetch('/api/run', { method: 'POST', body })
      const payload = (await response.json()) as RunResponse
      setResult(payload)
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : 'Request failed' })
    } finally {
      setBusy(false)
    }
  }

  const liveBlocked = mode === 'live' && status != null && !status.liveReady

  return (
    <main className="studio">
      <header className="mb-8 flex flex-col gap-3">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          <a className="underline-offset-4 hover:underline" href="https://github.com/google-gemini/gemini-api-cli">
            google-gemini/gemini-api-cli
          </a>
          {' · '}
          <a className="underline-offset-4 hover:underline" href="https://www.apache.org/licenses/LICENSE-2.0">
            Apache-2.0
          </a>
        </p>
        <h1 className="text-3xl font-medium tracking-tight">Gemini API CLI Studio</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Drop a file or type a prompt, then read the exact <code className="font-mono text-[0.9em]">gemini-api</code>{' '}
          command beside its result. This wraps the official stateless CLI, not the{' '}
          <code className="font-mono text-[0.9em]">@google/gemini-cli</code> coding agent.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant={status?.binary.found ? 'secondary' : 'outline'}>{binaryLabel(status, statusError)}</Badge>
        <Badge variant={status?.key.present ? 'secondary' : 'outline'}>{keyLabel(status, statusError)}</Badge>
        <fieldset className="ml-auto flex items-center gap-3">
          <legend className="text-sm font-medium">Mode</legend>
          <span className="flex items-center gap-1.5">
            <input
              id="mode-mock"
              type="radio"
              name="mode"
              value="mock"
              checked={mode === 'mock'}
              onChange={() => setMode('mock')}
            />
            <label htmlFor="mode-mock">Mock</label>
          </span>
          <span className="flex items-center gap-1.5">
            <input
              id="mode-live"
              type="radio"
              name="mode"
              value="live"
              checked={mode === 'live'}
              onChange={() => setMode('live')}
            />
            <label htmlFor="mode-live">Live</label>
          </span>
        </fieldset>
      </div>

      {liveBlocked ? (
        <pre className="command mb-6 overflow-x-auto text-sm whitespace-pre-wrap">
          {status.binary.found ? status.help.missingKey : status.help.missingBinary}
        </pre>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div>
          <div
            id="tool-tabs"
            className="tablist"
            aria-label="Gemini API tools"
            onFocus={selectTabFromFocus}
            {...{ focusgroup: 'tablist nomemory' }}
          >
            {TAB_LIST.map((item) => (
              <button
                key={item.id}
                id={`${item.id}-tab`}
                type="button"
                data-tab={item.id}
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                {...(tab === item.id ? { focusgroupstart: '' } : {})}
              >
                <span className="tab-label">{item.label}</span>
              </button>
            ))}
          </div>

          <TabPanel id="video" selected={tab === 'video'} onSelect={setTab}>
            <form
              aria-labelledby="video-heading"
              onSubmit={(event) => {
                event.preventDefault()
                void run('analyze')
              }}
            >
              <h2 id="video-heading" className="mb-1 text-base font-medium">
                Timestamped summary
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Runs <code className="font-mono">analyze</code>, not <code className="font-mono">video</code>.{' '}
                <code className="font-mono">video</code> generates video.
              </p>
              <FileField
                id="video-file"
                label="Video file"
                accept="video/*"
                file={videoFile}
                sampleLabel={videoSample ? 'Using sample clip as interview.mp4' : null}
                onFile={(file) => {
                  setVideoFile(file)
                  setVideoSample(false)
                }}
              />
              <div className="mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setVideoSample(true)
                    setVideoFile(null)
                  }}
                >
                  Use sample clip
                </Button>
              </div>
              <PromptField
                id="video-question"
                label="Question"
                value={prompts.video}
                onChange={(value) => setPrompts((current) => ({ ...current, video: value }))}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy}>
                  Run analyze
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void run('transcribe')}>
                  Transcribe SRT
                </Button>
              </div>
            </form>
          </TabPanel>

          <TabPanel id="document" selected={tab === 'document'} onSelect={setTab}>
            <form
              aria-labelledby="document-heading"
              onSubmit={(event) => {
                event.preventDefault()
                void run('analyze')
              }}
            >
              <h2 id="document-heading" className="mb-1 text-base font-medium">
                Extract text
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                There is no <code className="font-mono">ocr</code> subcommand. This runs{' '}
                <code className="font-mono">analyze</code> with an extract-text question.
              </p>
              <FileField
                id="document-file"
                label="Image or PDF"
                accept="image/*,application/pdf,.pdf"
                file={documentFile}
                sampleLabel={
                  documentSample === 'image'
                    ? 'Using sample image as brief.png'
                    : documentSample === 'pdf'
                      ? 'Using sample PDF as product-brief.pdf'
                      : null
                }
                onFile={(file) => {
                  setDocumentFile(file)
                  setDocumentSample(null)
                }}
              />
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDocumentSample('image')
                    setDocumentFile(null)
                  }}
                >
                  Use sample image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDocumentSample('pdf')
                    setDocumentFile(null)
                  }}
                >
                  Use sample PDF
                </Button>
              </div>
              <PromptField
                id="document-question"
                label="Question"
                value={prompts.document}
                onChange={(value) => setPrompts((current) => ({ ...current, document: value }))}
              />
              <Button type="submit" disabled={busy}>
                Run analyze
              </Button>
            </form>
          </TabPanel>

          <TabPanel id="tts" selected={tab === 'tts'} onSelect={setTab}>
            <form
              aria-labelledby="tts-heading"
              onSubmit={(event) => {
                event.preventDefault()
                void run('analyze')
              }}
            >
              <h2 id="tts-heading" className="mb-1 text-base font-medium">
                Text to speech
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Runs <code className="font-mono">tts --out ./assets/welcome.wav</code>. Help text defaults the voice
                to Kore; this studio does not pass <code className="font-mono">--voice</code>.
              </p>
              <PromptField
                id="tts-text"
                label="Text to speak"
                value={prompts.tts}
                onChange={(value) => setPrompts((current) => ({ ...current, tts: value }))}
              />
              <div className="mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPrompts((current) => ({ ...current, tts: PROMPTS.tts }))}
                >
                  Use sample line
                </Button>
              </div>
              <Button type="submit" disabled={busy}>
                Run tts
              </Button>
            </form>
          </TabPanel>

          <TabPanel id="image" selected={tab === 'image'} onSelect={setTab}>
            <form
              aria-labelledby="image-heading"
              onSubmit={(event) => {
                event.preventDefault()
                void run('analyze')
              }}
            >
              <h2 id="image-heading" className="mb-1 text-base font-medium">
                Prompt to image
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Runs <code className="font-mono">image --out ./assets/mascot.jpg</code>. Aspect ratio and size stay at
                the CLI defaults.
              </p>
              <PromptField
                id="image-prompt"
                label="Image prompt"
                value={prompts.image}
                onChange={(value) => setPrompts((current) => ({ ...current, image: value }))}
              />
              <div className="mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPrompts((current) => ({ ...current, image: PROMPTS.image }))}
                >
                  Use sample prompt
                </Button>
              </div>
              <Button type="submit" disabled={busy}>
                Run image
              </Button>
            </form>
          </TabPanel>
        </div>
        <ResultPane result={result} busy={busy} />
      </div>

      <footer className="mt-8 text-xs leading-5 text-muted-foreground">
        <a className="underline-offset-4 hover:underline" href="https://x.com/LyalinDotCom/status/2124593932038254981">
          Bookmark
        </a>
        {' · '}
        Beta CLI. Pin a release before using it from a script. Mock results are fixtures, labeled MOCK.
      </footer>
    </main>
  )
}

function TabPanel({
  id,
  selected,
  onSelect,
  children,
}: {
  id: TabId
  selected: boolean
  onSelect: (id: TabId) => void
  children: ReactNode
}) {
  useEffect(() => {
    const panel = document.getElementById(`${id}-panel`)
    if (!panel) return undefined
    const onMatch = () => onSelect(id)
    panel.addEventListener('beforematch', onMatch)
    return () => panel.removeEventListener('beforematch', onMatch)
  }, [id, onSelect])

  return (
    <div
      id={`${id}-panel`}
      role="tabpanel"
      aria-labelledby={`${id}-tab`}
      hidden={(selected ? undefined : 'until-found') as boolean | undefined}
      className="tab-panel"
    >
      <div className="panel-body">
        <Card>
          <CardContent className="pt-0">{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}

function PromptField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Textarea id={id} name={id} value={value} required onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function FileField({
  id,
  label,
  accept,
  file,
  sampleLabel,
  onFile,
}: {
  id: string
  label: string
  accept: string
  file: File | null
  sampleLabel: string | null
  onFile: (file: File | null) => void
}) {
  const [hot, setHot] = useState(false)
  return (
    <div
      className={hot ? 'dropzone hot' : 'dropzone'}
      onDragOver={(event) => {
        event.preventDefault()
        setHot(true)
      }}
      onDragLeave={() => setHot(false)}
      onDrop={(event) => {
        event.preventDefault()
        setHot(false)
        onFile(event.dataTransfer.files.item(0))
      }}
    >
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type="file"
        accept={accept}
        onChange={(event) => onFile(event.target.files?.item(0) ?? null)}
      />
      <p className="text-sm text-muted-foreground">
        {sampleLabel ?? (file ? file.name : 'Drop a file here, or choose one. Inline limit is about 14 MB.')}
      </p>
    </div>
  )
}

function binaryLabel(status: StatusResponse | null, error: string | null): string {
  if (error) return 'Binary status unavailable'
  if (!status) return 'Checking binary…'
  if (!status.binary.found) return 'Binary missing'
  return status.binary.version ? `gemini-api ${status.binary.version}` : 'Binary found'
}

function keyLabel(status: StatusResponse | null, error: string | null): string {
  if (error) return 'Key status unavailable'
  if (!status) return 'Checking key…'
  if (!status.key.present) return 'GEMINI_API_KEY absent'
  switch (status.key.source) {
    case 'env':
      return 'GEMINI_API_KEY set'
    case 'keyring':
      return 'API key in keychain'
    case 'config':
      return 'API key in config file'
    case 'flag':
      return 'API key from flag'
    case 'unset':
    case 'default':
    case 'unknown':
      return 'API key configured'
    default: {
      const unreachable: never = status.key.source
      return unreachable
    }
  }
}
