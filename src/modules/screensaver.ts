import { store } from '../store';

const INTERVAL = 10000;
const TRANSITION_DURATION = `${INTERVAL / 1000}s`;
let screensaverInterval: NodeJS.Timeout;

function screensaver() {
  const quote = document.getElementById('quote');
  if (quote) {
    quote.style.transitionDuration = TRANSITION_DURATION;

    const getRandomNumber = (min: number, max: number) => Math.random() * (max - min) + min;
    const scale = getRandomNumber(0.6, 1);
    const windowHeight = window.innerHeight - 30;
    const windowWidth = window.innerWidth - 30;
    const quoteHeight = quote.offsetHeight * scale;
    const quoteWidth = quote.offsetWidth * scale;

    const xRange = (windowWidth - quoteWidth) / 2;
    const yRange = (windowHeight - quoteHeight) / 2;

    quote.style.transform = `scale(${scale}) translate(${getRandomNumber(
      xRange * -1,
      xRange,
    )}px, ${getRandomNumber(yRange * -1, yRange)}px)`;
  }
}

export function initScreensaverMode() {
  if (store.get('screensaver')) {
    startScreensaver();
  }

  document.getElementById('screensaver')?.addEventListener('click', toggleScreensaverMode);
}

export function startScreensaver() {
  document.querySelector('footer')?.classList.add('hidden');
  clearInterval(screensaverInterval);

  // TODO: Investigate why setTimeout is needed
  setTimeout(screensaver, 1);
  screensaverInterval = setInterval(screensaver, INTERVAL);
}

function toggleScreensaverMode() {
  if (store.toggle('screensaver')) {
    startScreensaver();
    return;
  }

  exitScreensaverMode();
}

export function exitScreensaverMode() {
  clearInterval(screensaverInterval);
  store.set('screensaver', false);
}
