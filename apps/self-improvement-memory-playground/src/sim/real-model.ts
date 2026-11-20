import { retryBlocked } from "./retry.ts";
import type { Task } from "./tasks.ts";
import type { EditorInput, Harness, Proposal } from "./types.ts";

type ChatMessage = { role: "system" | "user"; content: string };

export function modelConfig(): { apiKey: string; base: string; model: string } {
  const apiKey = process.env.SIM_API_KEY || process.env.OPENAI_API_KEY || "";
  const base = (process.env.SIM_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.SIM_MODEL || "gpt-4o-mini";
  return { apiKey, base, model };
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const { apiKey, base, model } = modelConfig();
  if (!apiKey) {
    throw new Error(
      "Real model mode needs SIM_API_KEY or OPENAI_API_KEY in the environment (.env). No key is set, so this run was not sent to a model.",
    );
  }
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Model API ${response.status}: ${body.slice(0, 400)}`);
  }
  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Model returned an empty response.");
  }
  return text.trim();
}

export function stripFences(text: string): string {
  const fenced = text.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

export async function realSolve(tasks: Task[], harness: Harness): Promise<string> {
  const { model } = modelConfig();
  const specs = tasks
    .map((task) => `${task.signature}\n${task.prompt}`)
    .join("\n\n");
  const text = await chat([
    {
      role: "system",
      content:
        "You write TypeScript functions. Return only the functions, one module, no markdown, no tests, no prose. Match each signature exactly and export each function.",
    },
    {
      role: "user",
      content: `Harness prompt:\n${harness.prompt}\n\nEnabled tools: ${harness.tools.join(", ")}\n\nImplement these functions:\n${specs}\n\nModel: ${model}`,
    },
  ]);
  return stripFences(text);
}

type RawProposal = {
  problemName?: unknown;
  what?: unknown;
  files?: unknown;
  predicts?: unknown;
  tools?: unknown;
};

export async function proposeReal(input: EditorInput): Promise<Proposal[]> {
  const failing = input.train.filter((row) => !row.passed).map((row) => row.id);
  const trainIds = new Set(input.tasks.map((task) => task.id));
  const ledger =
    input.ledger === null
      ? null
      : {
          problems: input.ledger.problems,
          rounds: input.ledger.rounds.map((round) => ({
            round: round.round,
            candidates: round.candidates.map((candidate) => ({
              what: candidate.what,
              problem_name: candidate.problem_name,
              predicted: candidate.predicted,
              fixed: candidate.fixed,
              missed: candidate.missed,
              accepted: candidate.accepted,
              passed: candidate.passed,
              total: candidate.total,
              failing: candidate.evaluation_context.failing,
            })),
          })),
        };
  const text = await chat([
    {
      role: "system",
      content: [
        "You edit an agent's harness (its system prompt and enabled tools) so it solves coding tasks better.",
        "Propose candidate edits. Reply with a JSON array only.",
        "Each item: {\"problemName\": string, \"what\": string, \"files\": string, \"predicts\": string[], \"tools\": string[]}.",
        "predicts lists train task ids you expect this edit to start passing. Use only ids from the failing train list.",
        "Cite an existing problemName when it explains the failure. Otherwise name a new problem.",
        "Revisit a tested direction (the same what) only when a train task is failing now that was not failing when that what was last tried.",
        "Do not mention tasks that are absent from the train list.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        round: input.round,
        k: input.k,
        harness: { prompt: input.harness.prompt, tools: input.harness.tools },
        failing_train_tasks: failing,
        train_tasks: input.tasks,
        ledger,
      }),
    },
  ]);
  const parsed = parseProposals(text);
  const proposals: Proposal[] = [];
  for (const [index, raw] of parsed.entries()) {
    const what = typeof raw.what === "string" ? raw.what.trim() : "";
    const problemName = typeof raw.problemName === "string" ? raw.problemName.trim() : "";
    if (!what || !problemName) continue;
    if (retryBlocked(input.ledger, what, failing)) continue;
    const predicts = Array.isArray(raw.predicts)
      ? raw.predicts.filter((id): id is string => typeof id === "string" && trainIds.has(id) && failing.includes(id))
      : [];
    const tools = Array.isArray(raw.tools)
      ? raw.tools.filter((tool): tool is string => typeof tool === "string" && tool.trim().length > 0)
      : [];
    const files = typeof raw.files === "string" && raw.files.trim() ? raw.files.trim() : "prompt.md";
    proposals.push({
      id: `real-r${input.round}-s${index + 1}`,
      problemName,
      what,
      files,
      predicts,
      tools,
    });
    if (proposals.length >= input.k) break;
  }
  if (proposals.length === 0) {
    throw new Error("Real editor returned no usable candidates.");
  }
  return proposals;
}

function parseProposals(text: string): RawProposal[] {
  const stripped = stripFences(text);
  const start = stripped.indexOf("[");
  const end = stripped.lastIndexOf("]");
  if (start < 0 || end <= start) {
    throw new Error("Real editor did not return a JSON array.");
  }
  const parsed: unknown = JSON.parse(stripped.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("Real editor JSON was not an array.");
  return parsed.filter((item): item is RawProposal => typeof item === "object" && item !== null);
}
