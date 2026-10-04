import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const output = 'public/times';
const manifest = '.netlify/quote-cache.json';
const paths = [output, manifest];

async function fingerprint() {
  const files = [
    ...(await readdir('quotes'))
      .filter((name) => name.endsWith('.csv'))
      .sort()
      .map((name) => `quotes/${name}`),
    'src/strings/translations.json',
    'scripts/generate_times.py',
    'scripts/validate_translation.py',
    'scripts/quote_sources.py',
    'plugins/netlify-plugin-quotes/index.js',
  ];
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(await readFile(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export async function onPreBuild({ utils: { cache, run } }) {
  await cache.restore(paths);
  const current = await fingerprint();
  let cached;
  try {
    cached = JSON.parse(await readFile(manifest, 'utf8'));
    // Missing output must always trigger generation, even with a valid marker.
    if (!(await readdir(output)).length) cached = undefined;
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    cached = undefined;
  }
  if (cached?.fingerprint === current) {
    console.log('Quotes unchanged: reusing generated files from Netlify cache.');
    return;
  }
  console.log('Quote inputs changed or cache missing: generating quote files.');
  // The generator and its imports use only the Python standard library.
  await run.command('python3 scripts/generate_times.py');
  await mkdir('.netlify', { recursive: true });
  await writeFile(manifest, JSON.stringify({ fingerprint: current }));
}

export async function onSuccess({ utils: { cache } }) {
  await cache.save(paths);
}
