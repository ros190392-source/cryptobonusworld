#!/usr/bin/env node
/**
 * gen-mexc-hero-variant-review-v2.mjs
 *
 * Generates the MEXC hero variant review pack.
 *
 * ROOT CAUSE NOTE (why this v2 was needed):
 *   Older review reports (mexc-logo-treatment-options-v1, mexc-full-review-v2)
 *   were generated before the ExchangePromoLogoSlot migration and used
 *   experimental logo treatments — some variants applied CSS filters, white
 *   plaques, or SVG-drawn logos that looked different at mobile vs desktop.
 *   The approved asset (mexc-logo-transparent-2517-trimmed.png) was NOT
 *   consistently used across all options in those old reports.
 *
 * THIS GENERATOR:
 *   - Always uses the same logo: mexc-logo-transparent-2517-trimmed.png
 *   - Logo color is LOCKED — never recolored, never filtered
 *   - Desktop and mobile use identical asset and identical component (mode="clean")
 *   - The 3 glow levels are applied by CSS-injecting the hero background PNG
 *   - The page ExchangePromoLogoSlot component is untouched
 *   - "std"   = full hero block screenshot (shows context)
 *   - "large" = tight logo-zone crop for color verification (zoomed in)
 *
 * Approved logo: public/media/exchanges/mexc/logo/mexc-logo-transparent-2517-trimmed.png
 * Logo on page:  src/pages/mexc/index.astro exchange.wordmarkImg
 * Component:     src/components/ExchangePromoLogoSlot.astro mode="clean"
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = resolve(ROOT, 'reports/visual/mexc-hero-variant-review-v2');
mkdirSync(OUT, { recursive: true });

const BASE    = 'http://localhost:4326';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

// Hero crop sizes
const HERO_FULL_D = { x: 0, y: 0, width: 1440, height: 480 };
const HERO_FULL_M = { x: 0, y: 0, width: 390,  height: 440 };

// Logo-zone crop: centered on the logo slot position within the hero
// Desktop: hero is 480px tall, logo slot is centered, roughly y:60–240
const LOGO_ZONE_D = { x: 360, y: 40, width: 720, height: 260 };
// Mobile: logo slot is centered, roughly y:60–210 in a 440px hero
const LOGO_ZONE_M = { x: 0,   y: 50, width: 390, height: 240 };

// ── Glow variants ─────────────────────────────────────────────────────────────
const GLOW_VARIANTS = [
  {
    name: 'no_glow',
    bg:   "url('/media/hero-backgrounds/cbw-hero-neutral-no-glow-v2.png') left center / cover no-repeat",
  },
  {
    name: 'soft_glow',
    bg:   "url('/media/hero-backgrounds/cbw-hero-neutral-logo-glow-v2.png') center center / cover no-repeat",
  },
  {
    name: 'strong_glow',
    bg:   "url('/media/hero-backgrounds/cbw-hero-neutral-strong-glow-v1.png') center center / cover no-repeat",
  },
];

// ── CSS injection to override the baked-in hero background ───────────────────
// Uses body prefix + !important to beat Astro-scoped styles (data-astro-cid-*)
async function injectGlow(page, bg) {
  await page.addStyleTag({
    content: `body .brand-hero { background: ${bg}, linear-gradient(160deg,#0C1118 0%,#141B25 100%) !important; }`,
  });
}

// ── Label SVG ─────────────────────────────────────────────────────────────────
function labelSvg(text, w, h) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="${h - 44}" width="${text.length * 10 + 24}" height="32" rx="4" fill="rgba(0,0,0,0.70)"/>
      <text x="22" y="${h - 23}" font-family="monospace" font-size="16" font-weight="bold" fill="#e2e8f0">${text}</text>
    </svg>`
  );
}

const { default: sharp } = await import('sharp');
const browser = await chromium.launch();

const screenshots = {}; // key → Buffer

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP: all 3 glow × std + large
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Desktop variants ──');

for (const gv of GLOW_VARIANTS) {
  const pageD = await browser.newPage({ viewport: DESKTOP });
  await pageD.goto(`${BASE}/mexc/`, { waitUntil: 'networkidle' });
  await injectGlow(pageD, gv.bg);
  await pageD.waitForTimeout(150);

  // std: full hero
  const stdKey = `${gv.name}-std-desktop`;
  const stdBuf = await pageD.screenshot({ clip: HERO_FULL_D });
  screenshots[stdKey] = stdBuf;
  await sharp(stdBuf).png().toFile(resolve(OUT, `desktop-${gv.name}-std.png`));
  console.log(`  ✓ desktop-${gv.name}-std.png`);

  // large: logo-zone crop
  const lrgKey = `${gv.name}-large-desktop`;
  const lrgBuf = await pageD.screenshot({ clip: LOGO_ZONE_D });
  screenshots[lrgKey] = lrgBuf;
  await sharp(lrgBuf).png().toFile(resolve(OUT, `desktop-${gv.name}-large.png`));
  console.log(`  ✓ desktop-${gv.name}-large.png`);

  await pageD.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE: all 3 glow × std + large
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Mobile variants ──');

for (const gv of GLOW_VARIANTS) {
  const pageM = await browser.newPage({ viewport: MOBILE });
  await pageM.goto(`${BASE}/mexc/`, { waitUntil: 'networkidle' });
  await injectGlow(pageM, gv.bg);
  await pageM.waitForTimeout(150);

  const stdKey = `${gv.name}-std-mobile`;
  const stdBuf = await pageM.screenshot({ clip: HERO_FULL_M });
  screenshots[stdKey] = stdBuf;
  await sharp(stdBuf).png().toFile(resolve(OUT, `mobile-${gv.name}-std.png`));
  console.log(`  ✓ mobile-${gv.name}-std.png`);

  const lrgKey = `${gv.name}-large-mobile`;
  const lrgBuf = await pageM.screenshot({ clip: LOGO_ZONE_M });
  screenshots[lrgKey] = lrgBuf;
  await sharp(lrgBuf).png().toFile(resolve(OUT, `mobile-${gv.name}-large.png`));
  console.log(`  ✓ mobile-${gv.name}-large.png`);

  await pageM.close();
}

await browser.close();

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON BOARDS
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Building comparison boards ──');

async function labelledCell(buf, text, w, h) {
  const resized = await sharp(buf).resize({ width: w, height: h, fit: 'cover', position: 'top' }).png().toBuffer();
  return sharp(resized).composite([{ input: labelSvg(text, w, h), blend: 'over' }]).png().toBuffer();
}

function dividerV(h) {
  return Buffer.from(`<svg width="2" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="2" height="${h}" fill="rgba(255,255,255,0.2)"/></svg>`);
}
function dividerH(w) {
  return Buffer.from(`<svg width="${w}" height="2" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="2" fill="rgba(255,255,255,0.2)"/></svg>`);
}

// ── Desktop comparison board: 3 rows (one per glow), 2 cols (desktop std / mobile std)
// Cell: 720×240 each, 3 rows = 720px total height
const BC = 720, BH = 240;

const deskRows = [];
for (const gv of GLOW_VARIANTS) {
  const dCell = await labelledCell(screenshots[`${gv.name}-std-desktop`], `${gv.name} — desktop`, BC, BH);
  const mCell = await labelledCell(screenshots[`${gv.name}-std-mobile`],  `${gv.name} — mobile`,  BC, BH);
  const row = await sharp({ create: { width: BC * 2 + 2, height: BH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
    .composite([
      { input: dCell, left: 0,        top: 0 },
      { input: dividerV(BH), left: BC, top: 0 },
      { input: mCell, left: BC + 2,   top: 0 },
    ])
    .png().toBuffer();
  deskRows.push(row);
}

const totalH = BH * 3 + 2 * 2; // 3 rows + 2 dividers
const boardW = BC * 2 + 2;
const composites = [];
for (let i = 0; i < deskRows.length; i++) {
  const y = i * (BH + 2);
  composites.push({ input: deskRows[i], left: 0, top: y });
  if (i < deskRows.length - 1) {
    composites.push({ input: dividerH(boardW), left: 0, top: y + BH });
  }
}
await sharp({ create: { width: boardW, height: totalH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
  .composite(composites)
  .png()
  .toFile(resolve(OUT, 'comparison-desktop-vs-mobile.png'));
console.log('  ✓ comparison-desktop-vs-mobile.png');

// ── Large-zone board: 3 glow × 2 viewports (desktop-large / mobile-large)
const LC = 600, LH = 220;
const lgRows = [];
for (const gv of GLOW_VARIANTS) {
  const dCell = await labelledCell(screenshots[`${gv.name}-large-desktop`], `${gv.name} — desktop large`, LC, LH);
  const mCell = await labelledCell(screenshots[`${gv.name}-large-mobile`],  `${gv.name} — mobile large`,  LC, LH);
  const row = await sharp({ create: { width: LC * 2 + 2, height: LH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
    .composite([
      { input: dCell, left: 0,        top: 0 },
      { input: dividerV(LH), left: LC, top: 0 },
      { input: mCell, left: LC + 2,   top: 0 },
    ])
    .png().toBuffer();
  lgRows.push(row);
}

const lgTotalH = LH * 3 + 2 * 2;
const lgBoardW = LC * 2 + 2;
const lgComposites = [];
for (let i = 0; i < lgRows.length; i++) {
  const y = i * (LH + 2);
  lgComposites.push({ input: lgRows[i], left: 0, top: y });
  if (i < lgRows.length - 1) {
    lgComposites.push({ input: dividerH(lgBoardW), left: 0, top: y + LH });
  }
}
await sharp({ create: { width: lgBoardW, height: lgTotalH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
  .composite(lgComposites)
  .png()
  .toFile(resolve(OUT, 'comparison-logo-zone-large.png'));
console.log('  ✓ comparison-logo-zone-large.png');

console.log(`\n✅ All files saved to ${OUT}`);
console.log(`\nRoot cause: Old reports used experimental CSS/SVG treatments that altered logo color.`);
console.log(`This generator always uses ExchangePromoLogoSlot with mode="clean" and the`);
console.log(`approved asset (mexc-logo-transparent-2517-trimmed.png). Logo is color-locked.`);
