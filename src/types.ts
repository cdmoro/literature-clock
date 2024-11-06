import TRANSLATIONS from './strings/translations.json';

export type { Translations } from './strings/types';

export type Locale = keyof typeof TRANSLATIONS;

export interface Quote {
  id: string;
  quote_first: string;
  quote_time_case: string;
  quote_last: string;
  title: string;
  author: string;
  sfw: string;
}

export interface ResolvedQuote extends Quote {
  fallback: boolean;
  index: number;
  locale: Locale;
  quote_raw: string;
}
