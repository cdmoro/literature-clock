export function initZenMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const zenQueryParam = urlParams.get('zen');
    const zenLocalStorage = localStorage.getItem("zen");
    const input = document.getElementById('zen-mode-input');
    const zenMode = zenQueryParam || zenLocalStorage || false;

    document.body.classList.toggle('zen-mode', zenMode);
    input.checked = zenMode;
    localStorage.setItem('zen', zenMode);
}

export function setZenMode(checked) {
    document.body.classList.toggle('zen-mode', checked);
    localStorage.setItem('zen', checked);
}

export function isZenMode() {
    const input = document.getElementById('zen-mode-input');
    return input.checked;
}

export function exitZenMode() {
    const input = document.getElementById('zen-mode-input');
    input.checked = false;
    setZenMode(false);
}