/**
 * gen-square-logos.mjs
 * Rewrites all wide-banner SVGs as proper 40×40 square icons.
 * These are fallbacks used when PNG fails to load.
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logoDir = join(__dirname, '../public/logos');

const logos = {
  'binance.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#181A20"/>
  <text x="20" y="28" font-family="Arial,sans-serif" font-size="15" font-weight="900" fill="#F3BA2F" text-anchor="middle" letter-spacing="-0.3">BNB</text>
</svg>`,

  'bingx.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#0B1120"/>
  <text x="20" y="29" font-family="Arial,sans-serif" font-size="13" font-weight="900" fill="#1890FF" text-anchor="middle" letter-spacing="-0.3">BingX</text>
</svg>`,

  'bitget.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#0C1F3D"/>
  <text x="20" y="28" font-family="Arial,sans-serif" font-size="14" font-weight="900" fill="#1DA2B4" text-anchor="middle" letter-spacing="-0.3">BGT</text>
</svg>`,

  'bybit.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#1E1E1E"/>
  <text x="20" y="28" font-family="Arial,sans-serif" font-size="15" font-weight="900" fill="#F7A600" text-anchor="middle" letter-spacing="-0.5">BYB</text>
</svg>`,

  'coinex.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#10101E"/>
  <text x="20" y="28" font-family="Arial,sans-serif" font-size="14" font-weight="900" fill="#5B52FF" text-anchor="middle" letter-spacing="-0.3">CEx</text>
</svg>`,

  'gate-io.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#0A1A2E"/>
  <text x="20" y="29" font-family="Arial,sans-serif" font-size="20" font-weight="900" fill="#2BAFCC" text-anchor="middle">G</text>
</svg>`,

  'htx.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#0D1226"/>
  <text x="20" y="28" font-family="Arial,sans-serif" font-size="15" font-weight="900" fill="#1352F0" text-anchor="middle" letter-spacing="-0.5">HTX</text>
</svg>`,

  'kucoin.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#0D1F1A"/>
  <text x="20" y="28" font-family="Arial,sans-serif" font-size="14" font-weight="900" fill="#23AF91" text-anchor="middle" letter-spacing="-0.3">KCS</text>
</svg>`,

  'mexc.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#0C1421"/>
  <text x="20" y="28" font-family="Arial,sans-serif" font-size="14" font-weight="900" fill="#00C0B4" text-anchor="middle" letter-spacing="-0.5">MXC</text>
</svg>`,

  'okx.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#000"/>
  <text x="20" y="28" font-family="Arial,sans-serif" font-size="15" font-weight="900" fill="#fff" text-anchor="middle" letter-spacing="-0.5">OKX</text>
</svg>`,

  'phemex.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="8" fill="#0E0E1E"/>
  <text x="20" y="29" font-family="Arial,sans-serif" font-size="18" font-weight="900" fill="#3657FF" text-anchor="middle">P</text>
</svg>`,
};

for (const [file, svg] of Object.entries(logos)) {
  writeFileSync(join(logoDir, file), svg + '\n', 'utf8');
  console.log(`Written: ${file}`);
}
console.log('All square SVG logos generated.');
