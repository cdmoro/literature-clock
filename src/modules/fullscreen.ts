import { updateBooleanSettingButtonStatus } from "../utils/settings";

export function initFullscreen() {
    const fullscreenBtn = document.getElementById("fullscreen");
    if (document.fullscreenEnabled) {
        fullscreenBtn?.addEventListener("click", toggleFullscreen);
    } else {
        fullscreenBtn?.remove();
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        updateBooleanSettingButtonStatus("fullscreen", true);
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
        updateBooleanSettingButtonStatus("fullscreen", false);
    }
}