#!/usr/bin/env node
/**
 * screenshot-hero-current-final-review-v1.mjs
 *
 * Fresh visual review of the Exchange Hero System using only assets
 * already inside the project — no external downloads required.
 *
 * Source-of-truth assets:
 *   public/media/hero-backgrounds/cbw-hero-neutral-no-glow-v2.png
 *   public/media/hero-backgrounds/cbw-hero-neutral-logo-glow-v2.png
 *   public/media/hero-backgrounds/cbw-hero-neutral-strong-glow-v1.png
 *
 * Shots:
 *   01  Bybit desktop top
 *   02  Bybit desktop bottom
 *   03  Bybit mobile top
 *   04  MEXC desktop top
 *   05  MEXC desktop bottom
 *   06  MEXC mobile top
 *   07  Bybit vs MEXC desktop (side-by-side)
 *   08  Bybit vs MEXC mobile (side-by-side)
 *   09  no_glow / soft_glow / strong_glow comparison (3-panel, CSS-injected on exchange page)
 *   10  homepage card → exchange hero flow
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = resolve(ROOT, 'reports/visual/exchange-hero-current-final-review');
mkdirSync(OUT, { recursive: true });

const { default: sharp } = await import('sharp');
const browser = await chromium.launch();

const BASE    = 'http://localhost:4326';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

// ── Helpers ───────────────────────────────────────────────────────────────────

async function openPage(viewport, url) {
  const p = await browser.newPage({ viewport });
  await p.goto(url, { waitUntil: 'networkidle' });
  return p;
}

async function heroShot(page, outFile, mobile = false) {
  const vp = page.viewportSize();
  const clip = { x: 0, y: 0, width: vp.width, height: mobile ? 460 : 480 };
  const buf = await page.screenshot({ clip });
  await sharp(buf).png().toFile(outFile);
  console.log('  ✓', outFile.split(/[\\/]/).at(-1));
  return buf;
}

async function bottomHeroShot(page, outFile) {
  const heroes = page.locator('.brand-hero');
  const count  = await heroes.count();
  await heroes.nth(count - 1).scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
  const box = await heroes.nth(count - 1).boundingBox();
  const vp  = page.viewportSize();
  const clipH = Math.min(box.height, 480);
  const buf = await page.screenshot({ clip: { x: 0, y: Math.max(0, box.y), width: vp.width, height: clipH } });
  await sharp(buf).png().toFile(outFile);
  console.log('  ✓', outFile.split(/[\\/]/).at(-1));
  return buf;
}

function divV(h) { return Buffer.from(`<svg width="3" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="3" height="${h}" fill="#1e2330"/></svg>`); }
function divH(w) { return Buffer.from(`<svg width="${w}" height="3" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="3" fill="#1e2330"/></svg>`); }

function badge(text, w, h) {
  const tw = text.length * 9 + 24;
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="${h - 42}" width="${tw}" height="28" rx="4" fill="rgba(0,0,0,0.72)"/>
      <text x="22" y="${h - 22}" font-family="monospace" font-size="14" font-weight="bold" fill="#e2e8f0">${text}</text>
    </svg>`
  );
}

async function labelledCell(buf, text, w, h, position = 'top') {
  const resized = await sharp(buf).resize({ width: w, height: h, fit: 'cover', position }).png().toBuffer();
  return sharp(resized).composite([{ input: badge(text, w, h), blend: 'over' }]).png().toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// 01–03 Bybit
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── 01–03 Bybit ──');
const bybitD = await openPage(DESKTOP, `${BASE}/bybit/`);
const b01 = await heroShot(bybitD, resolve(OUT, '01-bybit-desktop-top.png'));
const b02 = await bottomHeroShot(bybitD, resolve(OUT, '02-bybit-desktop-bottom.png'));
await bybitD.close();

const bybitM = await openPage(MOBILE, `${BASE}/bybit/`);
const b03 = await heroShot(bybitM, resolve(OUT, '03-bybit-mobile-top.png'), true);
await bybitM.close();

// ─────────────────────────────────────────────────────────────────────────────
// 04–06 MEXC
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 04–06 MEXC ──');
const mexcD = await openPage(DESKTOP, `${BASE}/mexc/`);
const b04 = await heroShot(mexcD, resolve(OUT, '04-mexc-desktop-top.png'));
const b05 = await bottomHeroShot(mexcD, resolve(OUT, '05-mexc-desktop-bottom.png'));
await mexcD.close();

const mexcM = await openPage(MOBILE, `${BASE}/mexc/`);
const b06 = await heroShot(mexcM, resolve(OUT, '06-mexc-mobile-top.png'), true);
await mexcM.close();

// ─────────────────────────────────────────────────────────────────────────────
// 07 Bybit vs MEXC — desktop side-by-side
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 07 Bybit vs MEXC desktop ──');
{
  const CW = 720, CH = 260;
  const left  = await labelledCell(b01, 'Bybit — no_glow (assigned)', CW, CH);
  const right  = await labelledCell(b04, 'MEXC — soft_glow (assigned)', CW, CH);
  await sharp({ create: { width: CW * 2 + 3, height: CH, channels: 3, background: { r: 8, g: 10, b: 15 } } })
    .composite([
      { input: left,    left: 0,       top: 0 },
      { input: divV(CH), left: CW,     top: 0 },
      { input: right,   left: CW + 3,  top: 0 },
    ])
    .png().toFile(resolve(OUT, '07-bybit-vs-mexc-desktop.png'));
  console.log('  ✓ 07-bybit-vs-mexc-desktop.png');
}

// ─────────────────────────────────────────────────────────────────────────────
// 08 Bybit vs MEXC — mobile side-by-side
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 08 Bybit vs MEXC mobile ──');
{
  const MW = 390, MH = 460;
  const left  = await labelledCell(b03, 'Bybit mobile', MW, MH);
  const right  = await labelledCell(b06, 'MEXC mobile', MW, MH);
  await sharp({ create: { width: MW * 2 + 3, height: MH, channels: 3, background: { r: 8, g: 10, b: 15 } } })
    .composite([
      { input: left,    left: 0,       top: 0 },
      { input: divV(MH), left: MW,     top: 0 },
      { input: right,   left: MW + 3,  top: 0 },
    ])
    .png().toFile(resolve(OUT, '08-bybit-vs-mexc-mobile.png'));
  console.log('  ✓ 08-bybit-vs-mexc-mobile.png');
}

// ─────────────────────────────────────────────────────────────────────────────
// 09 Three-level comparison: no_glow / soft_glow / strong_glow
// Uses MEXC page with CSS injection to swap the hero background.
// Shows how all 3 hero assets look on a real exchange page with a real logo.
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 09 Three-level glow comparison ──');

const GLOW_VARIANTS = [
  { name: 'no_glow',     bg: "url('/media/hero-backgrounds/cbw-hero-neutral-no-glow-v2.png') left center / cover no-repeat",    label: '① no_glow  (Bybit assigned)' },
  { name: 'soft_glow',   bg: "url('/media/hero-backgrounds/cbw-hero-neutral-logo-glow-v2.png') center center / cover no-repeat", label: '② soft_glow  (MEXC assigned)' },
  { name: 'strong_glow', bg: "url('/media/hero-backgrounds/cbw-hero-neutral-strong-glow-v1.png') center center / cover no-repeat",label: '③ strong_glow  (reserved)' },
];

const panelBufs = [];
const PW = 480, PH = 300;

for (const gv of GLOW_VARIANTS) {
  const p = await openPage(DESKTOP, `${BASE}/mexc/`);
  // Inject override — body prefix beats Astro scoped data-astro-cid-* specificity
  await p.addStyleTag({
    content: `body .brand-hero { background: ${gv.bg}, linear-gradient(160deg,#0C1118 0%,#141B25 100%) !important; }`,
  });
  await p.waitForTimeout(150);
  const raw = await p.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 480 } });
  await p.close();
  const cell = await labelledCell(raw, gv.label, PW, PH);
  panelBufs.push(cell);
}

// Three panels in a row
const TW = PW * 3 + 3 * 2;
await sharp({ create: { width: TW, height: PH, channels: 3, background: { r: 8, g: 10, b: 15 } } })
  .composite([
    { input: panelBufs[0], left: 0,              top: 0 },
    { input: divV(PH),     left: PW,             top: 0 },
    { input: panelBufs[1], left: PW + 3,         top: 0 },
    { input: divV(PH),     left: PW * 2 + 3,     top: 0 },
    { input: panelBufs[2], left: PW * 2 + 3 * 2, top: 0 },
  ])
  .png()
  .toFile(resolve(OUT, '09-glow-levels-comparison.png'));
console.log('  ✓ 09-glow-levels-comparison.png');

// ─────────────────────────────────────────────────────────────────────────────
// 10 Homepage card → exchange hero flow
// Shows the visual continuity from the homepage exchange section into the
// exchange page hero so the owner can judge whether they feel like one system.
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 10 Homepage → hero flow ──');

const homePage = await openPage(DESKTOP, `${BASE}/`);
await homePage.evaluate(() => window.scrollTo(0, 0));
const homeRaw = await homePage.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 700 } });
await homePage.close();

const FW = 1440, FC = 340, FH = 300;
// Build: [homepage strip] [divider] [bybit hero] [divider] [mexc hero]
const homeStrip  = await sharp(homeRaw).resize({ width: FW, height: FC, fit: 'cover', position: 'top' }).png().toBuffer();
const bybitStrip = await sharp(b01).resize({ width: FW, height: FH, fit: 'cover', position: 'top' }).png().toBuffer();
const mexcStrip  = await sharp(b04).resize({ width: FW, height: FH, fit: 'cover', position: 'top' }).png().toBuffer();

// Add labels
function sectionLabel(text, color, w, h) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="${text.length * 9 + 24}" height="28" rx="4" fill="rgba(0,0,0,0.65)"/>
      <text x="22" y="30" font-family="monospace" font-size="14" font-weight="bold" fill="${color}">${text}</text>
    </svg>`
  );
}
const homeLabelled  = await sharp(homeStrip).composite([{ input: sectionLabel('homepage — exchange card section', '#94a3b8', FW, FC), blend: 'over' }]).png().toBuffer();
const bybitLabelled = await sharp(bybitStrip).composite([{ input: sectionLabel('↓  bybit page — no_glow hero', '#60a5fa', FW, FH), blend: 'over' }]).png().toBuffer();
const mexcLabelled  = await sharp(mexcStrip).composite([{ input: sectionLabel('↓  mexc page — soft_glow hero', '#34d399', FW, FH), blend: 'over' }]).png().toBuffer();

const totalH = FC + 3 + FH + 3 + FH;
await sharp({ create: { width: FW, height: totalH, channels: 3, background: { r: 11, g: 13, b: 20 } } })
  .composite([
    { input: homeLabelled,  left: 0, top: 0 },
    { input: divH(FW),      left: 0, top: FC },
    { input: bybitLabelled, left: 0, top: FC + 3 },
    { input: divH(FW),      left: 0, top: FC + 3 + FH },
    { input: mexcLabelled,  left: 0, top: FC + 3 + FH + 3 },
  ])
  .png()
  .toFile(resolve(OUT, '10-homepage-to-exchange-flow.png'));
console.log('  ✓ 10-homepage-to-exchange-flow.png');

await browser.close();
console.log(`\n✅ All 10 screenshots → ${OUT}`);
