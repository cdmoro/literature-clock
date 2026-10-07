import { updateQuote } from './quotes';
import { getLiveTime, updateFavicon } from '../utils';
import { setDayParameters } from './horizon';
import { store } from '../store';
import { isClockVisible } from '../utils/visibility';

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
  const time = getLiveTime();
  if (store.get('theme')?.startsWith('horizon')) setDayParameters();

  if (lastTime !== time) {
    if (time.includes(':00') || time.includes(':30')) {
      updateFavicon(time);
    }

    document.title = document.title.replace(/[0-9]{2}:[0-9]{2}/, time);

    const timeEl = document.querySelector('#time-clock span');
    if (timeEl) {
      timeEl.textContent = time;
    }

    if (!store.get('paused')) {
      if (lastTime) void updateQuote({ time, minuteTick: true });
      else void updateQuote({ time });
    }
    lastTime = time;
  }
}

export function initClock() {
  lastTime = '';
  if (store.get('time')) store.set('paused', true, false);
  if (store.get('paused')) void updateQuote();
  void updateTime();

  if (!store.get('quote')) {
    let clockTimer: ReturnType<typeof setInterval> | undefined;
    let progressFrame: number | undefined;
    const animateProgress = () => {
      updateProgressBar();
      progressFrame = requestAnimationFrame(animateProgress);
    };
    const syncTimers = () => {
      clearInterval(clockTimer);
      if (progressFrame !== undefined) cancelAnimationFrame(progressFrame);
      progressFrame = undefined;
      if (!isClockVisible()) return;
      void updateTime();
      clockTimer = setInterval(updateTime, 1000);
      if (store.get('progressbar') !== 'none') {
        animateProgress();
      }
    };
    store.subscribe((state, previous) => {
      if (state.progressbar !== previous.progressbar) syncTimers();
    });
    document.addEventListener('visibilitychange', syncTimers);
    syncTimers();
  }
}
