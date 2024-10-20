import { updateBooleanSettingButtonStatus } from "../utils/settings";

export function initFullscreen() {
    document.getElementById("fullscreen")?.addEventListener("click", toggleFullscreen);
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