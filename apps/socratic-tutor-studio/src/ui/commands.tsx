import type { Command } from "@/session/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const COMMAND_BUTTONS: { command: Command; label: string }[] = [
  { command: "show-progress", label: "Show progress" },
  { command: "harder", label: "Harder" },
  { command: "easier", label: "Easier" },
  { command: "just-tell-me", label: "Just tell me" },
  { command: "save-state", label: "Save state" },
]

export function Commands({
  onCommand,
  showPlay,
  playing,
  playDisabled,
  onPlay,
  onStop,
  resumeText,
  onResumeText,
  onResume,
  resumeError,
}: {
  onCommand: (command: Command) => void
  showPlay: boolean
  playing: boolean
  playDisabled: boolean
  onPlay: () => void
  onStop: () => void
  resumeText: string
  onResumeText: (value: string) => void
  onResume: () => void
  resumeError: string | null
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {showPlay ? (
          playing ? (
            <Button type="button" variant="secondary" data-testid="play-scripted" data-playing="true" onClick={onStop}>
              Stop scripted session
            </Button>
          ) : (
            <Button type="button" data-testid="play-scripted" data-playing="false" disabled={playDisabled} onClick={onPlay}>
              Play scripted session
            </Button>
          )
        ) : null}
        {COMMAND_BUTTONS.map((item) => (
          <Button key={item.command} type="button" variant="outline" onClick={() => onCommand(item.command)}>
            {item.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="resume-block" className="text-sm font-medium">
          Resume from a saved block
        </label>
        <Textarea
          id="resume-block"
          name="resume"
          value={resumeText}
          onChange={(event) => onResumeText(event.target.value)}
          aria-describedby={resumeError ? "resume-error" : undefined}
          aria-invalid={resumeError ? true : undefined}
          className="min-h-20 font-mono text-xs"
        />
        {resumeError ? (
          <p id="resume-error" className="text-sm text-destructive" role="alert">
            {resumeError}
          </p>
        ) : null}
        <Button type="button" variant="outline" className="self-start" onClick={onResume}>
          Resume
        </Button>
      </div>
    </div>
  )
}
