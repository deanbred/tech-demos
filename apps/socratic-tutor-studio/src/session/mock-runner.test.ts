import { createHash } from "node:crypto"
import { expect, test } from "bun:test"
import { applyParsedMap, parseSkillMap } from "./map-text"
import { applyCommand, playScriptedSession, resumeFromBlock, startMockSession, submitAnswer } from "./mock-runner"
import { completionBody, loadSkillText } from "../server/live"
import { ingestReply, startLiveSession } from "../ui/live-session"
import { TOPICS } from "./topics"

const SKILL_SHA256 = "9190b68440ad99be4d865c63b87939f23a362efac0776c5a67c93d1498bb5e37"
const LICENSE_SHA256 = "92cd3e89e1331afd684eef3d4e98c3e53259f572cc57667b63da223f61ecbc84"

const GIVEAWAYS: Record<string, string[]> = {
  "css-grid": ["3 tracks", "spans 3", "span all", "line 4", "end line", "-1 is"],
  "event-loop": ["runs first", "before the timer", "before the timeout", "promise callback runs"],
  "svg-viewbox": ["right edge", "far edge", "not the center"],
}

test("scripted mock session stays offline and resume restores the map", async () => {
  let fetches = 0
  const original = globalThis.fetch
  globalThis.fetch = (() => {
    fetches += 1
    throw new Error("mock mode called fetch")
  }) as unknown as typeof fetch

  try {
    for (const topic of TOPICS) {
      const played = playScriptedSession(topic.id)
      expect(played.frameId).toBeNull()
      expect(played.phasesSeen).toEqual(
        expect.arrayContaining(["diagnostic", "teaching", "review", "assessment"]),
      )
      expect(played.messages.some((message) => message.evidence === "wrong-answer")).toBe(true)
      const narrower = played.messages.find((message) => message.evidence === "narrower")
      expect(narrower?.role).toBe("tutor")
      const narrowerText = narrower?.text.toLowerCase() ?? ""
      for (const phrase of GIVEAWAYS[topic.id] ?? []) {
        expect(narrowerText).not.toContain(phrase)
      }
      expect(played.levelUps.length).toBeGreaterThan(0)
      expect(played.saveBlock?.startsWith("MOCK")).toBe(true)
      expect(played.messages.some((message) => message.evidence === "save" && message.text.startsWith("MOCK"))).toBe(
        true,
      )

      const restored = resumeFromBlock(played.saveBlock ?? "")
      expect(restored.ok).toBe(true)
      if (!restored.ok) continue
      expect(restored.session.topicTitle).toBe(played.topicTitle)
      expect(restored.session.subskills.map((skill) => [skill.name, skill.level])).toEqual(
        played.subskills.map((skill) => [skill.name, skill.level]),
      )
      expect(restored.session.focusId).toBe(played.focusId)
      expect(restored.session.misconceptions).toEqual(played.misconceptions)
    }

    const grid = playScriptedSession("css-grid")
    expect(grid.levelUps).toContainEqual({ subskillId: "line-placement", from: 1, to: 2 })
    expect(grid.subskills.find((skill) => skill.id === "line-placement")?.level).toBe(2)
    const wrong = grid.messages.find((message) => message.evidence === "wrong-answer")
    expect(wrong?.text).toBe("2")
    const progress = applyCommand(grid, "show-progress")
    expect(progress.messages.at(-1)?.text).toContain("MOCK")
    expect(progress.messages.at(-1)?.text).toContain("█")
    expect(progress.messages.at(-1)?.text).toContain("░")

    const manual = submitAnswer(startMockSession("css-grid"), "200px")
    expect(manual.subskills.find((skill) => skill.id === "fr-tracks")?.level).toBe(3)

    expect(parseSkillMap("I feel about 4/5 done with this.")).toBeNull()
    const parsed = parseSkillMap(
      [
        "Topic: CSS Grid placement                          overall: ######.... 58%",
        "-----------------------------------------------------------------",
        "Line placement        [████░░░░░░]  2/5  can follow along  <- current focus",
        "Gaps                  [░░░░░░░░░░]  0/5  unaware",
      ].join("\n"),
    )
    expect(parsed?.rows).toEqual([
      { name: "Line placement", level: 2, focus: true },
      { name: "Gaps", level: 0, focus: false },
    ])
    expect(
      parseSkillMap("Line placement [████░░░░░░] 2/5\nLine placement [██████░░░░] 3/5"),
    ).toBeNull()

    const skillUrl = new URL("../../vendor/janestreet-agent-skills/socratic-tutor/SKILL.md", import.meta.url)
    const licenseUrl = new URL("../../vendor/janestreet-agent-skills/LICENSE.md", import.meta.url)
    const skillBytes = new Uint8Array(await Bun.file(skillUrl).arrayBuffer())
    const licenseBytes = new Uint8Array(await Bun.file(licenseUrl).arrayBuffer())
    expect(createHash("sha256").update(skillBytes).digest("hex")).toBe(SKILL_SHA256)
    expect(createHash("sha256").update(licenseBytes).digest("hex")).toBe(LICENSE_SHA256)
    const skill = new TextDecoder().decode(skillBytes)
    const license = new TextDecoder().decode(licenseBytes)
    expect(skill).toContain('name: "socratic-tutor"')
    expect(skill).toContain("show progress")
    expect(skill).toContain('"harder" / "easier"')
    expect(skill).toContain("just tell me")
    expect(skill).toContain("save state")
    expect(skill).toContain("resume from:")
    expect(license).toContain("Copyright (c) 2026 Jane Street Group, LLC <opensource-contacts@janestreet.com>")

    const skillText = loadSkillText()
    const request = completionBody(skillText, [{ role: "user", content: "Teach me CSS Grid placement." }], "example-model")
    expect(request.messages[0]).toEqual({ role: "system", content: skillText })
    expect(JSON.stringify(request)).not.toContain("LLM_API_KEY")

    const live = ingestReply(startLiveSession("css-grid"), "Tell me more about grids.", null)
    expect(live.subskills).toEqual([])
    expect(live.messages.some((message) => message.role === "note")).toBe(true)
    const placed = applyParsedMap(
      [],
      null,
      parsed ?? { topic: null, rows: [] },
    )
    expect(placed.subskills.map((skill) => skill.level)).toEqual([2, 0])
    expect(fetches).toBe(0)
  } finally {
    globalThis.fetch = original
  }
})
