import {
  deleteUrlParamAndRefresh,
  getBooleanSetting,
  setBooleanSetting,
} from "./settings.js";

export function initZenMode(defaultValue = false) {
  const value = getBooleanSetting("zen", defaultValue);
  setBooleanSetting("zen", value);

  document.getElementById("zen").addEventListener("click", () => {
    setBooleanSetting("zen", true);
    deleteUrlParamAndRefresh("zen");
  });
  document.getElementById("exit-zen").addEventListener("click", () => {
    setBooleanSetting("zen", false);
    deleteUrlParamAndRefresh("zen");
  });
}
