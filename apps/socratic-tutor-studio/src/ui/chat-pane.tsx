import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react"
import type { ChatMessage } from "@/session/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export function ChatPane({
  label,
  title,
  caption,
  visual,
  messages,
  scrollMode,
  answer,
  onAnswer,
  onSend,
  sendDisabled,
  hint,
}: {
  label: "MOCK" | "LIVE"
  title: string
  caption: string
  visual: ReactNode
  messages: ChatMessage[]
  scrollMode: "end" | "evidence"
  answer: string
  onAnswer: (value: string) => void
  onSend: () => void
  sendDisabled: boolean
  hint: string
}) {
  const logRef = useRef<HTMLDivElement>(null)
  const lastTutor = [...messages].reverse().find((message) => message.role === "tutor")?.text ?? ""

  useEffect(() => {
    const log = logRef.current
    if (!log) return
    if (scrollMode === "evidence") {
      const target = log.querySelector("[data-evidence='wrong-answer']")
      if (target instanceof HTMLElement) {
        const top = target.getBoundingClientRect().top - log.getBoundingClientRect().top + log.scrollTop
        log.scrollTo({ top: Math.max(0, top - 8) })
      }
      return
    }
    log.scrollTo({ top: log.scrollHeight })
  }, [messages, scrollMode])

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Tutor</CardTitle>
          <Badge>{label}</Badge>
        </div>
        <figure className="flex flex-col gap-2">
          {visual}
          <figcaption className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{title}. </span>
            {caption}
          </figcaption>
        </figure>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="sr-only" aria-live="polite">
          {lastTutor}
        </p>
        <div
          ref={logRef}
          data-testid="chat-log"
          className="flex h-[min(32rem,62vh)] flex-col gap-4 overflow-y-auto rounded-lg border p-3"
          tabIndex={0}
          role="log"
          aria-label="Tutor chat"
        >
          {messages.map((message) => (
            <article
              key={message.id}
              data-evidence={message.evidence}
              data-testid={message.evidence ? `message-${message.evidence}` : undefined}
              className="flex flex-col gap-1"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium">
                  {message.role === "user" ? "You" : message.role === "note" ? "Studio" : "Tutor"}
                </span>
                {message.role === "note" ? (
                  <Badge variant="outline">Studio</Badge>
                ) : (
                  <Badge>{message.source === "mock" ? "MOCK" : "LIVE"}</Badge>
                )}
              </div>
              <p className="whitespace-pre-wrap font-mono text-sm">{message.text}</p>
            </article>
          ))}
          <div data-chat-end="true" />
        </div>
        <form
          aria-labelledby="answer-label"
          action="#"
          method="post"
          className="flex flex-col gap-1"
          onSubmit={(event) => {
            event.preventDefault()
            if (!sendDisabled) onSend()
          }}
        >
          <label id="answer-label" htmlFor="answer" className="text-sm font-medium">
            Your answer
          </label>
          <Textarea
            id="answer"
            name="answer"
            value={answer}
            onChange={(event) => onAnswer(event.target.value)}
            onKeyDown={onAnswerKeyDown}
            enterKeyHint="send"
            aria-describedby="answer-hint"
            disabled={sendDisabled}
            required
          />
          <p id="answer-hint" className="text-xs text-muted-foreground">
            {hint} Enter sends. Shift+Enter inserts a line.
          </p>
          <Button type="submit" disabled={sendDisabled}>
            Send answer
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function onAnswerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Enter" || event.shiftKey) return
  event.preventDefault()
  if (event.nativeEvent.isComposing || event.keyCode === 229) return
  event.currentTarget.form?.requestSubmit()
}
