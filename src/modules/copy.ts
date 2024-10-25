export function initCopy() {
  document.getElementById('copy')?.addEventListener('click', copyQuote);
}

function copyQuote() {
  if (document.body.classList.contains('quote-copied')) {
    return;
  }

  const blockquote = document.getElementById('quote');
  const quoteText = blockquote?.getAttribute('aria-description');

  if (quoteText) {
    navigator.clipboard.writeText(quoteText);
  }

  document.body.classList.add('quote-copied');
  setTimeout(() => {
    document.body.classList.remove('quote-copied');
  }, 1500);
}
