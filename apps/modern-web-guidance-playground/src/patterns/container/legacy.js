// Before container queries, a component that adapts to its own space needed
// a ResizeObserver (or window resize listeners) toggling breakpoint classes.
const wrapper = document.getElementById('wrapper');
const card = document.getElementById('card');

const WIDE_BREAKPOINT = 340;
const DETAILS_BREAKPOINT = 420;

function applyBreakpoints(width) {
  card.classList.toggle('wide', width >= WIDE_BREAKPOINT);
  card.classList.toggle('show-details', width >= DETAILS_BREAKPOINT);
}

const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    applyBreakpoints(entry.contentBoxSize[0].inlineSize);
  }
});

observer.observe(wrapper);
applyBreakpoints(wrapper.clientWidth);
