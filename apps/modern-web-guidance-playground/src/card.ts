import { metrics } from 'virtual:pattern-metrics';
import type { FeatureBadge } from '../scripts/metrics';
import type { PatternDef } from './registry';
import demoBaseCss from './demo-base.css?raw';

type Side = 'legacy' | 'modern';
type FileKind = 'html' | 'css' | 'js';

const rawFiles = import.meta.glob('./patterns/*/*.{html,css,js}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function demoFile(slug: string, side: Side, kind: FileKind): string | null {
  return rawFiles[`./patterns/${slug}/${side}.${kind}`] ?? null;
}

function buildSrcdoc(slug: string, side: Side): string {
  const html = demoFile(slug, side, 'html') ?? '';
  const css = demoFile(slug, side, 'css') ?? '';
  const js = demoFile(slug, side, 'js');
  const script = js
    ? `<script type="module">${js.replaceAll('</script>', '<\\/script>')}</script>`
    : '';
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><style>${demoBaseCss}
${css}</style></head>
<body>${html}${script}</body>
</html>`;
}

const formatBytes = (bytes: number) => `${bytes.toLocaleString('en-US')} B`;

function baselineLabel(baseline: FeatureBadge['baseline']): string {
  switch (baseline) {
    case 'high':
      return 'Widely available';
    case 'low':
      return 'Newly available';
    case false:
      return 'Limited availability';
    default:
      return baseline satisfies never;
  }
}

function baselineClass(baseline: FeatureBadge['baseline']): string {
  switch (baseline) {
    case 'high':
      return 'badge-high';
    case 'low':
      return 'badge-low';
    case false:
      return 'badge-limited';
    default:
      return baseline satisfies never;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function renderCard(pattern: PatternDef): HTMLElement {
  const patternMetrics = metrics[pattern.slug];
  if (!patternMetrics) {
    throw new Error(`No build-time metrics for pattern "${pattern.slug}"`);
  }

  let side: Side = 'legacy';
  let fileKind: FileKind = 'js';

  const card = el('article', 'card');
  card.id = `pattern-${pattern.slug}`;

  // Header: title, Baseline badges, tagline, measured bytes.
  const header = el('header', 'card-header');
  const heading = el('div', 'card-heading');
  heading.append(el('h2', '', pattern.title));
  const badges = el('div', 'badges');
  for (const feature of patternMetrics.features) {
    const badge = el(
      'span',
      `badge ${baselineClass(feature.baseline)}`,
      `${feature.name} · ${baselineLabel(feature.baseline)}`,
    );
    badge.title = feature.baselineLowDate
      ? `Baseline ${baselineLabel(feature.baseline).toLowerCase()} since ${feature.baselineLowDate} (web-features: ${feature.id})`
      : `Baseline: ${baselineLabel(feature.baseline)} (web-features: ${feature.id})`;
    badges.append(badge);
  }
  heading.append(badges);
  header.append(heading, el('p', 'tagline', pattern.tagline));

  const metricsLine = el('p', 'metrics-line');
  const legacySpan = el(
    'span',
    'metric-legacy',
    `legacy JS ${formatBytes(patternMetrics.legacyJsBytes)}`,
  );
  const modernSpan = el(
    'span',
    'metric-modern',
    `modern JS ${formatBytes(patternMetrics.modernJsBytes)}`,
  );
  const savedSpan = el(
    'strong',
    'metric-saved',
    `${formatBytes(patternMetrics.jsBytesSaved)} saved`,
  );
  metricsLine.append(legacySpan, ' → ', modernSpan, ' · ', savedSpan);
  metricsLine.title =
    'Minified byte size of each demo’s real JS source, measured with esbuild at build time';
  header.append(metricsLine);
  card.append(header);

  // Legacy / Modern toggle.
  const toggle = el('div', 'side-toggle');
  const sideButtons = new Map<Side, HTMLButtonElement>();
  for (const [key, label] of [
    ['legacy', `Legacy · ${pattern.legacyLabel}`],
    ['modern', `Modern · ${pattern.modernLabel}`],
  ] as const) {
    const button = el('button', 'side-btn', label);
    button.type = 'button';
    button.addEventListener('click', () => setSide(key));
    sideButtons.set(key, button);
    toggle.append(button);
  }
  card.append(toggle);

  // Live demo iframe + unsupported notice.
  const pane = el('div', 'demo-pane');
  const notice = el(
    'div',
    'unsupported-notice',
    'Not supported in this browser — the modern demo below may not work. The page itself stays intact.',
  );
  notice.hidden = true;
  const iframe = document.createElement('iframe');
  iframe.className = 'demo-frame';
  iframe.style.height = `${pattern.demoHeight}px`;
  iframe.title = `${pattern.title} demo`;
  iframe.setAttribute('loading', 'lazy');
  pane.append(notice, iframe);
  card.append(pane);

  // Source viewer.
  const codeView = el('details', 'code-view');
  codeView.append(el('summary', '', 'View source'));
  const fileTabs = el('div', 'file-tabs');
  const fileButtons = new Map<FileKind, HTMLButtonElement>();
  for (const kind of ['html', 'css', 'js'] as const) {
    const button = el('button', 'file-btn', kind.toUpperCase());
    button.type = 'button';
    button.addEventListener('click', () => {
      fileKind = kind;
      updateCode();
    });
    fileButtons.set(kind, button);
    fileTabs.append(button);
  }
  const pre = el('pre', 'code-block');
  const code = el('code');
  pre.append(code);
  codeView.append(fileTabs, pre);
  card.append(codeView);

  function updateCode() {
    for (const [kind, button] of fileButtons) {
      button.classList.toggle('active', kind === fileKind);
    }
    const source = demoFile(pattern.slug, side, fileKind);
    code.textContent =
      source ?? `No ${side}.${fileKind} — this side ships no ${fileKind.toUpperCase()}.`;
  }

  function setSide(next: Side) {
    side = next;
    for (const [key, button] of sideButtons) {
      button.classList.toggle('active', key === side);
      button.setAttribute('aria-pressed', String(key === side));
    }
    notice.hidden = !(side === 'modern' && !pattern.supported());
    iframe.srcdoc = buildSrcdoc(pattern.slug, side);
    updateCode();
  }

  setSide('legacy');
  return card;
}
