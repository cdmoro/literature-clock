import {
  initBooleanSetting,
  setBooleanSetting,
  toggleBooleanSetting,
  updateBooleanSettingButtonStatus,
  updateURL,
} from "../utils/settings";

export function initFadeMode(defaultValue = false) {
  const value = initBooleanSetting("fade", defaultValue);
  setBooleanSetting("fade", value);
  updateBooleanSettingButtonStatus("fade", value);

  document.getElementById("fade")?.addEventListener("click", toggleFadeMode);
}

function toggleFadeMode() {
  const isFadeMode = toggleBooleanSetting("fade");

  updateURL("fade", isFadeMode);
  updateBooleanSettingButtonStatus("fade", isFadeMode);
}

export function fadeOutQuote() {
  const now = new Date();
  const seconds = now.getSeconds();

  if (seconds == 59) {
    const blockquote = document.getElementById("quote");

    blockquote?.classList.remove("fade-in");
    blockquote?.classList.add("fade-out");
  }
}

export function fadeInQuote() {
    const blockquote = document.getElementById("quote");
    
    blockquote?.classList.remove("fade-out");
    blockquote?.classList.add("fade-in");
}
