import { initTheme } from "./themes.js";
import { setLocale } from "./locales.js";

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    setLocale("it");
    
    document.body.classList.remove("hidden");
});