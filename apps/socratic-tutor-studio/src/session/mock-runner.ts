import { parseSaveBlock, renderProgress, renderSaveBlock } from "./map-text"
import { frameById, topicById, topicByTitle } from "./topics"
import {
  LEVEL_LABELS,
  type ChatMessage,
  type Command,
  type Difficulty,
  type Effect,
  type Frame,
  type MockSession,
  type Phase,
  assertNever,
} from "./types"

function withMessage(
  session: MockSession,
  message: Omit<ChatMessage, "id" | "source">,
): MockSession {
  return {
    ...session,
    nextMessageId: session.nextMessageId + 1,
    messages: [
      ...session.messages,
      { ...message, id: `m${session.nextMessageId}`, source: "mock" },
    ],
  }
}

function addPhase(phases: Phase[], phase: Phase): Phase[] {
  if (phases[phases.length - 1] === phase) return phases
  return [...phases, phase]
}

export function promptFor(frame: Frame, difficulty: Difficulty): string {
  if (difficulty === "easier" && frame.tutorEasier) return frame.tutorEasier
  if (difficulty === "harder" && frame.tutorHarder) return frame.tutorHarder
  return frame.tutor
}

export function answerMatches(frame: Frame, text: string): boolean {
  const checks = frame.accept.map((token) => includesToken(text, token))
  if (frame.match === "all") return checks.every(Boolean)
  return checks.some(Boolean)
}

function includesToken(haystack: string, token: string): boolean {
  const source = token.toLowerCase()
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (/^\d+$/.test(source)) {
    return new RegExp(`(?<![\\d-])${escaped}(?![\\d-])`).test(haystack.toLowerCase())
  }
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i").test(haystack)
}

function applyEffects(session: MockSession, effects: Effect[] | undefined): MockSession {
  if (!effects || effects.length === 0) return session
  let next = session
  for (const effect of effects) {
    switch (effect.type) {
      case "set-level": {
        const current = next.subskills.find((skill) => skill.id === effect.subskillId)
        if (!current) break
        if (effect.announce && effect.level > current.level) {
          next = {
            ...next,
            levelUps: [
              ...next.levelUps,
              { subskillId: effect.subskillId, from: current.level, to: effect.level },
            ],
          }
          next = withMessage(next, {
            role: "tutor",
            evidence: "level-up",
            text: `${current.name} moved from ${current.level}/5 (${LEVEL_LABELS[current.level]}) to ${effect.level}/5 (${LEVEL_LABELS[effect.level]}). MOCK.`,
          })
        }
        next = {
          ...next,
          subskills: next.subskills.map((skill) =>
            skill.id === effect.subskillId ? { ...skill, level: effect.level } : skill,
          ),
        }
        break
      }
      case "misconception":
        if (!next.misconceptions.includes(effect.text)) {
          next = { ...next, misconceptions: [...next.misconceptions, effect.text] }
        }
        break
      case "covered":
        if (!next.covered.includes(effect.text)) {
          next = { ...next, covered: [...next.covered, effect.text] }
        }
        break
      default:
        assertNever(effect)
    }
  }
  return next
}

function followingFrameId(topicId: string, frameId: string): string | null {
  const frames = topicById(topicId).frames
  const index = frames.findIndex((frame) => frame.id === frameId)
  if (index < 0 || index + 1 >= frames.length) return null
  return frames[index + 1]?.id ?? null
}

function goToFrame(session: MockSession, frameId: string | null): MockSession {
  if (!frameId) {
    return withMessage(
      {
        ...session,
        frameId: null,
        phase: "complete",
        attempts: 0,
        phasesSeen: addPhase(session.phasesSeen, "complete"),
      },
      {
        role: "tutor",
        text: "This scripted pass has finished a diagnostic, a teaching loop, a spaced review, and an assessment beat. That is not a claim that every subskill is at the 4/5 target. Save state is available. MOCK.",
      },
    )
  }
  const frame = frameById(topicById(session.topicId), frameId)
  return withMessage(
    {
      ...session,
      frameId: frame.id,
      phase: frame.phase,
      focusId: frame.focusId,
      attempts: 0,
      phasesSeen: addPhase(session.phasesSeen, frame.phase),
    },
    {
      role: "tutor",
      text: promptFor(frame, session.difficulty),
      evidence: frame.tutorEvidence,
    },
  )
}

export function startMockSession(topicId: string): MockSession {
  const topic = topicById(topicId)
  const frame = topic.frames[0]
  if (!frame) throw new Error(`Topic ${topicId} has no frames`)
  const session: MockSession = {
    source: "mock",
    topicId: topic.id,
    topicTitle: topic.title,
    phase: frame.phase,
    subskills: topic.subskills.map((skill) => ({ id: skill.id, name: skill.name, level: 0 })),
    focusId: frame.focusId,
    messages: [],
    frameId: frame.id,
    difficulty: "normal",
    target: 4,
    misconceptions: [],
    covered: [],
    saveBlock: null,
    levelUps: [],
    phasesSeen: [frame.phase],
    attempts: 0,
    nextMessageId: 1,
  }
  return withMessage(session, {
    role: "tutor",
    text: promptFor(frame, "normal"),
    evidence: frame.tutorEvidence,
  })
}

export function submitAnswer(session: MockSession, text: string): MockSession {
  const trimmed = text.trim()
  if (!trimmed) return session
  if (!session.frameId) {
    return withMessage(session, {
      role: "tutor",
      text: "No question is waiting. Show progress, save state, or play the scripted session again. MOCK.",
    })
  }
  const topic = topicById(session.topicId)
  const frame = frameById(topic, session.frameId)
  const correct = answerMatches(frame, trimmed)
  let next = withMessage(session, {
    role: "user",
    text: trimmed,
    evidence: !correct && frame.wrongEvidence ? "wrong-answer" : undefined,
  })
  next = applyEffects(next, correct ? frame.onCorrect : frame.onWrong)
  if (correct) {
    return goToFrame(next, frame.correctNext ?? followingFrameId(topic.id, frame.id))
  }
  const failed = session.attempts + 1
  if (failed >= 3 && frame.tell) {
    const told = withMessage({ ...next, attempts: 0 }, {
      role: "tutor",
      text: `${frame.tell}\n\nThat explanation is for this question only. MOCK.`,
    })
    return goToFrame(told, frame.correctNext ?? followingFrameId(topic.id, frame.id))
  }
  if (frame.wrongNext && frame.wrongNext !== frame.id) {
    return goToFrame({ ...next, attempts: 0 }, frame.wrongNext)
  }
  return withMessage(
    { ...next, attempts: failed },
    {
      role: "tutor",
      text: `${promptFor(frame, next.difficulty)}\n\nStill one question. MOCK.`,
      evidence: frame.tutorEvidence,
    },
  )
}

export function currentFrame(session: MockSession): Frame | null {
  if (!session.frameId) return null
  return frameById(topicById(session.topicId), session.frameId)
}

export function submitScriptedAnswer(session: MockSession): MockSession {
  const frame = currentFrame(session)
  if (!frame) return session
  return submitAnswer(session, frame.scripted)
}

function tellCurrent(session: MockSession): MockSession {
  const frame = currentFrame(session)
  if (!frame) {
    return withMessage(session, {
      role: "tutor",
      text: "There is no current question to reveal. MOCK.",
    })
  }
  if (!frame.tell) {
    return withMessage(session, {
      role: "tutor",
      text: "This question has no direct explanation in the fixture. MOCK.",
    })
  }
  const told = withMessage(session, {
    role: "tutor",
    text: `${frame.tell}\n\nDirect explanation for this question only. Levels are not raised for an answer you were just told. MOCK.`,
  })
  return goToFrame(told, frame.correctNext ?? followingFrameId(session.topicId, frame.id))
}

export function applyCommand(session: MockSession, command: Command): MockSession {
  switch (command) {
    case "show-progress":
      return withMessage(session, { role: "tutor", text: renderProgress(session) })
    case "harder":
    case "easier": {
      const difficulty: Difficulty = command === "harder" ? "harder" : "easier"
      const frame = currentFrame(session)
      const usesVariant = Boolean(
        frame &&
          ((difficulty === "harder" && frame.tutorHarder) || (difficulty === "easier" && frame.tutorEasier)),
      )
      const variant = frame && usesVariant ? promptFor(frame, difficulty) : ""
      return withMessage(
        { ...session, difficulty },
        {
          role: "tutor",
          text: usesVariant
            ? `Difficulty is now ${difficulty}. MOCK.\n\n${variant}`
            : `Difficulty is now ${difficulty}. The next question uses that wording when this topic has one. MOCK.`,
        },
      )
    }
    case "just-tell-me":
      return tellCurrent(session)
    case "save-state":
      return saveState(session)
    default:
      return assertNever(command)
  }
}

export function saveState(session: MockSession): MockSession {
  const block = renderSaveBlock(session)
  return withMessage(
    { ...session, saveBlock: block },
    { role: "tutor", text: block, evidence: "save" },
  )
}

export function playScriptedSession(topicId: string): MockSession {
  let session = startMockSession(topicId)
  for (let step = 0; step < 40 && session.frameId; step++) {
    session = submitScriptedAnswer(session)
  }
  if (session.frameId) {
    throw new Error(`Script for ${topicId} did not finish`)
  }
  return saveState(session)
}

export function resumeFromBlock(block: string): { ok: true; session: MockSession } | { ok: false; reason: string } {
  const parsed = parseSaveBlock(block)
  if (!parsed.ok) return parsed
  const snapshot = parsed.value
  if (snapshot.label !== "MOCK") {
    return {
      ok: false,
      reason: "This block is labeled LIVE. Mock mode will not present it as MOCK. Switch to Live to work from a live reply.",
    }
  }
  const topic = topicByTitle(snapshot.topic)
  if (!topic) return { ok: false, reason: `No starter topic is titled "${snapshot.topic}".` }
  const levels = new Map(snapshot.rows.map((row) => [row.name, row.level]))
  if (snapshot.rows.length !== topic.subskills.length) {
    return { ok: false, reason: "The save block does not list this topic's subskills." }
  }
  for (const skill of topic.subskills) {
    if (!levels.has(skill.name)) {
      return { ok: false, reason: `The save block is missing ${skill.name}.` }
    }
  }
  const focus = topic.subskills.find((skill) => skill.name === snapshot.focusName)
  if (!focus) return { ok: false, reason: `Unknown focus: ${snapshot.focusName}` }
  const session = startMockSession(topic.id)
  const restored: MockSession = {
    ...session,
    phase: snapshot.phase,
    subskills: topic.subskills.map((skill) => {
      const level = levels.get(skill.name)
      if (level === undefined) throw new Error(`Missing level for ${skill.name}`)
      return { id: skill.id, name: skill.name, level }
    }),
    focusId: focus.id,
    frameId: null,
    difficulty: snapshot.difficulty,
    target: snapshot.target,
    misconceptions: snapshot.misconceptions,
    covered: snapshot.covered,
    saveBlock: block.trim(),
    levelUps: [],
    phasesSeen: [snapshot.phase],
    attempts: 0,
    messages: [],
    nextMessageId: 1,
  }
  return {
    ok: true,
    session: withMessage(restored, {
      role: "tutor",
      text: `Restored ${topic.title}. The map matches the pasted block. MOCK.`,
    }),
  }
}
