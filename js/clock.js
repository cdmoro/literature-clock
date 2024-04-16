import { updateQuote } from "./quotes.js";
import { getTime } from "./utils.js";

const urlParams = new URLSearchParams(window.location.search);
const testTime = urlParams.get("time");
const testQuote = urlParams.get("quote");
const quoteTimeBar = document.getElementById("time-progress-bar");
let lastTime;

async function updateTime(testTime) {
  const time = getTime();
  const now = new Date();
  const seconds = now.getSeconds();

  if (!testTime && !testQuote) {
    const percentage = ((seconds / 59) * 100).toFixed(2);
    quoteTimeBar.setAttribute("aria-valuenow", percentage);
    quoteTimeBar.style.width = `${percentage}%`;

    if (seconds === 0) {
      quoteTimeBar.style.transition = "none";
      quoteTimeBar.style.width = 0;

      setTimeout(() => (quoteTimeBar.style.transition = "width 1s linear"), 10);
    }
  }

  if (lastTime !== time) {
    document.title = document.title.replace(/[0-9]{2}:[0-9]{2}/, time);
    updateQuote(time);
    lastTime = time;
  }
}

export function initClock() {
  updateTime(testTime);

  if (!testTime && !testQuote) {
    setInterval(updateTime, 1000);
  }
}
