import { readFileSync } from "node:fs"
import { VENDORED_COMMIT } from "../session/vendor"

const SKILL_URL = new URL("../../vendor/janestreet-agent-skills/socratic-tutor/SKILL.md", import.meta.url)

export function loadSkillText(): string {
  return readFileSync(SKILL_URL, "utf8")
}

export type LiveConfig =
  | { ok: true; apiKey: string; model: string; baseUrl: string }
  | { ok: false; reason: string }

export function readLiveConfig(env: Record<string, string | undefined>): LiveConfig {
  const apiKey = env.LLM_API_KEY?.trim() ?? ""
  const model = env.LLM_MODEL?.trim() ?? ""
  const baseUrl = (env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "")
  if (!apiKey || !model) {
    return {
      ok: false,
      reason:
        "Set LLM_API_KEY and LLM_MODEL in .env. LLM_BASE_URL is optional and defaults to https://api.openai.com/v1.",
    }
  }
  return { ok: true, apiKey, model, baseUrl }
}

export function publicStatus(env: Record<string, string | undefined>) {
  const model = env.LLM_MODEL?.trim() ?? ""
  return {
    keyPresent: Boolean(env.LLM_API_KEY?.trim()),
    modelSet: Boolean(model),
    model: model || null,
    commit: VENDORED_COMMIT,
  }
}

export type ChatTurn = { role: "user" | "assistant"; content: string }

/** The system message is the vendored SKILL.md, byte for byte. No extra instructions. */
export function completionBody(skill: string, messages: ChatTurn[], model: string) {
  return {
    model,
    messages: [{ role: "system" as const, content: skill }, ...messages],
  }
}

export function redactSecret(text: string, secret: string): string {
  if (!secret) return text
  return text.split(secret).join("[redacted]")
}

export function parseTurns(value: unknown): ChatTurn[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null
  const turns: ChatTurn[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null
    if (content.length === 0 || content.length > 8_000) return null
    turns.push({ role, content })
  }
  return turns
}
