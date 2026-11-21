import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { isFixed } from "./patches.ts";
import type { Task } from "./tasks.ts";
import type { Harness } from "./types.ts";

export type TaskScore = {
  id: string;
  passed: boolean;
  casesPassed: number;
  casesTotal: number;
  error?: string;
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
  const fn = solution[task.exportName];
  const total = task.cases.length;
  if (typeof fn !== "function") {
    tasks.push({ id: task.id, passed: 0, total, error: "missing export " + task.exportName });
    continue;
  }
  let passed = 0;
  for (const testCase of task.cases) {
    try {
      const got = fn(...testCase.args);
      if (same(got, testCase.expected)) passed += 1;
    } catch {
      // a thrown case counts as a failure
    }
  }
  tasks.push({ id: task.id, passed, total });
}
console.log(JSON.stringify({ tasks }));
`;

const scoreCache = new Map<string, Promise<TaskScore[]>>();

export function renderMockSolution(tasks: Task[], harness: Harness): string {
  return tasks
    .map((task) => (isFixed(task.id, harness.patchIds) ? task.correct : task.buggy))
    .join("\n\n");
}

function cacheKey(source: string, tasks: Task[]): string {
  const cases = tasks.map((task) => ({ id: task.id, cases: task.cases }));
  return `${source}\n---\n${JSON.stringify(cases)}`;
}

/** Run solution source against tasks in a fresh Bun subprocess. Identical runs are cached. */
export function scoreSource(source: string, tasks: Task[], timeoutMs = 5000): Promise<TaskScore[]> {
  if (tasks.length === 0) return Promise.resolve([]);
  const key = cacheKey(source, tasks);
  const cached = scoreCache.get(key);
  if (cached) return cached;
  const pending = runOnce(source, tasks, timeoutMs);
  scoreCache.set(key, pending);
  return pending;
}

async function runOnce(source: string, tasks: Task[], timeoutMs: number): Promise<TaskScore[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "sim-"));
  try {
    await Bun.write(path.join(dir, "solution.ts"), source);
    await Bun.write(
      path.join(dir, "cases.json"),
      JSON.stringify({
        tasks: tasks.map((task) => ({
          id: task.id,
          exportName: task.id,
          cases: task.cases,
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
      return failAll(tasks, stderr.trim().slice(0, 240) || `exit ${exitCode}`);
    }
    return parseScores(stdout, tasks);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failAll(tasks, message.slice(0, 240));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function failAll(tasks: Task[], error: string): TaskScore[] {
  return tasks.map((task) => ({
    id: task.id,
    passed: false,
    casesPassed: 0,
    casesTotal: task.cases.length,
    error,
  }));
}

function parseScores(stdout: string, tasks: Task[]): TaskScore[] {
  const line = stdout
    .trim()
    .split("\n")
    .find((entry) => entry.startsWith("{"));
  if (!line) return failAll(tasks, "runner produced no JSON");
  let parsed: { tasks?: { id: string; passed: number; total: number; error?: string }[] };
  try {
    parsed = JSON.parse(line) as typeof parsed;
  } catch {
    return failAll(tasks, "runner JSON was invalid");
  }
  const byId = new Map((parsed.tasks ?? []).map((task) => [task.id, task]));
  return tasks.map((task) => {
    const row = byId.get(task.id);
    if (!row) {
      return {
        id: task.id,
        passed: false,
        casesPassed: 0,
        casesTotal: task.cases.length,
        error: "missing result",
      };
    }
    const casesTotal = row.total;
    const casesPassed = row.passed;
    return {
      id: task.id,
      passed: casesTotal > 0 && casesPassed === casesTotal && !row.error,
      casesPassed,
      casesTotal,
      error: row.error,
    };
  });
}
