import { updateBooleanSettingStatus } from '../store';

export function initFullscreenMode() {
  const fullscreenBtn = document.getElementById('fullscreen');
  if (document.fullscreenEnabled) {
    fullscreenBtn?.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', exitFullscreen);
  } else {
    fullscreenBtn?.remove();
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    updateBooleanSettingStatus('fullscreen', true);
  } else {
    document.exitFullscreen();
    updateBooleanSettingStatus('fullscreen', false);
  }
}

function exitFullscreen() {
  if (!document.fullscreenElement) {
    updateBooleanSettingStatus('fullscreen', false);
  }
}
