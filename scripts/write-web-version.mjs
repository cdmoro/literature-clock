import { readFileSync, writeFileSync } from 'node:fs';
const { version: packageVersion } = JSON.parse(readFileSync('package.json', 'utf8'));
const version = `v${packageVersion}`;
if (!/^v\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid package version: ${packageVersion}`);
writeFileSync('src/web-version.json', JSON.stringify({ version }) + '\n');
