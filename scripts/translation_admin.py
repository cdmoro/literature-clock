"""Local API and Vite launcher for managing translation catalogues."""
import hashlib
import io
import json
import os
import secrets
import shutil
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from generate_times import generate_catalogue
from translation_manager import Project
from validate_translation import ROOT, catalogue_progress, is_draft, read_catalogue, validate


class Admin:
    def __init__(self, root):
        self.root = Path(root)
        self.lock = threading.RLock()
        self.cancel = threading.Event()
        self.job = {'running': False, 'message': '', 'locale': '', 'url': '', 'kind': ''}

    def project(self, locale):
        # Validate the locale before constructing any user-controlled path.
        if not isinstance(locale, str):
            raise ValueError('Locale must be text.')
        project = Project(self.root, locale, locale.split('-')[0])
        config = project.folder / 'project.json'
        if config.exists():
            data = json.loads(config.read_text(encoding='utf-8'))
            project = Project(self.root, locale, data['target'])
        return project

    def enabled(self):
        return json.loads((self.root / 'src/strings/translations.json').read_text(encoding='utf-8'))

    def revision(self, project):
        return hashlib.sha256(project.catalogue.read_bytes()).hexdigest()

    def languages(self):
        enabled = self.enabled()
        result = []
        for path in sorted((self.root / 'quotes').glob('quotes.*.csv')):
            if path.name.endswith('.draft.csv') or path.name == 'quotes.en-GB.csv':
                continue
            locale = path.name.split('.')[1]
            project = self.project(locale)
            rows = read_catalogue(path)
            result.append({'locale': locale, 'target': project.target,
                           'enabled': locale in enabled, **catalogue_progress(rows)})
        return {'languages': result, 'job': self.job}

    def quotes(self, locale, query='', status='draft', page=0):
        project = self.project(locale)
        # Read one snapshot so the optimistic edit revision matches the rows shown.
        content = project.catalogue.read_bytes()
        import csv
        rows = list(csv.DictReader(io.StringIO(content.decode('utf-8')), delimiter='|'))
        source = {row['Id']: row for row in project.source()}
        query = query.casefold()
        filtered = [row for row in rows if (status == 'all' or is_draft(row) == (status == 'draft'))
                    and query in ' '.join(str(value) for value in row.values()).casefold()]
        page = min(max(0, page), max(0, (len(filtered) - 1) // 25))
        return {'rows': [{'quote': row, 'source': source.get(row['Id']),
                          'issues': validate([source[row['Id']]], [{**row, 'Draft': 'false'}])
                          if row['Id'] in source else ['Source quote no longer exists']}
                         for row in filtered[page * 25:(page + 1) * 25]],
                'page': page, 'total': len(filtered), 'revision': hashlib.sha256(content).hexdigest()}

    def start_job(self, locale, action, kind="translate"):
        if self.job['running']:
            raise ValueError('Another operation is running. Wait or stop it first.')
        self.cancel.clear()
        self.job = {'running': True, 'locale': locale, 'message': 'Working…', 'url': '', 'kind': kind}

        def run():
            try:
                result = action()
                self.job = {'running': False, 'locale': locale, 'message': 'Completed.', 'url': result or '', 'kind': kind}
            except Exception as error:
                self.job = {'running': False, 'locale': locale, 'message': str(error), 'url': '', 'kind': kind}
        threading.Thread(target=run, daemon=True).start()

    def mutate(self, action, data):
        with self.lock:
            if action == 'stop':
                if self.job.get('kind') == 'pr' and self.job['running']:
                    raise ValueError('PR creation is in progress. Wait for its result.')
                self.cancel.set()
                return {'message': 'Stopping after the current Google request. Saved quotes are kept.'}
            if self.job['running']:
                raise ValueError('An operation is running. Wait or stop it before editing.')
            project = self.project(data.get('locale', ''))
            if action == 'create':
                project = Project(self.root, data['locale'], data['target'])
                project.create()
            elif action == 'edit':
                if data.get('revision') != self.revision(project):
                    raise ValueError('The catalogue changed. Reload the quote before saving.')
                project.edit_quote(data['id'], data['fields'], data['approved'])
            elif action == 'translate':
                count = data.get('count', 25)
                if type(count) is not int or not 1 <= count <= 500:
                    raise ValueError('Choose a batch size between 1 and 500.')
                if not (project.folder / 'project.json').exists():
                    project.create()
                completed = 0

                def progress(identifier):
                    nonlocal completed
                    completed += 1
                    self.job['message'] = f'{completed} translations saved to CSV in this batch. Latest: {identifier}'

                self.start_job(project.locale, lambda: project.translate(count, cancel=self.cancel, on_progress=progress))
            elif action == 'preview':
                generate_catalogue(project.catalogue, self.root / 'public/times', include_drafts=True)
            elif action == 'pr':
                self.start_job(project.locale, lambda: self.create_pr(project), kind='pr')
            else:
                raise ValueError('Unknown action.')
            return {'ok': True}

    def create_pr(self, project):
        """Publish one CSV from an isolated checkout; never switch/stage the user's tree."""
        def command(args, cwd):
            result = subprocess.run(args, cwd=cwd, text=True, capture_output=True, timeout=180)
            if result.returncode:
                raise ValueError(result.stderr.strip() or result.stdout.strip() or 'Command failed.')
            return result.stdout.strip()
        snapshot = project.catalogue.read_bytes()
        remote = command(['git', 'remote', 'get-url', 'origin'], self.root)
        with tempfile.TemporaryDirectory(prefix='literature-catalogue-pr-') as directory:
            checkout = Path(directory) / 'repo'
            command(['git', 'clone', '--shared', '--no-checkout', str(self.root), str(checkout)], self.root)
            command(['git', 'remote', 'set-url', 'origin', remote], checkout)
            command(['git', 'fetch', 'origin', 'main'], checkout)
            branch = f'codex/catalogue-{project.locale.lower()}-{secrets.token_hex(4)}'
            command(['git', 'checkout', '-b', branch, 'FETCH_HEAD'], checkout)
            relative = f'quotes/quotes.{project.locale}.csv'
            (checkout / relative).write_bytes(snapshot)
            errors = validate(read_catalogue(checkout / 'quotes/quotes.en-GB.csv'), read_catalogue(checkout / relative))
            if errors:
                raise ValueError('\n'.join(errors))
            command(['git', 'add', '--', relative], checkout)
            if not command(['git', 'diff', '--cached', '--name-only'], checkout):
                raise ValueError('This catalogue already matches main. There are no changes to publish.')
            title = f'Update {project.locale} catalogue translations'
            command(['git', 'commit', '-m', title], checkout)
            command(['git', 'push', '-u', 'origin', branch], checkout)
            body = ('Update the catalogue from the local translation administrator. '
                    'Approved rows have Draft=false; pending rows remain Draft=true. '
                    'This does not enable a new language in the selector. '
                    'Pending rows are accessible only through the draft URL. '
                    'Source IDs, metadata and approved translation structure were validated.')
            return command(['gh', 'pr', 'create', '--base', 'main', '--head', branch,
                            '--title', title, '--body', body], checkout)


def handler_for(admin, token):
    class Handler(BaseHTTPRequestHandler):
        def respond(self, status, payload):
            body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def authorized(self):
            return secrets.compare_digest(self.headers.get('X-Admin-Token', ''), token)

        def do_GET(self):
            if not self.authorized():
                self.respond(403, {'error': 'Forbidden'})
                return
            try:
                parsed = urlsplit(self.path)
                args = parse_qs(parsed.query)
                if parsed.path == '/api/languages':
                    result = admin.languages()
                elif parsed.path == '/api/quotes':
                    result = admin.quotes(args.get('locale', [''])[0], args.get('q', [''])[0],
                                          args.get('status', ['draft'])[0], int(args.get('page', ['0'])[0]))
                else:
                    self.respond(404, {'error': 'Not found'})
                    return
                self.respond(200, result)
            except (OSError, ValueError, KeyError) as error:
                self.respond(400, {'error': str(error)})

        def do_POST(self):
            if not self.authorized():
                self.respond(403, {'error': 'Forbidden'})
                return
            try:
                length = int(self.headers.get('Content-Length', 0))
                if not 0 < length <= 1000000:
                    raise ValueError('Invalid request size.')
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict):
                    raise ValueError('Expected a JSON object.')
                result = admin.mutate(urlsplit(self.path).path.removeprefix('/api/'), data)
                self.respond(200, result)
            except (OSError, ValueError, KeyError, TypeError) as error:
                self.respond(400, {'error': str(error)})

        def log_message(self, *args):
            pass
    return Handler


def main():
    root = ROOT
    vite = root / 'node_modules/vite/bin/vite.js'
    if not vite.exists():
        raise SystemExit('Install dependencies with npm ci first.')
    admin = Admin(root)
    token = secrets.token_urlsafe(32)
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(admin, token))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    env = {**os.environ, 'TRANSLATION_API_TARGET': f'http://127.0.0.1:{server.server_port}',
           'TRANSLATION_ADMIN_TOKEN': token}
    child = subprocess.Popen([shutil.which('node') or 'node', str(vite), '--config', 'admin/vite.config.mjs'],
                             cwd=root, env=env)
    try:
        child.wait()
    except KeyboardInterrupt:
        admin.cancel.set()
    finally:
        child.terminate()
        child.wait()
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
