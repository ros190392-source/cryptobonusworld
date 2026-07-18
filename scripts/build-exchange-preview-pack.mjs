// build-exchange-preview-pack.mjs — PREVIEW visual pack generator (Batch 01).
//
// Generates preview-only OG / article / card images for every entry in
// src/data/exchangePreview/batch-01.ts into public/preview-media/exchanges/{slug}/.
//
// Safety: text layers contain ONLY: exchange name, "REFERRAL CODE",
// "UNDER REVIEW", "No verified bonus listed", "CryptoBonusWorld.com".
// No codes, no bonus amounts, no CTAs, no country/KYC claims.
//
// Usage: node scripts/build-exchange-preview-pack.mjs
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';

// Registry data duplicated as plain JS (this script must run without a TS loader).
// Keep in sync with src/data/exchangePreview/batch-01.ts.
const ENTRIES = [
  { slug: 'bydfi',        name: 'BYDFi',        accent: '#F7C600', from: '#1a1602', to: '#0B0F17' },
  { slug: 'bitunix',      name: 'Bitunix',      accent: '#B6F04A', from: '#101a06', to: '#0B0F17' },
  { slug: 'hyperliquid',  name: 'Hyperliquid',  accent: '#97FCE4', from: '#04211c', to: '#0B0F17' },
  { slug: 'gate-com',     name: 'Gate.com',     accent: '#2354E6', from: '#071433', to: '#0B0F17' },
  { slug: 'blofin',       name: 'BloFin',       accent: '#12D2B0', from: '#03201b', to: '#0B0F17' },
  { slug: 'evedex',       name: 'EVEDEX',       accent: '#18C08F', from: '#052519', to: '#0B0F17' },
  { slug: 'vest-markets', name: 'Vest Markets', accent: '#35B0FF', from: '#06182b', to: '#0B0F17' },
  { slug: 'phemex',       name: 'Phemex',       accent: '#16A34A', from: '#06210f', to: '#0B0F17' },
  { slug: 'binance',      name: 'Binance',      accent: '#F0B90B', from: '#1d1502', to: '#0B0F17' },
  { slug: 'whitebit',     name: 'WhiteBIT',     accent: '#7C5CFF', from: '#140f2e', to: '#0B0F17' },
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function makeImage(e, W, H, out) {
  const dir = `public/preview-media/exchanges/${e.slug}`;
  const heroPath = `${dir}/${e.slug}-hero-preview-2172x724.webp`;
  const logoPath = `${dir}/${e.slug}-logo-slot-512x160.png`;

  const layers = [];
  // background: exchange empty hero (cover) or brand gradient fallback
  if (existsSync(heroPath)) {
    layers.push({ input: await sharp(heroPath).resize(W, H, { fit: 'cover' }).toBuffer(), left: 0, top: 0 });
    // dark scrim for text legibility
    layers.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="rgba(5,9,16,0.45)"/></svg>`),
      left: 0, top: 0,
    });
  }
  const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${e.from}"/><stop offset="1" stop-color="${e.to}"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
  </svg>`;

  // logo slot centered upper third (512×160 source, scale to ~46% width)
  const logoW = Math.round(W * 0.42);
  const logoBuf = await sharp(logoPath).resize(logoW, Math.round(logoW * 160 / 512), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const logoM = await sharp(logoBuf).metadata();
  const logoY = Math.round(H * 0.16);
  layers.push({ input: logoBuf, left: Math.round((W - logoM.width) / 2), top: logoY });

  const textY = logoY + logoM.height;
  const fsLabel = Math.round(W * 0.052);
  const pillW = Math.round(W * 0.34), pillH = Math.round(H * 0.104);
  const pillY = textY + Math.round(H * 0.135);
  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <text x="50%" y="${textY + Math.round(H * 0.085)}" font-family="Arial, Helvetica, sans-serif" font-size="${fsLabel}" font-weight="800" letter-spacing="4" fill="#FFFFFF" text-anchor="middle">REFERRAL CODE</text>
    <rect x="${(W - pillW) / 2}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${Math.round(pillH / 2)}" fill="rgba(10,14,22,0.72)" stroke="${e.accent}" stroke-width="2.5"/>
    <text x="50%" y="${pillY + pillH / 2 + Math.round(pillH * 0.13)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(pillH * 0.4)}" font-weight="800" letter-spacing="3" fill="#FFFFFF" text-anchor="middle">UNDER REVIEW</text>
    <text x="50%" y="${pillY + pillH + Math.round(H * 0.075)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(W * 0.021)}" font-weight="600" fill="rgba(255,255,255,0.75)" text-anchor="middle">No verified bonus listed</text>
    <text x="50%" y="${H - Math.round(H * 0.045)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(W * 0.019)}" font-weight="700" letter-spacing="1.5" fill="rgba(255,255,255,0.55)" text-anchor="middle">CryptoBonusWorld.com</text>
  </svg>`;
  layers.push({ input: Buffer.from(textSvg), left: 0, top: 0 });

  await sharp(Buffer.from(baseSvg)).composite(layers).jpeg({ quality: 88 }).toFile(out);
}

for (const e of ENTRIES) {
  const dir = `public/preview-media/exchanges/${e.slug}`;
  mkdirSync(dir, { recursive: true });
  await makeImage(e, 1200, 630, `${dir}/${e.slug}-og-preview-1200x630.jpg`);
  await makeImage(e, 1200, 675, `${dir}/${e.slug}-article-preview-1200x675.jpg`);
  await makeImage(e, 1200, 800, `${dir}/${e.slug}-card-preview-1200x800.jpg`);
  console.log(`${e.slug}: og + article + card done`);
}
console.log('preview pack complete');
