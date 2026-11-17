import { patternManifest, type PatternManifestEntry } from './manifest';

export interface PatternDef extends PatternManifestEntry {
  /** Does the current browser support the modern implementation? */
  supported: () => boolean;
}

const supportChecks: Record<string, () => boolean> = {
  modal: () =>
    typeof HTMLDialogElement === 'function' &&
    'commandForElement' in HTMLButtonElement.prototype,
  tooltip: () =>
    CSS.supports('anchor-name: --a') &&
    Object.hasOwn(HTMLElement.prototype, 'popover'),
  transition: () => 'startViewTransition' in document,
  container: () => CSS.supports('container-type: inline-size'),
  has: () => CSS.supports('selector(:has(*))'),
  scroll: () => CSS.supports('animation-timeline: scroll()'),
  accordion: () => Object.hasOwn(HTMLDetailsElement.prototype, 'name'),
  validation: () => CSS.supports('selector(:user-invalid)'),
};

export const patterns: PatternDef[] = patternManifest.map((entry) => {
  const supported = supportChecks[entry.slug];
  if (!supported) {
    throw new Error(`No support check registered for pattern "${entry.slug}"`);
  }
  return { ...entry, supported };
});
