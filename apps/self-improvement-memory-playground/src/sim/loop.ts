import path from "node:path";

import { proposeMock } from "./mock-model.ts";
import { applyPatch, initialHarness } from "./patches.ts";
import { proposeReal, realSolve } from "./real-model.ts";
import { renderMockSolution, scoreSource } from "./runner.ts";
import { publicTasks, tasksBySplit, TASKS, type Task } from "./tasks.ts";
import {
  BENCHMARK,
  DOMAIN,
  MODEL_LABEL,
  type Attempt,
  type ComparisonResult,
  type Condition,
  type ConditionResult,
  type EditorInput,
  type Harness,
  type Ledger,
  type Mode,
  type ProblemEntry,
  type SeriesPoint,
} from "./types.ts";

export type RunOptions = {
  seed?: number;
  rounds?: number;
  candidates?: number;
  mode?: Mode;
  tasks?: Task[];
  /** When set, writes sim-ledger.json and baseline-ledger.json into this directory. */
  ledgerDir?: string;
  onEditor?: (input: EditorInput) => void;
  onProgress?: (result: ComparisonResult) => void;
  /** Pause after each published update so a UI can show the ledger filling in. Tests leave this at 0. */
  stepDelayMs?: number;
};

const CONDITIONS: Condition[] = ["sim", "no-ledger"];

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function emptyLedger(condition: Condition, seed: number): Ledger {
  return {
    condition,
    seed,
    domain: DOMAIN,
    problems: [],
    rounds: [],
  };
}

function emptyResult(
  condition: Condition,
  seed: number,
): ConditionResult {
  return { condition, ledger: emptyLedger(condition, seed), series: [] };
}

async function solveSource(mode: Mode, tasks: Task[], harness: Harness): Promise<string> {
  if (mode === "mock") return renderMockSolution(tasks, harness);
  return realSolve(tasks, harness);
}

async function scoreSplit(mode: Mode, tasks: Task[], harness: Harness) {
  const source = await solveSource(mode, tasks, harness);
  return scoreSource(source, tasks);
}

function passedCount(scores: { passed: boolean }[]): number {
  return scores.filter((row) => row.passed).length;
}

function rememberAccepted(
  problems: ProblemEntry[],
  problemName: string,
  round: number,
  attempt: Attempt,
): string {
  let entry = problems.find((problem) => problem.name === problemName);
  if (!entry) {
    entry = {
      id: `P${problems.length + 1}`,
      name: problemName,
      opened_round: round,
      attempts: [],
    };
    problems.push(entry);
  }
  entry.attempts.push(attempt);
  return entry.id;
}

export async function runComparison(options: RunOptions = {}): Promise<ComparisonResult> {
  const seed = clampInt(options.seed, 1, 0, 1_000_000);
  const rounds = clampInt(options.rounds, 10, 1, 20);
  const candidates = clampInt(options.candidates, 5, 1, 8);
  const mode: Mode = options.mode === "real" ? "real" : "mock";
  const tasks = options.tasks ?? TASKS;
  const train = tasksBySplit(tasks, "train");
  const heldout = tasksBySplit(tasks, "heldout");
  const trainPublic = publicTasks(train);
  const policy = mode === "mock" ? "mock-simulated" : "real-model";

  const result: ComparisonResult = {
    seed,
    rounds,
    candidates,
    mode,
    modelLabel: MODEL_LABEL[mode],
    sim: emptyResult("sim", seed),
    baseline: emptyResult("no-ledger", seed),
  };
  const harnesses: Record<Condition, Harness> = {
    sim: initialHarness(),
    "no-ledger": initialHarness(),
  };
  const trainState: Record<Condition, { id: string; passed: boolean }[]> = {
    sim: [],
    "no-ledger": [],
  };

  const publish = async () => {
    if (options.ledgerDir) await writeLedgers(options.ledgerDir, result);
    options.onProgress?.(result);
    if (options.stepDelayMs && options.stepDelayMs > 0) {
      await Bun.sleep(options.stepDelayMs);
    }
  };

  for (const condition of CONDITIONS) {
    const scores = await scoreSplit(mode, train, harnesses[condition]);
    const held = await scoreSplit(mode, heldout, harnesses[condition]);
    trainState[condition] = scores.map((row) => ({ id: row.id, passed: row.passed }));
    result[condition === "sim" ? "sim" : "baseline"].series.push(
      point(0, scores, held, train.length, heldout.length),
    );
  }
  await publish();

  for (let round = 1; round <= rounds; round++) {
    for (const condition of CONDITIONS) {
      const bucket = condition === "sim" ? result.sim : result.baseline;
      const failing = trainState[condition].filter((row) => !row.passed).map((row) => row.id);
      const failingSet = new Set(failing);
      const trainIds = new Set(train.map((task) => task.id));
      const editorInput: EditorInput = {
        condition,
        round,
        seed,
        k: candidates,
        mode,
        harness: structuredClone(harnesses[condition]),
        train: trainState[condition].map((row) => ({ ...row })),
        ledger: condition === "sim" ? structuredClone(bucket.ledger) : null,
        tasks: trainPublic.map((task) => ({ ...task })),
      };
      options.onEditor?.(editorInput);
      const proposals =
        mode === "mock" ? proposeMock(editorInput) : await proposeReal(editorInput);

      const evaluated = await Promise.all(
        proposals.map(async (proposal, index) => {
          const predicted = proposal.predicts.filter(
            (id) => trainIds.has(id) && failingSet.has(id),
          );
          const next = applyPatch(harnesses[condition], proposal);
          const scores = await scoreSplit(mode, train, next);
          const passedIds = new Set(scores.filter((row) => row.passed).map((row) => row.id));
          const attempt: Attempt = {
            round,
            sample: `s${index + 1}`,
            accepted: false,
            backfilled: false,
            what: proposal.what,
            files: proposal.files,
            predicted,
            fixed: predicted.filter((id) => passedIds.has(id)),
            missed: predicted.filter((id) => !passedIds.has(id)),
            passed: passedCount(scores),
            total: train.length,
            domain: DOMAIN,
            evaluation_context: {
              benchmark: BENCHMARK,
              policy,
              split: "train",
              failing: [...failing],
            },
          };
          return { proposal, next, scores, attempt };
        }),
      );

      const currentPassed = train.length - failing.length;
      let bestIndex = -1;
      let bestPassed = currentPassed;
      for (let index = 0; index < evaluated.length; index++) {
        const row = evaluated[index];
        if (!row) continue;
        if (row.attempt.passed > bestPassed) {
          bestPassed = row.attempt.passed;
          bestIndex = index;
        }
      }

      let acceptedProblemId: string | null = null;
      if (bestIndex >= 0) {
        const chosen = evaluated[bestIndex];
        if (chosen) {
          chosen.attempt.accepted = true;
          acceptedProblemId = rememberAccepted(
            bucket.ledger.problems,
            chosen.proposal.problemName,
            round,
            chosen.attempt,
          );
          harnesses[condition] = chosen.next;
          trainState[condition] = chosen.scores.map((row) => ({ id: row.id, passed: row.passed }));
        }
      }

      const knownIds = new Map(bucket.ledger.problems.map((problem) => [problem.name, problem.id]));
      bucket.ledger.rounds.push({
        round,
        failing_before: failing,
        accepted_problem_id: acceptedProblemId,
        candidates: evaluated.map((row) => ({
          ...row.attempt,
          problem_name: row.proposal.problemName,
          problem_id: knownIds.get(row.proposal.problemName) ?? null,
        })),
      });

      const held = await scoreSplit(mode, heldout, harnesses[condition]);
      const trainScores = trainState[condition];
      bucket.series.push({
        round,
        trainPassed: trainScores.filter((row) => row.passed).length,
        trainTotal: train.length,
        heldoutPassed: passedCount(held),
        heldoutTotal: heldout.length,
      });
      await publish();
    }
  }

  await publish();
  return result;
}

function point(
  round: number,
  trainScores: { passed: boolean }[],
  heldScores: { passed: boolean }[],
  trainTotal: number,
  heldTotal: number,
): SeriesPoint {
  return {
    round,
    trainPassed: passedCount(trainScores),
    trainTotal,
    heldoutPassed: passedCount(heldScores),
    heldoutTotal: heldTotal,
  };
}

async function writeLedgers(dir: string, result: ComparisonResult): Promise<void> {
  await Bun.write(path.join(dir, "sim-ledger.json"), `${JSON.stringify(result.sim.ledger, null, 2)}\n`);
  await Bun.write(
    path.join(dir, "baseline-ledger.json"),
    `${JSON.stringify(result.baseline.ledger, null, 2)}\n`,
  );
}

export function ledgerDecisions(ledger: Ledger): { round: number; what: string; accepted: boolean }[] {
  return ledger.rounds.flatMap((round) =>
    round.candidates.map((candidate) => ({
      round: round.round,
      what: candidate.what,
      accepted: candidate.accepted,
    })),
  );
}
