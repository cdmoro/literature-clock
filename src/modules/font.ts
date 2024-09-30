import {
  getStringSetting,
  initStringSetting,
  removeURLParam,
  setStringSetting,
  updateURL,
} from "../utils/settings";
import { fitQuote, loadFontIfNotExists } from "../utils/utils";

export const THEME_FONTS: Record<string, string[]> = {
  retro: ["VT323"],
  elegant: ["Playfair Display"],
  festive: ["Borel"],
  bohemian: ["Comfortaa"],
  handwriting: ["Reenie Beanie"],
  anaglyph: ["Anton"],
  whatsapp: ["Roboto"],
  terminal: ["B612 Mono"],
  frame: ["Playfair Display"],
  subtle: ["Unna"],
  poster: ["Averia Serif Libre", "Allura"],
  dynamic: ["Caveat", "Indie Flower", "Yeseva One", "Sacramento"],
};

export const INITIAL_THEME_FONT_SIZE = {
  handwriting: 90,
  whatsapp: 45,
  retro: 70,
  frame: 35,
  subtle: 60,
  poster: 35,
} as const;

const FONTS = ["Special Elite", ...new Set(Object.values(THEME_FONTS))].flat();
const CSS_FONT_VARIABLE = "--override-quote-font-family";

function createOption(value: string) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = value;

  return option;
}

export function initFont(defaultValue = "default") {
  const font = initStringSetting("font", defaultValue);
  const fontSelect = document.querySelector<HTMLSelectElement>("#font-select");

  FONTS.forEach((fontName) => {
    fontSelect?.appendChild(createOption(fontName));
  });

  if (font !== "default" && !FONTS.includes(font)) {
    setStringSetting("custom-font", font);
  }

  const customFont = getStringSetting("custom-font");
  if (customFont) {
    fontSelect?.appendChild(createOption(customFont));
  }

  setStringSetting("font", font);
  if (fontSelect) {
    fontSelect.value = font;
  }

  if (font !== "default") {
    loadFontIfNotExists(font);
    const root = document.querySelector<HTMLElement>(":root");
    root?.style.setProperty(CSS_FONT_VARIABLE, `${font}, sans-serif`);
  }

  fontSelect?.addEventListener("change", setFont);
}

function setFont() {
  const fontSelect = document.querySelector<HTMLSelectElement>("#font-select");
  const font = fontSelect?.value;
  const root = document.querySelector<HTMLElement>(":root");

  if (font) {
    setStringSetting("font", font);

    if (font === "default") {
      root?.style.removeProperty(CSS_FONT_VARIABLE);
      removeURLParam("font");
    } else {
      updateURL("font", font);
      loadFontIfNotExists(font);
      root?.style.setProperty(CSS_FONT_VARIABLE, `${font}, sans-serif`);
    }
  }

  fitQuote();
}

export function resetFont() {
  const root = document.querySelector<HTMLElement>(":root");
  const fontSelect = document.querySelector<HTMLSelectElement>("#font-select");

  root?.style.removeProperty(CSS_FONT_VARIABLE);
  if (fontSelect) {
    fontSelect.value = "default";
  }
  setStringSetting("font", "default");
  removeURLParam("font");
}
