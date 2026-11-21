/**
 * Build-time metrics, shared by the Vite virtual module and the tests.
 *
 * - JS bytes are measured by minifying each demo's real `legacy.js` /
 *   `modern.js` source with esbuild and counting UTF-8 bytes. Nothing is
 *   hardcoded; a pattern with no modern JS file simply measures 0 bytes.
 * - Baseline statuses come straight from the `web-features` npm package.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { transform } from 'esbuild';
import { features } from 'web-features';
import type { PatternManifestEntry } from '../src/manifest';

export type BaselineStatus = 'high' | 'low' | false;

export interface FeatureBadge {
  id: string;
  name: string;
  baseline: BaselineStatus;
  baselineLowDate?: string;
}

export interface PatternMetrics {
  slug: string;
  legacyJsBytes: number;
  modernJsBytes: number;
  jsBytesSaved: number;
  features: FeatureBadge[];
}

async function minifiedJsBytes(file: string): Promise<number | null> {
  let source: string;
  try {
    source = await readFile(file, 'utf8');
  } catch {
    return null;
  }
  const out = await transform(source, { minify: true, loader: 'js' });
  return new TextEncoder().encode(out.code.trim()).length;
}

export function featureBadge(id: string): FeatureBadge {
  const feature = features[id];
  if (!feature || feature.kind !== 'feature') {
    throw new Error(`Unknown web-features id: ${id}`);
  }
  // The published data never uses `true`, but the type allows it; normalize.
  const rawBaseline = feature.status.baseline;
  return {
    id,
    name: feature.name,
    baseline: rawBaseline === true ? 'high' : rawBaseline,
    baselineLowDate: feature.status.baseline_low_date,
  };
}

export async function computePatternMetrics(
  patternsDir: string,
  entry: PatternManifestEntry,
): Promise<PatternMetrics> {
  const legacyJsBytes = await minifiedJsBytes(
    path.join(patternsDir, entry.slug, 'legacy.js'),
  );
  if (legacyJsBytes === null) {
    throw new Error(`Missing legacy.js for pattern "${entry.slug}"`);
  }
  const modernJsBytes =
    (await minifiedJsBytes(path.join(patternsDir, entry.slug, 'modern.js'))) ??
    0;
  return {
    slug: entry.slug,
    legacyJsBytes,
    modernJsBytes,
    jsBytesSaved: legacyJsBytes - modernJsBytes,
    features: entry.featureIds.map(featureBadge),
  };
}

export async function computeAllMetrics(
  patternsDir: string,
  manifest: PatternManifestEntry[],
): Promise<Record<string, PatternMetrics>> {
  const all = await Promise.all(
    manifest.map((entry) => computePatternMetrics(patternsDir, entry)),
  );
  return Object.fromEntries(all.map((metrics) => [metrics.slug, metrics]));
}
