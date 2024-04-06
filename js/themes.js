export function initTheme(){
    const urlParams = new URLSearchParams(window.location.search);
    const overrideTheme = urlParams.get('theme');

    let theme = "default-theme-light";
    const lsTheme = localStorage.getItem("theme");

    if (lsTheme) {
        theme = lsTheme;
    }

    if (window?.matchMedia("(prefers-color-scheme: dark)")) {
        theme = "default-theme-dark";
    }

    document.documentElement.setAttribute("data-theme", overrideTheme || theme);
}

export function setTheme(theme) {
    theme = `${theme}-theme-light`;

    if (window?.matchMedia("(prefers-color-scheme: dark)")) {
        theme = `${theme}-theme-dark`;
    }

    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
}