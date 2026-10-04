import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { onPreBuild, onSuccess } from './index.js';

test('restore generated quotes and invalidate changed inputs or missing output', async () => {
  const original = process.cwd();
  const temp = await mkdtemp(join(tmpdir(), 'quote-cache-test-'));
  try {
    for (const dir of ['scripts', 'quotes', 'src/strings', 'plugins']) {
      await mkdir(join(temp, dir), { recursive: true });
    }
    await cp(join(original, 'plugins/netlify-plugin-quotes'), join(temp, 'plugins/netlify-plugin-quotes'), {
      recursive: true,
    });
    for (const name of ['generate_times.py', 'validate_translation.py', 'quote_sources.py']) {
      await cp(join(original, 'scripts', name), join(temp, 'scripts', name));
    }
    process.chdir(temp);
    const csv = 'Time|Id|Quote time|Quote|Title|Author|SFW\n07:30|1|seven thirty|At seven thirty.|Book|Author|true\n';
    await writeFile('quotes/quotes.en-GB.csv', csv);
    await writeFile('src/strings/translations.json', '{"en-GB":{}}');
    let generations = 0;
    const utils = {
      cache: {
        restore: async () => false,
        save: async (paths) => {
          for (const path of paths) await cp(path, join(temp, 'saved', path), { recursive: true });
        },
      },
      run: {
        command: async () => {
          generations++;
          execFileSync('python3', ['scripts/generate_times.py']);
        },
      },
    };
    await onPreBuild({ utils });
    assert.equal(generations, 1);
    await onSuccess({ utils });
    await rm('public/times', { recursive: true });
    await rm('.netlify', { recursive: true });
    utils.cache.restore = async (paths) => {
      for (const path of paths) await cp(join(temp, 'saved', path), path, { recursive: true });
      return true;
    };
    await onPreBuild({ utils });
    assert.equal(generations, 1);
    assert.equal(JSON.parse(await readFile('public/times/en-GB/07_30.json'))[0].author, 'Author');
    utils.cache.restore = async () => false;
    await writeFile('quotes/quotes.en-GB.csv', csv.replace('Author|true', 'Writer|true'));
    await onPreBuild({ utils });
    assert.equal(generations, 2);
    assert.equal(JSON.parse(await readFile('public/times/en-GB/07_30.json'))[0].author, 'Writer');
    await writeFile('scripts/quote_sources.py', (await readFile('scripts/quote_sources.py')) + '\n# changed\n');
    await onPreBuild({ utils });
    assert.equal(generations, 3);
    await rm('public/times', { recursive: true });
    await onPreBuild({ utils });
    assert.equal(generations, 4);
    await writeFile('src/strings/translations.json', '{}');
    await onPreBuild({ utils });
    assert.equal(generations, 5);
    await assert.rejects(readFile('public/times/en-GB/07_30.json'));
    await rm('quotes/quotes.en-GB.csv');
    await onPreBuild({ utils });
    assert.equal(generations, 6);
  } finally {
    process.chdir(original);
    await rm(temp, { recursive: true, force: true });
  }
});
