/** Shared types for the SIM playground. Safe to import from the UI. */

export type Mode = "mock" | "real";

export type Condition = "sim" | "no-ledger";

export const DOMAIN = "coding_playground";

export const BENCHMARK = "playground-v1";

/** Shown on every results surface. Mock is the default and never looks like a real run. */
export const MODEL_LABEL: Record<Mode, string> = {
  mock: "Mock model (simulated)",
  real: "Real model",
};

/**
 * One attempt, matching Figure 8 of arXiv 2611.18856:
 * {round, sample, accepted, backfilled, what, files, predicted, fixed, missed, passed, total, domain}.
 * `evaluation_context` is the paper's provenance (benchmark, policy) plus the train tasks
 * that were failing before the attempt — the "new evidence" the retry rule checks.
 */
export type Attempt = {
  round: number;
  sample: string;
  accepted: boolean;
  backfilled: boolean;
  what: string;
  files: string;
  predicted: string[];
  fixed: string[];
  missed: string[];
  passed: number;
  total: number;
  domain: string;
  evaluation_context: {
    benchmark: string;
    policy: string;
    split: "train";
    failing: string[];
  };
};

/** Problem entry from Figure 8: {id, name, opened_round, attempts[]}. */
export type ProblemEntry = {
  id: string;
  name: string;
  opened_round: number;
  attempts: Attempt[];
};

export type CandidateRecord = Attempt & {
  problem_name: string;
  /** Set once the problem has an accepted attempt. Rejected-only hypotheses stay null. */
  problem_id: string | null;
};

export type RoundLog = {
  round: number;
  failing_before: string[];
  candidates: CandidateRecord[];
  accepted_problem_id: string | null;
};

/**
 * Ledger file written to sim-ledger.json (SIM) and baseline-ledger.json (no ledger).
 * `problems` follows the paper: only the selected edit is appended.
 * `rounds` also keeps rejected candidates so the viewer can show accepted vs rejected.
 */
export type Ledger = {
  condition: Condition;
  seed: number;
  domain: string;
  problems: ProblemEntry[];
  rounds: RoundLog[];
};

export type SeriesPoint = {
  round: number;
  trainPassed: number;
  trainTotal: number;
  heldoutPassed: number;
  heldoutTotal: number;
};

export type ConditionResult = {
  condition: Condition;
  ledger: Ledger;
  series: SeriesPoint[];
};

export type ComparisonResult = {
  seed: number;
  rounds: number;
  candidates: number;
  mode: Mode;
  modelLabel: string;
  sim: ConditionResult;
  baseline: ConditionResult;
};

export type PublicTask = {
  id: string;
  split: "train" | "heldout";
  title: string;
  signature: string;
  prompt: string;
};

export type Harness = {
  patchIds: string[];
  prompt: string;
  tools: string[];
};

export type Proposal = {
  id: string;
  problemName: string;
  what: string;
  files: string;
  /** Train task ids the editor expects this edit to fix. Recorded before evaluation. */
  predicts: string[];
  tools: string[];
};

export type TrainFeedback = {
  id: string;
  passed: boolean;
};

/** What the editor is allowed to see. Held-out scores are never included. */
export type EditorInput = {
  condition: Condition;
  round: number;
  seed: number;
  k: number;
  mode: Mode;
  harness: Harness;
  train: TrainFeedback[];
  /** Full ledger for SIM. Null for the no-ledger baseline, which sees only `train`. */
  ledger: Ledger | null;
  tasks: PublicTask[];
};
