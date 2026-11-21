import type { AgentView, Model } from "./runner.ts";
import {
  HARNESS_FILES,
  MODEL_LABEL,
  type FixerView,
  type HarnessFile,
  type HarnessSources,
  type Proposal,
} from "./types.ts";

type ChatMessage = { role: "system" | "user"; content: string };

export function modelConfig(): { apiKey: string; base: string; model: string } {
  const apiKey = process.env.HARNESS_API_KEY || process.env.OPENAI_API_KEY || "";
  const base = (process.env.HARNESS_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.HARNESS_MODEL || "gpt-4o-mini";
  return { apiKey, base, model };
}

export function realModel(): Model {
  return {
    label: MODEL_LABEL.real,
    act: realAct,
    propose: realPropose,
  };
}

async function realAct(view: AgentView): Promise<string> {
  const text = await chat([
    {
      role: "system",
      content:
        'You are the task agent inside a harness. Reply with one JSON object only: {"tool":"read"|"edit"|"test"|"finish","body":string}. Include body only for edit, and body must be the full TypeScript module. Do not wrap the JSON in markdown.',
    },
    {
      role: "user",
      content: JSON.stringify({
        task: view.task.id,
        title: view.task.title,
        turn: view.turn,
        maxTurns: view.maxTurns,
        context: view.contextText,
      }),
    },
  ]);
  return stripFences(text);
}

async function realPropose(view: FixerView): Promise<Proposal> {
  const oneFile = view.optimizer === "one-file";
  const text = await chat([
    {
      role: "system",
      content: oneFile
        ? "You edit one file of a 4-file agent harness. Reply with JSON only: {\"file\":\"memory\"|\"loop\"|\"tools\"|\"stop\",\"summary\":string,\"source\":string}. source is the full replacement file. Use only the train logs. Do not mention held-out tasks."
        : "You rewrite all four harness files. Reply with JSON only: {\"summary\":string,\"files\":{\"memory\":string,\"loop\":string,\"tools\":string,\"stop\":string}}. Each value is the full file. Use only the train logs.",
    },
    {
      role: "user",
      content: JSON.stringify({
        round: view.round,
        optimizer: view.optimizer,
        trainLogs: view.trainLogs,
        history: view.history,
        sources: view.sources,
      }),
    },
  ]);
  return oneFile ? proposalFromFile(view, stripFences(text)) : proposalFromRewrite(view, stripFences(text));
}

function proposalFromFile(view: FixerView, text: string): Proposal {
  const parsed = parseJson(text);
  const file = parsed.file;
  if (!isHarnessFile(file) || typeof parsed.source !== "string") {
    throw new Error("Real fixer did not return a single harness file.");
  }
  const sources: HarnessSources = { ...view.sources, [file]: parsed.source };
  return {
    patchId: `real-${view.round}`,
    summary: typeof parsed.summary === "string" ? parsed.summary : `Replace ${file}.ts`,
    file,
    sources,
  };
}

function proposalFromRewrite(view: FixerView, text: string): Proposal {
  const parsed = parseJson(text);
  const files = parsed.files;
  if (typeof files !== "object" || files === null) throw new Error("Real fixer did not return four files.");
  const record = files as Record<string, unknown>;
  const sources = { ...view.sources };
  for (const file of HARNESS_FILES) {
    const source = record[file];
    if (typeof source !== "string") throw new Error(`Real fixer omitted ${file}.ts`);
    sources[file] = source;
  }
  return {
    patchId: `real-rewrite-${view.round}`,
    summary: typeof parsed.summary === "string" ? parsed.summary : "Rewrite all four harness files.",
    file: "all",
    sources,
  };
}

function isHarnessFile(value: unknown): value is HarnessFile {
  return value === "memory" || value === "loop" || value === "tools" || value === "stop";
}

function parseJson(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null) throw new Error("Model JSON was not an object.");
  return parsed as Record<string, unknown>;
}

export function stripFences(text: string): string {
  const fenced = text.match(/```(?:json|typescript|ts)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

async function chat(messages: ChatMessage[]): Promise<string> {
  const { apiKey, base, model } = modelConfig();
  if (!apiKey) {
    throw new Error(
      "Real model mode needs HARNESS_API_KEY or OPENAI_API_KEY in the environment (.env). No key is set, so this run was not sent to a model.",
    );
  }
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, temperature: 0, messages }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Model API ${response.status}: ${body.slice(0, 400)}`);
  }
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("Model returned an empty response.");
  return text.trim();
}
