// The classic reading-progress bar: a scroll listener with requestAnimationFrame
// throttling ("ticking"), running on the main thread for every scroll event.
const progress = document.getElementById('progress');
let ticking = false;

function update() {
  const scrollable =
    document.documentElement.scrollHeight - window.innerHeight;
  const fraction = scrollable > 0 ? window.scrollY / scrollable : 0;
  progress.style.transform = `scaleX(${fraction})`;
  ticking = false;
}

window.addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  },
  { passive: true },
);

update();
