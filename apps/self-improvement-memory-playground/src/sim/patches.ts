import type { Proposal } from "./types.ts";

export type Patch = Proposal & {
  /** Task ids the mock solver actually implements correctly once this patch is applied. */
  fixes: string[];
  /** Overconfident edits: high predicted overlap, no effect on the code that runs. */
  decoy: boolean;
};

/**
 * Editor action space for the mock model.
 * `predicts` lists train tasks only. Held-out ids appear in `fixes` so a train-motivated
 * lesson can transfer, but the editor never receives held-out scores.
 * Decoys predict more failing tasks than any real lesson, so a memory-less editor
 * fills its candidate budget with them.
 */
export const PATCHES: Patch[] = [
  {
    id: "comments",
    problemName: "missing explanatory comments",
    what: "Add a block comment above every function that restates the signature.",
    files: "prompt.md",
    predicts: ["sum", "mean", "median", "clamp", "range", "chunk"],
    tools: [],
    fixes: [],
    decoy: true,
  },
  {
    id: "logging",
    problemName: "missing trace logging",
    what: "Log each argument and return value with console.log before returning.",
    files: "prompt.md",
    predicts: ["sum", "mean", "clamp", "unique", "zip", "flatten"],
    tools: [],
    fixes: [],
    decoy: true,
  },
  {
    id: "rename",
    problemName: "unclear local names",
    what: "Rename every local to a single letter so the function body is shorter.",
    files: "prompt.md",
    predicts: ["unique", "groupBy", "zip", "flatten", "clamp", "range"],
    tools: [],
    fixes: [],
    decoy: true,
  },
  {
    id: "trycatch",
    problemName: "uncaught exceptions",
    what: "Wrap every function body in try/catch and return null on any throw.",
    files: "prompt.md",
    predicts: ["median", "chunk", "groupBy", "range", "zip", "sum"],
    tools: [],
    fixes: [],
    decoy: true,
  },
  {
    id: "typedefs",
    problemName: "missing type aliases",
    what: "Introduce a type alias for each parameter and leave the runtime behavior unchanged.",
    files: "prompt.md",
    predicts: ["flatten", "mean", "unique", "clamp", "chunk", "groupBy"],
    tools: [],
    fixes: [],
    decoy: true,
  },
  {
    id: "bounds",
    problemName: "off-by-one and swapped bounds",
    what: "Lesson: ranges are half-open, clamp swaps min and max when min > max, and chunk keeps a short tail. Enable the bounds tool.",
    files: "prompt.md, tools.json",
    predicts: ["clamp", "range", "chunk"],
    tools: ["bounds"],
    fixes: ["clamp", "range", "chunk", "clampIndex", "stepSum"],
    decoy: false,
  },
  {
    id: "numeric",
    problemName: "numeric aggregation on empty input",
    what: "Lesson: the sum of an empty list is 0, and the mean or median of an empty list is null. Enable the numeric tool.",
    files: "prompt.md, tools.json",
    predicts: ["sum", "mean", "median"],
    tools: ["numeric"],
    fixes: ["sum", "mean", "median", "sumAll", "average"],
    decoy: false,
  },
  {
    id: "order",
    problemName: "unstable first-seen order",
    what: "Lesson: keep the first-seen order, stop zip at the shorter list, and do not sort keys or members. Enable the order tool.",
    files: "prompt.md, tools.json",
    predicts: ["unique", "groupBy", "zip"],
    tools: ["order"],
    fixes: ["unique", "groupBy", "zip", "intersection", "difference", "firstWins", "zipShort"],
    decoy: false,
  },
  {
    id: "nesting",
    problemName: "nested lists flattened too far",
    what: "Lesson: flatten exactly one level and leave inner lists intact.",
    files: "prompt.md",
    predicts: ["flatten"],
    tools: [],
    fixes: ["flatten", "flattenOnce"],
    decoy: false,
  },
];

/** movingAverage is correct only when both lessons are in the harness. */
const BOTH: Record<string, string[]> = {
  movingAverage: ["numeric", "bounds"],
};

export function isFixed(taskId: string, patchIds: readonly string[]): boolean {
  const have = new Set(patchIds);
  const both = BOTH[taskId];
  if (both) return both.every((id) => have.has(id));
  return PATCHES.some(
    (patch) => !patch.decoy && have.has(patch.id) && patch.fixes.includes(taskId),
  );
}

export function initialHarness(): {
  patchIds: string[];
  prompt: string;
  tools: string[];
} {
  return {
    patchIds: [],
    prompt:
      "Write each exported TypeScript function so it matches the requested behavior. Prefer straightforward code. Do not print anything.",
    tools: ["read-signature"],
  };
}

export function applyPatch(
  harness: { patchIds: string[]; prompt: string; tools: string[] },
  patch: Proposal,
): { patchIds: string[]; prompt: string; tools: string[] } {
  const tools = [...harness.tools];
  for (const tool of patch.tools) {
    if (!tools.includes(tool)) tools.push(tool);
  }
  return {
    patchIds: harness.patchIds.includes(patch.id)
      ? harness.patchIds
      : [...harness.patchIds, patch.id],
    prompt: `${harness.prompt}\n- ${patch.what}`,
    tools,
  };
}
