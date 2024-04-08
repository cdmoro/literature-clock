function getTheme(newTheme) {
    let defaultTheme = "base-dark";
    const themeLocalStorage = localStorage.getItem("theme");
    const urlParams = new URLSearchParams(window.location.search);
    const themeQueryParam = urlParams.get('theme');
    const variantSelect = document.getElementById('variant-select');
    const variant = variantSelect.value;

    let theme = themeQueryParam || newTheme || themeLocalStorage || defaultTheme;

    if (theme.indexOf('-') < 0) {
        theme += `-${variant}`;
    }

    return theme;
}

export function setTheme(newTheme, updateVariant = true) {
    const themeSelect = document.getElementById('theme-select');
    const variantSelect = document.getElementById('variant-select');
    const urlParams = new URLSearchParams(window.location.search);
    // const themeQueryParam = urlParams.get('theme');
    let theme = getTheme(newTheme);

    // if (!themeQueryParam && variantSelect.value === 'system') {
    //     theme = theme.split("-")[0];
    //     theme += `-${window?.matchMedia("(prefers-color-scheme: dark)") ? 'dark' : 'light'}`;
    // }

    themeSelect.value = theme.split('-')[0];

    if (updateVariant) {
        variantSelect.value = theme.indexOf('-') >= 0 ? theme.split('-')[1] : 'system';
    }
    
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute("data-theme", theme);
}

export function setVariant(variant) {
    let theme = getTheme().split('-')[0];
    
    if(variant !== 'system') {
        theme = `${theme}-${variant}`
    }

    setTheme(theme);
}

// export function setTheme(theme) {
//     theme = `${theme}-light`;

//     if (window?.matchMedia("(prefers-color-scheme: dark)")) {
//         theme = `${theme}-dark`;
//     }

//     localStorage.setItem("theme", theme);
//     document.documentElement.setAttribute("data-theme", theme);
// }