import { exitScreensaverMode } from "./screensaver";
import { store } from "../store";

export function initZenMode() {
  document.getElementById("zen")?.addEventListener("click", () => {
    const isZenMode = store.toggleState("zen");
    if (isZenMode) {
      exitScreensaverMode();
    }
  });
  document.getElementById("exit-zen")?.addEventListener("click", exitZenMode);
}

export function exitZenMode() {
  store.setState("zen", false)
}
