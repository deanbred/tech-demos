import { PATCHES } from "./patches.ts";
import { retryBlocked } from "./retry.ts";
import type { EditorInput, Proposal } from "./types.ts";

/**
 * Deterministic stand-in for the paper's proposer.
 * It ranks harness edits by how many currently failing train tasks they predict
 * they will fix, drops directions the retry rule blocks, and returns k of them.
 * It does not read held-out scores: those are not on EditorInput.
 */
export function proposeMock(input: EditorInput): Proposal[] {
  const failing = new Set(input.train.filter((row) => !row.passed).map((row) => row.id));
  const failingNow = [...failing];
  const applied = new Set(input.harness.patchIds);
  const available = PATCHES.filter((patch) => !applied.has(patch.id)).filter(
    (patch) => !retryBlocked(input.ledger, patch.what, failingNow),
  );
  available.sort((a, b) => {
    const overlapA = a.predicts.filter((id) => failing.has(id)).length;
    const overlapB = b.predicts.filter((id) => failing.has(id)).length;
    if (overlapB !== overlapA) return overlapB - overlapA;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  return available.slice(0, input.k).map((patch) => ({
    id: patch.id,
    problemName: patch.problemName,
    what: patch.what,
    files: patch.files,
    predicts: patch.predicts.filter((id) => failing.has(id)),
    tools: [...patch.tools],
  }));
}
