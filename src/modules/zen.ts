import {
  initBooleanSetting,
  setBooleanSetting,
  updateURL,
} from "../utils/settings";

export function initZenMode(defaultValue: boolean = false) {
  const value = initBooleanSetting("zen", defaultValue);
  setBooleanSetting("zen", value);

  document.getElementById("zen")?.addEventListener("click", () => {
    setBooleanSetting("zen", true);
    updateURL("zen", true);
  });
  document.getElementById("exit-zen")?.addEventListener("click", () => {
    setBooleanSetting("zen", false);
    updateURL("zen", false);
  });
}
