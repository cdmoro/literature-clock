import { initLocale } from "./modules/locales";
import { initTheme } from "./modules/themes";
import { initZenMode } from "./modules/zen";
import { initWorkMode } from "./modules/work";
import { initClock } from "./modules/clock";
import { initScreensaver } from "./modules/screensaver";
import { initFont } from "./modules/fonts";
import { getTime, updateFavicon } from "./utils/utils";

document.addEventListener("DOMContentLoaded", () => {
  updateFavicon();
  initZenMode(false);
  initWorkMode(false);
  initScreensaver(false);
  initTheme("base-dark");
  initLocale(navigator.language);
  initFont("default");
  initClock();

  document.body.removeAttribute("data-loading");
});
