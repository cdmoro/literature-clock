import { updateQuote } from "./quotes.js";
import { initBooleanSetting, toggleBooleanSetting } from "./utils.js";

/**
 * Initializes the work mode based on URL parameters or local storage.
 * If no work mode is specified in URL parameters or local storage, default is set to false.
 */
export function initWorkMode(defaultValue = false) {
  const value = initBooleanSetting("work", defaultValue);
  setWorkModeButtonClass(value);

  document.getElementById("work-mode").addEventListener("click", () => {
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
  setWorkModeButtonClass(value);
  return value;
}

/**
 * Retrieves the work mode from a checkbox input.
 * @returns {boolean} The current work mode, true if checked, false otherwise.
 */
export function isWorkMode() {
  return localStorage.getItem("work") === "true";
}

function setWorkModeButtonClass(value) {
  const workModeButton = document.getElementById("work-mode");
  workModeButton.classList.toggle("active", value);
}
