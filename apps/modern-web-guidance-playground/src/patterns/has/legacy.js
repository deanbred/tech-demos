// CSS selectors could not look "up" the tree, so styling a parent from a
// child's state meant event listeners mirroring that state into classes.
const card = document.getElementById('theme-card');
const toggle = document.getElementById('theme-toggle');
const noteInput = document.getElementById('note-input');

toggle.addEventListener('change', () => {
  card.classList.toggle('is-dark', toggle.checked);
});

noteInput.addEventListener('focus', () => {
  card.classList.add('is-focused');
});

noteInput.addEventListener('blur', () => {
  card.classList.remove('is-focused');
});
