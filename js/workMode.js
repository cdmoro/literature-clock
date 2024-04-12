import { getStrings } from "./locales.js";

/**
 * Initializes the work mode based on URL parameters or local storage.
 * If no work mode is specified in URL parameters or local storage, default is set to false.
 */
export function initWorkMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const workQueryParam = urlParams.get('work') === 'true';
    const workLocalStorage = localStorage.getItem("work") === 'true';
    const workMode = workQueryParam || workLocalStorage || false;

    updateWorkModeLabel(workMode);
    localStorage.setItem('work', workMode);
}

/**
 * Sets the work mode status in the local storage.
 * @param {boolean} checked - The new work mode status to be set.
 */
export function toggleWorkMode() {
    const newState = !isWorkMode();

    updateWorkModeLabel(newState);
    localStorage.setItem('work', newState);
}

/**
 * Retrieves the work mode from a checkbox input.
 * @returns {boolean} The current work mode, true if checked, false otherwise.
 */
export function isWorkMode() {
    return localStorage.getItem('work') === 'true';
}

function updateWorkModeLabel(newState) {
    const strings = getStrings();
    const workModeEl = document.getElementById("work-mode");

    workModeEl.textContent = strings.work_mode;
    workModeEl.classList.toggle('active', newState);
}