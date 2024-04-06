import { initTheme } from "./themes.js";
import { setLocale } from "./locales.js";

function updateLanguage(e) {
    setLocale(e.target.value);
}

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    setLocale();

    document.getElementById("language-select").addEventListener("change", updateLanguage);
    
    document.body.classList.remove("hidden");
});