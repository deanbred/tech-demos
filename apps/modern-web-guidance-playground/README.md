# Modern Web vs Legacy — a Modern Web Guidance playground

A one-page gallery that implements 8 common UI patterns twice: the typical JS-heavy
legacy way, and the modern native-platform way. The modern implementations follow
[Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance)
(**skill version 1.0.1**), the skill pack stewarded by the Chrome, Edge, Firefox
and MDN teams that steers coding agents toward modern web platform features.

Each card shows:

- A live, interactive **Legacy** and **Modern** demo (each demo runs in its own
  sandboxed `srcdoc` iframe so duplicate ids, global listeners and
  `document.startViewTransition()` can't leak between demos)
- **JS bytes saved** — the minified byte size of each demo's real `legacy.js` /
  `modern.js` source, measured with esbuild at build time by a Vite virtual
  module (`virtual:pattern-metrics`). Nothing is hardcoded; a demo with no
  modern JS file measures 0 B
- **Baseline badges** — the status (Widely available / Newly available /
  Limited availability) of every platform feature used, read from the
  [`web-features`](https://www.npmjs.com/package/web-features) npm package at
  build time
- A **source viewer** for the HTML / CSS / JS of whichever side is active
- A **browser-support notice**: if the current browser lacks the modern
  feature, the modern pane shows "Not supported in this browser" instead of
  breaking (feature-detected at runtime per pattern)

## Run it

```sh
bun install
bun run dev     # http://localhost:5173
```

Other scripts: `bun run build` (typecheck + production build), `bun test`
(validates that the bytes-saved and Baseline helpers return real values for
every card).

Best viewed in a current Chromium (anchor positioning needs Chrome 125+ for
`position-area`; everything else is Baseline Newly available or better).

## What is Modern Web Guidance?

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) is
a set of agent skills with expert-curated guides for ~262 modern web features.
Its CLI can be used without installing:

```sh
npx modern-web-guidance@latest search "dialog modal popover"
npx modern-web-guidance@latest retrieve "dialog"
npx modern-web-guidance@latest legacy-scan .
```

This app was built by retrieving the guides below (v1.0.1) and following them
for every modern implementation — including their MANDATORY notes on
accessibility, `@supports` gating and fallbacks.

## Patterns and the guidance each modern card used

| Pattern | Legacy | Modern | Skill guides followed |
| --- | --- | --- | --- |
| Modal dialog | Overlay div, hand-rolled focus trap, Esc handler, scroll lock, focus restore | `<dialog>` opened with `command="show-modal"`, `closedby="any"`, `::backdrop`, `@starting-style` entry animation — 0 JS | [dialog](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-components/dialog.md), [light-dismiss-a-dialog](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-behaviors/light-dismiss-a-dialog.md), [animate-to-from-top-layer](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-behaviors/animate-to-from-top-layer.md) |
| Anchored tooltip | `getBoundingClientRect` math, manual edge flipping, scroll/resize listeners | Popover API + CSS anchor positioning: `position-area`, `position-try-fallbacks: flip-block`, `@supports`-gated resets — 0 JS | [viewport-aware-dropdowns](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-atoms/viewport-aware-dropdowns.md), [position-aware-tooltips](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-atoms/position-aware-tooltips.md) |
| List → detail transition | Hand-rolled FLIP: measure rects, Web-Animations choreography, crossfades, cleanup | `document.startViewTransition()` with per-thumb `view-transition-name`, focus routing, reduced-motion opt-out, no-support fallback | [same-document-transitions](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-behaviors/same-document-transitions.md) |
| Responsive card | `ResizeObserver` toggling breakpoint classes | `container-type: inline-size` + `@container` width queries — 0 JS | [size-aware-styling](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/css/size-aware-styling.md) |
| Parent styling | `change`/`focusin`/`focusout` listeners mirroring child state into parent classes | `:has(.theme-toggle:checked)` / `:has(.note-input:focus)` driving custom properties — 0 JS | [child-state-based-styling](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/css/child-state-based-styling.md), [style-parent-with-has](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/css/style-parent-with-has.md) |
| Reading progress | Scroll listener with rAF "ticking" throttle | `animation-timeline: scroll()` inside `@supports` + `prefers-reduced-motion` — 0 JS | [scroll-progress-indicator](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-atoms/scroll-progress-indicator.md) |
| Exclusive accordion | ARIA wiring, `scrollHeight` measuring, `max-height` animation, exclusivity loop | `<details name="faq">` + `::details-content` height transition via `interpolate-size`, masked chevron `::before` marker — 0 JS | [accordion](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-components/accordion.md), [animate-to-intrinsic-sizes](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/css/animate-to-intrinsic-sizes.md) |
| Form validation styling | Per-field touched flags, regex validators, class/ARIA toggling on blur/input | HTML constraints (`type`, `required`, `pattern`) + `:user-invalid` / `:user-valid` — 0 JS | [validate-input-after-interaction](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/forms/validate-input-after-interaction.md) |

The legacy demos are written honestly in the style those patterns were actually
built (not strawmen): the modal traps focus correctly, the tooltip flips at
edges, the accordion animates to measured heights, the validation defers errors
until blur.

## How the metrics stay honest

- `scripts/metrics.ts` minifies each pattern's `legacy.js` and `modern.js` with
  esbuild and counts UTF-8 bytes. The Vite plugin in `vite.config.ts` exposes
  the result as a virtual module; the page renders whatever was measured.
- Feature ids in `src/manifest.ts` are resolved against `web-features` at build
  time; an unknown id fails the build and the test suite.
- `tests/metrics.test.ts` (run with `bun test`) asserts every card gets a
  non-negative, internally consistent byte count and a valid Baseline status.

Note: the X post that prompted this demo mentioned an eval pass-rate
improvement ("56% → 88%"). That figure is not verified here and is not
repeated as fact; the project publishes its own numbers on its
[eval dashboard](https://googlechrome.github.io/modern-web-guidance-src/).

## Structure

```
src/
  manifest.ts        # pattern list + web-features ids (pure data)
  registry.ts        # + per-pattern runtime feature detection
  card.ts            # card shell: demo iframes, badges, metrics, source view
  patterns/<slug>/   # legacy.{html,css,js} + modern.{html,css[,js]} per pattern
scripts/metrics.ts   # build-time byte measuring + Baseline lookup
vite.config.ts       # virtual:pattern-metrics plugin
tests/metrics.test.ts
```
