declare module 'virtual:pattern-metrics' {
  import type { PatternMetrics } from '../scripts/metrics';
  export const metrics: Record<string, PatternMetrics>;
}
