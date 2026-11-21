import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { compiles, scoreSubmissions, verboseLog } from "./score.ts";
import type { FixerView, HarnessSources, Proposal } from "./types.ts";
import type { Task } from "./types.ts";

export type AgentView = {
  turn: number;
  maxTurns: number;
  contextTokens: number;
  contextText: string;
  hasRead: boolean;
  edited: boolean;
  tested: boolean;
  testsPassed: boolean;
  blockedFinishes: number;
  finishBlockedAfterEdit: boolean;
  previousAction: string;
  breakRepeats: boolean;
  task: Task;
};

export type Model = {
  label: string;
  act(view: AgentView): Promise<string>;
  propose(view: FixerView): Promise<Proposal>;
};

export type TaskRun = {
  id: string;
  title: string;
  passed: boolean;
  events: string[];
  tokens: number;
  signatures: string[];
  source: string | null;
};

type Action =
  | { tool: "read" }
  | { tool: "edit"; body: string }
  | { tool: "test" }
  | { tool: "finish" }
  | { tool: "invalid"; raw: string };

type TurnRecord = { turn: number; action: string; observation: string };

type LoadedHarness = {
  renderContext: (turns: TurnRecord[]) => { text: string; tokens: number };
  maxTurns: () => number;
  parseAction: (raw: string) => Action;
  observationOverhead: () => string;
  breakRepeats: () => boolean;
  presentObservation: (kind: string, raw: string) => string;
  reviewStop: (state: { edited: boolean; compiled: boolean; testsPassed: boolean }) => {
    allow: boolean;
    reason: string;
  };
};

const harnessCache = new Map<string, Promise<LoadedHarness>>();

export class HarnessLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HarnessLoadError";
  }
}

export async function runTasks(
  sources: HarnessSources,
  tasks: Task[],
  model: Model,
): Promise<TaskRun[]> {
  const harness = await loadHarness(sources);
  const runs: TaskRun[] = [];
  for (const task of tasks) {
    runs.push(await runOne(harness, task, model));
  }
  return runs;
}

export function signaturesOf(events: string[], passed: boolean): string[] {
  const signatures: string[] = [];
  const edits = events.filter((event) => event === "edit").length;
  const reads = events.filter((event) => event === "read").length;
  if (!passed && events.includes("finish") && edits === 0) signatures.push("premature_finish");
  if (!passed && edits > 0 && !events.includes("test_fail") && !events.includes("test_pass")) {
    signatures.push("untested_exit");
  }
  if (reads >= 2) signatures.push("context_overflow");
  if (events.at(-1) === "turn_cap") signatures.push("turn_cap");
  if (
    !passed &&
    events.includes("test_fail") &&
    !signatures.includes("premature_finish") &&
    !signatures.includes("untested_exit")
  ) {
    signatures.push("model_limit");
  }
  return signatures;
}

async function runOne(harness: LoadedHarness, task: Task, model: Model): Promise<TaskRun> {
  const turns: TurnRecord[] = [];
  const events: string[] = [];
  let tokens = 0;
  let source: string | null = null;
  let hasRead = false;
  let tested = false;
  let testsPassed = false;
  let compiled = false;
  let blockedFinishes = 0;
  let finishBlockedAfterEdit = false;
  let previousAction = "";
  const limit = Math.max(1, Math.min(harness.maxTurns(), 24));

  for (let turn = 1; turn <= limit; turn += 1) {
    const context = harness.renderContext(turns);
    tokens += context.tokens + 10;
    const view: AgentView = {
      turn,
      maxTurns: limit,
      contextTokens: context.tokens,
      contextText: context.text,
      hasRead,
      edited: source !== null,
      tested,
      testsPassed,
      blockedFinishes,
      finishBlockedAfterEdit,
      previousAction,
      breakRepeats: harness.breakRepeats(),
      task,
    };
    const action = normalize(harness.parseAction(await model.act(view)));
    if (action.tool === "finish") {
      const decision = harness.reviewStop({
        edited: source !== null,
        compiled,
        testsPassed,
      });
      if (!decision.allow) {
        blockedFinishes += 1;
        if (source !== null) finishBlockedAfterEdit = true;
        pushTurn(harness, turns, turn, "finish", "blocked", decision.reason);
        events.push("finish_blocked");
        previousAction = "finish_blocked";
        continue;
      }
      pushTurn(harness, turns, turn, "finish", "finish", "stop");
      events.push("finish");
      previousAction = "finish";
      break;
    }
    if (action.tool === "read") {
      pushTurn(harness, turns, turn, "read", "read", task.buggy);
      events.push("read");
      hasRead = true;
      previousAction = "read";
      continue;
    }
    if (action.tool === "edit") {
      source = action.body;
      compiled = compiles(action.body);
      testsPassed = false;
      tested = false;
      pushTurn(harness, turns, turn, "edit", "edit", compiled ? "compiled" : "compile failed");
      events.push("edit");
      previousAction = "edit";
      continue;
    }
    if (action.tool === "test") {
      const outcome = await observeTest(task, source);
      testsPassed = outcome.passed;
      compiled = source !== null && compiles(source);
      tested = true;
      pushTurn(harness, turns, turn, outcome.passed ? "test_pass" : "test_fail", "test", outcome.detail);
      events.push(outcome.passed ? "test_pass" : "test_fail");
      previousAction = "test";
      continue;
    }
    pushTurn(harness, turns, turn, "invalid", "invalid", action.raw);
    events.push("invalid");
    previousAction = "invalid";
  }

  if (events.at(-1) !== "finish") events.push("turn_cap");
  const [graded] = await scoreSubmissions([{ task, source }]);
  const passed = graded?.passed ?? false;
  return {
    id: task.id,
    title: task.title,
    passed,
    events,
    tokens,
    signatures: signaturesOf(events, passed),
    source,
  };
}

async function observeTest(task: Task, source: string | null): Promise<{ passed: boolean; detail: string }> {
  if (!source) return { passed: false, detail: verboseLog("no submission") };
  const [row] = await scoreSubmissions([{ task, source }]);
  return { passed: row?.passed ?? false, detail: verboseLog(row?.detail ?? "no result") };
}

function pushTurn(
  harness: LoadedHarness,
  turns: TurnRecord[],
  turn: number,
  action: string,
  kind: string,
  raw: string,
): void {
  const overhead = harness.observationOverhead();
  const withOverhead = overhead ? `${overhead}\n${raw}` : raw;
  turns.push({
    turn,
    action,
    observation: harness.presentObservation(kind, withOverhead),
  });
}

function normalize(action: Action): Action {
  switch (action.tool) {
    case "read":
    case "edit":
    case "test":
    case "finish":
    case "invalid":
      return action;
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

async function loadHarness(sources: HarnessSources): Promise<LoadedHarness> {
  const key = JSON.stringify(sources);
  const cached = harnessCache.get(key);
  if (cached) return cached;
  const pending = importHarness(sources);
  harnessCache.set(key, pending);
  try {
    return await pending;
  } catch (error) {
    harnessCache.delete(key);
    throw error;
  }
}

async function importHarness(sources: HarnessSources): Promise<LoadedHarness> {
  const dir = await mkdtemp(path.join(tmpdir(), "harness-src-"));
  try {
    await Bun.write(path.join(dir, "memory.ts"), sources.memory);
    await Bun.write(path.join(dir, "loop.ts"), sources.loop);
    await Bun.write(path.join(dir, "tools.ts"), sources.tools);
    await Bun.write(path.join(dir, "stop.ts"), sources.stop);
    const [memory, loop, tools, stop] = await Promise.all([
      import(pathToFileURL(path.join(dir, "memory.ts")).href),
      import(pathToFileURL(path.join(dir, "loop.ts")).href),
      import(pathToFileURL(path.join(dir, "tools.ts")).href),
      import(pathToFileURL(path.join(dir, "stop.ts")).href),
    ]);
    if (typeof memory.renderContext !== "function") throw new HarnessLoadError("memory.ts is missing renderContext");
    if (typeof loop.maxTurns !== "function" || typeof loop.parseAction !== "function") {
      throw new HarnessLoadError("loop.ts is missing maxTurns or parseAction");
    }
    if (typeof tools.presentObservation !== "function") {
      throw new HarnessLoadError("tools.ts is missing presentObservation");
    }
    if (typeof stop.reviewStop !== "function") throw new HarnessLoadError("stop.ts is missing reviewStop");
    return {
      renderContext: memory.renderContext as LoadedHarness["renderContext"],
      maxTurns: loop.maxTurns as LoadedHarness["maxTurns"],
      parseAction: loop.parseAction as LoadedHarness["parseAction"],
      observationOverhead:
        typeof loop.observationOverhead === "function"
          ? (loop.observationOverhead as LoadedHarness["observationOverhead"])
          : () => "",
      breakRepeats:
        typeof loop.breakRepeats === "function"
          ? (loop.breakRepeats as LoadedHarness["breakRepeats"])
          : () => false,
      presentObservation: tools.presentObservation as LoadedHarness["presentObservation"],
      reviewStop: stop.reviewStop as LoadedHarness["reviewStop"],
    };
  } catch (error) {
    if (error instanceof HarnessLoadError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new HarnessLoadError(message);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
