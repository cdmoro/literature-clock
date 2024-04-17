import { updateQuote } from "./quotes.js";
import {
  deleteUrlParamAndRefresh,
  getBooleanSetting,
  setBooleanSetting,
  toggleBooleanSetting,
  updateBooleanSettingButtonStatus,
} from "./settings.js";

export function initWorkMode(defaultValue = false) {
  const value = getBooleanSetting("work", defaultValue);
  setBooleanSetting("work", value);
  updateBooleanSettingButtonStatus("work", value);

  document.getElementById("work").addEventListener("click", toggleWorkMode);
}

function toggleWorkMode() {
  const isWorkMode = toggleBooleanSetting("work");

  deleteUrlParamAndRefresh("work");

  updateBooleanSettingButtonStatus("work", isWorkMode);
  const sfw = document.getElementById("quote").dataset.sfw;

  if (isWorkMode && sfw === "nsfw") {
    updateQuote();
  }
}
