import {
  LEVEL_LABELS,
  type Difficulty,
  type Level,
  type LevelUp,
  type MockSession,
  type Phase,
  type SubskillState,
  isDifficulty,
  isLevel,
  isPhase,
} from "./types"

const BAR_WIDTH = 10

export function levelBar(level: Level): string {
  return "█".repeat(level * 2) + "░".repeat(BAR_WIDTH - level * 2)
}

export function overallStats(levels: Level[]): { bar: string; percent: number } {
  if (levels.length === 0) return { bar: "░".repeat(BAR_WIDTH), percent: 0 }
  const mean = levels.reduce((sum: number, level) => sum + level, 0) / levels.length
  const percent = Math.round((mean / 5) * 100)
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((percent / 100) * BAR_WIDTH)))
  return { bar: "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled), percent }
}

export function renderProgress(session: MockSession): string {
  const { bar, percent } = overallStats(session.subskills.map((skill) => skill.level))
  const width = Math.max(...session.subskills.map((skill) => skill.name.length), 8)
  const rows = session.subskills.map((skill) => {
    const focus = skill.id === session.focusId ? "  <- current focus" : ""
    return `${skill.name.padEnd(width, " ")}  [${levelBar(skill.level)}]  ${skill.level}/5  ${LEVEL_LABELS[skill.level]}${focus}`
  })
  return [
    "MOCK",
    `Topic: ${session.topicTitle}`.padEnd(48, " ") + `overall: ${bar} ${percent}%`,
    "-".repeat(65),
    ...rows,
    "-".repeat(65),
    "Overall is the mean of the levels on this map.",
  ].join("\n")
}

export function renderSaveBlock(session: MockSession): string {
  const { bar, percent } = overallStats(session.subskills.map((skill) => skill.level))
  const width = Math.max(...session.subskills.map((skill) => skill.name.length), 8)
  const focusName = session.subskills.find((skill) => skill.id === session.focusId)?.name ?? ""
  const rows = session.subskills.map((skill) => {
    const focus = skill.id === session.focusId ? "  <- current focus" : ""
    return `${skill.name.padEnd(width, " ")}  [${levelBar(skill.level)}]  ${skill.level}/5  ${LEVEL_LABELS[skill.level]}${focus}`
  })
  const bullets = (items: string[]) => (items.length === 0 ? "- (none)" : items.map((item) => `- ${item}`).join("\n"))
  return [
    "MOCK",
    `topic: ${session.topicTitle}`,
    `phase: ${session.phase}`,
    `target: ${session.target}/5`,
    `difficulty: ${session.difficulty}`,
    `focus: ${focusName}`,
    `overall: ${bar} ${percent}%`,
    "---",
    ...rows,
    "---",
    "misconceptions:",
    bullets(session.misconceptions),
    "covered:",
    bullets(session.covered),
  ].join("\n")
}

export type SavedSnapshot = {
  label: "MOCK" | "LIVE"
  topic: string
  phase: Phase
  target: 4 | 5
  difficulty: Difficulty
  focusName: string
  rows: { name: string; level: Level }[]
  misconceptions: string[]
  covered: string[]
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string }

export function parseSaveBlock(block: string): ParseResult<SavedSnapshot> {
  const lines = block.trim().split(/\r?\n/)
  const label = lines[0]
  if (label !== "MOCK" && label !== "LIVE") {
    return { ok: false, reason: "The block must start with MOCK or LIVE." }
  }
  const header: Record<string, string> = {}
  let index = 1
  for (; index < lines.length; index++) {
    if (lines[index] === "---") {
      index += 1
      break
    }
    const match = /^([a-z]+):\s*(.*)$/.exec(lines[index] ?? "")
    if (!match) return { ok: false, reason: `Unrecognized header line: ${lines[index]}` }
    header[match[1] ?? ""] = (match[2] ?? "").trim()
  }
  const topic = header.topic
  const phaseText = header.phase
  const focusName = header.focus
  const difficultyText = header.difficulty
  const targetText = header.target
  if (!topic || !phaseText || !focusName || !difficultyText || !targetText) {
    return { ok: false, reason: "The block is missing topic, phase, focus, difficulty, or target." }
  }
  if (!isPhase(phaseText)) return { ok: false, reason: `Unknown phase: ${phaseText}` }
  if (!isDifficulty(difficultyText)) return { ok: false, reason: `Unknown difficulty: ${difficultyText}` }
  if (targetText !== "4/5" && targetText !== "5/5") {
    return { ok: false, reason: "Target must be 4/5 or 5/5, the levels the skill documents." }
  }
  const rows: { name: string; level: Level }[] = []
  for (; index < lines.length; index++) {
    if (lines[index] === "---") {
      index += 1
      break
    }
    const row = /^(.+?)\s{2,}\[([█░]+)\]\s+([0-5])\/5\b/.exec(lines[index] ?? "")
    if (!row) return { ok: false, reason: `Unrecognized map row: ${lines[index]}` }
    const level = Number(row[3])
    if (!isLevel(level)) return { ok: false, reason: `Level out of range: ${row[3]}` }
    rows.push({ name: (row[1] ?? "").trim(), level })
  }
  if (rows.length === 0) return { ok: false, reason: "The block has no skill-map rows." }
  const misconceptions: string[] = []
  const covered: string[] = []
  let section: "misconceptions" | "covered" | null = null
  for (; index < lines.length; index++) {
    const line = lines[index] ?? ""
    if (line === "misconceptions:") {
      section = "misconceptions"
      continue
    }
    if (line === "covered:") {
      section = "covered"
      continue
    }
    if (!line.startsWith("- ") || !section) continue
    const text = line.slice(2).trim()
    if (text === "(none)" || text.length === 0) continue
    if (section === "misconceptions") misconceptions.push(text)
    else covered.push(text)
  }
  return {
    ok: true,
    value: {
      label,
      topic,
      phase: phaseText,
      target: targetText === "5/5" ? 5 : 4,
      difficulty: difficultyText,
      focusName,
      rows,
      misconceptions,
      covered,
    },
  }
}

export type ParsedMapRow = { name: string; level: Level; focus: boolean }

export type ParsedMap = { topic: string | null; rows: ParsedMapRow[] }

const MAP_ROW = /^(.+?)\s+\[([█░#.]+)\]\s+([0-5])\s*\/\s*5\b(.*)$/

/** Parse an official-looking skill map. Returns null when the reply has no clear bar rows. */
export function parseSkillMap(text: string): ParsedMap | null {
  const rows: ParsedMapRow[] = []
  let topic: string | null = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    const topicMatch = /^Topic:\s+(.+?)(?:\s{2,}overall\b|$)/.exec(line)
    if (topicMatch) {
      topic = (topicMatch[1] ?? "").trim() || null
      continue
    }
    const match = MAP_ROW.exec(line)
    if (!match) continue
    const bar = match[2] ?? ""
    if (bar.length < 4 || !/^[█░#.]+$/.test(bar)) continue
    const name = (match[1] ?? "").replace(/^[-*]\s*/, "").trim()
    if (!name || /^overall\b/i.test(name)) continue
    const level = Number(match[3])
    if (!isLevel(level)) continue
    const focus = /current focus/i.test(match[4] ?? "")
    rows.push({ name, level, focus })
  }
  if (rows.length === 0) return null
  const byName = new Map<string, Level>()
  for (const row of rows) {
    const previous = byName.get(row.name)
    if (previous !== undefined && previous !== row.level) return null
    byName.set(row.name, row.level)
  }
  const unique: ParsedMapRow[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (seen.has(row.name)) continue
    seen.add(row.name)
    unique.push(row)
  }
  return { topic, rows: unique }
}

function slug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return base || "subskill"
}

export function applyParsedMap(
  current: SubskillState[],
  focusId: string | null,
  parsed: ParsedMap,
): { subskills: SubskillState[]; focusId: string | null; levelUps: LevelUp[] } {
  const namesMatch =
    current.length > 0 && parsed.rows.every((row) => current.some((skill) => skill.name === row.name))
  if (namesMatch) {
    const levelUps: LevelUp[] = []
    const subskills = current.map((skill) => {
      const row = parsed.rows.find((item) => item.name === skill.name)
      if (!row) return skill
      if (row.level > skill.level) {
        levelUps.push({ subskillId: skill.id, from: skill.level, to: row.level })
      }
      return { ...skill, level: row.level }
    })
    const focusName = parsed.rows.find((row) => row.focus)?.name
    const nextFocus = focusName
      ? (subskills.find((skill) => skill.name === focusName)?.id ?? focusId)
      : focusId
    return { subskills, focusId: nextFocus, levelUps }
  }
  const subskills = parsed.rows.map((row, index) => {
    const base = slug(row.name)
    const earlier = parsed.rows.slice(0, index).filter((item) => slug(item.name) === base).length
    return {
      id: earlier === 0 ? base : `${base}-${earlier + 1}`,
      name: row.name,
      level: row.level,
    }
  })
  const focusName = parsed.rows.find((row) => row.focus)?.name
  const nextFocus = focusName ? (subskills.find((skill) => skill.name === focusName)?.id ?? null) : null
  return { subskills, focusId: nextFocus, levelUps: [] }
}
