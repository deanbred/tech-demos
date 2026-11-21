import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { RoundRecord } from "@/sim/types";

const chartConfig = {
  oneFile: { label: "One file", color: "oklch(0.45 0.16 262)" },
  rewriteAll: { label: "Rewrite all", color: "oklch(0.58 0.14 45)" },
} satisfies ChartConfig;

export function TokenChart({
  oneFile,
  rewriteAll,
}: {
  oneFile: RoundRecord[];
  rewriteAll: RoundRecord[];
}) {
  const rounds = new Set([
    ...oneFile.map((round) => round.round),
    ...rewriteAll.map((round) => round.round),
  ]);
  const data = [...rounds]
    .sort((a, b) => a - b)
    .map((round) => ({
      round: String(round),
      oneFile: oneFile.find((item) => item.round === round)?.tokensAfter ?? null,
      rewriteAll: rewriteAll.find((item) => item.round === round)?.tokensAfter ?? null,
    }));

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Candidate token cost shows up here after the first patch is scored.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-[2.1/1] w-full">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="round" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis width={48} tickLine={false} axisLine={false} tickFormatter={compact} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="oneFile" fill="var(--color-oneFile)" radius={3} />
        <Bar dataKey="rewriteAll" fill="var(--color-rewriteAll)" radius={3} />
      </BarChart>
    </ChartContainer>
  );
}

function compact(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}
