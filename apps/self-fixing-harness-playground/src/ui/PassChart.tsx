import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SeriesPoint } from "@/sim/types";

const chartConfig = {
  oneFile: { label: "One file", color: "oklch(0.45 0.16 262)" },
  rewriteAll: { label: "Rewrite all", color: "oklch(0.58 0.14 45)" },
} satisfies ChartConfig;

export function PassChart({
  oneFile,
  rewriteAll,
}: {
  oneFile: SeriesPoint[];
  rewriteAll: SeriesPoint[];
}) {
  const rounds = new Set([
    ...oneFile.map((point) => point.round),
    ...rewriteAll.map((point) => point.round),
  ]);
  const data = [...rounds]
    .sort((a, b) => a - b)
    .map((round) => ({
      round: String(round),
      oneFile: percent(oneFile.find((point) => point.round === round)),
      rewriteAll: percent(rewriteAll.find((point) => point.round === round)),
    }));

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Held-out pass rate shows up here after the seed harness is scored. Round 0 is that seed.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-[2.1/1] w-full">
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="round" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis domain={[0, 100]} width={32} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="oneFile"
          stroke="var(--color-oneFile)"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="rewriteAll"
          stroke="var(--color-rewriteAll)"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}

function percent(point: SeriesPoint | undefined): number | null {
  if (!point || point.heldoutTotal === 0) return null;
  return Math.round((point.heldoutPassed / point.heldoutTotal) * 100);
}
