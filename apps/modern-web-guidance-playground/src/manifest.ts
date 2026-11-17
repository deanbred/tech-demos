/**
 * Pure-data pattern manifest, importable from both the browser app and the
 * node-side build tooling (vite.config.ts, scripts/metrics.ts, tests).
 */
export interface PatternManifestEntry {
  slug: string;
  title: string;
  tagline: string;
  legacyLabel: string;
  modernLabel: string;
  /** `web-features` ids whose Baseline status is shown on the card. */
  featureIds: string[];
  /** Modern Web Guidance guide ids the modern implementation followed. */
  guideIds: string[];
  /** Demo iframe height in px. */
  demoHeight: number;
}

export const patternManifest: PatternManifestEntry[] = [
  {
    slug: 'modal',
    title: 'Modal dialog',
    tagline:
      'Confirmation modal: overlay div, hand-rolled focus trap and Esc handling vs the native <dialog> opened declaratively.',
    legacyLabel: 'Overlay div + focus trap JS',
    modernLabel: '<dialog> + invoker commands',
    featureIds: ['dialog', 'invoker-commands', 'dialog-closedby'],
    guideIds: ['dialog', 'light-dismiss-a-dialog', 'animate-to-from-top-layer'],
    demoHeight: 260,
  },
  {
    slug: 'tooltip',
    title: 'Anchored tooltip',
    tagline:
      'A tooltip tethered to its trigger that flips at viewport edges: getBoundingClientRect math vs CSS anchor positioning.',
    legacyLabel: 'getBoundingClientRect + scroll listeners',
    modernLabel: 'Popover + CSS anchor positioning',
    featureIds: ['anchor-positioning', 'popover'],
    guideIds: ['viewport-aware-dropdowns', 'position-aware-tooltips'],
    demoHeight: 260,
  },
  {
    slug: 'transition',
    title: 'List → detail transition',
    tagline:
      'Morphing a thumbnail into a hero view: manual Web-Animations choreography vs the View Transitions API.',
    legacyLabel: 'JS-choreographed FLIP + fades',
    modernLabel: 'document.startViewTransition()',
    featureIds: ['view-transitions'],
    guideIds: ['same-document-transitions'],
    demoHeight: 320,
  },
  {
    slug: 'container',
    title: 'Responsive card',
    tagline:
      'A card that adapts to the space it is given (drag the handle): ResizeObserver class toggling vs container queries.',
    legacyLabel: 'ResizeObserver + class toggling',
    modernLabel: '@container size queries',
    featureIds: ['container-queries'],
    guideIds: ['size-aware-styling'],
    demoHeight: 320,
  },
  {
    slug: 'has',
    title: 'Parent styling',
    tagline:
      'Styling a card from the state of its children (a theme toggle, input focus): change/focus listeners vs :has().',
    legacyLabel: 'change + focusin/focusout listeners',
    modernLabel: ':has() state selectors',
    featureIds: ['has'],
    guideIds: ['child-state-based-styling', 'style-parent-with-has'],
    demoHeight: 300,
  },
  {
    slug: 'scroll',
    title: 'Reading progress',
    tagline:
      'A reading-progress bar driven by scroll position: a throttled scroll listener vs a CSS scroll-driven animation.',
    legacyLabel: 'scroll listener + rAF throttle',
    modernLabel: 'animation-timeline: scroll()',
    featureIds: ['scroll-driven-animations'],
    guideIds: ['scroll-progress-indicator'],
    demoHeight: 300,
  },
  {
    slug: 'accordion',
    title: 'Exclusive accordion',
    tagline:
      'One-open-at-a-time accordion with animated height: scrollHeight measuring JS vs <details name> + ::details-content.',
    legacyLabel: 'click handlers + max-height math',
    modernLabel: '<details name> + interpolate-size',
    featureIds: ['details-name', 'details-content', 'interpolate-size'],
    guideIds: ['accordion', 'animate-to-intrinsic-sizes'],
    demoHeight: 340,
  },
  {
    slug: 'validation',
    title: 'Form validation styling',
    tagline:
      'Showing errors only after the user has finished interacting: touched-state bookkeeping JS vs :user-invalid.',
    legacyLabel: 'blur/input listeners + touched flags',
    modernLabel: ':user-invalid / :user-valid',
    featureIds: ['user-pseudos'],
    guideIds: ['validate-input-after-interaction'],
    demoHeight: 340,
  },
];
