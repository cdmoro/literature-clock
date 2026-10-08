import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
let version = process.env.WEB_RELEASE_TAG || '';
if (!/^v\d+\.\d+\.\d+$/.test(version)) {
  try { version = execFileSync('git', ['describe', '--tags', '--match', 'v[0-9]*', '--abbrev=0'], { encoding: 'utf8' }).trim(); }
  catch { version = 'development'; }
}
writeFileSync('src/web-version.json', JSON.stringify({ version }) + '\n');
