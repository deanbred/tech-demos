import './style.css';
import { metrics } from 'virtual:pattern-metrics';
import { renderCard } from './card';
import { patterns } from './registry';

const SKILL_VERSION = '1.0.1';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root');

const totalSaved = patterns.reduce(
  (sum, pattern) => sum + (metrics[pattern.slug]?.jsBytesSaved ?? 0),
  0,
);

const header = document.createElement('header');
header.className = 'page-header';
header.innerHTML = `
  <h1>Modern Web <span class="vs">vs</span> Legacy</h1>
  <p class="subtitle">
    ${patterns.length} common UI patterns, each implemented twice: the typical
    JS-heavy legacy way, and the modern native-platform way following
    <a href="https://github.com/GoogleChrome/modern-web-guidance">Modern Web Guidance</a>
    (skill v${SKILL_VERSION}). Byte counts are minified sizes of each demo's real JS
    source, measured at build time; Baseline badges come from the
    <a href="https://www.npmjs.com/package/web-features">web-features</a> data package.
  </p>
  <p class="total-saved">
    <strong>${totalSaved.toLocaleString('en-US')} B</strong> of minified JS replaced
    by native platform features across the gallery
  </p>
`;

const grid = document.createElement('main');
grid.className = 'card-grid';
for (const pattern of patterns) {
  grid.append(renderCard(pattern));
}

const footer = document.createElement('footer');
footer.className = 'page-footer';
footer.innerHTML = `
  <p>
    Built with <a href="https://github.com/GoogleChrome/modern-web-guidance">GoogleChrome/modern-web-guidance</a>
    v${SKILL_VERSION} · best viewed in a current Chromium; unsupported modern demos
    show a notice instead of breaking.
  </p>
`;

app.append(header, grid, footer);
