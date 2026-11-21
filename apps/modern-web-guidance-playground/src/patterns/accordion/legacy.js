// Pre-<details name> accordion: ARIA state, exclusivity and the open/close
// animation (measure scrollHeight, animate max-height, clean up afterwards)
// are all manual.
const accordion = document.getElementById('accordion');
const triggers = Array.from(accordion.querySelectorAll('.acc-trigger'));

function panelFor(trigger) {
  return document.getElementById(trigger.getAttribute('aria-controls'));
}

function openPanel(trigger, panel) {
  trigger.setAttribute('aria-expanded', 'true');
  panel.hidden = false;
  panel.style.maxHeight = '0px';
  // Force a reflow so the transition starts from 0.
  panel.getBoundingClientRect();
  panel.style.maxHeight = `${panel.scrollHeight}px`;
  panel.addEventListener(
    'transitionend',
    () => {
      // Let the panel size itself naturally after the animation.
      if (trigger.getAttribute('aria-expanded') === 'true') {
        panel.style.maxHeight = 'none';
      }
    },
    { once: true },
  );
}

function closePanel(trigger, panel) {
  trigger.setAttribute('aria-expanded', 'false');
  // From 'none' back to a pixel value so the collapse can animate.
  panel.style.maxHeight = `${panel.scrollHeight}px`;
  panel.getBoundingClientRect();
  panel.style.maxHeight = '0px';
  panel.addEventListener(
    'transitionend',
    () => {
      if (trigger.getAttribute('aria-expanded') === 'false') {
        panel.hidden = true;
      }
    },
    { once: true },
  );
}

for (const trigger of triggers) {
  trigger.addEventListener('click', () => {
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    // Exclusivity: close every other open item first.
    for (const other of triggers) {
      if (other !== trigger && other.getAttribute('aria-expanded') === 'true') {
        closePanel(other, panelFor(other));
      }
    }
    if (isOpen) {
      closePanel(trigger, panelFor(trigger));
    } else {
      openPanel(trigger, panelFor(trigger));
    }
  });
}
