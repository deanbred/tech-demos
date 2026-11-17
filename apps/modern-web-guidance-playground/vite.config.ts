import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { computeAllMetrics } from './scripts/metrics.ts';
import { patternManifest } from './src/manifest.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const patternsDir = path.join(here, 'src', 'patterns');

/**
 * Exposes `virtual:pattern-metrics`: per-pattern JS byte sizes (minified from
 * the real demo sources with esbuild) and Baseline statuses (from the
 * `web-features` package), computed at build time.
 */
function patternMetricsPlugin(): Plugin {
  const virtualId = 'virtual:pattern-metrics';
  const resolvedId = `\0${virtualId}`;
  return {
    name: 'pattern-metrics',
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    async load(id) {
      if (id !== resolvedId) return;
      const metrics = await computeAllMetrics(patternsDir, patternManifest);
      return `export const metrics = ${JSON.stringify(metrics)};`;
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(patternsDir) && file.endsWith('.js')) {
        const mod = server.moduleGraph.getModuleById(resolvedId);
        if (mod) server.moduleGraph.invalidateModule(mod);
      }
    },
  };
}

export default defineConfig({
  plugins: [patternMetricsPlugin()],
});
