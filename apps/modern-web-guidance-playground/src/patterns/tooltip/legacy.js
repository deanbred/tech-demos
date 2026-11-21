// Typical pre-anchor-positioning tooltip: measure the trigger and the tooltip
// with getBoundingClientRect, do the placement math, flip at viewport edges,
// and keep listening to scroll/resize to stay attached.
const tooltip = document.getElementById('tooltip');
const GAP = 8;
let currentTrigger = null;

function position() {
  if (!currentTrigger) return;
  const triggerRect = currentTrigger.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();

  // Prefer above; flip below when there is not enough headroom.
  let top = triggerRect.top - tipRect.height - GAP;
  if (top < 0) {
    top = triggerRect.bottom + GAP;
  }

  // Center horizontally, clamped to the viewport.
  let left = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2;
  left = Math.max(GAP, Math.min(left, window.innerWidth - tipRect.width - GAP));

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

function show(trigger) {
  currentTrigger = trigger;
  tooltip.textContent = trigger.dataset.tip;
  tooltip.hidden = false;
  position();
}

function hide() {
  currentTrigger = null;
  tooltip.hidden = true;
}

for (const trigger of document.querySelectorAll('.tip-trigger')) {
  trigger.addEventListener('mouseenter', () => show(trigger));
  trigger.addEventListener('focus', () => show(trigger));
  trigger.addEventListener('mouseleave', hide);
  trigger.addEventListener('blur', hide);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hide();
});

// The tether breaks on scroll/resize unless we keep re-measuring.
window.addEventListener('scroll', position, { passive: true });
window.addEventListener('resize', position);
