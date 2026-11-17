// Pre-:user-invalid, deferring errors until "the user has finished" meant
// tracking touched/dirty flags per field and re-running validators by hand.
const validators = {
  email: {
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  },
  username: {
    validate: (value) => /^[a-z0-9]{3,12}$/.test(value),
  },
};

for (const [name, { validate }] of Object.entries(validators)) {
  const input = document.getElementById(name);
  const error = document.getElementById(`${name}-error`);
  let touched = false;

  function render() {
    const valid = validate(input.value);
    const showError = touched && !valid;
    input.classList.toggle('is-invalid', showError);
    input.classList.toggle('is-valid', touched && valid && input.value !== '');
    input.setAttribute('aria-invalid', String(showError));
    error.hidden = !showError;
    if (showError) {
      input.setAttribute('aria-describedby', error.id);
    } else {
      input.removeAttribute('aria-describedby');
    }
  }

  // Only mark the field touched once the user commits a value and leaves.
  input.addEventListener('blur', () => {
    if (input.value !== '') touched = true;
    render();
  });

  // After that, re-validate on every keystroke so errors clear promptly.
  input.addEventListener('input', render);
}
