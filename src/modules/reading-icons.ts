const paths = {
  shuffle: '<path d="M3 6h3c5 0 7 12 12 12h3M3 18h3c2 0 4-3 6-6s4-6 6-6h3M18 3l3 3-3 3M18 15l3 3-3 3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  speaker: '<path d="M11 5 6 9H3v6h3l5 4V5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" fill="currentColor" stroke="none"/>',
  'hide-title': '<path d="M3 3l18 18M10 5h10v14M6 5H4v14h12M8 9h8M12 9v6"/>',
  pause: '<path d="M7 5v14M17 5v14" stroke-width="4"/>',
  play: '<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  previous: '<path d="m14 6-6 6 6 6"/>',
  next: '<path d="m10 6 6 6-6 6"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  book: '<path d="M5 19a2 2 0 0 1 2-2h12M5 19a2 2 0 0 0 2 2h12V3H7a2 2 0 0 0-2 2zM9 7h6"/>',
  person: '<circle cx="12" cy="8" r="3"/><path d="M5 20v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/>',
  'book-open': '<path d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14"/>',
  document: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
  external: '<path d="M7 17 17 7M8 7h9v9"/>',
  info: '<path fill="currentColor" fill-rule="evenodd" stroke="none" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 9h2v6h-2v-6Zm1-4.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"/>',
  history: '<path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7M12 7v5l3 2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  'fuzzy-clock': '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>',
};

export function readingIcon(name: keyof typeof paths) {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
