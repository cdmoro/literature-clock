import { exitScreensaverMode } from './screensaver';
import { store } from '../store';
import { getInterfaceLocale, getStrings } from './locales';

export function initZenMode() {
  const trigger = document.getElementById('zen');
  const exit = document.getElementById('exit-zen');
  const hint = document.getElementById('zen-hint');
  let timer: ReturnType<typeof setTimeout>;
  let hintTimer: ReturnType<typeof setTimeout>;

  const reveal = () => {
    if (!store.get('zen')) return;
    document.body.classList.add('zen-controls-visible');
    clearTimeout(timer);
    timer = setTimeout(() => {
      document.body.classList.remove('zen-controls-visible');
    }, 4000);
  };
  const refresh = () => {
    const active = store.get('zen');
    clearTimeout(hintTimer);
    trigger?.setAttribute('aria-pressed', String(active));
    if (exit) {
      exit.title = getStrings(getInterfaceLocale()).exit_zen_title;
      exit.setAttribute('aria-label', exit.title);
    }
    if (hint) {
      hint.textContent = active ? getStrings(getInterfaceLocale()).zen_mode_hint : '';
      hint.classList.remove('zen-hint-fading');
      hint.hidden = !active;
    }
    if (active) {
      exitScreensaverMode();
      reveal();
      hintTimer = setTimeout(() => {
        hint?.classList.add('zen-hint-fading');
        hintTimer = setTimeout(() => {
          if (hint) hint.hidden = true;
        }, 300);
      }, 4000);
      // Move keyboard focus out of the now-hidden menu without scrolling the quote.
      exit?.focus({ preventScroll: true });
    } else {
      clearTimeout(timer);
      document.body.classList.remove('zen-controls-visible');
    }
  };
  const leave = () => {
    if (!store.get('zen')) return;
    store.set('zen', false);
    const footer = document.querySelector<HTMLElement>('footer');
    footer?.classList.remove('hidden');
    footer?.style.removeProperty('display');
    trigger?.focus({ preventScroll: true });
  };

  trigger?.addEventListener('click', () => store.toggle('zen'));
  exit?.addEventListener('click', leave);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && store.get('zen')) {
      event.preventDefault();
      leave();
    } else reveal();
  });
  document.addEventListener('pointermove', reveal, { passive: true });
  document.addEventListener('pointerdown', reveal, { passive: true });
  document.addEventListener('focusin', reveal);
  store.subscribe((state, old) => {
    if (state.zen !== old.zen) refresh();
    else if (state.locale !== old.locale || state['ui-locale'] !== old['ui-locale']) {
      if (exit) {
        exit.title = getStrings(getInterfaceLocale()).exit_zen_title;
        exit.setAttribute('aria-label', exit.title);
      }
      if (hint) hint.textContent = state.zen ? getStrings(getInterfaceLocale()).zen_mode_hint : '';
    }
  });
  refresh();
}
