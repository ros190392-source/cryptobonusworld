// build-batch02-visual-pack.mjs — Batch 02 permanent visual-pack builder.
//
// Sources: owner CBW-Batch-02-Full-Visual-Pack.zip (2026-07-17), extracted to
// .tmp-batch02-input/ (ignored, never committed). Fixed order 1–10 per
// BATCH-02-MANIFEST.json — mapping is NEVER inferred from filenames/colors.
//
// Roles:
//   A (2172×724) — clean hero backgrounds → versioned WebP, no baked overlays.
//   B (1200×675) / C (1200×630) — owner-approved composition REFERENCE only:
//     they contain baked AI-rendered logos/text and are never served. Finals
//     are rebuilt from the matching A background preserving the approved
//     composition intent (B = centered stack, C = left-composed with art zone
//     on the right) using the exact repository canonicalBannerLogo and the
//     fixed factory template (same T constants as Batch 01,
//     scripts/build-exchange-preview-pack.mjs).
//
// Factory wording contract: REFERRAL CODE / CLAIM BONUS / CryptoBonusWorld.com
// only — no promo value, bonus amount, date or status wording in permanent
// assets. CLAIM BONUS button: fixed geometry/typography; color = the uniform
// green of the owner-approved Batch 02 B/C sources (#16A34A family).
//
// Usage: node scripts/build-batch02-visual-pack.mjs
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';

const SRC = '.tmp-batch02-input/CBW-Batch-02-Full-Visual-Pack';

// Fixed manifest order 1–10 ↔ registry slugs (batch-02.ts). canonical = the
// exact committed canonicalBannerLogo asset for that exchange — single source
// across hero HTML overlay, article, OG, card and lower promo block.
const ENTRIES = [
  { n: 1,  slug: 'htx',        a: '1.A-HTX-hero.png',        heroV: 'v3', lockup: 'htx-logo-lockup-512x160-v2.png' },
  { n: 2,  slug: 'crypto-com', a: '2.A-Crypto-com-hero.png', heroV: 'v2', lockup: 'crypto-com-logo-lockup-512x160-v1.png' },
  { n: 3,  slug: 'coinbase',   a: '3.A-Coinbase-hero.png',   heroV: 'v2', lockup: 'coinbase-logo-lockup-512x160-v2.png' },
  { n: 4,  slug: 'weex',       a: '4.A-WEEX-hero.png',       heroV: 'v2', lockup: 'weex-logo-lockup-512x160-v1.png' },
  { n: 5,  slug: 'zoomex',     a: '5.A-Zoomex-hero.png',     heroV: 'v2', lockup: 'zoomex-logo-lockup-512x160-v1.png' },
  { n: 6,  slug: 'margex',     a: '6.A-Margex-hero.png',     heroV: 'v2', lockup: 'margex-logo-lockup-512x160-v1.png' },
  { n: 7,  slug: 'bitmart',    a: '7.A-BitMart-hero.png',    heroV: 'v2', lockup: 'bitmart-logo-lockup-512x160-v2.png' },
  { n: 8,  slug: 'bitrue',     a: '8.A-Bitrue-hero.png',     heroV: 'v2', lockup: 'bitrue-logo-lockup-512x160-v1.png' },
  { n: 9,  slug: 'coinw',      a: '9.A-CoinW-hero.png',      heroV: 'v2', lockup: 'coinw-logo-lockup-512x160-v1.png' },
  { n: 10, slug: 'xt-com',     a: '10.A-XT-COM-hero.png',    heroV: 'v2', lockup: 'xt-com-logo-lockup-512x160-v2.png' },
];

// ── FIXED FACTORY TEMPLATE (identical to Batch 01 build-exchange-preview-pack.mjs) ──
const T = {
  logoW: 560, logoH: 175,
  gapLogoLabel: 26,
  labelSize: 40, labelTracking: 5, labelH: 48,
  gapLabelCta: 30,
  ctaW: 400, ctaH: 88, ctaSize: 34, ctaTracking: 3,
  domainSize: 20, domainBottom: 30,
};
const BLOCK_H = T.logoH + T.gapLogoLabel + T.labelH + T.gapLabelCta + T.ctaH;

// OG left-composed template (identical to Batch 01 build-exchange-og-final.mjs)
const OG = {
  logoX: 70, logoY: 110, logoW: 480, logoH: 150,
  labelX: 95, labelBaseline: 372, labelSize: 40, labelTracking: 5,
  btnX: 95, btnY: 408, btnW: 400, btnH: 88, ctaSize: 34, ctaTracking: 3,
  domainX: 95, domainBaseline: 585, domainSize: 20,
};

// Uniform CLAIM BONUS green — matches the owner-approved B/C source direction.
const CTA_GREEN = '#16A34A';

const centeredText = (W, H, blockTop) => {
  const labelY = blockTop + T.logoH + T.gapLogoLabel + T.labelH - 10;
  const ctaY = blockTop + T.logoH + T.gapLogoLabel + T.labelH + T.gapLabelCta;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <text x="50%" y="${labelY}" font-family="Arial, Helvetica, sans-serif" font-size="${T.labelSize}" font-weight="800" letter-spacing="${T.labelTracking}" fill="#FFFFFF" text-anchor="middle">REFERRAL CODE</text>
    <rect x="${(W - T.ctaW) / 2}" y="${ctaY}" width="${T.ctaW}" height="${T.ctaH}" rx="${T.ctaH / 2}" fill="${CTA_GREEN}"/>
    <text x="50%" y="${ctaY + T.ctaH / 2 + T.ctaSize * 0.36}" font-family="Arial, Helvetica, sans-serif" font-size="${T.ctaSize}" font-weight="800" letter-spacing="${T.ctaTracking}" fill="#FFFFFF" text-anchor="middle">CLAIM BONUS</text>
    <text x="50%" y="${H - T.domainBottom}" font-family="Arial, Helvetica, sans-serif" font-size="${T.domainSize}" font-weight="700" letter-spacing="1.5" fill="rgba(255,255,255,0.6)" text-anchor="middle">CryptoBonusWorld.com</text>
  </svg>`;
};

async function centeredAsset(e, W, H, out, quality) {
  const dir = `public/preview-media/exchanges/${e.slug}`;
  const layers = [
    { input: await sharp(`${SRC}/A-Hero-Backgrounds/${e.a}`).resize(W, H, { fit: 'cover' }).toBuffer(), left: 0, top: 0 },
    { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="rgba(5,9,16,0.45)"/></svg>`), left: 0, top: 0 },
  ];
  const blockTop = Math.max(24, Math.round((H - BLOCK_H) / 2) - Math.round(T.domainBottom / 2));
  const logoBuf = await sharp(`${dir}/${e.lockup}`)
    .resize(T.logoW, T.logoH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  layers.push({ input: logoBuf, left: Math.round((W - T.logoW) / 2), top: blockTop });
  layers.push({ input: Buffer.from(centeredText(W, H, blockTop)), left: 0, top: 0 });
  const base = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#05090F"/></svg>`);
  const p = sharp(base).composite(layers);
  if (out.endsWith('.webp')) await p.webp({ quality }).toFile(out);
  else await p.jpeg({ quality }).toFile(out);
}

async function ogAsset(e, out) {
  const W = 1200, H = 630;
  const dir = `public/preview-media/exchanges/${e.slug}`;
  const layers = [
    // keep the art zone on the RIGHT (approved C composition intent)
    { input: await sharp(`${SRC}/A-Hero-Backgrounds/${e.a}`).resize(W, H, { fit: 'cover', position: 'east' }).toBuffer(), left: 0, top: 0 },
    { // factory scrim over the left column so the fixed template stays readable
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="rgba(5,8,15,0.92)"/>
          <stop offset="0.55" stop-color="rgba(5,8,15,0.82)"/>
          <stop offset="0.92" stop-color="rgba(5,8,15,0)"/>
        </linearGradient></defs>
        <rect width="${W}" height="${H}" fill="url(#s)"/>
      </svg>`), left: 0, top: 0 },
  ];
  const logoBuf = await sharp(`${dir}/${e.lockup}`)
    .resize(OG.logoW, OG.logoH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  layers.push({ input: logoBuf, left: OG.logoX, top: OG.logoY });
  layers.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <text x="${OG.labelX}" y="${OG.labelBaseline}" font-family="Arial, Helvetica, sans-serif" font-size="${OG.labelSize}" font-weight="800" letter-spacing="${OG.labelTracking}" fill="#FFFFFF">REFERRAL CODE</text>
      <rect x="${OG.btnX}" y="${OG.btnY}" width="${OG.btnW}" height="${OG.btnH}" rx="${OG.btnH / 2}" fill="${CTA_GREEN}"/>
      <text x="${OG.btnX + OG.btnW / 2}" y="${OG.btnY + OG.btnH / 2 + OG.ctaSize * 0.36}" font-family="Arial, Helvetica, sans-serif" font-size="${OG.ctaSize}" font-weight="800" letter-spacing="${OG.ctaTracking}" fill="#FFFFFF" text-anchor="middle">CLAIM BONUS</text>
      <text x="${OG.domainX}" y="${OG.domainBaseline}" font-family="Arial, Helvetica, sans-serif" font-size="${OG.domainSize}" font-weight="700" letter-spacing="1.5" fill="rgba(255,255,255,0.6)">CryptoBonusWorld.com</text>
    </svg>`), left: 0, top: 0,
  });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#05080F' } })
    .composite(layers).jpeg({ quality: 90 }).toFile(out);
}

for (const e of ENTRIES) {
  const dir = `public/preview-media/exchanges/${e.slug}`;
  mkdirSync(dir, { recursive: true });
  if (!existsSync(`${SRC}/A-Hero-Backgrounds/${e.a}`)) throw new Error(`missing A: ${e.a}`);
  if (!existsSync(`${dir}/${e.lockup}`)) throw new Error(`missing canonical lockup: ${e.lockup}`);

  // Task 2 — final A hero: next unused version, never overwrite committed ones
  const heroOut = `${dir}/${e.slug}-hero-2172x724-${e.heroV}.webp`;
  if (existsSync(heroOut)) throw new Error(`version collision: ${heroOut}`);
  await sharp(`${SRC}/A-Hero-Backgrounds/${e.a}`).webp({ quality: 90 }).toFile(heroOut);

  // Task 3 — final B article (centered approved composition, factory template)
  await centeredAsset(e, 1200, 675, `${dir}/${e.slug}-article-inline-banner-v1.webp`, 86);
  // Task 5 — final D card
  await centeredAsset(e, 1200, 800, `${dir}/${e.slug}-card-1200x800-v1.jpg`, 88);
  // Task 4 — final C OG (left-composed approved composition, factory template)
  await ogAsset(e, `${dir}/${e.slug}-og-1200x630-v1.jpg`);

  console.log(`${e.n}. ${e.slug}: hero ${e.heroV} + article v1 + og v1 + card v1 done`);
}
console.log('batch-02 visual pack complete');
