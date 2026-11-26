import { completionBody, loadSkillText, parseTurns, publicStatus, readLiveConfig, redactSecret } from "./live"

const skill = loadSkillText()
const port = Number(process.env.PORT ?? 8787)

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

async function handleChat(request: Request): Promise<Response> {
  const config = readLiveConfig(process.env)
  if (!config.ok) return json({ error: config.reason }, 400)
  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null
  const messages = parseTurns(body?.messages)
  if (!messages) return json({ error: "Send a short list of user and assistant messages." }, 400)
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(completionBody(skill, messages, config.model)),
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) {
      const detail = redactSecret(await response.text(), config.apiKey).slice(0, 300)
      return json({ error: `The model API returned ${response.status}. ${detail}` }, 502)
    }
    const payload = (await response.json()) as { choices?: { message?: { content?: unknown } }[] }
    const reply = payload.choices?.[0]?.message?.content
    if (typeof reply !== "string" || !reply.trim()) {
      return json({ error: "The model returned an empty reply." }, 502)
    }
    return json({ reply })
  } catch (error) {
    const message = error instanceof Error ? error.message : "The model request failed."
    return json({ error: redactSecret(message, config.apiKey) }, 502)
  }
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url)
    if (request.method === "GET" && url.pathname === "/api/status") return json(publicStatus(process.env))
    if (request.method === "POST" && url.pathname === "/api/chat") return handleChat(request)
    return new Response("Not found", { status: 404 })
  },
})

console.log(`socratic tutor api listening on ${port}`)
