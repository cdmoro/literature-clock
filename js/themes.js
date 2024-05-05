import { initStringSetting, setStringSetting, updateURL } from "./settings.js";
import { doFitQuote, fitQuote, loadFontIfNotExists } from "./utils.js";

const THEME_FONTS = {
  retro: "VT323",
  elegant: "Playfair Display",
  festive: "Borel",
  bohemian: "Comfortaa",
  handwriting: "Reenie Beanie",
  anaglyph: "Anton",
  whatsapp: "Roboto",
  terminal: "B612 Mono",
  frame: "Playfair Display",
};

function getRandomThemeColor() {
  let colors = Array.from(document.querySelectorAll("#colors option")).map(
    (op) => op.value
  );
  const [themePrefix] = document.documentElement.dataset.theme.split("-");

  colors.pop();
  colors = colors.filter((color) => color !== themePrefix);

  return colors[Math.floor(Math.random() * colors.length)];
}

export function initTheme(defaultValue = "base-dark") {
  let [theme, variant = "system"] = initStringSetting(
    "theme",
    defaultValue
  ).split("-");
  const themeSelect = document.getElementById("theme-select");
  const variantSelect = document.getElementById("variant-select");
  const preferDarkThemes = window.matchMedia("(prefers-color-scheme: dark)");

  setStringSetting("theme", `${theme}-${variant}`);
  if (THEME_FONTS[theme]) {
    loadFontIfNotExists(THEME_FONTS[theme]);
  }
  themeSelect.value = theme;
  variantSelect.value = variant;

  if (theme === "color") {
    theme = getRandomThemeColor();
  }
  if (variant === "system") {
    variant = preferDarkThemes.matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = `${theme}-${variant}`;

  window.addEventListener("resize", doFitQuote);
  themeSelect.addEventListener("change", setTheme);
  variantSelect.addEventListener("change", setTheme);
  preferDarkThemes.addEventListener("change", (e) => {
    const variant = document.getElementById("variant-select").value;

    if (variant === "system") {
      const theme = document.getElementById("theme-select").value;

      setStringSetting("theme", `${theme}-system`);
      document.documentElement.dataset.theme = `${theme}-${
        e.matches ? "dark" : "light"
      }`;
    }
  });
}

export function setTheme(doUpdateURL = true) {
  const p = document.querySelector("blockquote p");

  if (p) {
    p.style.visibility = "hidden";
  }

  let theme = document.getElementById("theme-select").value;
  let variant = document.getElementById("variant-select").value;

  if (THEME_FONTS[theme]) {
    loadFontIfNotExists(THEME_FONTS[theme]);
  }
  setStringSetting("theme", `${theme}-${variant}`);
  if (doUpdateURL) {
    updateURL("theme", `${theme}-${variant}`);
  }

  if (theme === "color") {
    theme = getRandomThemeColor();
  }
  if (variant === "system") {
    variant = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  document.documentElement.dataset.theme = `${theme}-${variant}`;
  fitQuote();

  if (p) {
    setTimeout(() => (p.style.visibility = "visible"), 50);
  }
}
