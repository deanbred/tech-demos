export const LEVELS = [0, 1, 2, 3, 4, 5] as const
export type Level = (typeof LEVELS)[number]

/** Official labels from socratic-tutor/SKILL.md. Do not rename them. */
export const LEVEL_LABELS: Record<Level, string> = {
  0: "unaware",
  1: "heard of it",
  2: "can follow along",
  3: "can do with help",
  4: "can do independently",
  5: "can teach it / handle edge cases",
}

export const PHASES = ["diagnostic", "teaching", "review", "assessment", "complete"] as const
export type Phase = (typeof PHASES)[number]

export const PHASE_LABELS: Record<Phase, string> = {
  diagnostic: "Diagnostic",
  teaching: "Teaching loop",
  review: "Spaced review",
  assessment: "Final assessment",
  complete: "Pass finished",
}

export const DIFFICULTIES = ["easier", "normal", "harder"] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const COMMANDS = ["show-progress", "harder", "easier", "just-tell-me", "save-state"] as const
export type Command = (typeof COMMANDS)[number]

export type SourceLabel = "mock" | "live"

export type Evidence = "wrong-answer" | "narrower" | "level-up" | "save"

export type ChatMessage = {
  id: string
  role: "tutor" | "user" | "note"
  text: string
  source: SourceLabel
  evidence?: Evidence
}

export type SubskillState = {
  id: string
  name: string
  level: Level
}

export type LevelUp = {
  subskillId: string
  from: Level
  to: Level
}

export type MockSession = {
  source: "mock"
  topicId: string
  topicTitle: string
  phase: Phase
  subskills: SubskillState[]
  focusId: string
  messages: ChatMessage[]
  frameId: string | null
  difficulty: Difficulty
  target: 4 | 5
  misconceptions: string[]
  covered: string[]
  saveBlock: string | null
  levelUps: LevelUp[]
  phasesSeen: Phase[]
  attempts: number
  nextMessageId: number
}

export type Effect =
  | { type: "set-level"; subskillId: string; level: Level; announce: boolean }
  | { type: "misconception"; text: string }
  | { type: "covered"; text: string }

export type Frame = {
  id: string
  phase: Exclude<Phase, "complete">
  focusId: string
  tutor: string
  tutorEasier?: string
  tutorHarder?: string
  accept: string[]
  match: "any" | "all"
  scripted: string
  /** Tag the user message when the answer does not match. */
  wrongEvidence?: boolean
  /** Tag the tutor prompt. The scripted narrower follow-up uses this. */
  tutorEvidence?: "narrower"
  onCorrect?: Effect[]
  onWrong?: Effect[]
  correctNext?: string
  wrongNext?: string
  /** Spoken only by "just tell me", or after repeated misses. */
  tell?: string
}

export type Topic = {
  id: string
  title: string
  summary: string
  caption: string
  subskills: { id: string; name: string }[]
  frames: Frame[]
}

export function isLevel(value: number): value is Level {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

export function isPhase(value: string): value is Phase {
  return (
    value === "diagnostic" ||
    value === "teaching" ||
    value === "review" ||
    value === "assessment" ||
    value === "complete"
  )
}

export function isDifficulty(value: string): value is Difficulty {
  return value === "easier" || value === "normal" || value === "harder"
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`)
}
