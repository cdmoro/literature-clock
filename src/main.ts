import { initModules } from './modules';
import { createStore } from './store';
import { onMouseMove, updateFavicon } from './utils';

document.addEventListener('DOMContentLoaded', () => {
  createStore();
  updateFavicon();
  initModules();

  document.addEventListener('mousemove', onMouseMove);
  document.body.removeAttribute('data-loading');
});
