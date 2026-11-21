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
  sim: { label: "SIM", color: "oklch(0.45 0.16 262)" },
  baseline: { label: "No ledger", color: "oklch(0.58 0.14 45)" },
} satisfies ChartConfig;

export function ScoreChart({
  sim,
  baseline,
}: {
  sim: SeriesPoint[];
  baseline: SeriesPoint[];
}) {
  const rounds = new Set([...sim.map((point) => point.round), ...baseline.map((point) => point.round)]);
  const heldoutTotal = sim[0]?.heldoutTotal ?? baseline[0]?.heldoutTotal ?? 10;
  const data = [...rounds]
    .sort((a, b) => a - b)
    .map((round) => ({
      round: String(round),
      sim: sim.find((point) => point.round === round)?.heldoutPassed ?? null,
      baseline: baseline.find((point) => point.round === round)?.heldoutPassed ?? null,
    }));

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Held-out scores show up here after the first scoring pass. Round 0 is the seed harness.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-[2.1/1] w-full">
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="round" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          domain={[0, heldoutTotal]}
          width={28}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="sim"
          stroke="var(--color-sim)"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="baseline"
          stroke="var(--color-baseline)"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}
