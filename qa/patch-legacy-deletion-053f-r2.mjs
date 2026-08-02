import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('./legacy-deletion-053f-r2.mjs', import.meta.url);
const source = await readFile(file, 'utf8');
let replacements = 0;

const next = source
  .replace(
    "primaryActionAmber: await primary.evaluate(node => isAmber(getComputedStyle(node).backgroundColor)),",
    "primaryActionAmber: await primary.evaluate(node => ['rgb(247, 147, 26)', 'rgb(255, 173, 61)'].includes(getComputedStyle(node).backgroundColor)),",
  )
  .replace(
    "amberSubmit: await submit.evaluate(node => isAmber(getComputedStyle(node).backgroundColor)),",
    "amberSubmit: await submit.evaluate(node => ['rgb(247, 147, 26)', 'rgb(255, 173, 61)'].includes(getComputedStyle(node).backgroundColor)),",
  );

replacements += next.includes("primaryActionAmber: await primary.evaluate(node => ['rgb(247, 147, 26)'") ? 1 : 0;
replacements += next.includes("amberSubmit: await submit.evaluate(node => ['rgb(247, 147, 26)'") ? 1 : 0;

if (replacements !== 2 || next === source) {
  throw new Error(`Expected two browser-context color patches; applied=${replacements}`);
}

await writeFile(file, next);
console.log('Browser-context amber assertions patched.');
