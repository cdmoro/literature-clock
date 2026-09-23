import { store } from '../store';
import { getQuoteUrl } from './quote-links';
import { readingStrings, showQuoteNotice } from './reading-ui';
import { FAVORITES_KEY, isCollectible, quoteKey, readFavorites, toggleFavorite } from '../utils/quote-collection';
import type { ResolvedQuote } from '../types';

export function initQuoteLibrary() {
  if (store.get('static')) return;
  const group = document.getElementById('reading-controls');
  if (!group) return;
  const favorite = document.createElement('button');
  favorite.id = 'favorite-quote';
  favorite.type = 'button';
  const open = document.createElement('button');
  open.id = 'open-quote-library';
  open.type = 'button';
  open.textContent = '☷';
  open.setAttribute('aria-haspopup', 'dialog');
  group.append(favorite, open);

  const dialog = document.createElement('dialog');
  dialog.id = 'quote-library';
  dialog.setAttribute('aria-labelledby', 'quote-library-title');
  dialog.setAttribute('data-html2canvas-ignore', '');
  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.id = 'quote-library-title';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.autofocus = true;
  close.addEventListener('click', () => dialog.close());
  header.append(title, close);
  const list = document.createElement('ul');
  list.className = 'saved-quotes';
  const empty = document.createElement('p');
  empty.className = 'library-empty';
  empty.setAttribute('role', 'status');
  const feedback = document.createElement('p');
  feedback.setAttribute('role', 'status');
  dialog.append(header, feedback, empty, list);
  document.body.appendChild(dialog);

  const changeFavorite = (quote: ResolvedQuote) => {
    const result = toggleFavorite(quote);
    const strings = readingStrings();
    const message =
      result === 'full'
        ? strings.favoritesFull
        : result === 'unavailable'
          ? strings.storageUnavailable
          : result === 'saved'
            ? strings.favoriteSaved
            : strings.favoriteRemoved;
    feedback.textContent = message;
    showQuoteNotice(message);
    refresh();
  };

  const refresh = (refreshList = true) => {
    const strings = readingStrings();
    const current = store.get('active-quote');
    const favorites = readFavorites();
    const saved = !!current && favorites.some((quote) => quoteKey(quote) === quoteKey(current));
    favorite.textContent = saved ? '♥' : '♡';
    favorite.title = saved ? strings.removeFavorite : strings.saveFavorite;
    favorite.setAttribute('aria-label', favorite.title);
    favorite.setAttribute('aria-pressed', String(saved));
    favorite.disabled = !isCollectible(current) || !!store.get('quote');
    open.title = strings.myQuotes;
    open.setAttribute('aria-label', strings.myQuotes);
    title.textContent = strings.favorites;
    close.setAttribute('aria-label', strings.close);
    if (!dialog.open || !refreshList) return;
    list.replaceChildren();
    const visible = favorites.filter((quote) => !store.get('work') || quote.sfw !== 'nsfw');
    empty.hidden = visible.length > 0;
    empty.textContent = favorites.length ? strings.filteredLibrary : strings.noFavorites;
    for (const quote of visible) {
      const item = document.createElement('li');
      const text = document.createElement('p');
      text.textContent = quote.quote_raw;
      const attribution = document.createElement('p');
      attribution.className = 'saved-attribution';
      attribution.textContent = `${quote.title} — ${quote.author}`;
      const actions = document.createElement('div');
      actions.className = 'saved-actions';
      const link = document.createElement('a');
      link.textContent = `${strings.openQuote} · ${quote.time} · ${quote.locale}`;
      link.href = getQuoteUrl(quote)!;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = strings.removeFavorite;
      remove.addEventListener('click', () => {
        const index = Array.from(list.children).indexOf(item);
        changeFavorite(quote);
        const next = list.children[Math.min(index, list.children.length - 1)];
        (next?.querySelector('button') || close).focus();
      });
      actions.append(link, remove);
      item.append(text, attribution, actions);
      list.appendChild(item);
    }
  };

  favorite.addEventListener('click', () => {
    const quote = store.get('active-quote');
    if (isCollectible(quote) && !store.get('quote')) changeFavorite(quote);
  });
  open.addEventListener('click', () => {
    dialog.showModal();
    refresh();
  });
  dialog.addEventListener('close', () => open.focus());
  window.addEventListener('storage', (event) => {
    if (event.key === FAVORITES_KEY || event.key === null) refresh();
  });
  store.subscribe((state, previous) => {
    if (state.locale !== previous.locale || state.work !== previous.work) refresh();
    else if (state['active-quote'] !== previous['active-quote']) refresh(false);
  });
  refresh();
}
