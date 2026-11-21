import { mkdir } from "node:fs/promises";
import path from "node:path";

import { runComparison } from "../src/sim/optimize.ts";
import { modelConfig } from "../src/sim/real-model.ts";
import { publicTasks, TASKS } from "../src/sim/tasks.ts";
import {
  DEFAULT_ROUNDS,
  DEFAULT_SEED,
  DEFAULT_TOKEN_BUDGET,
  type ComparisonResult,
  type Mode,
  type RunScope,
} from "../src/sim/types.ts";

const APP_ROOT = path.resolve(import.meta.dirname, "..");
const PORT = Number(process.env.HARNESS_PORT ?? 8788);

type LiveRun = {
  id: string;
  status: "running" | "done" | "error";
  error?: string;
  result: ComparisonResult | null;
  listeners: Set<(frame: string) => void>;
};

let current: LiveRun | null = null;

export function loadEnvFile(): Promise<void> {
  const file = Bun.file(path.join(APP_ROOT, ".env"));
  return file.exists().then(async (exists) => {
    if (!exists) return;
    const text = await file.text();
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  });
}

function snapshot(run: LiveRun) {
  return {
    type: "snapshot" as const,
    id: run.id,
    status: run.status,
    error: run.error ?? null,
    result: run.result,
  };
}

function broadcast(run: LiveRun) {
  const frame = `data: ${JSON.stringify(snapshot(run))}\n\n`;
  for (const listener of run.listeners) listener(frame);
}

async function persist(result: ComparisonResult, runDir: string) {
  const body = `${JSON.stringify(result, null, 2)}\n`;
  await Bun.write(path.join(APP_ROOT, "history.json"), body);
  await Bun.write(path.join(runDir, "history.json"), body);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function readMode(value: unknown): Mode {
  return value === "real" ? "real" : "mock";
}

function readScope(value: unknown): RunScope {
  if (value === "one-file" || value === "rewrite-all") return value;
  return "compare";
}

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function startServer(port = PORT) {
  return Bun.serve({
    port,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);
      if (req.method === "GET" && url.pathname === "/api/health") {
        const config = modelConfig();
        return json({
          ok: true,
          realModelConfigured: config.apiKey.length > 0,
          model: config.apiKey ? config.model : null,
        });
      }
      if (req.method === "GET" && url.pathname === "/api/tasks") {
        return json({ tasks: publicTasks(TASKS) });
      }
      const eventsMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/events$/);
      if (req.method === "GET" && eventsMatch) {
        const id = eventsMatch[1];
        if (!current || current.id !== id) return json({ error: "Run not found." }, 404);
        const run = current;
        let remove: (() => void) | undefined;
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            const send = (frame: string) => {
              try {
                controller.enqueue(encoder.encode(frame));
              } catch {
                remove?.();
              }
            };
            const listener = (frame: string) => send(frame);
            run.listeners.add(listener);
            remove = () => run.listeners.delete(listener);
            send(`data: ${JSON.stringify(snapshot(run))}\n\n`);
          },
          cancel() {
            remove?.();
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
      const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
      if (req.method === "GET" && runMatch) {
        const id = runMatch[1];
        if (!current || current.id !== id) return json({ error: "Run not found." }, 404);
        return json(snapshot(current));
      }
      if (req.method === "POST" && url.pathname === "/api/runs") {
        if (current?.status === "running") {
          return json({ error: "A run is already in progress." }, 409);
        }
        let body: {
          rounds?: number;
          seed?: number;
          tokenBudget?: number;
          mode?: string;
          scope?: string;
        } = {};
        try {
          body = (await req.json()) as typeof body;
        } catch {
          return json({ error: "Expected a JSON body." }, 400);
        }
        const mode = readMode(body.mode);
        const scope = readScope(body.scope);
        const rounds = clamp(body.rounds, DEFAULT_ROUNDS, 1, 12);
        const seed = clamp(body.seed, DEFAULT_SEED, 0, 1_000_000);
        const tokenBudget = clamp(body.tokenBudget, DEFAULT_TOKEN_BUDGET, 50, 200_000);
        const id = crypto.randomUUID();
        const run: LiveRun = {
          id,
          status: "running",
          result: null,
          listeners: new Set(),
        };
        current = run;
        const runDir = path.join(APP_ROOT, "runs", id);
        void mkdir(runDir, { recursive: true })
          .then(() =>
            runComparison({
              rounds,
              seed,
              tokenBudget,
              mode,
              scope,
              paceMs: 400,
              onProgress: (result) => {
                run.result = result;
                broadcast(run);
              },
            }),
          )
          .then(async (result) => {
            run.status = "done";
            run.result = result;
            await persist(result, runDir);
            broadcast(run);
          })
          .catch((error: unknown) => {
            run.status = "error";
            run.error = error instanceof Error ? error.message : String(error);
            broadcast(run);
          });
        return json({ id });
      }
      return json({ error: "Not found." }, 404);
    },
  });
}

if (import.meta.main) {
  await loadEnvFile();
  const server = startServer();
  console.log(`Harness API http://127.0.0.1:${server.port}`);
}
