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
  history: '<path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7M12 7v5l3 2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};

export function readingIcon(name: keyof typeof paths) {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
