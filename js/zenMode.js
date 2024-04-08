/**
 * Initializes the zen mode based on URL parameters or local storage.
 * If no zen mode is specified in URL parameters or local storage, default is set to false.
 */
export function initZenMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const zenQueryParam = urlParams.get('zen') === 'true';
    const zenLocalStorage = localStorage.getItem("zen") === 'true';
    const zenMode = zenQueryParam || zenLocalStorage || false;

    document.body.classList.toggle('zen-mode', zenMode);
    localStorage.setItem('zen', zenMode);
}

/**
 * Sets the Zen Mode.
 * @param {boolean} checked - Boolean indicating whether Zen Mode should be activated or deactivated.
 */
export function setZenMode(checked) {
    document.body.classList.toggle('zen-mode', checked);
    localStorage.setItem('zen', checked);
}

/**
 * Checks whether Zen Mode is currently active.
 * @returns {boolean} - Returns true if Zen Mode is active, otherwise false.
 */
export function isZenMode() {
    return document.body.classList.contains('zen-mode');
}