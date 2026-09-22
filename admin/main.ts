import './style.css';
import { initAppearance } from './appearance';

type Quote = Record<'Id' | 'Time' | 'Quote' | 'Quote time' | 'Title' | 'Author' | 'SFW', string> & { Draft?: string };
type Entry = { quote: Quote; source: Quote | null; issues: string[] };
type Language = {
  locale: string;
  target: string;
  enabled: boolean;
  quotes_total: number;
  quotes_published: number;
  quotes_draft: number;
  publication_progress: number;
};
type Job = { running: boolean; locale: string; message: string; url: string; kind?: string };
type Page = { rows: Entry[]; total: number; page: number; revision: string };
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', [String.fromCharCode(39)]: '&#39;' })[c]!,
  );
const formatted = (value: string) => escape(value).replace(/&lt;(\/?em|br\s*\/?)&gt;/g, '<$1>');
const highlight = (quote: Quote) => {
  const phrase = quote['Quote time'];
  const index = phrase ? quote.Quote.indexOf(phrase) : -1;
  return index < 0
    ? formatted(quote.Quote)
    : `${formatted(quote.Quote.slice(0, index))}<mark>${formatted(phrase)}</mark>${formatted(quote.Quote.slice(index + phrase.length))}`;
};
let languages: Language[] = [];
let locale = '';
let page: Page = { rows: [], total: 0, page: 0, revision: '' };
let selected = '';
let job: Job = { running: false, locale: '', message: '', url: '' };
let dirty = false;
let quoteRequest = 0;
let busy = false;

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
    ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
function message(text: string, error = false) {
  el('message').textContent = text;
  el('message').className = error ? 'message error' : 'message';
}
async function action(task: () => Promise<void>) {
  if (busy) return;
  busy = true;
  try {
    await task();
  } catch (error) {
    message(String(error instanceof Error ? error.message : error), true);
  } finally {
    busy = false;
  }
}
function mayLeave() {
  return !dirty || window.confirm('Discard your unsaved edits?');
}

el('app').innerHTML = `
<aside class="sidebar"><a class="brand" href="/">LC<span>Literature Clock</span></a>
<div class="section-label">TRANSLATION STUDIO</div><button id="new-language" class="new-language">＋ New language</button>
<nav id="languages" aria-label="Languages"></nav><div class="local-note"><i></i> Local workspace<span>Changes are saved to your repository.</span></div></aside>
<main><header class="topbar"><span>CATALOGUE / TRANSLATIONS</span><div class="appearance"><label for="appearance">Theme</label><select id="appearance"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><span class="local-badge">LOCAL ONLY</span></div></header>
<div id="message" class="message" role="status" aria-live="polite"></div>
<section id="welcome"><p class="eyebrow">A WORLD OF WORDS</p><h1>Every language.<br>One quote at a time.</h1><p class="intro">Translate, refine and review your literary clock.<br>Choose a catalogue to begin, or start a new language.</p><div id="overview" class="overview"></div></section>
<section id="workspace" hidden><div class="workspace-heading"><div><p class="eyebrow">LANGUAGE WORKSPACE</p><h1 id="locale-title"></h1><p id="locale-status"></p></div><div class="heading-actions"><button id="clock-preview" class="secondary">Generate clock preview ↗</button><button id="prepare-pr" class="secondary">Create catalogue PR</button></div></div>
<div class="metrics" id="metrics"></div><section class="batch"><div><h2>Translate the next chapter</h2><p>Completed translations go straight into the CSV as drafts.</p></div><label>Quotes <input id="batch-size" type="number" min="1" max="500" value="25"></label><button id="translate" class="primary">Translate with Google</button><button id="stop" class="secondary" hidden>Stop translation</button></section>
<p id="job" role="status"></p><div class="review-toolbar"><h2>Review desk</h2><button id="reload-quotes" class="secondary">Reload</button><input id="search" type="search" placeholder="Search quotes, books or IDs" aria-label="Search quotes"><select id="status" aria-label="Quote status"><option value="draft">Drafts</option><option value="approved">Approved</option><option value="all">All quotes</option></select></div>
<div class="review-layout"><section class="quote-list"><div id="quotes"></div><footer class="pagination"><button id="previous" aria-label="Previous page">←</button><span id="page-label"></span><button id="next" aria-label="Next page">→</button></footer></section><section id="editor" class="editor"></section></div></section>
</main>
<dialog id="create-dialog"><form id="create-form"><p class="eyebrow">NEW CATALOGUE</p><h2>Start a new language</h2><p>Every source quote is copied from British English as a draft. Your language stays out of the clock's selector.</p><label>Locale<input id="new-locale" placeholder="el-GR" pattern="[a-z]{2,3}-[A-Z]{2}" required></label><label>Google language code<input id="new-target" placeholder="el" required></label><p id="create-error" class="error" role="alert"></p><div class="dialog-actions"><button type="button" id="cancel-create">Cancel</button><button class="primary">Create catalogue</button></div></form></dialog>
<dialog id="pr-dialog"><h2>Create a catalogue PR?</h2><p>This will commit and push this language's CSV in an isolated branch, then open a GitHub pull request. Your current branch and other files are left untouched.</p><p>Draft rows remain accessible via the draft URL. Creating this PR does not enable a new language in the selector or merge the changes.</p><p>Git and the GitHub CLI must already be authenticated.</p><div class="dialog-actions"><button id="cancel-pr">Cancel</button><button id="confirm-pr" class="primary">Create pull request</button></div></dialog>`;

initAppearance(el<HTMLSelectElement>('appearance'));

function renderLanguages() {
  el('languages').innerHTML = languages
    .map(
      (language) =>
        `<button class="language ${locale === language.locale ? 'active' : ''}" data-locale="${escape(language.locale)}"><span>${escape(language.locale)}<small>${language.enabled ? 'On the clock' : 'In development'}</small></span><b>${Math.round(language.publication_progress)}<small>%</small></b></button>`,
    )
    .join('');
  el('overview').innerHTML = languages
    .map(
      (language) =>
        `<button data-locale="${escape(language.locale)}" class="overview-card"><span class="eyebrow">${language.enabled ? 'ENABLED' : 'IN DEVELOPMENT'}</span><h2>${escape(language.locale)}</h2><progress value="${language.quotes_published}" max="${language.quotes_total}"></progress><p>${language.quotes_published.toLocaleString()} of ${language.quotes_total.toLocaleString()} approved</p></button>`,
    )
    .join('');
  document.querySelectorAll<HTMLButtonElement>('[data-locale]').forEach((button) => {
    button.onclick = () =>
      action(async () => {
        if (!mayLeave()) return;
        locale = button.dataset.locale!;
        selected = '';
        dirty = false;
        el<HTMLInputElement>('search').value = '';
        el<HTMLSelectElement>('status').value = languages.find((item) => item.locale === locale)!.quotes_draft
          ? 'draft'
          : 'all';
        renderLanguages();
        renderWorkspace();
        await loadQuotes(0);
      });
  });
}
function renderWorkspace() {
  el('welcome').hidden = !!locale;
  el('workspace').hidden = !locale;
  if (!locale) return;
  const language = languages.find((item) => item.locale === locale)!;
  el('locale-title').textContent = locale;
  el('locale-status').textContent = language.enabled
    ? 'Enabled on the clock · Drafts stay behind the draft URL.'
    : 'In development · Not available in the clock’s language selector.';
  el('metrics').innerHTML = [
    [language.quotes_total.toLocaleString(), 'Total quotes'],
    [language.quotes_published.toLocaleString(), 'Approved locally'],
    [language.quotes_draft.toLocaleString(), 'Drafts to review'],
    [`${language.publication_progress}%`, 'Reviewed'],
  ]
    .map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`)
    .join('');
  for (const id of ['translate', 'prepare-pr', 'clock-preview']) el<HTMLButtonElement>(id).disabled = job.running;
  el('stop').hidden = !job.running || job.kind !== 'translate';
  el('job').textContent = job.message ? `${job.locale}: ${job.message}` : '';
  if (job.url && job.url.startsWith('https://github.com/')) {
    const link = document.createElement('a');
    link.href = job.url;
    link.textContent = ' Open pull request ↗';
    link.target = '_blank';
    link.rel = 'noopener';
    el('job').append(link);
  }
}
async function refresh() {
  const previousJob = job.running;
  const data = await api<{ languages: Language[]; job: Job }>('languages');
  languages = data.languages;
  job = data.job;
  renderLanguages();
  renderWorkspace();
  if (previousJob && !job.running && locale && !dirty) await loadQuotes(page.page);
}
async function loadQuotes(number: number) {
  const request = ++quoteRequest;
  const params = new URLSearchParams({
    locale,
    q: el<HTMLInputElement>('search').value,
    status: el<HTMLSelectElement>('status').value,
    page: String(number),
  });
  const result = await api<Page>(`quotes?${params}`);
  if (request !== quoteRequest) return;
  page = result;
  if (!page.rows.some((entry) => entry.quote.Id === selected)) selected = page.rows[0]?.quote.Id || '';
  el('quotes').innerHTML = page.rows.length
    ? page.rows
        .map(
          ({ quote }) =>
            `<button class="quote-item ${selected === quote.Id ? 'active' : ''}" data-id="${escape(quote.Id)}"><span><strong>${escape(quote.Time)}</strong><small>${quote.Draft?.toLowerCase() === 'true' ? 'DRAFT' : 'APPROVED'}</small></span><p>${escape(quote.Quote.replace(/<[^>]*>/g, '').slice(0, 95))}</p><small>${escape(quote.Title)}</small></button>`,
        )
        .join('')
    : '<div class="empty">No quotes match this view.</div>';
  el('page-label').textContent =
    `${page.total.toLocaleString()} quotes · ${page.page + 1}/${Math.max(1, Math.ceil(page.total / 25))}`;
  el<HTMLButtonElement>('previous').disabled = page.page === 0;
  el<HTMLButtonElement>('next').disabled = (page.page + 1) * 25 >= page.total;
  document.querySelectorAll<HTMLButtonElement>('[data-id]').forEach(
    (button) =>
      (button.onclick = () => {
        if (!mayLeave()) return;
        selected = button.dataset.id!;
        dirty = false;
        document
          .querySelectorAll('[data-id]')
          .forEach((item) => item.classList.toggle('active', (item as HTMLElement).dataset.id === selected));
        renderEditor();
      }),
  );
  renderEditor();
}
function renderEditor() {
  const entry = page.rows.find((item) => item.quote.Id === selected);
  if (!entry) {
    el('editor').innerHTML = '<div class="empty">Select a quote to compare, edit and approve it.</div>';
    return;
  }
  const quote = entry.quote;
  el('editor').innerHTML =
    `<div class="editor-heading"><span class="eyebrow">${escape(quote.Id)} · ${escape(quote.Time)}</span><span class="tag">${quote.Draft?.toLowerCase() === 'true' ? 'Draft' : 'Approved'}</span></div>
  <h3>Original · en-GB</h3><blockquote lang="en-GB">${entry.source ? highlight(entry.source) : 'Source unavailable'}</blockquote><p class="credit">${escape(entry.source?.Title || '')} — ${escape(quote.Author)}</p>
  <form id="edit-form"><h3>Translation · ${escape(locale)}</h3><label>Quote<textarea id="quote-text" rows="6" required>${escape(quote.Quote)}</textarea></label><div class="field-pair"><label>Book title<input id="quote-title" value="${escape(quote.Title)}" required></label><label>Exact time phrase<input id="quote-time" value="${escape(quote['Quote time'])}"></label></div><p class="hint">Use &lt;br&gt; for line breaks and &lt;em&gt; for emphasis. Check that the time keeps its original meaning.</p><div id="translation-preview" class="translation-preview" lang="${escape(locale)}">${highlight(quote)}</div>
  ${entry.issues.length ? `<p class="validation">${entry.issues.map(escape).join('<br>')}</p>` : ''}
  <div class="editor-actions"><button type="button" id="save-draft" class="secondary">Save as draft</button><button class="primary" id="approve">Approve translation ✓</button></div></form>`;
  el('edit-form').oninput = () => {
    dirty = true;
    el('translation-preview').innerHTML = highlight({ ...quote, ...fields() });
  };
  const save = (approved: boolean) =>
    action(async () => {
      await api('edit', { locale, id: selected, revision: page.revision, fields: fields(), approved });
      dirty = false;
      message(
        approved ? 'Approved and saved to the CSV. Language visibility is unchanged.' : 'Saved in the CSV as a draft.',
      );
      await refresh();
      await loadQuotes(page.page);
    });
  el('edit-form').onsubmit = (event) => {
    event.preventDefault();
    void save(true);
  };
  el('save-draft').onclick = () => void save(false);
  for (const id of ['save-draft', 'approve']) el<HTMLButtonElement>(id).disabled = job.running;
}
function fields() {
  return {
    Quote: el<HTMLTextAreaElement>('quote-text').value,
    Title: el<HTMLInputElement>('quote-title').value,
    'Quote time': el<HTMLInputElement>('quote-time').value,
  };
}
el('new-language').onclick = () => {
  if (mayLeave()) el<HTMLDialogElement>('create-dialog').showModal();
};
el('cancel-create').onclick = () => el<HTMLDialogElement>('create-dialog').close();
el('new-locale').oninput = () => {
  el<HTMLInputElement>('new-target').value = el<HTMLInputElement>('new-locale').value.split('-')[0];
};
el('create-form').onsubmit = (event) => {
  event.preventDefault();
  void action(async () => {
    try {
      const newLocale = el<HTMLInputElement>('new-locale').value.trim();
      await api('create', { locale: newLocale, target: el<HTMLInputElement>('new-target').value.trim() });
      locale = newLocale;
      selected = '';
      dirty = false;
      el<HTMLDialogElement>('create-dialog').close();
      el<HTMLSelectElement>('status').value = 'draft';
      await refresh();
      await loadQuotes(0);
      message('Catalogue created. It is not enabled in the clock’s language selector.');
    } catch (error) {
      el('create-error').textContent = error instanceof Error ? error.message : String(error);
    }
  });
};
el('translate').onclick = () =>
  action(async () => {
    if (!mayLeave()) return;
    dirty = false;
    await api('translate', { locale, count: Number(el<HTMLInputElement>('batch-size').value) });
    await refresh();
    renderEditor();
  });
el('stop').onclick = () =>
  action(async () => {
    await api('stop', {});
    message('Stopping after the current Google request.');
  });
el('clock-preview').onclick = () =>
  action(async () => {
    await api('preview', { locale });
    message(
      `Preview generated. Open your clock development server with ?locale=${locale}-draft${page.rows.find((entry) => entry.quote.Id === selected) ? '&time=' + page.rows.find((entry) => entry.quote.Id === selected)!.quote.Time : ''}. The administrator runs separately from the clock.`,
    );
  });
el('prepare-pr').onclick = () => {
  if (dirty) {
    message('Save your edits before preparing a PR.', true);
    return;
  }
  el<HTMLDialogElement>('pr-dialog').showModal();
};
el('cancel-pr').onclick = () => el<HTMLDialogElement>('pr-dialog').close();
el('confirm-pr').onclick = () =>
  action(async () => {
    await api('pr', { locale });
    el<HTMLDialogElement>('pr-dialog').close();
    await refresh();
    renderEditor();
  });
let searchTimer: ReturnType<typeof setTimeout>;
el('search').oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(
    () =>
      action(async () => {
        if (mayLeave()) {
          dirty = false;
          await loadQuotes(0);
        }
      }),
    250,
  );
};
el('status').onchange = () =>
  action(async () => {
    if (mayLeave()) {
      dirty = false;
      await loadQuotes(0);
    }
  });
el('reload-quotes').onclick = () =>
  action(async () => {
    if (mayLeave()) {
      dirty = false;
      await loadQuotes(page.page);
    }
  });
el('previous').onclick = () =>
  action(async () => {
    if (mayLeave()) {
      dirty = false;
      await loadQuotes(page.page - 1);
    }
  });
el('next').onclick = () =>
  action(async () => {
    if (mayLeave()) {
      dirty = false;
      await loadQuotes(page.page + 1);
    }
  });
window.addEventListener('beforeunload', (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
void action(refresh);
setInterval(() => {
  if (!busy && job.running) void action(refresh);
}, 3000);
