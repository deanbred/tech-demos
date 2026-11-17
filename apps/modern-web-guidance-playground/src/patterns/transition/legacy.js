// Typical pre-View-Transitions morph: a hand-rolled FLIP animation. Measure
// the thumbnail, swap the DOM, measure the hero, then animate the delta with
// the Web Animations API while crossfading the views — all bookkeeping ours.
const listView = document.getElementById('list-view');
const detailView = document.getElementById('detail-view');
const hero = document.getElementById('hero');
const detailHeading = document.getElementById('detail-heading');
const listHeading = document.getElementById('list-heading');
const backButton = document.getElementById('back');

const DURATION = 300;
const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
let animating = false;

function flip(fromRect, element, fade) {
  // First-Last-Invert-Play: start from the old geometry, animate to identity.
  const toRect = element.getBoundingClientRect();
  const dx = fromRect.left - toRect.left;
  const dy = fromRect.top - toRect.top;
  const sx = fromRect.width / toRect.width;
  const sy = fromRect.height / toRect.height;
  return element.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transform: 'none' },
    ],
    { duration: DURATION, easing: EASING },
  ).finished.then(() => fade);
}

function goToDetail(thumb) {
  if (animating) return;
  animating = true;
  const color = getComputedStyle(thumb).getPropertyValue('--c');
  const thumbRect = thumb.getBoundingClientRect();

  listView.hidden = true;
  detailView.hidden = false;
  hero.style.background = color;
  hero.style.transformOrigin = 'top left';
  detailHeading.textContent = thumb.dataset.name;

  const fade = detailView.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: DURATION, easing: EASING },
  ).finished;

  flip(thumbRect, hero, fade)
    .then(() => fade)
    .finally(() => {
      animating = false;
      detailHeading.focus();
    });
}

function goToList() {
  if (animating) return;
  animating = true;
  const heroRect = hero.getBoundingClientRect();

  detailView.hidden = true;
  listView.hidden = false;

  // Find the thumb we came from so the hero can shrink back into it.
  const name = detailHeading.textContent;
  const thumb = Array.from(document.querySelectorAll('.thumb')).find(
    (t) => t.dataset.name === name,
  );
  const fade = listView.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: DURATION, easing: EASING },
  ).finished;

  const reverse = thumb
    ? (() => {
        thumb.style.transformOrigin = 'top left';
        return flip(heroRect, thumb, fade);
      })()
    : fade;

  Promise.resolve(reverse)
    .then(() => fade)
    .finally(() => {
      animating = false;
      listHeading.focus();
    });
}

for (const thumb of document.querySelectorAll('.thumb')) {
  thumb.addEventListener('click', () => goToDetail(thumb));
}
backButton.addEventListener('click', goToList);
