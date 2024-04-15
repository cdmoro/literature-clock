import { updateQuote } from "./quotes.js";
import {
  getBooleanSetting,
  isBooleanSettingActive,
  setBooleanSetting,
  toggleBooleanSetting,
  updateBooleanSettingButtonStatus,
} from "./settings.js";

/**
 * Initializes the work mode based on URL parameters or local storage.
 * If no work mode is specified in URL parameters or local storage, default is set to false.
 */
export function initWorkMode(defaultValue = false) {
  const value = getBooleanSetting("work", defaultValue);
  setBooleanSetting("work", value);
  updateBooleanSettingButtonStatus("work", value);

  document.getElementById("work").addEventListener("click", () => {
    const isWorkMode = toggleWorkMode();
    const quote = document.getElementById("quote");

    if (isWorkMode && quote.dataset.sfw == "nsfw") {
      updateQuote();
    }
  });
}

/**
 * Sets the work mode status in the local storage.
 * @param {boolean} checked - The new work mode status to be set.
 */
export function toggleWorkMode() {
  const value = toggleBooleanSetting("work");
  updateBooleanSettingButtonStatus("work", value);
  return value;
}

/**
 * Retrieves the work mode from a checkbox input.
 * @returns {boolean} The current work mode, true if checked, false otherwise.
 */
export function isWorkMode() {
  return isBooleanSettingActive("work");
}
