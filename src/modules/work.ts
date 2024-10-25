import { updateQuote } from './quotes';
import {
  initBooleanSetting,
  setBooleanSetting,
  toggleBooleanSetting,
  updateBooleanSettingButtonStatus,
  updateURL,
} from '../utils/settings';

export function initWorkMode(defaultValue = false) {
  const value = initBooleanSetting('work', defaultValue);
  setBooleanSetting('work', value);
  updateBooleanSettingButtonStatus('work', value);

  document.getElementById('work')?.addEventListener('click', toggleWorkMode);
}

function toggleWorkMode() {
  const quote = document.getElementById('quote');
  const isWorkMode = toggleBooleanSetting('work');

  updateURL('work', isWorkMode);
  updateBooleanSettingButtonStatus('work', isWorkMode);

  if ((isWorkMode && quote?.dataset.sfw === 'nsfw') || (!isWorkMode && quote?.dataset.fallback === 'true')) {
    updateQuote();
  }
}
