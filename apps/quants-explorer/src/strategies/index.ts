import type { Bar, Target } from "../engine/types.ts"
import { bollingerTargets } from "./bollinger.ts"
import { rsiReversionTargets } from "./rsi-reversion.ts"
import { smaCrossTargets } from "./sma-cross.ts"

export type PortedStrategy = {
  id: string
  targets: (bars: readonly Bar[]) => Target[]
}

export const portedStrategies: readonly PortedStrategy[] = [
  {
    id: "example-orders-01-market-sma-cross",
    targets: smaCrossTargets,
  },
  {
    id: "example-orders-02-market-rsi-reversion",
    targets: rsiReversionTargets,
  },
  {
    id: "example-weights-21-bollinger-reversion",
    targets: bollingerTargets,
  },
]

const byId = new Map(portedStrategies.map((strategy) => [strategy.id, strategy]))

export function portedStrategy(id: string): PortedStrategy | undefined {
  return byId.get(id)
}
