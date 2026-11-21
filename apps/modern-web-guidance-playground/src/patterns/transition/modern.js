// With the View Transitions API the browser measures, morphs and crossfades.
// We only swap the DOM inside startViewTransition and route focus after.
const listView = document.getElementById('list-view');
const detailView = document.getElementById('detail-view');
const hero = document.getElementById('hero');
const detailHeading = document.getElementById('detail-heading');
const listHeading = document.getElementById('list-heading');

function transitionTo(update, focusTarget) {
  if (!document.startViewTransition) {
    update(); // Fallback: swap instantly, no animation.
    focusTarget.focus();
    return;
  }
  const transition = document.startViewTransition(update);
  transition.finished.finally(() => focusTarget.focus());
}

for (const thumb of document.querySelectorAll('.thumb')) {
  thumb.addEventListener('click', () => {
    // The hero adopts the clicked thumbnail's transition name, so the browser
    // knows which pair of elements to morph.
    hero.style.viewTransitionName = getComputedStyle(thumb).viewTransitionName;
    hero.style.background = getComputedStyle(thumb).getPropertyValue('--c');
    transitionTo(() => {
      detailHeading.textContent = thumb.dataset.name;
      listView.hidden = true;
      detailView.hidden = false;
    }, detailHeading);
  });
}

document.getElementById('back').addEventListener('click', () => {
  transitionTo(() => {
    detailView.hidden = true;
    listView.hidden = false;
  }, listHeading);
});
