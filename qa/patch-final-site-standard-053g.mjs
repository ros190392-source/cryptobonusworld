import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('./final-site-standard-053g.mjs', import.meta.url);
const source = await readFile(file, 'utf8');
const oldLine = "    const relative = normalize(path.relative(repoRoot, file));";
const newLine = "    const relative = normalize(path.relative(repoRoot, file.file));";

if (!source.includes(oldLine)) {
  throw new Error('Expected source-path line was not found in final audit script.');
}

const next = source.replace(oldLine, newLine);
if (next === source) throw new Error('Final audit source-path patch made no change.');

await writeFile(file, next);
console.log('Final route audit source path handling patched.');
