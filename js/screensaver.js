import {
  initBooleanSetting,
  setBooleanSetting,
  toggleBooleanSetting,
  updateBooleanSettingButtonStatus,
  updateURL,
} from "./settings.js";

const INTERVAL = 15000;
let screensaverInterval;

function screensaver() {
  const quote = document.getElementById("quote");

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

  if (value) {
    screensaver();
    screensaverInterval = setInterval(screensaver, INTERVAL);
  } else {
    clearInterval(screensaverInterval);
  }

  document
    .getElementById("screensaver")
    .addEventListener("click", toggleScreensaverMode);
}

function toggleScreensaverMode() {
  const isScreensaverMode = toggleBooleanSetting("screensaver");

  updateURL("screensaver", isScreensaverMode);
  updateBooleanSettingButtonStatus("screensaver", isScreensaverMode);

  if (isScreensaverMode) {
    screensaver();
    screensaverInterval = setInterval(screensaver, INTERVAL);
  } else {
    clearInterval(screensaverInterval);
  }
}
