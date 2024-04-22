import { initLocale } from "./locales.js";
import { initTheme } from "./themes.js";
import { initZenMode } from "./zen.js";
import { initWorkMode } from "./work.js";
import { initClock } from "./clock.js";
import { fitQuote } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  initZenMode(false);
  initWorkMode(false);
  initTheme("base-dark");
  initLocale(navigator.language);
  initClock();
  setTimeout(fitQuote, 10);

  window.addEventListener("resize", fitQuote);
  document.addEventListener("visibilitychange", () =>
    document.body.classList.toggle(
      "blur",
      document.visibilityState === "hidden"
    )
  );
  document.body.removeAttribute("data-loading");
});
