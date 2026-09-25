import { readingIcon } from './reading-icons';
import { store } from '../store';
import { cancelPendingQuote, updateQuote } from './quotes';
import { getLiveTime } from '../utils';
import { readingStrings, showQuoteNotice } from './reading-ui';

export function pauseReading() {
  if (!store.get('active-quote')) return;
  cancelPendingQuote();
  store.set('paused', true, false);
}

export function resumeReading() {
  cancelPendingQuote();
  for (const key of ['time', 'quote-id', 'index'] as const) {
    store.set(key, undefined, false);
    store.removeFromUrl(key);
  }
  store.set('paused', false, false);
  showQuoteNotice('');
  const time = getLiveTime();
  if (store.get('active-quote')?.time !== time) void updateQuote({ time });
}

export function initReadingControls() {
  if (store.get('time')) store.set('paused', true, false);
  const group = document.createElement('span');
  group.id = 'reading-controls';
  group.className = 'input-group';
  const pause = document.createElement('button');
  pause.id = 'pause-reading';
  pause.type = 'button';
  pause.addEventListener('click', () => (store.get('paused') ? resumeReading() : pauseReading()));
  const previous = document.createElement('button');
  previous.id = 'previous-quote';
  previous.type = 'button';
  previous.innerHTML = readingIcon('previous');
  const counter = document.createElement('span');
  counter.id = 'quote-position';
  counter.className = 'input-group-text';
  counter.setAttribute('aria-live', 'polite');
  counter.setAttribute('aria-atomic', 'true');
  const next = document.createElement('button');
  next.id = 'next-quote';
  next.type = 'button';
  next.innerHTML = readingIcon('next');
  let changing = false;
  const changeVariant = async (direction: number) => {
    if (changing || next.disabled) return;
    changing = true;
    for (const key of ['quote-id', 'index'] as const) {
      store.set(key, undefined, false);
      store.removeFromUrl(key);
    }
    refresh();
    try {
      await updateQuote({ variantStep: direction });
    } finally {
      changing = false;
      refresh();
    }
  };
  previous.addEventListener('click', () => void changeVariant(-1));
  next.addEventListener('click', () => void changeVariant(1));
  group.append(pause);
  const shareGroup = document.getElementById('copy')?.parentElement;
  if (shareGroup?.classList.contains('input-group')) {
    group.append(...Array.from(shareGroup.children));
    shareGroup.remove();
  }
  const navigation = document.createElement('span');
  navigation.id = 'quote-navigation';
  navigation.className = 'input-group';
  navigation.append(previous, counter, next);
  document.getElementById('settings')?.prepend(group, navigation);

  const status = document.createElement('div');
  status.id = 'reading-status';
  status.setAttribute('data-html2canvas-ignore', '');
  const label = document.createElement('span');
  const resume = document.createElement('button');
  resume.type = 'button';
  resume.addEventListener('click', resumeReading);
  status.append(label, resume);
  if (!store.get('static')) document.body.appendChild(status);

  const refresh = () => {
    const strings = readingStrings();
    const paused = !!store.get('paused');
    pause.innerHTML = readingIcon(paused ? 'play' : 'pause');
    pause.title = paused ? strings.resume : strings.pause;
    pause.setAttribute('aria-label', pause.title);
    pause.setAttribute('aria-pressed', String(paused));
    pause.disabled = !store.get('active-quote') || !!store.get('quote');
    const quote = store.get('active-quote');
    previous.title = strings.previousQuote;
    previous.setAttribute('aria-label', strings.previousQuote);
    counter.textContent = quote && !quote.fallback ? `${quote.index + 1}/${quote.variants}` : '0/0';
    next.title = strings.nextQuote;
    next.setAttribute('aria-label', strings.nextQuote);
    next.disabled = changing || !quote || quote.fallback || quote.variants < 2 || !!store.get('quote');
    previous.disabled = next.disabled;
    status.hidden = !paused;
    label.textContent = `${strings.pausedAt} ${store.get('active-quote')?.time || store.get('time') || ''}`;
    resume.textContent = strings.resume;
  };
  store.subscribe(refresh);
  refresh();
}
