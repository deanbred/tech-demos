import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeAllMetrics, featureBadge } from '../scripts/metrics';
import { patternManifest } from '../src/manifest';

const patternsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'patterns',
);

describe('build-time metrics', () => {
  test('every pattern gets real, non-negative JS byte metrics', async () => {
    const metrics = await computeAllMetrics(patternsDir, patternManifest);
    for (const entry of patternManifest) {
      const m = metrics[entry.slug];
      expect(m).toBeDefined();
      if (!m) continue;
      // Every legacy demo actually ships JS.
      expect(m.legacyJsBytes).toBeGreaterThan(0);
      expect(m.modernJsBytes).toBeGreaterThanOrEqual(0);
      // The point of the gallery: modern never ships more JS than legacy.
      expect(m.jsBytesSaved).toBeGreaterThanOrEqual(0);
      expect(m.jsBytesSaved).toBe(m.legacyJsBytes - m.modernJsBytes);
    }
  });

  test('every feature id resolves to a valid Baseline status in web-features', () => {
    for (const entry of patternManifest) {
      expect(entry.featureIds.length).toBeGreaterThan(0);
      for (const id of entry.featureIds) {
        const badge = featureBadge(id);
        expect(badge.name.length).toBeGreaterThan(0);
        expect([false, 'low', 'high']).toContain(badge.baseline);
        if (badge.baseline !== false) {
          expect(badge.baselineLowDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });

  test('unknown feature ids throw instead of silently rendering', () => {
    expect(() => featureBadge('definitely-not-a-feature')).toThrow(
      /Unknown web-features id/,
    );
  });
});
