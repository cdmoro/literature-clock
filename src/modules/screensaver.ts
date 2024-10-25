import { store } from "../store";
import { exitZenMode } from "./zen";

const INTERVAL = 10000;
const TRANSITION_DURATION = `${INTERVAL / 1000}s`;
let screensaverInterval: NodeJS.Timeout;

function screensaver() {
  const quote = document.getElementById("quote");
  if (quote) {
    quote.style.transitionDuration = TRANSITION_DURATION;

    const getRandomNumber = (min: number, max: number) =>
      Math.random() * (max - min) + min;
    const scale = getRandomNumber(0.6, 1);
    const windowHeight = window.innerHeight - 30;
    const windowWidth = window.innerWidth - 30;
    const quoteHeight = quote?.offsetHeight * scale;
    const quoteWidth = quote?.offsetWidth * scale;

    const xRange = (windowWidth - quoteWidth) / 2;
    const yRange = (windowHeight - quoteHeight) / 2;

    quote.style.transform = `scale(${scale}) translate(${getRandomNumber(
      xRange * -1,
      xRange
    )}px, ${getRandomNumber(yRange * -1, yRange)}px)`;
  }
}

export function initScreensaver() {
  const value = store.getState("screensaver");

  if (value) {
    startScreensaver();
    exitZenMode();
  }

  document
    .getElementById("screensaver")
    ?.addEventListener("click", toggleScreensaverMode);
}

export function startScreensaver() {
  document.querySelector("footer")?.classList.add("hidden");
  clearInterval(screensaverInterval);

  screensaver();
  screensaverInterval = setInterval(screensaver, INTERVAL);
}

function toggleScreensaverMode() {
  const isScreensaverMode = store.toggleState("screensaver");

  if (isScreensaverMode) {
    startScreensaver();
    exitZenMode();
  } else {
    exitScreensaverMode();
  }
}

export function exitScreensaverMode() {
  clearInterval(screensaverInterval);
  store.setState("screensaver", false);
}
