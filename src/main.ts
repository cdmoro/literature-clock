import { initLocale } from "./modules/locales";
import { initTheme } from "./modules/themes";
import { initZenMode } from "./modules/zen";
import { initWorkMode } from "./modules/work";
import { initClock } from "./modules/clock";
import { initScreensaver } from "./modules/screensaver";
import { initFont } from "./modules/font";
import { onMouseMove, updateFavicon } from "./utils/utils";
import { initFadeMode } from "./modules/fade";
import { initTimeMode } from "./modules/time";
import { initCopy } from "./modules/copy";

document.addEventListener("DOMContentLoaded", () => {
  updateFavicon();
  initZenMode(false);
  initWorkMode(false);
  initFadeMode(false);
  initScreensaver(false);
  initTimeMode(false);
  initTheme("base-dark");
  initLocale(navigator.language);
  initFont("default");
  initClock();
  initCopy();

  document.addEventListener("mousemove", onMouseMove);
  document.body.removeAttribute("data-loading");
});
