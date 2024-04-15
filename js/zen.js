import { getBooleanSetting, setBooleanSetting } from "./settings.js";

/**
 * Initializes the zen mode based on URL parameters or local storage.
 * If no zen mode is specified in URL parameters or local storage, default is set to false.
 */
export function initZenMode(defaultValue = false) {
  const value = getBooleanSetting("zen", defaultValue);
  setBooleanSetting("zen", value);

  document
    .getElementById("zen")
    .addEventListener("click", () => setBooleanSetting("zen", true));
  document
    .getElementById("exit-zen")
    .addEventListener("click", () => setBooleanSetting("zen", false));
}
