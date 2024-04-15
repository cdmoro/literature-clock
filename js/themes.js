import { getStringSetting, setStringSetting } from "./settings.js";

const THEME_FONTS = {
  retro: "VT323",
  elegant: "Playfair Display",
  festive: "Borel",
  bohemian: "Comfortaa",
  handwriting: "Gochi Hand",
};

function loadFontIfNotExists(theme) {
  if (THEME_FONTS[theme]) {
    const fontNameSanitized = THEME_FONTS[theme].replace(/ /g, "+");
    const fontExists = Array.from(
      document.querySelectorAll("link[rel=stylesheet][href*=fonts]")
    ).some((link) => link.href.includes(fontNameSanitized));

    if (fontExists) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontNameSanitized}:wght@400&display=swap`;
    document.head.appendChild(link);
  }
}

export function initTheme(defaultValue = "base-dark") {
  const [theme, variant] = getStringSetting("theme", defaultValue).split("-");
  const themeSelect = document.getElementById("theme-select");
  const variantSelect = document.getElementById("variant-select");
  const preferDarkThemes = window.matchMedia("(prefers-color-scheme: dark)");

  if (!variant || variant === "auto") {
    variantSelect.value = "auto";
    document.documentElement.setAttribute(
      "data-theme",
      `${theme}-${preferDarkThemes.matches ? "dark" : "light"}`
    );
    setStringSetting("theme", `${theme}-auto`, false);
  } else {
    const dataTheme = `${theme}-${variant}`;
    variantSelect.value = variant;
    document.documentElement.setAttribute("data-theme", dataTheme);
    setStringSetting("theme", dataTheme, false);
  }

  themeSelect.value = theme;
  loadFontIfNotExists(theme);

  themeSelect.addEventListener("change", (e) => setTheme(e.target.value));
  variantSelect.addEventListener("change", (e) => setVariant(e.target.value));
  preferDarkThemes.addEventListener("change", (e) => {
    const variantSelect = document.getElementById("variant-select");

    if (variantSelect.value === "auto") {
      const themeSelect = document.getElementById("theme-select");
      const theme = themeSelect.value;

      localStorage.setItem("theme", `${theme}-auto`);
      document.documentElement.setAttribute(
        "data-theme",
        `${theme}-${e.matches ? "dark" : "light"}`
      );
    }
  });
}

function getTheme(newTheme) {
  let defaultTheme = "base-dark";
  const themeLocalStorage = localStorage.getItem("theme");
  const urlParams = new URLSearchParams(window.location.search);
  const themeQueryParam = urlParams.get("theme");
  // const themeSelect = document.getElementById('theme-select');
  const variantSelect = document.getElementById("variant-select");
  const variant = variantSelect.value;

  let theme = themeQueryParam || newTheme || themeLocalStorage || defaultTheme;

  if (theme.indexOf("-") < 0 && variant !== "auto") {
    theme += `-${variant}`;
  }

  return theme;
}

export function setTheme(newTheme) {
  const themeSelect = document.getElementById("theme-select");
  const variantSelect = document.getElementById("variant-select");
  let theme = getTheme(newTheme);

  if (theme.indexOf("-") === -1 && window.matchMedia) {
    const preferDarkThemes = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    theme = `${theme}-${preferDarkThemes ? "dark" : "light"}`;
  }

  themeSelect.value = theme.split("-")[0];

  if (variantSelect.value !== "auto") {
    variantSelect.value =
      theme.indexOf("-") >= 0 ? theme.split("-")[1] : "auto";
  }

  loadFontIfNotExists(themeSelect.value);

  localStorage.setItem("theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function setVariant(variant = "auto") {
  const themeSelect = document.getElementById("theme-select");
  const themePrefix = themeSelect.value;
  let theme = `${themePrefix}-${variant}`;

  if (variant === "auto" && window.matchMedia) {
    const preferDarkThemes = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    theme = `${themePrefix}-${preferDarkThemes ? "dark" : "light"}`;
    localStorage.setItem("theme", `${themePrefix}-auto`);
  } else {
    localStorage.setItem("theme", theme);
  }

  document.documentElement.setAttribute("data-theme", theme);
}
