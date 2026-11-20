export const HARNESS_FILES = ["memory", "loop", "tools", "stop"] as const;

export type HarnessFile = (typeof HARNESS_FILES)[number];

export type HarnessSources = Record<HarnessFile, string>;

export type TaskSplit = "train" | "heldout";

export type TaskKind = "easy" | "guided" | "impossible";

export type TaskCase = {
  args: unknown[];
  expected: unknown;
};

export type Task = {
  id: string;
  title: string;
  split: TaskSplit;
  kind: TaskKind;
  exportName: string;
  buggy: string;
  wrong: string;
  correct: string;
  cases: TaskCase[];
};

export type PublicTask = {
  id: string;
  title: string;
  split: TaskSplit;
  kind: TaskKind;
};

export type Mode = "mock" | "real";

export type OptimizerMode = "one-file" | "rewrite-all";

export type RunScope = "compare" | OptimizerMode;

export const MODEL_LABEL: Record<Mode, string> = {
  mock: "Mock model (simulated)",
  real: "Real model",
};

export const DEFAULT_ROUNDS = 10;
export const DEFAULT_SEED = 1;
export const DEFAULT_TOKEN_BUDGET = 500;

export type RoundRecord = {
  round: number;
  optimizer: OptimizerMode;
  file: HarnessFile | "all";
  patchId: string;
  summary: string;
  diff: string;
  scoreBefore: number;
  scoreAfter: number;
  heldoutTotal: number;
  tokensBefore: number;
  tokensAfter: number;
  keptTokens: number;
  accepted: boolean;
  reason: string;
  trainSignatures: { name: string; count: number }[];
};

export type SeriesPoint = {
  round: number;
  heldoutPassed: number;
  heldoutTotal: number;
  avgTokens: number;
};

export type ConditionResult = {
  optimizer: OptimizerMode;
  rounds: RoundRecord[];
  series: SeriesPoint[];
  harness: HarnessSources;
  accepted: number;
  rejected: number;
};

export type ComparisonResult = {
  modelLabel: string;
  mode: Mode;
  seed: number;
  rounds: number;
  tokenBudget: number;
  scope: RunScope;
  oneFile: ConditionResult | null;
  rewriteAll: ConditionResult | null;
  phase: string;
};

export type FixerLog = {
  id: string;
  title: string;
  passed: boolean;
  events: string[];
  tokens: number;
  signatures: string[];
};

export type FixerHistoryItem = {
  round: number;
  patchId: string;
  file: string;
  accepted: boolean;
  reason: string;
};

export type FixerView = {
  round: number;
  optimizer: OptimizerMode;
  seed: number;
  trainLogs: FixerLog[];
  history: FixerHistoryItem[];
  sources: HarnessSources;
};

export type Proposal = {
  patchId: string;
  summary: string;
  file: HarnessFile | "all";
  sources: HarnessSources;
};

export type StepInfo = {
  optimizer: OptimizerMode;
  before: HarnessSources;
  proposed: HarnessSources;
  after: HarnessSources;
  accepted: boolean;
};
