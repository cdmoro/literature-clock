import { setLocale, getStrings } from "./locales.js";
import { initTheme, setTheme, setVariant } from "./themes.js";
import { initZenMode } from "./zen.js";
import { initWorkMode } from "./work.js";
import { getTime } from "./utils.js";
import { updateQuote } from "./quotes.js";

const urlParams = new URLSearchParams(window.location.search);
const testTime = urlParams.get("time");
const testQuote = urlParams.get("quote");
const quoteTimeBar = document.getElementById("time-progress-bar");
let lastTime;
let pauseTimeBar = false;

async function updateTime(testTime) {
  const time = getTime();
  const now = new Date();
  const seconds = now.getSeconds();

  if (!testTime && !testQuote) {
    const percentage = (seconds / 60) * 100;
    quoteTimeBar.style.width = `${percentage.toFixed(2)}%`;
    quoteTimeBar.style.transition =
      seconds === 0 || pauseTimeBar ? "none" : "width 1s linear";
    quoteTimeBar.style.display = pauseTimeBar ? "none" : "block";
  }

  if (lastTime !== time) {
    const strings = getStrings();

    if (!testQuote) {
      document.title = `[${time}] ${strings.document_title}`;
    }

    updateQuote(time);
    lastTime = time;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initZenMode(false);
  initWorkMode(false);
  initTheme("base-dark");
  // initLocale("en-US");
  // setTheme();
  setLocale();

  document.getElementById("locale-select").addEventListener("change", (e) => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("locale")) {
      localStorage.setItem("locale", e.target.value);
      urlParams.delete("locale");
      window.location.search = urlParams.toString();
      return;
    }

    const isMulti = e.target.value === "multi";
    const newLocale = isMulti ? "en-US" : e.target.value;
    const time = getTime();
    const strings = getStrings(newLocale);

    setLocale(e.target.value);

    if (!testQuote) {
      document.title = `[${time}] ${strings.document_title}`;
    }

    if (!isMulti) {
      updateQuote(time);
    }
  });

  window.addEventListener("blur", () => (pauseTimeBar = true));
  window.addEventListener("focus", () => (pauseTimeBar = false));

  updateTime(testTime);

  if (!testTime && !testQuote) {
    setInterval(updateTime, 1000);
  }

  document.body.removeAttribute("data-loading");
});
