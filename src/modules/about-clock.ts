import webVersion from '../web-version.json';
/** Wire up interactivity for the About panel.
 *
 * The <summary>/<section> markup stays in the initial HTML so it is
 * readable and crawlable without JavaScript. Once JS runs, though, the
 * <section> is moved out to the body level — like the app's other dialogs
 * (Settings, My quotes) — instead of staying inside <footer>. Left inside
 * the footer, a fixed-position panel would still visually fade out with it:
 * the footer fades itself out after a few seconds of inactivity, and an
 * ancestor's opacity dims its descendants even when they're
 * position: fixed and otherwise laid out independently of it.
 *
 * The <details> element itself (and its <summary>) stays put as the footer
 * link that opens the panel; its `open` state is the single source of truth
 * that the moved panel's visibility follows. */
export function initAboutClock() {
  const details = document.getElementById('about-clock');
  const section = details?.querySelector('section');
  if (!(details instanceof HTMLDetailsElement) || !section) return;

  const version = document.createElement('p');
  const link = document.createElement('a');
  link.textContent = `Web · ${webVersion.version}`;
  link.href = /^v\d+\.\d+\.\d+$/.test(webVersion.version)
    ? `https://github.com/cdmoro/literature-clock/releases/tag/${webVersion.version}`
    : 'https://github.com/cdmoro/literature-clock/releases';
  version.append(link);
  section.append(version);

  const overlay = document.createElement('div');
  overlay.id = 'about-clock-overlay';
  overlay.hidden = true;
  overlay.setAttribute('data-html2canvas-ignore', '');
  overlay.appendChild(section);
  document.body.appendChild(overlay);

  const close = () => {
    details.open = false;
  };

  details.addEventListener('toggle', () => {
    overlay.hidden = !details.open;
  });

  section.querySelector('#about-clock-close')?.addEventListener('click', close);

  // A click landing directly on the overlay (rather than on the section
  // card inside it) is a click on the dimmed backdrop.
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) {
      event.preventDefault();
      close();
    }
  });
}
