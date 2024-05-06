import { initLocale } from "./js/locales";
import { initTheme } from "./js/themes";
import { initZenMode } from "./js/zen";
import { initWorkMode } from "./js/work";
import { initClock } from "./js/clock";
import { initScreensaver } from "./js/screensaver";
import { initFont } from "./js/fonts";

document.addEventListener("DOMContentLoaded", () => {
  initZenMode(false);
  initWorkMode(false);
  initScreensaver(false);
  initTheme("base-dark");
  initLocale(navigator.language);
  initFont("default");
  initClock();

  document.body.removeAttribute("data-loading");
});
