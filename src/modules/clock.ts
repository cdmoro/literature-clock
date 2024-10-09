import { updateQuote } from "./quotes";
import { getTime, updateFavicon } from "../utils/utils";
import { getStringSetting, isBooleanSettingTrue } from "../utils/settings";
import { setDayParameters } from "./dynamic";
import { fadeOutQuote } from "./fade";
import { removeBackgroundImage, setDynamicBackgroundPicture } from "./themes";

const urlParams = new URLSearchParams(window.location.search);
const testTime = urlParams.get("time");
const testQuote = urlParams.get("quote");
const isTest = !!(testTime || testQuote);
const timeProgressBar = document.getElementById("time-progress-bar");
let lastTime: string;

function updateProgressBar() {
  const now = new Date(); 
  const time = parseFloat(`${now.getSeconds()}.${now.getMilliseconds().toString().padStart(3, "0")}`);
  const percentage = ((time / 60) * 100).toFixed(4);

  if (timeProgressBar) {
    timeProgressBar.setAttribute("aria-valuenow", percentage);
    timeProgressBar.style.width = `${percentage}%`;
  }
}

async function updateTime() {
  const time = testTime || getTime();

  if (isBooleanSettingTrue("fade")) {
    fadeOutQuote();
  }

  if (lastTime !== time) {
    if (time.includes(":00") || time.includes(":30")) {
      updateFavicon(time);
    }

    if (getStringSetting("theme")?.startsWith("dynamic")) {
      setDayParameters();
    }

    if (getStringSetting("theme")?.startsWith("photo")) {
      setDynamicBackgroundPicture();
    } else {
      removeBackgroundImage();
    }

    document.title = document.title.replace(/[0-9]{2}:[0-9]{2}/, time);
    
    const timeEl = document.getElementById("time-clock");
    if (timeEl) {
      timeEl.innerHTML = time;
    }
    
    updateQuote(time);
    lastTime = time;
  }
}

export function initClock() {
  updateTime();

  if (!isTest) {
    setInterval(updateTime, 1000);
    setInterval(updateProgressBar, 10);
  }
}
