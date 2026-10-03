/** Direction belongs to each passage, independently of the interface. */
export function textDirection(locale: string): 'rtl' | 'ltr' {
  return ['ar', 'he', 'fa', 'ur'].includes(locale.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr';
}

export function setTextLocale(element: HTMLElement, locale: string) {
  element.lang = locale.replace(/-draft$/, '');
  element.dir = textDirection(locale);
}
