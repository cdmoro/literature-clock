import {
  initBooleanSetting,
  setBooleanSetting,
  toggleBooleanSetting,
  updateBooleanSettingButtonStatus,
  updateURL,
} from "./settings.js";

const INTERVAL = 5000;
const TRANSITION_DURATION = `${INTERVAL / 1000}s`;
let screensaverInterval;

function screensaver() {
  const quote = document.getElementById("quote");
  quote.style.transitionDuration = TRANSITION_DURATION;

  const getRandomNumber = (min, max) => Math.random() * (max - min) + min;
  const scale = getRandomNumber(0.7, 1.2);
  const windowHeight = window.innerHeight - 110 - 30;
  const windowWidth = window.innerWidth - 30;
  const quoteHeight = quote.offsetHeight * scale;
  const quoteWidth = quote.offsetWidth * scale;

  const xRange = (windowWidth - quoteWidth) / 2;
  const yRange = (windowHeight - quoteHeight) / 2;

  quote.style.transform = `scale(${scale}) translate(${getRandomNumber(
    xRange * -1,
    xRange
  )}px, ${getRandomNumber(yRange * -1, yRange)}px)`;
}

export function initScreensaver(defaultValue = false) {
  const value = initBooleanSetting("screensaver", defaultValue);
  setBooleanSetting("screensaver", value);
  updateBooleanSettingButtonStatus("screensaver", value);

  document
    .getElementById("screensaver")
    .addEventListener("click", toggleScreensaverMode);
}

export function startScreensaver() {
  screensaver();
  screensaverInterval = setInterval(screensaver, INTERVAL);
}

function toggleScreensaverMode() {
  const isScreensaverMode = toggleBooleanSetting("screensaver");

  updateURL("screensaver", isScreensaverMode);
  updateBooleanSettingButtonStatus("screensaver", isScreensaverMode);

  if (isScreensaverMode) {
    startScreensaver();
  } else {
    clearInterval(screensaverInterval);
  }
}
