import { applyParsedMap, parseSkillMap } from "@/session/map-text"
import { topicById } from "@/session/topics"
import type { ChatMessage, Command, LevelUp, SubskillState } from "@/session/types"

export type LiveSession = {
  topicId: string
  topicTitle: string
  subskills: SubskillState[]
  focusId: string | null
  messages: ChatMessage[]
  saveBlock: string | null
  levelUps: LevelUp[]
  nextMessageId: number
}

const COMMAND_PHRASES: Record<Command, string> = {
  "show-progress": "show progress",
  harder: "harder",
  easier: "easier",
  "just-tell-me": "just tell me",
  "save-state": "save state",
}

export function commandPhrase(command: Command): string {
  switch (command) {
    case "show-progress":
    case "harder":
    case "easier":
    case "just-tell-me":
    case "save-state":
      return COMMAND_PHRASES[command]
    default: {
      const unreachable: never = command
      return unreachable
    }
  }
}

export function startLiveSession(topicId: string): LiveSession {
  const topic = topicById(topicId)
  return {
    topicId: topic.id,
    topicTitle: topic.title,
    subskills: [],
    focusId: null,
    messages: [],
    saveBlock: null,
    levelUps: [],
    nextMessageId: 1,
  }
}

export function appendLive(session: LiveSession, message: Omit<ChatMessage, "id">): LiveSession {
  return {
    ...session,
    nextMessageId: session.nextMessageId + 1,
    messages: [...session.messages, { ...message, id: `l${session.nextMessageId}` }],
  }
}

export function liveHistory(session: LiveSession): { role: "user" | "assistant"; content: string }[] {
  const turns: { role: "user" | "assistant"; content: string }[] = []
  for (const message of session.messages) {
    if (message.role === "note") continue
    turns.push({
      role: message.role === "user" ? "user" : "assistant",
      content: message.text,
    })
  }
  return turns
}

export function ingestReply(session: LiveSession, reply: string, command: Command | null): LiveSession {
  let next = appendLive(session, { role: "tutor", text: reply, source: "live" })
  const parsed = parseSkillMap(reply)
  if (!parsed) {
    next = appendLive(next, {
      role: "note",
      source: "live",
      text: "No clear skill map in that reply. Levels were not changed.",
    })
  } else {
    const merged = applyParsedMap(next.subskills, next.focusId, parsed)
    next = {
      ...next,
      subskills: merged.subskills,
      focusId: merged.focusId,
      levelUps: [...next.levelUps, ...merged.levelUps],
      topicTitle: parsed.topic ?? next.topicTitle,
    }
  }
  if (command === "save-state") {
    const trimmed = reply.trim()
    next = { ...next, saveBlock: trimmed.startsWith("LIVE") ? trimmed : `LIVE\n${trimmed}` }
  }
  return next
}
