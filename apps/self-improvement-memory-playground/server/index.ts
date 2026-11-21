import { mkdir } from "node:fs/promises";
import path from "node:path";

import { runComparison } from "../src/sim/loop.ts";
import { publicTasks, TASKS } from "../src/sim/tasks.ts";
import { modelConfig } from "../src/sim/real-model.ts";
import { MODEL_LABEL, type ComparisonResult, type Mode } from "../src/sim/types.ts";

const APP_ROOT = path.resolve(import.meta.dirname, "..");
const PORT = Number(process.env.SIM_PORT ?? 8787);

type LiveRun = {
  id: string;
  status: "running" | "done" | "error";
  error?: string;
  result: ComparisonResult | null;
  listeners: Set<(frame: string) => void>;
};

let current: LiveRun | null = null;

function loadEnvFile() {
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

async function persistLatest(result: ComparisonResult, runDir: string) {
  const sim = `${JSON.stringify(result.sim.ledger, null, 2)}\n`;
  const baseline = `${JSON.stringify(result.baseline.ledger, null, 2)}\n`;
  await Bun.write(path.join(APP_ROOT, "sim-ledger.json"), sim);
  await Bun.write(path.join(APP_ROOT, "baseline-ledger.json"), baseline);
  await Bun.write(path.join(runDir, "sim-ledger.json"), sim);
  await Bun.write(path.join(runDir, "baseline-ledger.json"), baseline);
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

export function startServer(port = PORT) {
  return Bun.serve({
    port,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);
      if (req.method === "GET" && url.pathname === "/api/health") {
        return json({
          ok: true,
          realModelConfigured: modelConfig().apiKey.length > 0,
          model: modelConfig().apiKey ? modelConfig().model : null,
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
          candidates?: number;
          seed?: number;
          mode?: string;
        } = {};
        try {
          body = (await req.json()) as typeof body;
        } catch {
          return json({ error: "Expected a JSON body." }, 400);
        }
        const mode = readMode(body.mode);
        const id = crypto.randomUUID();
        const runDir = path.join(APP_ROOT, "runs", id);
        await mkdir(runDir, { recursive: true });
        const run: LiveRun = {
          id,
          status: "running",
          result: null,
          listeners: new Set(),
        };
        current = run;
        void runComparison({
          rounds: body.rounds,
          candidates: body.candidates,
          seed: body.seed,
          mode,
          stepDelayMs: 400,
          onProgress: (result) => {
            run.result = result;
            void persistLatest(result, runDir);
            broadcast(run);
          },
        })
          .then((result) => {
            run.result = result;
            run.status = "done";
            broadcast(run);
          })
          .catch((error: unknown) => {
            run.status = "error";
            run.error = error instanceof Error ? error.message : String(error);
            broadcast(run);
          });
        return json({ id, modelLabel: MODEL_LABEL[mode] }, 202);
      }
      return json({ error: "Not found." }, 404);
    },
  });
}

if (import.meta.main) {
  await loadEnvFile();
  const server = startServer();
  console.log(`SIM API http://127.0.0.1:${server.port}`);
}

export { loadEnvFile };
