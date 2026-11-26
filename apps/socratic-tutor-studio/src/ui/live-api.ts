export type LiveStatus = {
  keyPresent: boolean
  modelSet: boolean
  model: string | null
  commit: string
}

export async function fetchLiveStatus(): Promise<LiveStatus> {
  const response = await fetch("/api/status")
  if (!response.ok) throw new Error(`Status request failed (${response.status}).`)
  const payload = (await response.json()) as Partial<LiveStatus>
  if (typeof payload.keyPresent !== "boolean" || typeof payload.modelSet !== "boolean") {
    throw new Error("Status response was missing keyPresent or modelSet.")
  }
  return {
    keyPresent: payload.keyPresent,
    modelSet: payload.modelSet,
    model: typeof payload.model === "string" ? payload.model : null,
    commit: typeof payload.commit === "string" ? payload.commit : "",
  }
}

export async function sendLiveChat(messages: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  let response: Response
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    })
  } catch {
    throw new Error("The live server is not reachable. Mock mode still works.")
  }
  const payload = (await response.json().catch(() => null)) as { reply?: unknown; error?: unknown } | null
  if (!response.ok) {
    const error = typeof payload?.error === "string" ? payload.error : `Live request failed (${response.status}).`
    throw new Error(error)
  }
  if (typeof payload?.reply !== "string" || !payload.reply.trim()) {
    throw new Error("The model returned an empty reply. Levels were not changed.")
  }
  return payload.reply
}
