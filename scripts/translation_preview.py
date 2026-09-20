"""Read-only browser review of local translations, never written to public/."""
import html
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlencode, urlsplit

from validate_translation import is_draft, read_catalogue, validate


def formatted(text):
    # Permit only the catalogue's presentation tags, never arbitrary source HTML.
    escaped = html.escape(text)
    for tag in ('<br>', '<br/>', '<br />', '<em>', '</em>'):
        escaped = escaped.replace(html.escape(tag), tag)
    return escaped


def quote_html(row):
    phrase = row['Quote time']
    if phrase and phrase in row['Quote']:
        first, last = row['Quote'].split(phrase, 1)
        return formatted(first) + '<mark>' + formatted(phrase) + '</mark>' + formatted(last)
    return formatted(row['Quote'])


def render(project, query=''):
    params = parse_qs(query)
    search = params.get('q', [''])[0].strip()
    try:
        page = max(0, int(params.get('page', ['0'])[0]))
    except ValueError:
        page = 0
    entries = project.reviews()
    if search:
        entries = [entry for entry in entries if search.casefold() in
                   json_search(entry).casefold()]
    total = len(entries)
    page = min(page, max(0, (total - 1) // 12))
    published = {row['Id']: row for row in read_catalogue(project.catalogue) if not is_draft(row)}
    cards = []
    for entry in entries[page * 12:(page + 1) * 12]:
        row = entry['translation']
        same = row['Id'] in published and all(
            published[row['Id']][field] == row[field] for field in entry['source'])
        status = 'Published in local CSV' if same else 'Approved locally · not applied' if entry['approved'] else 'Draft · pending review'
        issues = validate([entry['source']], [{**row, 'Draft': 'false'}])
        warning = '<p class="warning">' + html.escape('; '.join(issues)) + '</p>' if issues else ''
        cards.append(f'''<article>
          <header><strong>{html.escape(row['Time'])}</strong> · {html.escape(row['Id'])}
          <span class="badge">{status}</span></header>
          <div class="comparison"><section><h2>Original · en-GB</h2>
          <blockquote lang="en-GB">{quote_html(entry['source'])}</blockquote>
          <p class="credit">{formatted(entry['source']['Title'])} — {html.escape(row['Author'])}</p></section>
          <section><h2>Translation · {html.escape(project.locale)}</h2>
          <blockquote lang="{html.escape(project.locale)}">{quote_html(row)}</blockquote>
          <p class="credit">{formatted(row['Title'])} — {html.escape(row['Author'])}</p>{warning}</section></div>
        </article>''')
    if not cards:
        cards = ['<p class="empty">No translated drafts found. Translate a batch from the menu first.</p>']
    navigation = []
    for number, label in ((page - 1, '← Previous'), (page + 1, 'Next →')):
        if 0 <= number <= (total - 1) // 12:
            navigation.append(f'<a href="/?{html.escape(urlencode({"q": search, "page": number}))}">{label}</a>')
    locale = html.escape(project.locale)
    return f'''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{locale} · Translation review</title><style>
*{{box-sizing:border-box}} body{{margin:0;background:#f4f1e9;color:#292923;font:16px/1.6 system-ui,sans-serif}}
main{{max-width:1200px;margin:auto;padding:32px 24px}} h1{{font:42px Georgia,serif;margin:12px 0}}
.subtitle,h2,.credit{{color:#626259}}h2{{font:14px system-ui,sans-serif;letter-spacing:.04em}}
.local{{font-size:12px;text-transform:uppercase;letter-spacing:.15em;color:#756239}}
form{{display:flex;gap:10px;margin:24px 0}}input{{flex:1;min-width:0}}input,button{{font:inherit;padding:10px 14px;border:1px solid #ccc5b6;border-radius:6px}}
button{{background:#333d31;color:white;cursor:pointer}}article{{background:#fffdf8;border:1px solid #e2dccf;border-radius:8px;margin:20px 0;padding:24px}}
header{{border-bottom:1px solid #e2dccf;padding-bottom:16px}}.badge{{float:right;font-size:12px;padding:4px 10px;border-radius:20px;background:#ece6d8}}
.comparison{{display:grid;grid-template-columns:1fr 1fr;gap:36px}}blockquote{{font:26px/1.65 Georgia,serif;margin:14px 0;overflow-wrap:anywhere}}
mark{{background:#f4e5a6;color:inherit;padding:0 2px}}.credit{{font:italic 16px Georgia,serif}}.warning{{color:#8d3825;background:#ffefe8;padding:12px}}
nav{{display:flex;gap:24px;margin:24px 0}}a{{color:#333d31}}.empty{{padding:40px 0}}@media(max-width:700px){{.comparison{{grid-template-columns:1fr}}.badge{{float:none;display:block;width:fit-content;margin-top:8px}}h1{{font-size:32px}}}}
</style><main><div class="local">Literature Clock · Local review only</div>
<h1>{locale} translations</h1><p class="subtitle">Original and translation, with the time highlighted.
This review page is separate from the live clock. Approve or edit in the terminal menu, then refresh this page.</p>
<form><input name="q" aria-label="Search translations" placeholder="Search by ID, time, title or text" value="{html.escape(search, quote=True)}"><button>Search</button></form>
<p>{total} {'translation' if total == 1 else 'translations'} · Page {page + 1} of {max(1, (total + 11) // 12)}</p>
{''.join(cards)}<nav>{''.join(navigation)}</nav></main></html>'''


def json_search(entry):
    return ' '.join(str(value) for row in (entry['source'], entry['translation']) for value in row.values())


def handler_for(project):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            address = urlsplit(self.path)
            if address.path != '/':
                self.send_error(404)
                return
            try:
                body = render(project, address.query).encode('utf-8')
                status = 200
            except (OSError, ValueError) as error:
                body = ('Cannot read the review: ' + html.escape(str(error))).encode('utf-8')
                status = 400
            self.send_response(status)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass
    return Handler


class Preview:
    def __init__(self, project):
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(project))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}/'

    def open(self):
        print(f'Local preview: {self.url}\nKeep this menu open while reviewing. Refresh to see saved edits.')
        webbrowser.open(self.url)

    def close(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
