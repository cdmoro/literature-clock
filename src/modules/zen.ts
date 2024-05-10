import {
  initBooleanSetting,
  setBooleanSetting,
  toggleBooleanSetting,
  updateBooleanSettingButtonStatus,
  updateURL,
} from "../utils/settings";

export function initZenMode(defaultValue: boolean = false) {
  const value = initBooleanSetting("zen", defaultValue);
  setBooleanSetting("zen", value);
  updateBooleanSettingButtonStatus("zen", value);

  document.getElementById("zen")?.addEventListener("click", () => {
    const isZenMode = toggleBooleanSetting("zen");

    setBooleanSetting("zen", isZenMode);
    updateURL("zen", isZenMode);
    updateBooleanSettingButtonStatus("zen", isZenMode);
  });
  document.getElementById("exit-zen")?.addEventListener("click", exitZenMode);
}

export function exitZenMode() {
  setBooleanSetting("zen", false);
  updateURL("zen", false);
  updateBooleanSettingButtonStatus("zen", false);
}
