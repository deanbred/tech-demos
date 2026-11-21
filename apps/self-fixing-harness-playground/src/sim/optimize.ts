import { changedFiles, harnessDiff } from "./diff.ts";
import { mockModel } from "./mock-model.ts";
import { realModel } from "./real-model.ts";
import { HarnessLoadError, runTasks, type Model, type TaskRun } from "./runner.ts";
import { readSeed } from "./seed.ts";
import { TASKS, tasksBySplit } from "./tasks.ts";
import {
  MODEL_LABEL,
  type ComparisonResult,
  type ConditionResult,
  type FixerHistoryItem,
  type FixerLog,
  type FixerView,
  type HarnessFile,
  type HarnessSources,
  type Mode,
  type OptimizerMode,
  type Proposal,
  type RoundRecord,
  type RunScope,
  type SeriesPoint,
  type StepInfo,
  type Task,
} from "./types.ts";

export type RunOptions = {
  seed?: number;
  rounds?: number;
  tokenBudget?: number;
  mode?: Mode;
  scope?: RunScope;
  tasks?: Task[];
  paceMs?: number;
  onFixer?: (view: FixerView) => void;
  onRound?: (info: StepInfo) => void;
  onProgress?: (result: ComparisonResult) => void;
};

type Measured = {
  passed: number;
  avgTokens: number;
  logs: TaskRun[];
};

export async function runComparison(options: RunOptions = {}): Promise<ComparisonResult> {
  const seed = options.seed ?? 1;
  const rounds = options.rounds ?? 10;
  const tokenBudget = options.tokenBudget ?? 500;
  const mode = options.mode ?? "mock";
  const scope = options.scope ?? "compare";
  const tasks = options.tasks ?? TASKS;
  const sources = await readSeed();
  const model = mode === "real" ? realModel() : mockModel(sources);
  const result: ComparisonResult = {
    modelLabel: mode === "real" ? MODEL_LABEL.real : model.label,
    mode,
    seed,
    rounds,
    tokenBudget,
    scope,
    oneFile: null,
    rewriteAll: null,
    phase: "starting",
  };

  if (scope !== "rewrite-all") {
    result.phase = "one-file";
    result.oneFile = await runCondition("one-file", {
      ...options,
      seed,
      rounds,
      tokenBudget,
      tasks,
      sources,
      model,
      result,
    });
  }
  if (scope !== "one-file") {
    result.phase = "rewrite-all";
    result.rewriteAll = await runCondition("rewrite-all", {
      ...options,
      seed,
      rounds,
      tokenBudget,
      tasks,
      sources,
      model,
      result,
    });
  }
  result.phase = "done";
  options.onProgress?.(cloneResult(result));
  return result;
}

async function runCondition(
  optimizer: OptimizerMode,
  options: RunOptions & {
    seed: number;
    rounds: number;
    tokenBudget: number;
    tasks: Task[];
    sources: HarnessSources;
    model: Model;
    result: ComparisonResult;
  },
): Promise<ConditionResult> {
  const train = tasksBySplit(options.tasks, "train");
  const heldout = tasksBySplit(options.tasks, "heldout");
  let sources = { ...options.sources };
  const history: FixerHistoryItem[] = [];
  const rounds: RoundRecord[] = [];
  const baseline = await measure(sources, heldout, options.model);
  const series: SeriesPoint[] = [
    {
      round: 0,
      heldoutPassed: baseline.passed,
      heldoutTotal: heldout.length,
      avgTokens: baseline.avgTokens,
    },
  ];
  let current: ConditionResult = {
    optimizer,
    rounds,
    series,
    harness: sources,
    accepted: 0,
    rejected: 0,
  };
  publish(options, current);
  options.onProgress?.(cloneResult(options.result));

  for (let round = 1; round <= options.rounds; round += 1) {
    options.result.phase = `${optimizer} round ${round}`;
    const trainLogs = await measure(sources, train, options.model);
    const view: FixerView = {
      round,
      optimizer,
      seed: options.seed,
      trainLogs: toFixerLogs(trainLogs.logs),
      history: history.map((item) => ({ ...item })),
      sources: { ...sources },
    };
    options.onFixer?.(view);
    const proposal = await options.model.propose(view);
    const proposed =
      optimizer === "one-file" ? enforceOneFile(sources, proposal) : { ...proposal.sources };
    const changed = changedFiles(sources, proposed);
    let accepted = false;
    let reason = "";
    let after = baselineOf(baseline);
    if (changed.length === 0) {
      reason = "patch did not change the harness";
      after = { passed: baseline.passed, avgTokens: baseline.avgTokens };
    } else {
      try {
        const candidate = await measure(proposed, heldout, options.model);
        after = { passed: candidate.passed, avgTokens: candidate.avgTokens };
        const decision = gate(baseline.passed, baseline.avgTokens, candidate.passed, candidate.avgTokens, options.tokenBudget);
        accepted = decision.accepted;
        reason = decision.reason;
      } catch (error) {
        if (!(error instanceof HarnessLoadError)) throw error;
        reason = "harness failed to load";
        after = { passed: 0, avgTokens: baseline.avgTokens };
      }
    }
    const beforeSources = { ...sources };
    if (accepted) {
      sources = proposed;
      baseline.passed = after.passed;
      baseline.avgTokens = after.avgTokens;
      current.accepted += 1;
    } else {
      current.rejected += 1;
    }
    const keptTokens = baseline.avgTokens;
    history.push({
      round,
      patchId: proposal.patchId,
      file: optimizer === "one-file" ? (changed[0] ?? proposal.file) : "all",
      accepted,
      reason,
    });
    rounds.push({
      round,
      optimizer,
      file: fileLabel(optimizer, proposal.file, changed),
      patchId: proposal.patchId,
      summary: proposal.summary,
      diff: harnessDiff(beforeSources, proposed),
      scoreBefore: series.at(-1)?.heldoutPassed ?? baseline.passed,
      scoreAfter: after.passed,
      heldoutTotal: heldout.length,
      tokensBefore: series.at(-1)?.avgTokens ?? baseline.avgTokens,
      tokensAfter: after.avgTokens,
      keptTokens,
      accepted,
      reason,
      trainSignatures: countSignatures(trainLogs.logs),
    });
    series.push({
      round,
      heldoutPassed: baseline.passed,
      heldoutTotal: heldout.length,
      avgTokens: keptTokens,
    });
    current = {
      optimizer,
      rounds: [...rounds],
      series: [...series],
      harness: { ...sources },
      accepted: current.accepted,
      rejected: current.rejected,
    };
    options.onRound?.({
      optimizer,
      before: beforeSources,
      proposed,
      after: { ...sources },
      accepted,
    });
    publish(options, current);
    options.onProgress?.(cloneResult(options.result));
    if (options.paceMs && options.paceMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.paceMs));
    }
  }
  return current;
}

function publish(
  options: { result: ComparisonResult },
  current: ConditionResult,
): void {
  if (current.optimizer === "one-file") options.result.oneFile = current;
  if (current.optimizer === "rewrite-all") options.result.rewriteAll = current;
}

function enforceOneFile(before: HarnessSources, proposal: Proposal): HarnessSources {
  const file: HarnessFile = proposal.file === "all" ? "memory" : proposal.file;
  return { ...before, [file]: proposal.sources[file] };
}

function fileLabel(
  optimizer: OptimizerMode,
  proposed: Proposal["file"],
  changed: HarnessFile[],
): HarnessFile | "all" {
  if (optimizer === "rewrite-all") return "all";
  if (proposed !== "all") return proposed;
  return changed[0] ?? "memory";
}

function gate(
  scoreBefore: number,
  tokensBefore: number,
  scoreAfter: number,
  tokensAfter: number,
  budget: number,
): { accepted: boolean; reason: string } {
  const scoreOk = scoreAfter >= scoreBefore;
  const tokensOk = tokensAfter <= budget;
  void tokensBefore;
  if (scoreOk && tokensOk) return { accepted: true, reason: "held-out score held and tokens stayed within budget" };
  if (!scoreOk && !tokensOk) {
    return { accepted: false, reason: "held-out score dropped and average tokens exceeded the budget" };
  }
  if (!scoreOk) return { accepted: false, reason: "held-out score dropped" };
  return { accepted: false, reason: "average tokens exceeded the budget" };
}

async function measure(sources: HarnessSources, tasks: Task[], model: Model): Promise<Measured> {
  const logs = await runTasks(sources, tasks, model);
  const passed = logs.filter((log) => log.passed).length;
  const avgTokens =
    logs.length === 0 ? 0 : Math.round(logs.reduce((sum, log) => sum + log.tokens, 0) / logs.length);
  return { passed, avgTokens, logs };
}

function baselineOf(measured: Measured): { passed: number; avgTokens: number } {
  return { passed: measured.passed, avgTokens: measured.avgTokens };
}

function toFixerLogs(logs: TaskRun[]): FixerLog[] {
  return logs.map((log) => ({
    id: log.id,
    title: log.title,
    passed: log.passed,
    events: log.events,
    tokens: log.tokens,
    signatures: log.signatures,
  }));
}

function countSignatures(logs: TaskRun[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (log.passed) continue;
    for (const name of log.signatures) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

function cloneResult(result: ComparisonResult): ComparisonResult {
  return structuredClone(result);
}
