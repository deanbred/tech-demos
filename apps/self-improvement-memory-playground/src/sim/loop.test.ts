import { describe, expect, test } from "bun:test";

import { initialHarness } from "./patches.ts";
import { ledgerDecisions, runComparison } from "./loop.ts";
import { renderMockSolution, scoreSource } from "./runner.ts";
import { TASKS, tasksBySplit } from "./tasks.ts";
import type { EditorInput, Ledger } from "./types.ts";

const HELD_OUT_IDS = new Set(tasksBySplit(TASKS, "heldout").map((task) => task.id));

function decisions(ledger: Ledger) {
  return ledgerDecisions(ledger);
}

describe("mock SIM ledger loop", () => {
  test("buggy solutions fail and patched solutions pass in the sandbox", async () => {
    const empty = initialHarness();
    const full = {
      ...empty,
      patchIds: ["bounds", "numeric", "order", "nesting"],
    };
    const buggy = await scoreSource(renderMockSolution(TASKS, empty), TASKS);
    const fixed = await scoreSource(renderMockSolution(TASKS, full), TASKS);
    for (const row of buggy) expect(row.passed).toBe(false);
    for (const row of fixed) expect(row.passed).toBe(true);
  }, 30_000);

  test(
    "same seed writes the same ledger, records Figure 8 fields, and never shows held-out results to the editor",
    async () => {
      const seen: EditorInput[] = [];
      const first = await runComparison({
        seed: 3,
        rounds: 5,
        candidates: 5,
        mode: "mock",
        onEditor: (input) => seen.push(structuredClone(input)),
      });
      const second = await runComparison({
        seed: 3,
        rounds: 5,
        candidates: 5,
        mode: "mock",
      });

      expect(JSON.stringify(first.sim.ledger)).toBe(JSON.stringify(second.sim.ledger));
      expect(JSON.stringify(first.baseline.ledger)).toBe(JSON.stringify(second.baseline.ledger));
      expect(first.modelLabel).toBe("Mock model (simulated)");

      for (const problem of first.sim.ledger.problems) {
        expect(problem.id).toMatch(/^P\d+$/);
        expect(problem.name.length).toBeGreaterThan(0);
        expect(problem.opened_round).toBeGreaterThan(0);
        for (const attempt of problem.attempts) {
          expect(attempt.accepted).toBe(true);
          expect(attempt.backfilled).toBe(false);
          expect(attempt.domain).toBe("coding_playground");
          expect(attempt.total).toBe(10);
          expect(attempt.passed).toBeLessThanOrEqual(attempt.total);
          expect([...attempt.fixed, ...attempt.missed].sort()).toEqual([...attempt.predicted].sort());
          for (const id of [...attempt.predicted, ...attempt.evaluation_context.failing]) {
            expect(HELD_OUT_IDS.has(id)).toBe(false);
          }
        }
      }

      expect(first.sim.ledger.problems.length).toBeGreaterThan(0);
      const missedOnce = first.sim.ledger.rounds.flatMap((round) =>
        round.candidates.filter((candidate) => candidate.fixed.length === 0).map((candidate) => candidate.what),
      );
      expect(new Set(missedOnce).size).toBe(missedOnce.length);
      const baselineWhats = decisions(first.baseline.ledger).map((row) => row.what);
      const repeatedBaseline = baselineWhats.filter((what, index) => baselineWhats.indexOf(what) !== index);
      expect(repeatedBaseline.length).toBeGreaterThan(0);

      const lastSim = first.sim.series.at(-1);
      const lastBase = first.baseline.series.at(-1);
      expect(lastSim?.trainPassed).toBe(10);
      expect(lastSim?.heldoutPassed).toBe(10);
      expect(lastBase?.trainPassed).toBe(0);
      expect(lastBase?.heldoutPassed).toBe(0);

      for (const input of seen) {
        expect(input.tasks.every((task) => task.split === "train")).toBe(true);
        expect(input.train.every((row) => !HELD_OUT_IDS.has(row.id))).toBe(true);
        if (input.condition === "no-ledger") expect(input.ledger).toBeNull();
        if (input.condition === "sim") expect(input.ledger).not.toBeNull();
        const blob = JSON.stringify({ train: input.train, tasks: input.tasks, ledger: input.ledger });
        for (const id of HELD_OUT_IDS) expect(blob.includes(`"${id}"`)).toBe(false);
      }

      const corrupted = TASKS.map((task) =>
        task.split === "heldout"
          ? {
              ...task,
              cases: task.cases.map((testCase) => ({ ...testCase, expected: "CORRUPT" })),
            }
          : task,
      );
      const blinded = await runComparison({
        seed: 3,
        rounds: 5,
        candidates: 5,
        mode: "mock",
        tasks: corrupted,
      });
      expect(decisions(blinded.sim.ledger)).toEqual(decisions(first.sim.ledger));
      expect(decisions(blinded.baseline.ledger)).toEqual(decisions(first.baseline.ledger));
      expect(blinded.sim.series.at(-1)?.heldoutPassed).toBe(0);
      expect(first.sim.series.at(-1)?.heldoutPassed).toBe(10);
    },
    90_000,
  );
});
