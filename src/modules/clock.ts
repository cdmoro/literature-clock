import { updateQuote } from "./quotes";
import { getTime, updateFavicon } from "../utils/utils";
import { getStringSetting } from "../utils/settings";
import { setDayParameters } from "./dynamic";

const urlParams = new URLSearchParams(window.location.search);
const testTime = urlParams.get("time");
const testQuote = urlParams.get("quote");
const isTest = !!(testTime || testQuote);
const timeProgressBar = document.getElementById("time-progress-bar");
let lastTime: string;

function updateProgressBar() {
  const now = new Date();
  const seconds = now.getSeconds();
  const percentage = ((seconds / 59) * 100).toFixed(2);

  if (timeProgressBar) {
    timeProgressBar.setAttribute("aria-valuenow", percentage);
    timeProgressBar.style.width = `${percentage}%`;

    if (seconds === 0) {
      timeProgressBar.style.transition = "none";
      timeProgressBar.style.width = "0";

      setTimeout(
        () => (timeProgressBar.style.transition = "width 1s linear"),
        10
      );
    }
  }
}

async function updateTime() {
  const time = testTime || getTime();

  if (!isTest) {
    updateProgressBar();
  }

  if (lastTime !== time) {
    if (time.includes(":00") || time.includes(":30")) {
      updateFavicon(time);
    }

    if (getStringSetting("theme")?.startsWith("dynamic")) {
      setDayParameters();
    }

    document.title = document.title.replace(/[0-9]{2}:[0-9]{2}/, time);
    updateQuote(time);
    lastTime = time;
  }
}

export function initClock() {
  updateTime();

  if (!isTest) {
    setInterval(updateTime, 1000);
  }
}
