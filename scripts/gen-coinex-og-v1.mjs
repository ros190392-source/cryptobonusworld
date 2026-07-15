// Generate the neutral CoinEx "Current Status" OG image (1200x630 JPG).
//
// Programmatic factory asset — NOT from any ChatGPT mockup sheet. Navy brand
// background + official CoinEx teal logo (public/logos/coinex.png) on a clean
// white tile + neutral status text. Deliberately NO bonus amount, promo code,
// "Claim", KYC, or availability claim (this backs a neutral status page).
//
// Output: public/media/exchanges/coinex/final/coinex-og-final-v1-1200x630-{8hexhash}.jpg
// Filename carries an 8-char SHA-256 content-hash suffix (project cache-bust
// convention, per media-update.mjs / Visual Pack Factory Standard).
//
// Usage: node scripts/gen-coinex-og-v1.mjs
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const W = 1200, H = 630;
const OUT_DIR = 'public/media/exchanges/coinex/final';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#13233E"/>
      <stop offset="0.55" stop-color="#0C1626"/>
      <stop offset="1" stop-color="#080F18"/>
    </linearGradient>
    <radialGradient id="amber" cx="0.85" cy="0.15" r="0.5">
      <stop offset="0" stop-color="#F7931A" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#F7931A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="teal" cx="0.12" cy="0.9" r="0.5">
      <stop offset="0" stop-color="#14C7A0" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#14C7A0" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#amber)"/>
  <rect width="${W}" height="${H}" fill="url(#teal)"/>
  <rect x="32" y="32" width="${W - 64}" height="${H - 64}" rx="24" fill="none" stroke="#2A3F5F" stroke-opacity="0.5" stroke-width="1.5"/>

  <text x="80" y="92" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#14C7A0" letter-spacing="0.5">CryptoBonusWorld.com</text>

  <rect x="80" y="240" width="170" height="170" rx="34" fill="#FFFFFF"/>

  <text x="286" y="250" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#5EE0C2" letter-spacing="3">COINEX · REFERRAL CODE</text>
  <text x="284" y="330" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="800" fill="#FFFFFF" letter-spacing="-1">Current Status</text>

  <rect x="286" y="360" width="196" height="46" rx="23" fill="#F7931A"/>
  <text x="384" y="391" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="800" fill="#13233E" letter-spacing="1.5" text-anchor="middle">UNDER REVIEW</text>

  <text x="286" y="452" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="500" fill="#9FB2CC">No verified bonus listed</text>
</svg>`;

const logo = await sharp('public/logos/coinex.png')
  .resize(126, 126, { fit: 'contain', background: '#FFFFFF' })
  .toBuffer();

const jpg = await sharp(Buffer.from(svg))
  .composite([{ input: logo, top: 240 + 22, left: 80 + 22 }])
  .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
  .toBuffer();

const hash = createHash('sha256').update(jpg).digest('hex').slice(0, 8);
const name = `coinex-og-final-v1-1200x630-${hash}.jpg`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
// Remove any previous hashed variant so only one final asset remains.
for (const f of readdirSync(OUT_DIR)) {
  if (/^coinex-og-final-v1-1200x630-[0-9a-f]{8}\.jpg$/.test(f)) unlinkSync(join(OUT_DIR, f));
}
const outPath = join(OUT_DIR, name);
writeFileSync(outPath, jpg);

const meta = await sharp(jpg).metadata();
console.log(`wrote ${outPath}`);
console.log(`  ${meta.width}x${meta.height} ${meta.format} ${(jpg.length / 1024).toFixed(1)} KB  hash=${hash}`);
