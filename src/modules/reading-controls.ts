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
  void updateQuote({ time: getLiveTime() });
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
  group.appendChild(pause);
  document.getElementById('settings')?.prepend(group);

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
    pause.textContent = paused ? '▶' : 'Ⅱ';
    pause.title = paused ? strings.resume : strings.pause;
    pause.setAttribute('aria-label', pause.title);
    pause.setAttribute('aria-pressed', String(paused));
    pause.disabled = !store.get('active-quote') || !!store.get('quote');
    status.hidden = !paused;
    label.textContent = `${strings.pausedAt} ${store.get('active-quote')?.time || store.get('time') || ''}`;
    resume.textContent = strings.resume;
  };
  store.subscribe(refresh);
  refresh();
}
