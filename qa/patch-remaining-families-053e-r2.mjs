import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('./remaining-families-053e-r2.mjs', import.meta.url);
const source = await readFile(file, 'utf8');
let replacements = 0;

const next = source
  .split('\n')
  .map(line => {
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);

    if (trimmed.startsWith('const promoActions = ')) {
      replacements += 1;
      return `${indent}const promoActions = ['/go/bybit','/go/okx','/go/bitget','/go/mexc','/go/kucoin','/go/bingx'];`;
    }

    if (trimmed.startsWith('const promoNames = ')) {
      replacements += 1;
      return `${indent}const promoNames = ['Bybit','OKX','Bitget','MEXC','KuCoin','BingX'];`;
    }

    if (trimmed.startsWith('robots: ')) {
      replacements += 1;
      return `${indent}robots: /<meta\\b(?=[^>]*\\bname=["']robots["'])(?=[^>]*\\bcontent=["']noindex,\\s*follow["'])[^>]*>/i.test(html),`;
    }

    return line;
  })
  .join('\n');

if (replacements !== 3) {
  throw new Error(`Expected exactly 3 QA expectation replacements, received ${replacements}`);
}

await writeFile(file, next);
console.log('QA expectations patched: promo order/actions and redirect robots contract.');
