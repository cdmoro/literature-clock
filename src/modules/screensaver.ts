import {
  initBooleanSetting,
  setBooleanSetting,
  toggleBooleanSetting,
  updateBooleanSettingButtonStatus,
  updateURL,
} from "../utils/settings";
import { exitZenMode } from "./zen";

const INTERVAL = 10000;
const TRANSITION_DURATION = `${INTERVAL / 1000}s`;
let screensaverInterval: NodeJS.Timeout;
let mouseTimeout: NodeJS.Timeout;

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

export function initScreensaver(defaultValue = false) {
  const value = initBooleanSetting("screensaver", defaultValue);
  const footer = document.querySelector<HTMLElement>("footer");

  setBooleanSetting("screensaver", value);
  updateBooleanSettingButtonStatus("screensaver", value);

  if (value) {
    exitZenMode();
  }

  if (value) {
    footer?.classList.add("hidden");
  }

  document
    .getElementById("screensaver")
    ?.addEventListener("click", toggleScreensaverMode);
}

function onMouseMove() {
  const footer = document.querySelector<HTMLElement>("footer");
  footer?.classList.remove("hidden");

  clearTimeout(mouseTimeout);
  mouseTimeout = setTimeout(() => {
    footer?.classList.add("hidden");
  }, 1000);
}

export function startScreensaver() {
  clearInterval(screensaverInterval);

  screensaver();
  screensaverInterval = setInterval(screensaver, INTERVAL);

  document.addEventListener("mousemove", onMouseMove);
}

function toggleScreensaverMode() {
  const isScreensaverMode = toggleBooleanSetting("screensaver");
  const footer = document.querySelector<HTMLElement>("footer");

  updateURL("screensaver", isScreensaverMode);
  updateBooleanSettingButtonStatus("screensaver", isScreensaverMode);

  if (isScreensaverMode) {
    footer?.classList.add("hidden");
    startScreensaver();
    exitZenMode();
  } else {
    exitScreensaverMode();
  }
}

export function exitScreensaverMode() {
  const footer = document.querySelector<HTMLElement>("footer");

  document.removeEventListener("mousemove", onMouseMove);
  clearInterval(screensaverInterval);

  setBooleanSetting("screensaver", false);
  updateURL("screensaver", false);
  updateBooleanSettingButtonStatus("screensaver", false);

  footer?.classList.remove("hidden");
}
