import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Ledger } from "@/sim/types";

export function LedgerTable({ ledger }: { ledger: Ledger }) {
  const scroller = useRef<HTMLDivElement>(null);
  const rows = ledger.rounds.flatMap((round) => round.candidates);
  const count = rows.length;

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [count]);

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No edits yet. Each round adds one row per candidate, with predicted tasks recorded before the tests run.
      </p>
    );
  }

  return (
    <div ref={scroller} className="max-h-96 overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Round</TableHead>
            <TableHead>Problem</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Predicted vs observed</TableHead>
            <TableHead className="w-20">Train</TableHead>
            <TableHead className="w-24">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const differs = row.missed.length > 0 || row.fixed.length !== row.predicted.length;
            return (
              <TableRow
                key={`${row.round}-${row.sample}-${row.what}`}
                className={differs ? "bg-destructive/5" : undefined}
              >
                <TableCell className="text-muted-foreground tabular-nums">
                  {row.round}
                  <span className="block text-xs">{row.sample}</span>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{row.problem_name}</div>
                  <div className="text-muted-foreground text-xs">
                    {row.problem_id ?? "not opened"}
                  </div>
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal">
                  <div>{row.what}</div>
                  <div className="text-muted-foreground text-xs">{row.files}</div>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-wrap gap-1">
                    {row.predicted.length === 0 ? (
                      <span className="text-muted-foreground text-xs">nothing predicted</span>
                    ) : (
                      row.predicted.map((id) => (
                        <Badge
                          key={id}
                          variant={row.missed.includes(id) ? "destructive" : "secondary"}
                        >
                          {id}
                          {row.missed.includes(id) ? " missed" : " fixed"}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.passed}/{row.total}
                </TableCell>
                <TableCell>
                  <Badge variant={row.accepted ? "default" : "outline"}>
                    {row.accepted ? "accepted" : "rejected"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
