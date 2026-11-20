import type { ConditionResult } from "@/sim/types";

export function Scoreboard({
  oneFile,
  rewriteAll,
}: {
  oneFile: ConditionResult | null;
  rewriteAll: ConditionResult | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="py-2 pr-3 font-medium">
              Mode
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Held-out passed
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Kept tokens
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Kept
            </th>
            <th scope="col" className="py-2 font-medium">
              Rejected
            </th>
          </tr>
        </thead>
        <tbody>
          <Row label="One file" result={oneFile} />
          <Row label="Rewrite all" result={rewriteAll} />
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, result }: { label: string; result: ConditionResult | null }) {
  const last = result?.series.at(-1);
  return (
    <tr className="border-b last:border-0">
      <th scope="row" className="py-2 pr-3 text-left font-medium">
        {label}
      </th>
      <td className="py-2 pr-3">{last ? `${last.heldoutPassed} / ${last.heldoutTotal}` : "—"}</td>
      <td className="py-2 pr-3">{last ? last.avgTokens : "—"}</td>
      <td className="py-2 pr-3">{result ? result.accepted : "—"}</td>
      <td className="py-2">{result ? result.rejected : "—"}</td>
    </tr>
  );
}
