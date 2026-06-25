#!/usr/bin/env node
/**
 * screenshot-homepage-grid-review-v1.mjs
 * Visual review for the compact exchange grid homepage redesign.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = resolve(ROOT, 'reports/visual/homepage-compact-exchange-grid-v1');
mkdirSync(OUT, { recursive: true });

const { default: sharp } = await import('sharp');
const browser = await chromium.launch();
const BASE = 'http://127.0.0.1:4322';

async function page(vp, url) {
  const p = await browser.newPage({ viewport: vp });
  await p.goto(url, { waitUntil: 'networkidle' });
  // Extra wait for images to load
  await p.waitForTimeout(800);
  return p;
}
async function shot(page, file, clip) {
  await sharp(await page.screenshot({ clip })).png().toFile(file);
  console.log('  ✓', file.split(/[\\/]/).at(-1));
}

function divV(h) { return Buffer.from(`<svg width="3" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="3" height="${h}" fill="#1e2330"/></svg>`); }
function divH(w) { return Buffer.from(`<svg width="${w}" height="3" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="3" fill="#1e2330"/></svg>`); }

async function labelled(buf, text, color, w, h) {
  const resized = await sharp(buf).resize({ width: w, height: h, fit: 'cover', position: 'top' }).png().toBuffer();
  const lbl = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="${text.length * 9 + 24}" height="26" rx="4" fill="rgba(0,0,0,0.65)"/>
      <text x="22" y="28" font-family="monospace" font-size="13" font-weight="bold" fill="${color}">${text}</text>
    </svg>`
  );
  return sharp(resized).composite([{ input: lbl, blend: 'over' }]).png().toBuffer();
}

// ── 01: Desktop first screen
console.log('── 01 Desktop first screen ──');
const d = await page({ width: 1440, height: 900 }, `${BASE}/`);
await shot(d, resolve(OUT, '01-homepage-desktop-firstscreen.png'), { x: 0, y: 0, width: 1440, height: 900 });

// ── 02: Desktop grid close-up
console.log('── 02 Desktop grid close-up ──');
await d.evaluate(() => document.getElementById('exchanges')?.scrollIntoView({ behavior: 'instant' }));
await d.waitForTimeout(300);
await shot(d, resolve(OUT, '02-homepage-desktop-grid-closeup.png'), { x: 0, y: 0, width: 1440, height: 900 });
await d.close();

// ── 03: Tablet
console.log('── 03 Tablet ──');
const t = await page({ width: 768, height: 1024 }, `${BASE}/`);
await shot(t, resolve(OUT, '03-homepage-tablet.png'), { x: 0, y: 0, width: 768, height: 1024 });
await t.close();

// ── 04: Mobile
console.log('── 04 Mobile ──');
const m = await page({ width: 390, height: 844 }, `${BASE}/`);
await shot(m, resolve(OUT, '04-homepage-mobile.png'), { x: 0, y: 0, width: 390, height: 844 });
await m.close();

// ── 05: Bybit card close-up
console.log('── 05 Bybit card close-up ──');
const bPage = await page({ width: 1440, height: 900 }, `${BASE}/`);
await bPage.evaluate(() => document.getElementById('exchanges')?.scrollIntoView({ behavior: 'instant' }));
await bPage.waitForTimeout(300);
const bybitCard = bPage.locator('a.ec').first();
await bybitCard.waitFor();
const bcBox = await bybitCard.boundingBox();
await shot(bPage, resolve(OUT, '05-bybit-card-closeup.png'), {
  x: Math.max(0, bcBox.x - 4), y: Math.max(0, bcBox.y - 4),
  width: Math.min(1440, bcBox.width + 8), height: Math.min(900, bcBox.height + 8),
});
await bPage.close();

// ── 06: MEXC card close-up
console.log('── 06 MEXC card close-up ──');
const mxPage = await page({ width: 1440, height: 900 }, `${BASE}/`);
await mxPage.evaluate(() => document.getElementById('exchanges')?.scrollIntoView({ behavior: 'instant' }));
await mxPage.waitForTimeout(300);
const mexcCard = mxPage.locator('a.ec').nth(1);
await mexcCard.waitFor();
const mcBox = await mexcCard.boundingBox();
await shot(mxPage, resolve(OUT, '06-mexc-card-closeup.png'), {
  x: Math.max(0, mcBox.x - 4), y: Math.max(0, mcBox.y - 4),
  width: Math.min(1440, mcBox.width + 8), height: Math.min(900, mcBox.height + 8),
});
await mxPage.close();

// ── 07: Homepage card → Bybit page flow
console.log('── 07 Card → Bybit page flow ──');
{
  const FW = 1440, R1 = 340, R2 = 380;
  const hp = await page({ width: 1440, height: 900 }, `${BASE}/`);
  await hp.evaluate(() => document.getElementById('exchanges')?.scrollIntoView({ behavior: 'instant' }));
  await hp.waitForTimeout(300);
  const homeBuf = await hp.screenshot({ clip: { x: 0, y: 0, width: FW, height: R1 + 60 } });
  await hp.close();
  const bybitHero = await page({ width: 1440, height: 900 }, `${BASE}/bybit/`);
  const heroBuf = await bybitHero.screenshot({ clip: { x: 0, y: 0, width: FW, height: 480 } });
  await bybitHero.close();

  const r1 = await labelled(homeBuf, 'homepage — bybit card', '#94a3b8', FW, R1);
  const r2 = await labelled(heroBuf, 'bybit exchange page — custom hero v3', '#F7931A', FW, R2);
  await sharp({ create: { width: FW, height: R1 + 3 + R2, channels: 3, background: { r: 11, g: 13, b: 20 } } })
    .composite([
      { input: r1, left: 0, top: 0 },
      { input: divH(FW), left: 0, top: R1 },
      { input: r2, left: 0, top: R1 + 3 },
    ])
    .png().toFile(resolve(OUT, '07-homepage-card-to-bybit-flow.png'));
  console.log('  ✓ 07-homepage-card-to-bybit-flow.png');
}

// ── 08: Homepage card → MEXC page flow
console.log('── 08 Card → MEXC page flow ──');
{
  const FW = 1440, R1 = 340, R2 = 380;
  const hp = await page({ width: 1440, height: 900 }, `${BASE}/`);
  await hp.evaluate(() => document.getElementById('exchanges')?.scrollIntoView({ behavior: 'instant' }));
  await hp.waitForTimeout(300);
  const homeBuf = await hp.screenshot({ clip: { x: 0, y: 0, width: FW, height: R1 + 60 } });
  await hp.close();
  const mexcHero = await page({ width: 1440, height: 900 }, `${BASE}/mexc/`);
  const heroBuf = await mexcHero.screenshot({ clip: { x: 0, y: 0, width: FW, height: 480 } });
  await mexcHero.close();

  const r1 = await labelled(homeBuf, 'homepage — mexc card', '#94a3b8', FW, R1);
  const r2 = await labelled(heroBuf, 'mexc exchange page — custom hero v3', '#22d3ee', FW, R2);
  await sharp({ create: { width: FW, height: R1 + 3 + R2, channels: 3, background: { r: 11, g: 13, b: 20 } } })
    .composite([
      { input: r1, left: 0, top: 0 },
      { input: divH(FW), left: 0, top: R1 },
      { input: r2, left: 0, top: R1 + 3 },
    ])
    .png().toFile(resolve(OUT, '08-homepage-card-to-mexc-flow.png'));
  console.log('  ✓ 08-homepage-card-to-mexc-flow.png');
}

await browser.close();
console.log(`\n✅ All 8 screenshots → ${OUT}`);
