import type { Ledger } from "./types.ts";

/**
 * Paper guideline 6: revisit a tested direction only when new evidence justifies it.
 * A direction is the attempt's `what`.
 * If the last attempt fixed at least one predicted task, it stays eligible: another
 * edit won that round, which is not evidence against this one.
 * If it missed every prediction, it is blocked until a train task fails now that
 * was not failing when it was tried. Tasks that started passing are not a reason
 * to retry an idea that already missed.
 * With a null ledger (no-ledger condition) nothing is blocked.
 */
export function retryBlocked(ledger: Ledger | null, what: string, failingNow: readonly string[]): boolean {
  if (!ledger) return false;
  let last: { failing: string[]; fixed: string[] } | null = null;
  for (const round of ledger.rounds) {
    for (const candidate of round.candidates) {
      if (candidate.what === what) {
        last = { failing: candidate.evaluation_context.failing, fixed: candidate.fixed };
      }
    }
  }
  if (!last) return false;
  if (last.fixed.length > 0) return false;
  const then = new Set(last.failing);
  for (const id of failingNow) {
    if (!then.has(id)) return false;
  }
  return true;
}
