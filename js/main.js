import { initLocale } from "./locales.js";
import { initTheme } from "./themes.js";
import { initZenMode } from "./zen.js";
import { initWorkMode } from "./work.js";
import { initClock } from "./clock.js";
import { initScreensaver } from "./screensaver.js";
import { initFont } from "./fonts.js";

document.addEventListener("DOMContentLoaded", () => {
  initZenMode(false);
  initWorkMode(false);
  initScreensaver(false);
  initTheme("base-dark");
  initLocale(navigator.language);
  initFont();
  initClock();

  document.body.removeAttribute("data-loading");
});
