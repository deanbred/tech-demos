import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Task } from "./types.ts";

export type ScoreRow = {
  id: string;
  passed: boolean;
  detail: string;
};

const CHECK_SOURCE = `
const payload = await Bun.file("cases.json").json();
const solution = await import("./solution.ts");

function same(got, expected) {
  if (typeof expected === "number" && typeof got === "number") return Object.is(got, expected);
  if (expected === null || typeof expected !== "object") return Object.is(got, expected);
  try {
    return JSON.stringify(got) === JSON.stringify(expected);
  } catch {
    return false;
  }
}

const tasks = [];
for (const task of payload.tasks) {
  if (!task.source) {
    tasks.push({ id: task.id, passed: false, detail: "no submission" });
    continue;
  }
  const fn = solution[task.exportName];
  if (typeof fn !== "function") {
    tasks.push({ id: task.id, passed: false, detail: "missing export " + task.exportName });
    continue;
  }
  let passed = true;
  let detail = "ok";
  for (const testCase of task.cases) {
    try {
      const got = fn(...testCase.args);
      if (!same(got, testCase.expected)) {
        passed = false;
        detail = "Expected " + JSON.stringify(testCase.expected) + " but got " + JSON.stringify(got);
        break;
      }
    } catch (error) {
      passed = false;
      detail = "Expected " + JSON.stringify(testCase.expected) + " but threw " + String(error);
      break;
    }
  }
  tasks.push({ id: task.id, passed, detail });
}
console.log(JSON.stringify({ tasks }));
`;

const cache = new Map<string, Promise<ScoreRow[]>>();

export function scoreSubmissions(
  rows: { task: Task; source: string | null }[],
  timeoutMs = 5000,
): Promise<ScoreRow[]> {
  if (rows.length === 0) return Promise.resolve([]);
  const key = JSON.stringify(
    rows.map((row) => ({
      id: row.task.id,
      source: row.source,
      cases: row.task.cases,
    })),
  );
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = runOnce(rows, timeoutMs);
  cache.set(key, pending);
  return pending;
}

async function runOnce(
  rows: { task: Task; source: string | null }[],
  timeoutMs: number,
): Promise<ScoreRow[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "harness-score-"));
  try {
    const solution = rows
      .filter((row) => row.source)
      .map((row) => row.source)
      .join("\n\n");
    await Bun.write(path.join(dir, "solution.ts"), solution.length > 0 ? solution : "export {};\n");
    await Bun.write(
      path.join(dir, "cases.json"),
      JSON.stringify({
        tasks: rows.map((row) => ({
          id: row.task.id,
          exportName: row.task.exportName,
          source: row.source,
          cases: row.task.cases,
        })),
      }),
    );
    await Bun.write(path.join(dir, "check.ts"), CHECK_SOURCE);
    const proc = Bun.spawn({
      cmd: ["bun", "check.ts"],
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        TMPDIR: process.env.TMPDIR ?? tmpdir(),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      return failAll(rows, stderr.trim().slice(0, 240) || `exit ${exitCode}`);
    }
    return parseScores(stdout, rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failAll(rows, message.slice(0, 240));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function failAll(rows: { task: Task }[], detail: string): ScoreRow[] {
  return rows.map((row) => ({ id: row.task.id, passed: false, detail }));
}

function parseScores(stdout: string, rows: { task: Task }[]): ScoreRow[] {
  const line = stdout
    .trim()
    .split("\n")
    .find((entry) => entry.startsWith("{"));
  if (!line) return failAll(rows, "runner produced no JSON");
  let parsed: { tasks?: { id: string; passed: boolean; detail?: string }[] };
  try {
    parsed = JSON.parse(line) as typeof parsed;
  } catch {
    return failAll(rows, "runner JSON was invalid");
  }
  const byId = new Map((parsed.tasks ?? []).map((row) => [row.id, row]));
  return rows.map((row) => {
    const found = byId.get(row.task.id);
    if (!found) return { id: row.task.id, passed: false, detail: "missing result" };
    return { id: row.task.id, passed: found.passed, detail: found.detail ?? "" };
  });
}

export function verboseLog(detail: string): string {
  return `${detail}\n${"at suite.ts:1:1\n".repeat(90)}`;
}

export function compiles(source: string): boolean {
  try {
    new Bun.Transpiler({ loader: "ts" }).transformSync(source);
    return true;
  } catch {
    return false;
  }
}
