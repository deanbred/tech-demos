import { assertNever } from "@/session/types"

function isKnownTopic(topicId: string): topicId is "css-grid" | "event-loop" | "svg-viewbox" {
  return topicId === "css-grid" || topicId === "event-loop" || topicId === "svg-viewbox"
}

export function TopicVisual({ topicId }: { topicId: string }) {
  if (!isKnownTopic(topicId)) return null
  switch (topicId) {
    case "css-grid":
      return (
        <div
          className="grid h-28 gap-1 text-[11px] leading-none"
          style={{
            gridTemplateColumns: "1fr 1.4fr",
            gridTemplateRows: "0.7fr 1.4fr 0.7fr",
            gridTemplateAreas: '"header header" "side main" "footer footer"',
          }}
        >
          <div style={{ gridArea: "header" }} className="flex items-center bg-foreground/10 px-2">
            header
          </div>
          <div style={{ gridArea: "side" }} className="flex items-center bg-foreground/5 px-2">
            side
          </div>
          <div style={{ gridArea: "main" }} className="flex items-center border border-foreground/20 px-2">
            main
          </div>
          <div style={{ gridArea: "footer" }} className="flex items-center bg-foreground/10 px-2">
            footer
          </div>
        </div>
      )
    case "event-loop":
      return (
        <div className="grid h-28 grid-cols-3 gap-1 text-[11px]">
          <div className="flex flex-col gap-1 border border-foreground/15 p-1">
            <span className="font-medium">Call stack</span>
            <span className="bg-foreground/10 px-1 py-0.5">b</span>
            <span className="bg-foreground/5 px-1 py-0.5">a</span>
          </div>
          <div className="flex flex-col gap-1 border border-foreground/15 p-1">
            <span className="font-medium">Microtask checkpoint</span>
            <span className="bg-foreground/10 px-1 py-0.5">Promise.then</span>
          </div>
          <div className="flex flex-col gap-1 border border-foreground/15 p-1">
            <span className="font-medium">Task queue</span>
            <span className="bg-foreground/10 px-1 py-0.5">setTimeout 0</span>
          </div>
        </div>
      )
    case "svg-viewbox":
      return (
        <svg viewBox="0 0 100 100" className="h-28 w-full border border-foreground/20 bg-muted">
          <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeDasharray="2 2" />
          <circle cx="100" cy="50" r="3.5" fill="currentColor" />
          <text x="4" y="12" fontSize="8" fill="currentColor">
            x 0
          </text>
          <text x="58" y="12" fontSize="8" fill="currentColor">
            x 100
          </text>
        </svg>
      )
    default:
      return assertNever(topicId)
  }
}
