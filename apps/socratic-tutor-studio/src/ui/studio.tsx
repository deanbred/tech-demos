import { useEffect, useRef, useState } from "react"
import { VENDORED_COMMIT_SHORT } from "@/session/vendor"
import {
  applyCommand,
  resumeFromBlock,
  saveState,
  startMockSession,
  submitAnswer,
  submitScriptedAnswer,
} from "@/session/mock-runner"
import { topicById } from "@/session/topics"
import type { Command, MockSession } from "@/session/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChatPane } from "@/ui/chat-pane"
import { Commands } from "@/ui/commands"
import { fetchLiveStatus, sendLiveChat, type LiveStatus } from "@/ui/live-api"
import { appendLive, commandPhrase, ingestReply, liveHistory, startLiveSession, type LiveSession } from "@/ui/live-session"
import { SkillMap } from "@/ui/skill-map"
import { TopicPicker } from "@/ui/topic-picker"
import { TopicVisual } from "@/ui/visuals"

type Mode = "mock" | "live"

const SETUP_HELP =
  "Copy .env.example to .env in this app folder and set LLM_API_KEY and LLM_MODEL. LLM_BASE_URL is optional; when it is unset the server uses https://api.openai.com/v1. Restart bun run dev. The browser never receives the key. Jane Street did not name a model for this skill."

export function Studio() {
  const [mode, setMode] = useState<Mode>("mock")
  const [mock, setMock] = useState<MockSession | null>(null)
  const [live, setLive] = useState<LiveSession | null>(null)
  const [picking, setPicking] = useState(true)
  const [answer, setAnswer] = useState("")
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [scrollMode, setScrollMode] = useState<"end" | "evidence">("end")
  const [status, setStatus] = useState<LiveStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [resumeText, setResumeText] = useState("")
  const [resumeError, setResumeError] = useState<string | null>(null)
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (playTimer.current) clearTimeout(playTimer.current)
    }
  }, [])

  function stopPlay() {
    if (playTimer.current) clearTimeout(playTimer.current)
    playTimer.current = null
    setPlaying(false)
  }

  function selectMode(next: Mode) {
    stopPlay()
    setMode(next)
    setScrollMode("end")
    setBanner(null)
    setPicking(next === "mock" ? mock === null : live === null)
    if (next === "live") void loadStatus()
  }

  async function loadStatus(): Promise<LiveStatus | null> {
    try {
      const next = await fetchLiveStatus()
      setStatus(next)
      setStatusError(null)
      return next
    } catch (error) {
      setStatus(null)
      setStatusError(error instanceof Error ? error.message : "The live server is not reachable.")
      return null
    }
  }

  function pickTopic(topicId: string) {
    stopPlay()
    setPicking(false)
    setScrollMode("end")
    setAnswer("")
    setBanner(null)
    if (mode === "mock") {
      setMock(startMockSession(topicId))
      return
    }
    const session = startLiveSession(topicId)
    setLive(session)
    void pushLive(session, `Teach me ${topicById(topicId).title}.`, null)
  }

  function playScript() {
    if (!mock || mode !== "mock") return
    stopPlay()
    let current = startMockSession(mock.topicId)
    setMock(current)
    setScrollMode("end")
    setPlaying(true)
    const step = () => {
      if (!current.frameId) {
        current = saveState(current)
        setMock(current)
        setPlaying(false)
        setScrollMode("evidence")
        return
      }
      current = submitScriptedAnswer(current)
      setMock(current)
      playTimer.current = setTimeout(step, 1600)
    }
    playTimer.current = setTimeout(step, 600)
  }

  function sendMock() {
    if (!mock || playing) return
    const text = answer.trim()
    if (!text) return
    setMock(submitAnswer(mock, text))
    setAnswer("")
    setScrollMode("end")
  }

  async function pushLive(session: LiveSession, userText: string, command: Command | null) {
    const withUser = appendLive(session, { role: "user", text: userText, source: "live" })
    setLive(withUser)
    setAnswer("")
    const ready = status ?? (await loadStatus())
    if (!ready?.keyPresent || !ready.modelSet) {
      setLive(
        appendLive(withUser, {
          role: "note",
          source: "live",
          text: "Not sent. Add LLM_API_KEY and LLM_MODEL, then restart bun run dev.",
        }),
      )
      return
    }
    setBusy(true)
    try {
      const reply = await sendLiveChat(liveHistory(withUser))
      setLive(ingestReply(withUser, reply, command))
    } catch (error) {
      const message = error instanceof Error ? error.message : "The live request failed."
      setLive(appendLive(withUser, { role: "note", source: "live", text: message }))
    } finally {
      setBusy(false)
    }
  }

  function onCommand(command: Command) {
    setBanner(null)
    if (mode === "mock") {
      if (!mock) {
        setBanner("Pick a topic first.")
        return
      }
      setMock(applyCommand(mock, command))
      setScrollMode("end")
      return
    }
    if (!live || busy) {
      setBanner(live ? "Wait for the current reply." : "Pick a topic first.")
      return
    }
    void pushLive(live, commandPhrase(command), command)
  }

  function onResume() {
    const result = resumeFromBlock(resumeText)
    if (!result.ok) {
      setResumeError(result.reason)
      return
    }
    stopPlay()
    setResumeError(null)
    setMode("mock")
    setMock(result.session)
    setPicking(false)
    setScrollMode("end")
    setBanner(null)
  }

  async function copySave(block: string | null) {
    if (!block) return
    try {
      await navigator.clipboard.writeText(block)
      setBanner("Copied the save block.")
    } catch {
      setBanner("Select the save block and copy it from there.")
    }
  }

  const activeMock = mode === "mock" ? mock : null
  const activeLive = mode === "live" ? live : null
  const showPanes = !picking && (activeMock !== null || activeLive !== null)
  const topicId = activeMock?.topicId ?? activeLive?.topicId ?? null
  const topic = topicId ? topicById(topicId) : null
  const keyChip = !status ? "Key unchecked" : status.keyPresent ? "Key present" : "Key absent"

  return (
    <div
      className="@container/studio mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6"
      data-script-done={activeMock?.saveBlock && !playing ? "true" : "false"}
    >
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Socratic Tutor Studio</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              A local studio for Jane Street&apos;s socratic-tutor skill. One question at a time, with a 0–5 skill map.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Session status">
            <Badge data-testid="mode-chip">{mode === "mock" ? "MOCK" : "LIVE"}</Badge>
            <Badge variant="outline" data-testid="key-chip">
              {keyChip}
            </Badge>
            <Badge variant="outline" data-testid="commit-chip">
              skill {VENDORED_COMMIT_SHORT}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={mode === "mock" ? "default" : "outline"} aria-pressed={mode === "mock"} onClick={() => selectMode("mock")}>
            Mock
          </Button>
          <Button type="button" variant={mode === "live" ? "default" : "outline"} aria-pressed={mode === "live"} onClick={() => selectMode("live")}>
            Live
          </Button>
          {showPanes ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopPlay()
                setPicking(true)
              }}
            >
              Topics
            </Button>
          ) : null}
          {picking && (mock || live) ? (
            <Button type="button" variant="outline" onClick={() => setPicking(false)}>
              Back to session
            </Button>
          ) : null}
        </div>
      </header>

      <Commands
        onCommand={onCommand}
        showPlay={mode === "mock"}
        playing={playing}
        playDisabled={!mock || picking}
        onPlay={playScript}
        onStop={stopPlay}
        resumeText={resumeText}
        onResumeText={setResumeText}
        onResume={onResume}
        resumeError={resumeError}
      />

      {banner ? (
        <Alert>
          <AlertTitle>Studio</AlertTitle>
          <AlertDescription>{banner}</AlertDescription>
        </Alert>
      ) : null}
      {mode === "live" && statusError ? (
        <Alert>
          <AlertTitle>Live server</AlertTitle>
          <AlertDescription>{statusError} Mock mode does not use the network.</AlertDescription>
        </Alert>
      ) : null}
      {mode === "live" && status && (!status.keyPresent || !status.modelSet) ? (
        <Alert>
          <AlertTitle>Live setup</AlertTitle>
          <AlertDescription>{SETUP_HELP}</AlertDescription>
        </Alert>
      ) : null}

      {showPanes && topic && activeMock ? (
        <div className="grid items-start gap-4 @min-[60rem]/studio:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
          <SkillMap
            label="MOCK"
            phase={activeMock.phase}
            subskills={activeMock.subskills}
            focusId={activeMock.focusId}
            levelUps={activeMock.levelUps}
            saveBlock={activeMock.saveBlock}
            onCopySave={() => void copySave(activeMock.saveBlock)}
          />
          <ChatPane
            label="MOCK"
            title={topic.title}
            caption={topic.caption}
            visual={<TopicVisual topicId={topic.id} />}
            messages={activeMock.messages}
            scrollMode={scrollMode}
            answer={answer}
            onAnswer={setAnswer}
            onSend={sendMock}
            sendDisabled={playing}
            hint="Mock answers stay on this machine."
          />
        </div>
      ) : null}

      {showPanes && topic && activeLive ? (
        <div className="grid items-start gap-4 @min-[60rem]/studio:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
          <SkillMap
            label="LIVE"
            phase={null}
            subskills={activeLive.subskills}
            focusId={activeLive.focusId}
            levelUps={activeLive.levelUps}
            saveBlock={activeLive.saveBlock}
            onCopySave={() => void copySave(activeLive.saveBlock)}
          />
          <ChatPane
            label="LIVE"
            title={activeLive.topicTitle}
            caption={topic.caption}
            visual={<TopicVisual topicId={topic.id} />}
            messages={activeLive.messages}
            scrollMode="end"
            answer={answer}
            onAnswer={setAnswer}
            onSend={() => {
              const text = answer.trim()
              if (!text || busy) return
              void pushLive(activeLive, text, null)
            }}
            sendDisabled={busy}
            hint="The key stays on the server. A missing map does not change levels."
          />
        </div>
      ) : null}

      {!showPanes ? <TopicPicker onPick={pickTopic} /> : null}

      <footer className="border-t pt-4 text-sm text-muted-foreground">
        <p>
          Skill text is the official{" "}
          <a className="underline" href="https://github.com/janestreet/agent_skills">
            janestreet/agent_skills
          </a>{" "}
          socratic-tutor skill, MIT, Copyright (c) 2026 Jane Street Group, LLC. Vendored at {VENDORED_COMMIT_SHORT}.
          Starter topics are demo exercises, not a Jane Street curriculum.{" "}
          <a className="underline" href="https://x.com/injaneity/status/2124685667821297704">
            Bookmark
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
