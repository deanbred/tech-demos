import { describe, expect, test } from "bun:test";

import { changedFiles } from "./diff.ts";
import { runComparison, type RunOptions } from "./optimize.ts";
import { TASKS, tasksBySplit } from "./tasks.ts";
import { HARNESS_FILES, type FixerView, type StepInfo } from "./types.ts";

const HELD_OUT_IDS = tasksBySplit(TASKS, "heldout").map((task) => task.id);

describe("mock self-fixing harness", () => {
  test(
    "a fixed seed is deterministic, one-file rounds touch one file, rejections revert, and the fixer never sees held-out logs",
    async () => {
      const seen: FixerView[] = [];
      const steps: StepInfo[] = [];
      const options: RunOptions = {
        seed: 3,
        rounds: 10,
        tokenBudget: 500,
        mode: "mock",
        scope: "compare",
        paceMs: 0,
        onFixer: (view) => seen.push(structuredClone(view)),
        onRound: (info) => steps.push(structuredClone(info)),
      };
      const first = await runComparison(options);
      const second = await runComparison({ seed: 3, rounds: 10, tokenBudget: 500, mode: "mock", scope: "compare" });

      expect(JSON.stringify(first.oneFile)).toBe(JSON.stringify(second.oneFile));
      expect(JSON.stringify(first.rewriteAll)).toBe(JSON.stringify(second.rewriteAll));
      expect(first.modelLabel).toBe("Mock model (simulated)");

      const oneFileSteps = steps.filter((step) => step.optimizer === "one-file");
      expect(oneFileSteps.length).toBe(10);
      for (const step of oneFileSteps) {
        expect(changedFiles(step.before, step.proposed)).toHaveLength(1);
        if (step.accepted) expect(step.after).toEqual(step.proposed);
        else expect(step.after).toEqual(step.before);
      }

      const rewriteSteps = steps.filter((step) => step.optimizer === "rewrite-all");
      for (const step of rewriteSteps) {
        expect(changedFiles(step.before, step.proposed).length).toBe(HARNESS_FILES.length);
        expect(step.accepted).toBe(false);
        expect(step.after).toEqual(step.before);
      }

      expect(first.oneFile?.rounds.map((round) => round.patchId)).toEqual([
        "stop-empty",
        "stop-tests",
        "truncate",
        "stop-tests",
        "compress",
        "loop-debug",
        "window-read",
        "status-footer",
        "over-truncate",
        "tighter-notes",
      ]);
      expect(first.oneFile?.rounds.map((round) => round.accepted)).toEqual([
        true,
        false,
        true,
        true,
        true,
        false,
        true,
        true,
        false,
        true,
      ]);

      const seedScore = first.oneFile?.series[0]?.heldoutPassed ?? 0;
      const finalScore = first.oneFile?.series.at(-1)?.heldoutPassed ?? 0;
      expect(finalScore).toBeGreaterThan(seedScore);
      expect(first.rewriteAll?.series.at(-1)?.heldoutPassed).toBe(first.rewriteAll?.series[0]?.heldoutPassed);

      for (const view of seen) {
        const blob = JSON.stringify(view);
        for (const id of HELD_OUT_IDS) expect(blob.includes(`"${id}"`)).toBe(false);
        expect(view.trainLogs.every((log) => log.id.startsWith("t"))).toBe(true);
      }

      const corrupted = TASKS.map((task) =>
        task.split === "heldout"
          ? { ...task, cases: task.cases.map((testCase) => ({ ...testCase, expected: "CORRUPT" })) }
          : task,
      );
      const blindedViews: FixerView[] = [];
      await runComparison({
        seed: 3,
        rounds: 1,
        tokenBudget: 500,
        mode: "mock",
        scope: "one-file",
        tasks: corrupted,
        onFixer: (view) => blindedViews.push(view),
      });
      expect(blindedViews[0]?.trainLogs.map((log) => log.id)).toEqual(seen.filter((view) => view.optimizer === "one-file")[0]?.trainLogs.map((log) => log.id));
      expect(JSON.stringify(blindedViews[0]?.trainLogs)).toBe(
        JSON.stringify(seen.filter((view) => view.optimizer === "one-file")[0]?.trainLogs),
      );
    },
    60_000,
  );
});
