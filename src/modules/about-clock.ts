/** Wire up interactivity for the static About panel: it stays in the initial
 * HTML (readable without JavaScript, and crawlable), but closing it via its
 * close button or a click on the backdrop needs a little JS. */
export function initAboutClock() {
  const details = document.getElementById('about-clock');
  if (!(details instanceof HTMLDetailsElement)) return;

  details.querySelector('#about-clock-close')?.addEventListener('click', () => {
    details.open = false;
  });

  // The panel fills the viewport when open, so a click landing directly on
  // it (rather than on the card inside) is a click on the dimmed backdrop.
  details.addEventListener('click', (event) => {
    if (event.target === details) details.open = false;
  });
}
