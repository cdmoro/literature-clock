import { updateQuote } from './quotes';
import { getTime, updateFavicon } from '../utils';
import { setDayParameters } from './dynamic';
import { fadeOutQuote } from './fade';
import { removeBackgroundImage, setDynamicBackgroundPicture } from './themes';
import { store } from '../store';

const timeProgressBar = document.getElementById('time-progress-bar');
let lastTime: string;

function updateProgressBar() {
  const now = new Date();
  const time = parseFloat(`${now.getSeconds()}.${now.getMilliseconds().toString().padStart(3, '0')}`);
  const percentage = ((time / 60) * 100).toFixed(4);

  if (timeProgressBar) {
    timeProgressBar.setAttribute('aria-valuenow', percentage);
    timeProgressBar.style.width = `${percentage}%`;
  }
}

async function updateTime() {
  const time = store.getState('time') || getTime();

  if (store.getState('fade')) {
    fadeOutQuote();
  }

  if (lastTime !== time) {
    if (time.includes(':00') || time.includes(':30')) {
      updateFavicon(time);
    }

    if (store.getState('theme')?.startsWith('dynamic')) {
      setDayParameters();
    }

    if (store.getState('theme')?.startsWith('photo')) {
      setDynamicBackgroundPicture();
    } else {
      removeBackgroundImage();
    }

    document.title = document.title.replace(/[0-9]{2}:[0-9]{2}/, time);

    const timeEl = document.getElementById('time-clock');
    if (timeEl) {
      timeEl.innerHTML = time;
    }

    updateQuote({ time });
    lastTime = time;
  }
}

export function initClock() {
  const testTime = store.getState('time');
  const testQuote = store.getState('quote');
  const isTest = !!(testTime || testQuote);

  updateTime();

  if (!isTest) {
    setInterval(updateTime, 1000);
    setInterval(updateProgressBar, 10);
  }
}
