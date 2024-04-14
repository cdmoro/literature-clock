import { getStrings } from "./locales.js";

/**
 * Initializes the work mode based on URL parameters or local storage.
 * If no work mode is specified in URL parameters or local storage, default is set to false.
 */
export function initWorkMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const workQueryParam = urlParams.get('work') === 'true';
    const workLocalStorage = localStorage.getItem("work") === 'true';
    let workMode = false;

    if (workLocalStorage) {
        workMode = workLocalStorage;
    }

    if (urlParams.has('work')) {
        workMode = workQueryParam;
    }

    updateWorkModeState(workMode);
    localStorage.setItem('work', workMode);
}

/**
 * Sets the work mode status in the local storage.
 * @param {boolean} checked - The new work mode status to be set.
 */
export function toggleWorkMode() {
    const newState = !isWorkMode();

    localStorage.setItem('work', newState);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('work')) {
        urlParams.delete('work');
        window.location.search = urlParams.toString();
    }

    updateWorkModeState(newState);
}

/**
 * Retrieves the work mode from a checkbox input.
 * @returns {boolean} The current work mode, true if checked, false otherwise.
 */
export function isWorkMode() {
    return localStorage.getItem('work') === 'true';
}

function updateWorkModeState(newState) {
    const workModeEl = document.getElementById("work-mode");
    workModeEl.classList.toggle('active', newState);
}