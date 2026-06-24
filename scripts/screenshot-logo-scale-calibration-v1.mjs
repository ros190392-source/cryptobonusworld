#!/usr/bin/env node
/**
 * screenshot-logo-scale-calibration-v1.mjs
 * Visual scale calibration for Bybit logo vs MEXC reference.
 *
 * No page files are modified — scales are applied via JS property injection
 * on the running page, screenshots taken, then page is reloaded for each variant.
 *
 * visualScale tokens → pixel values (from ExchangePromoLogoSlot.astro formula):
 *   desktopMaxW = Math.round(300 * vs)
 *   desktopMaxH = Math.round(86  * vs)
 *   mobileMaxW  = Math.round(235 * vs)
 *   mobileMaxH  = Math.round(68  * vs)
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = resolve(ROOT, 'reports/visual/logo-scale-calibration-v1');
mkdirSync(OUT, { recursive: true });

const BASE    = 'http://localhost:4326';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };
const HERO_D  = { x: 0, y: 0, width: 1440, height: 480 };
const HERO_M  = { x: 0, y: 0, width: 390,  height: 440 };

// ── Scale token calculator ────────────────────────────────────────────────────
function tokens(vs) {
  const v = Math.min(1, Math.max(0.2, vs));
  return {
    '--ls-mw': `${Math.round(235 * v)}px`,
    '--ls-mh': `${Math.round(68  * v)}px`,
    '--ls-dw': `${Math.round(300 * v)}px`,
    '--ls-dh': `${Math.round(86  * v)}px`,
  };
}

// ── Inject visual scale on all .cbw-logo-slot elements ───────────────────────
async function applyScale(page, vs) {
  const t = tokens(vs);
  await page.evaluate((props) => {
    document.querySelectorAll('.cbw-logo-slot').forEach(el => {
      Object.entries(props).forEach(([k, v]) => el.style.setProperty(k, v));
    });
  }, t);
}

// ── Label SVG ─────────────────────────────────────────────────────────────────
function label(text, w, h) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="${h-46}" width="${text.length*10+24}" height="34" rx="4" fill="rgba(0,0,0,0.65)"/>
      <text x="24" y="${h-23}" font-family="monospace" font-size="17" font-weight="bold" fill="#e2e8f0">${text}</text>
    </svg>`
  );
}

const browser = await chromium.launch();
const { default: sharp } = await import('sharp');

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Desktop screenshots ──');

const bybitD = await browser.newPage({ viewport: DESKTOP });
await bybitD.goto(`${BASE}/bybit/`, { waitUntil: 'networkidle' });

const scales = [
  { vs: 0.70, label: 'Bybit 0.70 (current)', tag: 'bybit-0.70' },
  { vs: 0.78, label: 'Bybit 0.78',           tag: 'bybit-0.78' },
  { vs: 0.84, label: 'Bybit 0.84',           tag: 'bybit-0.84' },
];

const deskBufs = {};

for (const s of scales) {
  await bybitD.reload({ waitUntil: 'networkidle' });
  await applyScale(bybitD, s.vs);
  const buf = await bybitD.screenshot({ clip: HERO_D });
  deskBufs[s.tag] = buf;
  const file = resolve(OUT, `01-${s.tag}-top-desktop.png`);
  await sharp(buf).png().toFile(file);
  console.log('  ✓', `01-${s.tag}-top-desktop.png`);
}

// MEXC reference
const mexcD = await browser.newPage({ viewport: DESKTOP });
await mexcD.goto(`${BASE}/mexc/`, { waitUntil: 'networkidle' });
const mexcBuf = await mexcD.screenshot({ clip: HERO_D });
deskBufs['mexc-1.00'] = mexcBuf;
await sharp(mexcBuf).png().toFile(resolve(OUT, '04-mexc-1.00-top-desktop.png'));
console.log('  ✓ 04-mexc-1.00-top-desktop.png');

// ── Desktop comparison board (2×2) ────────────────────────────────────────────
console.log('── Desktop comparison board ──');
const CW = 720, CH = 240; // cell size (half of 1440×480)
const allDesktop = [
  { key: 'bybit-0.70', text: 'Bybit  0.70  (current)' },
  { key: 'bybit-0.78', text: 'Bybit  0.78' },
  { key: 'bybit-0.84', text: 'Bybit  0.84' },
  { key: 'mexc-1.00',  text: 'MEXC  1.00  (reference)' },
];

const cells = await Promise.all(
  allDesktop.map(async ({ key, text }) => {
    const cell = await sharp(deskBufs[key])
      .resize({ width: CW, height: CH, fit: 'cover', position: 'top' })
      .toBuffer();
    return sharp(cell)
      .composite([{ input: label(text, CW, CH), blend: 'over' }])
      .toBuffer();
  })
);

const boardW = CW * 2 + 2;
const boardH = CH * 2 + 2;
const divH = Buffer.from(`<svg width="${boardW}" height="2" xmlns="http://www.w3.org/2000/svg"><rect width="${boardW}" height="2" fill="rgba(255,255,255,0.2)"/></svg>`);
const divV = Buffer.from(`<svg width="2" height="${CH}" xmlns="http://www.w3.org/2000/svg"><rect width="2" height="${CH}" fill="rgba(255,255,255,0.2)"/></svg>`);

// Row 1 composite
const row1 = await sharp({ create: { width: boardW, height: CH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
  .composite([
    { input: cells[0], left: 0,       top: 0 },
    { input: divV,     left: CW,      top: 0 },
    { input: cells[1], left: CW + 2,  top: 0 },
  ])
  .png().toBuffer();

// Row 2 composite
const row2 = await sharp({ create: { width: boardW, height: CH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
  .composite([
    { input: cells[2], left: 0,       top: 0 },
    { input: divV,     left: CW,      top: 0 },
    { input: cells[3], left: CW + 2,  top: 0 },
  ])
  .png().toBuffer();

await sharp({ create: { width: boardW, height: boardH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
  .composite([
    { input: row1,  left: 0, top: 0 },
    { input: divH,  left: 0, top: CH },
    { input: row2,  left: 0, top: CH + 2 },
  ])
  .png()
  .toFile(resolve(OUT, '05-comparison-board-desktop.png'));
console.log('  ✓ 05-comparison-board-desktop.png');

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Mobile screenshots ──');

const bybitM = await browser.newPage({ viewport: MOBILE });
await bybitM.goto(`${BASE}/bybit/`, { waitUntil: 'networkidle' });

const mobBufs = {};

for (const s of scales) {
  await bybitM.reload({ waitUntil: 'networkidle' });
  await applyScale(bybitM, s.vs);
  const buf = await bybitM.screenshot({ clip: HERO_M });
  mobBufs[s.tag] = buf;
  const idx = scales.indexOf(s) + 6;
  const file = resolve(OUT, `0${idx}-${s.tag}-mobile.png`);
  await sharp(buf).png().toFile(file);
  console.log('  ✓', `0${idx}-${s.tag}-mobile.png`);
}

const mexcM = await browser.newPage({ viewport: MOBILE });
await mexcM.goto(`${BASE}/mexc/`, { waitUntil: 'networkidle' });
const mexcMBuf = await mexcM.screenshot({ clip: HERO_M });
mobBufs['mexc-1.00'] = mexcMBuf;
await sharp(mexcMBuf).png().toFile(resolve(OUT, '09-mexc-1.00-mobile.png'));
console.log('  ✓ 09-mexc-1.00-mobile.png');

// ── Mobile comparison board (2×2) ─────────────────────────────────────────────
console.log('── Mobile comparison board ──');
const MCW = MOBILE.width;   // 390 — full width (side by side = 2×390)
const MCH = Math.round(HERO_M.height / 2); // 220

const mobCells = await Promise.all(
  allDesktop.map(async ({ key, text }) => {
    const src = key.startsWith('mexc') ? mobBufs['mexc-1.00'] : mobBufs[key.replace('mexc-1.00', 'mexc-1.00')];
    const buf = key === 'mexc-1.00'
      ? await sharp(mexcMBuf).resize({ width: MCW, height: MCH, fit: 'cover', position: 'top' }).toBuffer()
      : await sharp(mobBufs[key]).resize({ width: MCW, height: MCH, fit: 'cover', position: 'top' }).toBuffer();

    const lbl = Buffer.from(
      `<svg width="${MCW}" height="${MCH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="${MCH-38}" width="${text.length*8+20}" height="28" rx="3" fill="rgba(0,0,0,0.65)"/>
        <text x="18" y="${MCH-19}" font-family="monospace" font-size="13" font-weight="bold" fill="#e2e8f0">${text}</text>
      </svg>`
    );
    return sharp(buf).composite([{ input: lbl, blend: 'over' }]).toBuffer();
  })
);

const mbDivV = Buffer.from(`<svg width="2" height="${MCH}" xmlns="http://www.w3.org/2000/svg"><rect width="2" height="${MCH}" fill="rgba(255,255,255,0.2)"/></svg>`);
const mbDivH = Buffer.from(`<svg width="${MCW*2+2}" height="2" xmlns="http://www.w3.org/2000/svg"><rect width="${MCW*2+2}" height="2" fill="rgba(255,255,255,0.2)"/></svg>`);

const mbRow1 = await sharp({ create: { width: MCW*2+2, height: MCH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
  .composite([{ input: mobCells[0], left: 0, top: 0 }, { input: mbDivV, left: MCW, top: 0 }, { input: mobCells[1], left: MCW+2, top: 0 }])
  .png().toBuffer();
const mbRow2 = await sharp({ create: { width: MCW*2+2, height: MCH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
  .composite([{ input: mobCells[2], left: 0, top: 0 }, { input: mbDivV, left: MCW, top: 0 }, { input: mobCells[3], left: MCW+2, top: 0 }])
  .png().toBuffer();

await sharp({ create: { width: MCW*2+2, height: MCH*2+2, channels: 3, background: { r: 8, g: 8, b: 12 } } })
  .composite([{ input: mbRow1, left: 0, top: 0 }, { input: mbDivH, left: 0, top: MCH }, { input: mbRow2, left: 0, top: MCH+2 }])
  .png()
  .toFile(resolve(OUT, '10-comparison-board-mobile.png'));
console.log('  ✓ 10-comparison-board-mobile.png');

await browser.close();
console.log(`\n✅ All 10 screenshots saved to ${OUT}`);
