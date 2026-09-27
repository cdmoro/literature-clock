import { updateQuote } from './quotes';
import { getTime, updateFavicon } from '../utils';
import { setDayParameters } from './horizon';
import { store } from '../store';

let lastTime: string;

function updateProgressBar() {
  const timeProgressBar = document.getElementById('progress-bar');
  const now = new Date();
  const time = parseFloat(`${now.getSeconds()}.${now.getMilliseconds().toString().padStart(3, '0')}`);
  const percentage = ((time / 60) * 100).toFixed(4);

  if (timeProgressBar) {
    timeProgressBar.setAttribute('aria-valuenow', percentage);
    timeProgressBar.style.width = `${percentage}%`;
  }
}

async function updateTime() {
  const time = store.get('time') || getTime();
  if (store.get('theme')?.startsWith('horizon')) setDayParameters();

  if (lastTime !== time) {
    if (time.includes(':00') || time.includes(':30')) {
      updateFavicon(time);
    }

    document.title = document.title.replace(/[0-9]{2}:[0-9]{2}/, time);

    const timeEl = document.getElementById('time-clock');
    if (timeEl) {
      timeEl.textContent = time;
    }

    updateQuote({ time });
    lastTime = time;
  }
}

export function initClock() {
  const testTime = store.get('time');
  const testQuote = store.get('quote');
  const isTest = !!(testTime || testQuote);

  updateTime();

  if (!isTest) {
    let clockTimer: ReturnType<typeof setInterval> | undefined;
    let progressTimer: ReturnType<typeof setInterval> | undefined;
    const syncTimers = () => {
      clearInterval(clockTimer);
      clearInterval(progressTimer);
      if (document.hidden) return;
      void updateTime();
      clockTimer = setInterval(updateTime, 1000);
      if (store.get('progressbar')) {
        updateProgressBar();
        progressTimer = setInterval(updateProgressBar, 100);
      }
    };
    store.subscribe((state, previous) => {
      if (state.progressbar !== previous.progressbar) syncTimers();
    });
    document.addEventListener('visibilitychange', syncTimers);
    syncTimers();
  }
}
