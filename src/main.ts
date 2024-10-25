import { initLocale, resolveLocale } from "./modules/locales";
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
import { initShare } from "./modules/share";
import { initFullscreen } from "./modules/fullscreen";
import { createStore } from "./store";

document.addEventListener("DOMContentLoaded", () => {
  createStore({
    locale: resolveLocale(navigator.language),
    screensaver: false,
    work: false,
    zen: false,
    fade: false,
    showtime: false,
    font: "default",
    theme: "base-dark"
  })
  
  updateFavicon();
  initZenMode();
  initWorkMode();
  initFadeMode();
  initScreensaver();
  initTimeMode();
  initTheme();
  initLocale();
  initFont();
  initClock();
  initCopy();
  initShare();
  initFullscreen();

  document.addEventListener("mousemove", onMouseMove);
  document.body.removeAttribute("data-loading");
});
