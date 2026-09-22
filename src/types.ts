import TRANSLATIONS from './strings/translations.json';

export type { Translations } from './strings/types';

export type BaseLocale = keyof typeof TRANSLATIONS;
export type Locale = BaseLocale | `${string}-draft`;

export interface Quote {
  draft?: boolean;
  id: string;
  quote_first: string;
  quote_time_case: string;
  quote_last: string;
  title: string;
  author: string;
  sfw: string;
}

export interface ResolvedQuote extends Quote {
  time: string;
  fallback: boolean;
  index: number;
  locale: Locale;
  quote_raw: string;
}
