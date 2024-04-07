/**
 * Initializes the work mode based on URL parameters or local storage.
 * If no work mode is specified in URL parameters or local storage, default is set to false.
 */
export function initWorkMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const workQueryParam = urlParams.get('work') === 'true';
    const workLocalStorage = localStorage.getItem("work") === 'true';
    const input = document.getElementById('work-mode-input');
    const workMode = workQueryParam || workLocalStorage || false;

    input.checked = workMode;
    localStorage.setItem('work', workMode);
}

/**
 * Sets the work mode status in the local storage.
 * @param {boolean} checked - The new work mode status to be set.
 */
export function setWorkMode(checked) {
    localStorage.setItem('work', checked);
}

/**
 * Retrieves the work mode from a checkbox input.
 * @returns {boolean} The current work mode, true if checked, false otherwise.
 */
export function isWorkMode() {
    const input = document.getElementById('work-mode-input');
    return input.checked;
}