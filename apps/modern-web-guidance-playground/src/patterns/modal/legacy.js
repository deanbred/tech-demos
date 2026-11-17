// Typical pre-<dialog> modal: manual overlay, focus trap, Esc handling,
// scroll locking and focus restoration — all reimplemented by hand.
const openButton = document.getElementById('open-modal');
const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');
const cancelButton = document.getElementById('modal-cancel');
const confirmButton = document.getElementById('modal-confirm');

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

let previouslyFocused = null;

function openModal() {
  previouslyFocused = document.activeElement;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden'; // scroll lock
  cancelButton.focus();
  document.addEventListener('keydown', onKeydown, true);
}

function closeModal() {
  overlay.hidden = true;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeydown, true);
  if (previouslyFocused) previouslyFocused.focus(); // restore focus
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }
  if (event.key !== 'Tab') return;

  // Manual focus trap: cycle Tab / Shift+Tab inside the modal.
  const focusable = Array.from(modal.querySelectorAll(FOCUSABLE));
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

openButton.addEventListener('click', openModal);
cancelButton.addEventListener('click', closeModal);
confirmButton.addEventListener('click', closeModal);

// Light dismiss: close when the click lands on the backdrop itself.
overlay.addEventListener('mousedown', (event) => {
  if (event.target === overlay) closeModal();
});
