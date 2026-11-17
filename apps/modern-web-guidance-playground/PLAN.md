# modern-web-guidance-playground

## Goal

A one-page "Modern Web vs Legacy" gallery that shows, for 6 to 8 common UI patterns, a legacy JS-heavy implementation next to the modern native-platform version. The modern versions are built with the official Modern Web Guidance skill pack (GoogleChrome/modern-web-guidance), so the demo also exercises the skill.

## Verify first (before building)

- Install the skill in your workspace with `npx modern-web-guidance@latest install` (or the currently documented command; check the repo README at https://github.com/GoogleChrome/modern-web-guidance). Install it only for your own session. Do not commit the skill or its install output into this repo unless it lives inside this app folder and is needed at runtime (it should not be).
- Read what the skill recommends for each pattern below and follow it. Record in the README which skill guidance each modern card used (link to the specific guidance doc when possible), and the skill version.
- If a claim from X can't be confirmed (for example the "56% to 88% pass rate" figure), don't repeat it as fact; cite the source or leave it out.

## Single-user MVP

**In:**

- A single page with a responsive grid of cards. Each card has:
  - A **Legacy** tab and a **Modern** tab (or side-by-side panes on wide screens), each with a live, interactive demo
  - The code for both (a compact diff or side-by-side code view)
  - **JS bytes saved:** compute it from the actual legacy and modern source files at build time (for example, minified byte size of each demo's JS). Never hardcode or estimate it
  - A **Baseline badge** for the modern feature (Widely available / Newly available / Limited), from the `web-features` npm package's data, not hand-typed
- Patterns (6 to 8; drop one if it doesn't work cleanly):
  1. Modal: custom JS overlay + focus trap vs `<dialog>` / `popover`
  2. Tooltip/menu positioning: JS getBoundingClientRect math vs CSS anchor positioning
  3. Page/state transition: JS-animated swap vs View Transitions API
  4. Responsive card: viewport media queries + JS resize vs container queries
  5. Parent styling: JS class toggling vs `:has()`
  6. Sticky header shrink / reading progress: scroll listener vs scroll-driven animations
  7. (optional) Accordion: JS height animation vs `<details name>` + `interpolate-size` / `::details-content`
  8. (optional) Form validation styling: JS vs `:user-invalid`
- Legacy demos are honestly written in the typical older style (not strawmen). Modern demos use no JS, or minimal JS where the platform needs it
- A browser-support note: if a feature isn't supported in the viewer's browser, the modern card shows a clear "Not supported in this browser" fallback instead of breaking
- `bunfig.toml` with `[install] minimumReleaseAge = 259200` before any install
- A README covering what Modern Web Guidance is, how it was used, how to run (`bun install && bun run dev` from this directory), and the per-card skill references

**Out:**

- A backend (this is a static page; no Bun API needed)
- Polyfills
- Framework-specific comparisons (React component libraries, etc.)
- Changing anything outside this app folder, except the tracking update

## Tasks (vertical slices)

1. Scaffold from the official Vite template with `bunx create-vite` (vanilla-ts or react-ts; prefer vanilla-ts since the point is the platform), skipping the initial install. Write `bunfig.toml` first, then run `bun install`. If you use React, init shadcn/ui with a minimalist preset. With vanilla, keep styling plain modern CSS (nesting, `@layer`, custom properties).
2. Card shell plus build-time metrics: a JS-bytes-saved calculation from real files, and Baseline badges from `web-features`.
3. Build the patterns one at a time, legacy then modern, using the skill for the modern version.
4. Validation: in a current Chromium, capture at least one screenshot AND at least one video. The video should interact with at least 4 cards (open a modal or popover, an anchored tooltip, a view transition, a container-query resize) and switch Legacy/Modern. Attach both to the PR.

## Testing and hooks

- One focused test: the bytes-saved and Baseline helpers return real values for each card (non-negative numbers, a valid Baseline status per feature id).
- No git hooks.

## Deferred

- Lighthouse or performance comparisons
- More patterns, and a per-browser support matrix
- A Cloudflare Pages preview (a static build makes this easy later)
