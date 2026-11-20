import { Badge } from "@/components/ui/badge";
import type { RoundRecord } from "@/sim/types";
import { DiffView } from "@/ui/DiffView";

export function Timeline({ rounds }: { rounds: RoundRecord[] }) {
  if (rounds.length === 0) {
    return <p className="text-muted-foreground text-sm">Rounds appear here as the fixer proposes patches.</p>;
  }
  return (
    <ol className="flex flex-col gap-3">
      {rounds.map((round) => (
        <li key={round.round} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Round {round.round}</span>
            <Badge variant="outline">{round.file === "all" ? "all 4 files" : `${round.file}.ts`}</Badge>
            <Badge variant={round.accepted ? "secondary" : "destructive"}>
              {round.accepted ? "Kept" : "Rejected"}
            </Badge>
          </div>
          <p className="mt-2 text-sm">{round.summary}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Held-out {round.scoreBefore}/{round.heldoutTotal} → {round.scoreAfter}/{round.heldoutTotal}
            {" · "}
            tokens {round.tokensBefore} → {round.tokensAfter}
            {round.accepted ? "" : ` · kept ${round.keptTokens}`}
            {" · "}
            {round.reason}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm">Diff</summary>
            <div className="mt-2">
              <DiffView diff={round.diff} />
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}
