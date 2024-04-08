const THEME_FONTS = {
    retro: 'VT323',
    elegant: 'Playfair Display',
    festive: 'Borel',
    bohemian: 'Atma',
};

export function loadFont(fontName) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400&display=swap`;
    document.head.appendChild(link);
}

function getTheme(newTheme) {
    let defaultTheme = "base-dark";
    const themeLocalStorage = localStorage.getItem("theme");
    const urlParams = new URLSearchParams(window.location.search);
    const themeQueryParam = urlParams.get('theme');
    // const themeSelect = document.getElementById('theme-select');
    const variantSelect = document.getElementById('variant-select');
    const variant = variantSelect.value;

    let theme = themeQueryParam || newTheme || themeLocalStorage || defaultTheme;

    if (theme.indexOf('-') < 0 && variant !== 'system') {
        theme += `-${variant}`;
    }

    return theme;
}

export function setTheme(newTheme, updateVariant = true) {
    const themeSelect = document.getElementById('theme-select');
    const variantSelect = document.getElementById('variant-select');
    let theme = getTheme(newTheme);

    themeSelect.value = theme.split('-')[0];

    if (updateVariant) {
        variantSelect.value = theme.indexOf('-') >= 0 ? theme.split('-')[1] : 'system';
    }

    if (THEME_FONTS[themeSelect.value]) {
        loadFont(THEME_FONTS[themeSelect.value]);
    }
    
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute("data-theme", theme);
}

export function setVariant(variant = 'system') {
    const themeSelect = document.getElementById('theme-select');
    const themePrefix = themeSelect.value;
    let theme = `${themePrefix}-${variant}`;
    
    if(variant === 'system' && window.matchMedia) {
        const preferDarkThemes = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = `${themePrefix}-${preferDarkThemes ? 'dark' : 'light'}`;
    }

    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute("data-theme", theme);
}