import { initLocale } from "./locales.js";
import { initTheme } from "./themes.js";
import { initZenMode } from "./zen.js";
import { initWorkMode } from "./work.js";
import { initClock } from "./clock.js";

document.addEventListener("DOMContentLoaded", () => {
  initZenMode(false);
  initWorkMode(false);
  initTheme("base-dark");
  initLocale(navigator.language);
  initClock();
  document.body.removeAttribute("data-loading");
});
