import { store } from '../store';
import { doFitQuote } from '../utils';
import { resolveTransition } from '../utils/transition-settings';

let animations: Animation[] = [];
let reducedMotion: MediaQueryList | undefined;

export function cancelQuoteTransition() {
  animations.forEach((animation) => animation.cancel());
  animations = [];
}

function mode() {
  return document.hidden || reducedMotion?.matches ? 'none' : resolveTransition(store.get('transition'));
}

async function animateQuote(entering: boolean) {
  const transition = mode();
  if (transition === 'none') return;
  const slide = transition === 'slide';
  const visible: Keyframe = { opacity: 1, translate: '0 0' };
  const hidden: Keyframe = { opacity: 0, translate: slide ? `0 ${entering ? 10 : -10}px` : '0 0' };
  if (transition === 'blur') {
    visible.filter = 'blur(0px)';
    hidden.filter = 'blur(4px)';
  }
  if (transition === 'zoom') {
    // Shrink rather than enlarge, keeping the text within its fitted bounds.
    visible.scale = '1';
    hidden.scale = '0.96';
  }
  const current = Array.from(document.querySelectorAll<HTMLElement>('#quote > p, #quote > cite'))
    .filter((element) => typeof element.animate === 'function')
    .map((element) => element.animate(entering ? [hidden, visible] : [visible, hidden], {
      duration: entering ? 320 : 180, easing: 'ease-in-out', fill: 'forwards',
    }));
  animations = current;
  await Promise.allSettled(current.map((animation) => animation.finished));
  current.forEach((animation) => animation.cancel());
  if (animations === current) animations = [];
}

/** Keep the current quote visible until its replacement has actually arrived. */
export async function transitionQuote(render: () => void, isCurrent: () => boolean) {
  const hasQuote = !!document.querySelector('#quote p');
  if (hasQuote) await animateQuote(false);
  if (!isCurrent()) return;
  render();
  doFitQuote();
  // Initial rendering stays immediate; subsequent replacements get the selected transition.
  if (hasQuote) await animateQuote(true);
}

export function initTransitions() {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion.addEventListener('change', cancelQuoteTransition);
  document.addEventListener('visibilitychange', cancelQuoteTransition);
  const select = document.querySelector<HTMLSelectElement>('#transition-select');
  if (select) select.value = store.get('transition');
  select?.addEventListener('change', () => {
    store.set('transition', resolveTransition(select.value));
    cancelQuoteTransition();
  });
}
