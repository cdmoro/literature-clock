import { THEME_FONTS, resetFont } from "./fonts";
import {
  initStringSetting,
  setStringSetting,
  updateURL,
} from "../utils/settings";
import { doFitQuote, fitQuote, loadFontIfNotExists } from "../utils/utils";

function getRandomThemeColor() {
  let colors = Array.from(
    document.querySelectorAll<HTMLOptionElement>("#colors option")
  ).map((op) => op.value);
  const [themePrefix] = (document.documentElement.dataset.theme || "").split(
    "-"
  );

  colors.pop();
  colors = colors.filter((color) => color !== themePrefix);

  return colors[Math.floor(Math.random() * colors.length)];
}

export function initTheme(defaultValue = "base-dark") {
  let [theme, variant = "system"] = initStringSetting(
    "theme",
    defaultValue
  ).split("-");
  const themeSelect =
    document.querySelector<HTMLSelectElement>("#theme-select");
  const variantSelect =
    document.querySelector<HTMLSelectElement>("#variant-select");
  const preferDarkThemes = window.matchMedia("(prefers-color-scheme: dark)");

  setStringSetting("theme", `${theme}-${variant}`);
  if (theme && THEME_FONTS[theme]) {
    THEME_FONTS[theme].forEach((font) => {
      loadFontIfNotExists(font);
    });
  }
  if (themeSelect) {
    themeSelect.value = theme;
  }
  if (variantSelect) {
    variantSelect.value = variant;
  }

  if (theme === "color") {
    theme = getRandomThemeColor();
  }
  if (variant === "system") {
    variant = preferDarkThemes.matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = `${theme}-${variant}`;

  window.addEventListener("resize", doFitQuote);
  themeSelect?.addEventListener("change", () => setTheme());
  variantSelect?.addEventListener("change", () => setTheme());
  preferDarkThemes.addEventListener("change", (e) => {
    const variant =
      document.querySelector<HTMLSelectElement>("#variant-select")?.value;

    if (variant === "system") {
      const theme =
        document.querySelector<HTMLSelectElement>("#theme-select")?.value;

      setStringSetting("theme", `${theme}-system`);
      document.documentElement.dataset.theme = `${theme}-${
        e.matches ? "dark" : "light"
      }`;
    }
  });
}

export function setTheme(doUpdateURL = true) {
  const p = document.querySelector<HTMLParagraphElement>("blockquote p");

  if (p) {
    p.style.visibility = "hidden";
  }

  let theme = document.querySelector<HTMLSelectElement>("#theme-select")?.value;
  let variant =
    document.querySelector<HTMLSelectElement>("#variant-select")?.value;

  if (theme && THEME_FONTS[theme]) {
    THEME_FONTS[theme].forEach((font) => {
      loadFontIfNotExists(font);
    });
    resetFont();
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
