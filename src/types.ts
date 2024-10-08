import TRANSLATIONS from "./strings/translations.json";

export type { Translations } from "./strings/types";

export type Locale = keyof typeof TRANSLATIONS;

// type SafeForWork = "sfw" | "nsfw" | "unknown";

export interface Quote {
  id: string;
  time: string;
  quote_first: string;
  quote_time_case: string;
  quote_last: string;
  title: string;
  author: string;
  sfw: string;
  fallback?: boolean;
}