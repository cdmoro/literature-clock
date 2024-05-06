import TRANSLATIONS from "./translations";

export type Locale = keyof typeof TRANSLATIONS;

type SafeForWork = "sfw" | "nsfw" | "unknown";

export interface Quote {
  id: string;
  time: string;
  quote_first: string;
  quote_time_case: string;
  quote_last: string;
  title: string;
  author: string;
  sfw: SafeForWork;
  fallback?: boolean;
}
