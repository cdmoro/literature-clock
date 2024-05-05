import {
  initStringSetting,
  removeURLParam,
  setStringSetting,
  updateURL,
} from "./settings.js";
import { THEME_FONTS } from "./themes.js";
import { fitQuote, loadFontIfNotExists } from "./utils.js";

const FONTS = ["Special Elite", ...new Set(Object.values(THEME_FONTS))];
const CSS_FONT_VARIABLE = "--override-quote-font-family";

export function initFont(defaultValue = "default") {
  const font = initStringSetting("font", defaultValue);
  const fontSelect = document.getElementById("font-select");

  FONTS.forEach((font) => {
    const option = document.createElement("option");
    option.value = font;
    option.textContent = font;

    fontSelect.appendChild(option);
  });

  setStringSetting("font", font);
  fontSelect.value = font;

  if (font !== "default") {
    loadFontIfNotExists(font);
    const root = document.querySelector(":root");
    root.style.setProperty(CSS_FONT_VARIABLE, `${font}, sans-serif`);
  }

  fontSelect.addEventListener("change", setFont);
}

function setFont() {
  const fontSelect = document.getElementById("font-select");
  const font = fontSelect.value;
  const root = document.querySelector(":root");

  setStringSetting("font", font);

  if (font === "default") {
    root.style.removeProperty(CSS_FONT_VARIABLE);
    removeURLParam("font");
  } else {
    updateURL("font", font);
    loadFontIfNotExists(font);
    root.style.setProperty(CSS_FONT_VARIABLE, `${font}, sans-serif`);
  }

  fitQuote();
}
