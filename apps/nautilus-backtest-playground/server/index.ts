import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const metaPath = resolve(root, "backtest/data/meta.json");

type Dataset = {
  label: string;
  seed: number;
  instrument_id: string;
  bar_spec: string;
  start: string;
  end: string;
  rows: number;
  generator: string;
  nautilus_version?: string;
};

const dataset: Dataset = JSON.parse(readFileSync(metaPath, "utf8"));

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function python(
  args: string[],
  stdin?: string,
  timeoutMs = 90_000,
): Promise<{ code: number; stdout: string; stderr: string; timedOut: boolean }> {
  const proc = spawn(
    "uv",
    ["run", "--directory", "backtest", "python", "-u", "run.py", ...args],
    { cwd: root, stdio: ["pipe", "pipe", "pipe"] },
  );

  let stdout = "";
  let stderr = "";
  proc.stdout?.on("data", (chunk) => {
    stdout += String(chunk);
  });
  proc.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill("SIGKILL");
  }, timeoutMs);

  proc.stdin?.end(stdin ?? "");

  const code = await new Promise<number>((resolveExit, reject) => {
    let settled = false;
    proc.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    proc.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      resolveExit(exitCode ?? 1);
    });
  });
  clearTimeout(timer);
  return { code, stdout, stderr, timedOut };
}

try {
  const result = await python(["--meta"], undefined, 60_000);
  if (result.code === 0 && result.stdout) {
    const parsed = JSON.parse(result.stdout) as Dataset;
    dataset.nautilus_version = parsed.nautilus_version;
  } else {
    console.error(result.stderr);
  }
} catch (error) {
  const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
  console.error(
    missing
      ? "uv is not installed. Install it from https://docs.astral.sh/uv/."
      : error,
  );
}

Bun.serve({
  hostname: "127.0.0.1",
  port: 8787,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, nautilus_version: dataset.nautilus_version ?? null });
    }
    if (req.method === "GET" && url.pathname === "/api/dataset") {
      return json(dataset);
    }
    if (req.method === "POST" && url.pathname === "/api/backtest") {
      let text = "";
      try {
        text = await req.text();
      } catch {
        return json({ error: "Could not read the request body." }, 400);
      }
      if (text.length > 20_000) {
        return json({ error: "Request is too large." }, 400);
      }
      let result: Awaited<ReturnType<typeof python>>;
      try {
        result = await python([], text || "{}");
      } catch (error) {
        const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
        return json(
          {
            error: missing
              ? "uv is not installed. Install it from https://docs.astral.sh/uv/ and run bun run dev again."
              : "Failed to start the backtest process.",
          },
          500,
        );
      }
      if (result.timedOut) {
        return json({ error: "The backtest timed out after 90 seconds." }, 504);
      }
      let payload: { error?: string } | null = null;
      try {
        payload = result.stdout ? (JSON.parse(result.stdout) as { error?: string }) : null;
      } catch {
        return json(
          {
            error: "The backtest process did not return JSON.",
            detail: (result.stderr || result.stdout).slice(0, 4000),
          },
          500,
        );
      }
      if (result.code === 2) {
        return json(payload ?? { error: "Invalid parameters." }, 400);
      }
      if (result.code !== 0) {
        return json(
          {
            error: payload?.error ?? "The backtest process failed.",
            detail: result.stderr.slice(0, 4000),
          },
          500,
        );
      }
      return json(payload);
    }
    return json({ error: "Not found." }, 404);
  },
});

console.log(
  `backtest api http://127.0.0.1:8787 (nautilus ${dataset.nautilus_version ?? "unknown"})`,
);
