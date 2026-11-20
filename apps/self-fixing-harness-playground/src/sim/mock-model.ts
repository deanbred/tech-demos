import { applyPatch, rewriteSources, type PatchId } from "./patches.ts";
import type { AgentView, Model } from "./runner.ts";
import { MODEL_LABEL, type FixerLog, type FixerView, type HarnessSources, type Proposal } from "./types.ts";

export const CONFUSED_AT = 260;

type MockAction = { tool: "read" } | { tool: "edit"; body: string } | { tool: "test" } | { tool: "finish" };

export function mockAction(view: AgentView): MockAction {
  const confused = view.contextTokens > CONFUSED_AT;
  const repeatBlocked = view.breakRepeats && view.previousAction === "read";
  if (confused && !repeatBlocked) return { tool: "read" };
  if (!view.hasRead) return { tool: "read" };
  if (!view.edited && view.blockedFinishes === 0) return { tool: "finish" };
  if (!view.edited) {
    const body = view.task.kind === "easy" ? view.task.correct : view.task.wrong;
    return { tool: "edit", body };
  }
  if (view.finishBlockedAfterEdit && !view.tested) return { tool: "test" };
  if (
    view.tested &&
    !view.testsPassed &&
    view.task.kind !== "impossible" &&
    view.contextText.includes("Expected")
  ) {
    return { tool: "edit", body: view.task.correct };
  }
  return { tool: "finish" };
}

export function choosePatch(view: FixerView): PatchId {
  const accepted = new Set(view.history.filter((item) => item.accepted).map((item) => item.patchId));
  const rejected = view.history.filter((item) => !item.accepted);
  const counts = signatureCounts(view.trainLogs);
  if ((counts.premature_finish ?? 0) > 0 && !accepted.has("stop-empty")) return "stop-empty";
  const testsRejectedForTokens = rejected.some(
    (item) => item.patchId === "stop-tests" && item.reason.toLowerCase().includes("token"),
  );
  if ((counts.untested_exit ?? 0) > 0 && testsRejectedForTokens && !accepted.has("truncate")) {
    return "truncate";
  }
  if ((counts.untested_exit ?? 0) > 0 && !accepted.has("stop-tests")) return "stop-tests";
  if (accepted.has("stop-tests") && !accepted.has("compress")) return "compress";
  if (accepted.has("compress") && !accepted.has("loop-debug") && !rejected.some((item) => item.patchId === "loop-debug")) {
    return "loop-debug";
  }
  if (rejected.some((item) => item.patchId === "loop-debug") && !accepted.has("window-read")) return "window-read";
  if (accepted.has("window-read") && !accepted.has("status-footer")) return "status-footer";
  if (
    accepted.has("status-footer") &&
    !accepted.has("over-truncate") &&
    !rejected.some((item) => item.patchId === "over-truncate")
  ) {
    return "over-truncate";
  }
  if (rejected.some((item) => item.patchId === "over-truncate") && !accepted.has("tighter-notes")) {
    return "tighter-notes";
  }
  return "repeat-breaker";
}

function signatureCounts(logs: FixerLog[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    if (log.passed) continue;
    for (const name of log.signatures) counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}

export function mockModel(seedSources: HarnessSources): Model {
  return {
    label: MODEL_LABEL.mock,
    act(view) {
      return Promise.resolve(JSON.stringify(mockAction(view)));
    },
    propose(view) {
      if (view.optimizer === "rewrite-all") {
        const proposal: Proposal = {
          patchId: `rewrite-${view.round}`,
          summary:
            "Rewrite all four files at once: stricter stop checks, a longer loop, and a debug trace, without compacting history or truncating terminal output.",
          file: "all",
          sources: rewriteSources(seedSources, view.round),
        };
        return Promise.resolve(proposal);
      }
      const patchId = choosePatch(view);
      const applied = applyPatch(view.sources, patchId);
      const proposal: Proposal = { patchId, ...applied };
      return Promise.resolve(proposal);
    },
  };
}
