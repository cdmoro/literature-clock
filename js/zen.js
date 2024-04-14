import { initBooleanSetting, setBooleanSetting } from "./utils.js";

/**
 * Initializes the zen mode based on URL parameters or local storage.
 * If no zen mode is specified in URL parameters or local storage, default is set to false.
 */
export function initZenMode(defaultValue = false) {
  initBooleanSetting("zen", defaultValue);

  document
    .getElementById("zen-mode")
    .addEventListener("click", () => setBooleanSetting("zen", true));
  document
    .getElementById("exit-zen")
    .addEventListener("click", () => setBooleanSetting("zen", false));
}
