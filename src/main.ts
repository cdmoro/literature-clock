import { initModules } from './modules';
import { createStore } from './store';
import { contentLoaded } from './utils';

document.addEventListener('DOMContentLoaded', () => {
  createStore();
  initModules();
  contentLoaded();
});
