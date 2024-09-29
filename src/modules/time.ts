import {
  initBooleanSetting,
  setBooleanSetting,
  toggleBooleanSetting,
  updateBooleanSettingButtonStatus,
  updateURL,
} from "../utils/settings";

export function initTimeMode(defaultValue = false) {
  const value = initBooleanSetting("showtime", defaultValue);
  setBooleanSetting("showtime", value);
  updateBooleanSettingButtonStatus("showtime", value);

  document.getElementById("showtime")?.addEventListener("click", toggleTimeMode);
}

function toggleTimeMode() {
  const isTimeMode = toggleBooleanSetting("showtime");

  updateURL("showtime", isTimeMode);
  updateBooleanSettingButtonStatus("showtime", isTimeMode);
}
