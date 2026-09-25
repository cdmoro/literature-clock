import { store } from '../store';
import { getQuoteUrl } from './quote-links';
import { readingStrings, showQuoteNotice } from './reading-ui';
import {
  FAVORITES_KEY,
  HISTORY_KEY,
  clearHistory,
  isCollectible,
  quoteKey,
  readFavorites,
  readHistory,
  recordQuote,
  toggleFavorite,
} from '../utils/quote-collection';
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
  let view: 'favorites' | 'history' = 'favorites';
  const tabs = document.createElement('div');
  tabs.className = 'library-tabs';
  tabs.setAttribute('role', 'tablist');
  const tabButtons = (['favorites', 'history'] as const).map((name) => {
    const button = document.createElement('button');
    button.id = `library-${name}-tab`;
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'library-panel');
    button.addEventListener('click', () => {
      view = name;
      feedback.textContent = '';
      refresh();
    });
    tabs.appendChild(button);
    return button;
  });
  tabs.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : view === 'favorites' ? 1 : 0;
    tabButtons[index].click();
    tabButtons[index].focus();
  });
  const panel = document.createElement('section');
  panel.id = 'library-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.tabIndex = 0;
  const clear = document.createElement('button');
  clear.id = 'clear-quote-history';
  clear.type = 'button';
  clear.addEventListener('click', () => {
    const success = clearHistory();
    feedback.textContent = success ? readingStrings().historyCleared : readingStrings().storageUnavailable;
    refresh();
    tabButtons[1].focus();
  });
  panel.append(clear, feedback, empty, list);
  dialog.append(header, tabs, panel);
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
    title.textContent = strings.myQuotes;
    tabs.setAttribute('aria-label', strings.myQuotes);
    tabButtons.forEach((button, index) => {
      const selected = (index === 0 ? 'favorites' : 'history') === view;
      button.textContent = index === 0 ? strings.favorites : strings.history;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `library-${view}-tab`);
    clear.hidden = view !== 'history';
    clear.textContent = strings.clearHistory;
    close.setAttribute('aria-label', strings.close);
    if (!dialog.open || !refreshList) return;
    list.replaceChildren();
    const items = view === 'favorites' ? favorites : readHistory();
    clear.disabled = readHistory().length === 0;
    const visible = items.filter((quote) => !store.get('work') || quote.sfw !== 'nsfw');
    empty.hidden = visible.length > 0;
    empty.textContent = items.length
      ? strings.filteredLibrary
      : view === 'favorites'
        ? strings.noFavorites
        : strings.noHistory;
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
      const isFavorite = favorites.some((item) => quoteKey(item) === quoteKey(quote));
      remove.textContent = isFavorite ? strings.removeFavorite : strings.saveFavorite;
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
    if (event.key === FAVORITES_KEY || event.key === HISTORY_KEY || event.key === null) refresh();
  });
  let storageWarningShown = false;
  const remember = (quote: ResolvedQuote | undefined) => {
    if (!isCollectible(quote) || store.get('quote')) return;
    if (!recordQuote(quote) && !storageWarningShown) {
      storageWarningShown = true;
      showQuoteNotice(readingStrings().storageUnavailable);
    }
  };
  remember(store.get('active-quote'));
  store.subscribe((state, previous) => {
    if (state['active-quote'] !== previous['active-quote']) remember(state['active-quote']);
    if (
      state.locale !== previous.locale ||
      state['ui-locale'] !== previous['ui-locale'] ||
      state.work !== previous.work
    )
      refresh();
    else if (state['active-quote'] !== previous['active-quote']) refresh(false);
  });
  refresh();
}
