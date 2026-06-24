#!/usr/bin/env node
/**
 * screenshot-exchange-hero-predeploy-v1.mjs
 * Final pre-deploy visual review for the exchange hero background system.
 *
 * Hero state (confirmed from code audit — no changes needed):
 *   Bybit: cbw-hero-neutral-no-glow-v2.png  (left center / cover)
 *   MEXC:  cbw-hero-neutral-logo-glow-v2.png (center center / cover)
 *
 * Old WebP assets in public/media/hero-backgrounds/ are orphaned (not referenced).
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = resolve(ROOT, 'reports/visual/exchange-hero-final-predeploy-v1');
mkdirSync(OUT, { recursive: true });

const BASE    = 'http://localhost:4326';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

const HERO_D  = { x: 0, y: 0, width: 1440, height: 480 };
const HERO_M  = { x: 0, y: 0, width: 390,  height: 460 };

const { default: sharp } = await import('sharp');
const browser = await chromium.launch();

// ── Helpers ───────────────────────────────────────────────────────────────────
async function desktopPage(url) {
  const p = await browser.newPage({ viewport: DESKTOP });
  await p.goto(url, { waitUntil: 'networkidle' });
  return p;
}

async function mobilePage(url) {
  const p = await browser.newPage({ viewport: MOBILE });
  await p.goto(url, { waitUntil: 'networkidle' });
  return p;
}

async function topHeroShot(page, file) {
  const buf = await page.screenshot({ clip: HERO_D });
  await sharp(buf).png().toFile(file);
  console.log('  ✓', file.split('/').at(-1));
  return buf;
}

async function topHeroMobile(page, file) {
  const buf = await page.screenshot({ clip: HERO_M });
  await sharp(buf).png().toFile(file);
  console.log('  ✓', file.split('/').at(-1));
  return buf;
}

async function bottomHeroShot(page, file) {
  const heroes = page.locator('.brand-hero');
  const count = await heroes.count();
  const bottom = heroes.nth(count - 1);
  await bottom.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await bottom.boundingBox();
  const vp = page.viewportSize();
  const clipH = Math.min(box.height, vp.height, 480);
  const buf = await page.screenshot({ clip: { x: 0, y: Math.max(0, box.y), width: vp.width, height: clipH } });
  await sharp(buf).png().toFile(file);
  console.log('  ✓', file.split('/').at(-1));
  return buf;
}

function label(text, w, h) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="${h - 44}" width="${text.length * 10 + 24}" height="32" rx="4" fill="rgba(0,0,0,0.68)"/>
      <text x="22" y="${h - 23}" font-family="monospace" font-size="16" font-weight="bold" fill="#e2e8f0">${text}</text>
    </svg>`
  );
}

function dividerV(h) {
  return Buffer.from(`<svg width="2" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="2" height="${h}" fill="rgba(255,255,255,0.2)"/></svg>`);
}
function dividerH(w) {
  return Buffer.from(`<svg width="${w}" height="2" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="2" fill="rgba(255,255,255,0.2)"/></svg>`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 01–03: Bybit
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Bybit ──');

const bybitD = await desktopPage(`${BASE}/bybit/`);
await topHeroShot(bybitD, resolve(OUT, '01-bybit-desktop-top.png'));
await bottomHeroShot(bybitD, resolve(OUT, '02-bybit-desktop-bottom.png'));
await bybitD.close();

const bybitM = await mobilePage(`${BASE}/bybit/`);
await topHeroMobile(bybitM, resolve(OUT, '03-bybit-mobile-top.png'));
await bybitM.close();

// ─────────────────────────────────────────────────────────────────────────────
// 04–06: MEXC
// ─────────────────────────────────────────────────────────────────────────────
console.log('── MEXC ──');

const mexcD = await desktopPage(`${BASE}/mexc/`);
await topHeroShot(mexcD, resolve(OUT, '04-mexc-desktop-top.png'));
await bottomHeroShot(mexcD, resolve(OUT, '05-mexc-desktop-bottom.png'));
await mexcD.close();

const mexcM = await mobilePage(`${BASE}/mexc/`);
await topHeroMobile(mexcM, resolve(OUT, '06-mexc-mobile-top.png'));
await mexcM.close();

// ─────────────────────────────────────────────────────────────────────────────
// 07: Bybit vs MEXC desktop top — side by side
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Comparison boards ──');

const HW = 720, HH = 240;

async function halfCell(srcFile, text) {
  const cell = await sharp(srcFile).resize({ width: HW, height: HH, fit: 'cover', position: 'top' }).png().toBuffer();
  return sharp(cell).composite([{ input: label(text, HW, HH), blend: 'over' }]).png().toBuffer();
}

const bybitTopCell = await halfCell(resolve(OUT, '01-bybit-desktop-top.png'), 'Bybit — no_glow');
const mexcTopCell  = await halfCell(resolve(OUT, '04-mexc-desktop-top.png'),  'MEXC — soft_glow');

await sharp({ create: { width: HW * 2 + 2, height: HH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
  .composite([
    { input: bybitTopCell, left: 0,        top: 0 },
    { input: dividerV(HH), left: HW,       top: 0 },
    { input: mexcTopCell,  left: HW + 2,   top: 0 },
  ])
  .png()
  .toFile(resolve(OUT, '07-bybit-vs-mexc-desktop-top.png'));
console.log('  ✓ 07-bybit-vs-mexc-desktop-top.png');

// ─────────────────────────────────────────────────────────────────────────────
// 08: Bybit vs MEXC mobile top
// ─────────────────────────────────────────────────────────────────────────────
const MW = 390, MH = 460;

async function mobileCell(srcFile, text) {
  return sharp(srcFile).composite([{ input: label(text, MW, MH), blend: 'over' }]).png().toBuffer();
}

const bybitMCell = await mobileCell(resolve(OUT, '03-bybit-mobile-top.png'), 'Bybit mobile');
const mexcMCell  = await mobileCell(resolve(OUT, '06-mexc-mobile-top.png'),  'MEXC mobile');

await sharp({ create: { width: MW * 2 + 2, height: MH, channels: 3, background: { r: 8, g: 8, b: 12 } } })
  .composite([
    { input: bybitMCell, left: 0,        top: 0 },
    { input: dividerV(MH), left: MW,     top: 0 },
    { input: mexcMCell,  left: MW + 2,   top: 0 },
  ])
  .png()
  .toFile(resolve(OUT, '08-bybit-vs-mexc-mobile-top.png'));
console.log('  ✓ 08-bybit-vs-mexc-mobile-top.png');

// ─────────────────────────────────────────────────────────────────────────────
// 09–10: Homepage card → exchange page hero flow
// Stacks: top ~600px of homepage (card zone) + exchange hero
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Homepage flow shots ──');

const homePage = await desktopPage(`${BASE}/`);

// Find the exchange card section (first visible card group, scroll to it)
await homePage.evaluate(() => window.scrollTo(0, 0));
const homeCardBuf = await homePage.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 700 } });
await homePage.close();

// Resize homecard strip and exchange hero strip side-by-side vertically
const FLOW_W = 1440, FLOW_CARD_H = 350, FLOW_HERO_H = 380;

async function flowBoard(homeCardBuf, heroFile, exchangeLabel, outFile) {
  const cardStrip = await sharp(homeCardBuf)
    .resize({ width: FLOW_W, height: FLOW_CARD_H, fit: 'cover', position: 'top' })
    .png().toBuffer();

  const heroStrip = await sharp(heroFile)
    .resize({ width: FLOW_W, height: FLOW_HERO_H, fit: 'cover', position: 'top' })
    .png().toBuffer();

  // Add labels
  const cardLbl = Buffer.from(
    `<svg width="${FLOW_W}" height="${FLOW_CARD_H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="260" height="30" rx="4" fill="rgba(0,0,0,0.6)"/>
      <text x="22" y="31" font-family="monospace" font-size="15" font-weight="bold" fill="#94a3b8">homepage — exchange cards</text>
    </svg>`
  );
  const heroLbl = Buffer.from(
    `<svg width="${FLOW_W}" height="${FLOW_HERO_H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="${exchangeLabel.length * 10 + 24}" height="30" rx="4" fill="rgba(0,0,0,0.6)"/>
      <text x="22" y="31" font-family="monospace" font-size="15" font-weight="bold" fill="#60a5fa">${exchangeLabel}</text>
    </svg>`
  );

  const cardWithLbl = await sharp(cardStrip).composite([{ input: cardLbl, blend: 'over' }]).png().toBuffer();
  const heroWithLbl = await sharp(heroStrip).composite([{ input: heroLbl, blend: 'over' }]).png().toBuffer();

  const totalH = FLOW_CARD_H + 2 + FLOW_HERO_H;
  await sharp({ create: { width: FLOW_W, height: totalH, channels: 3, background: { r: 11, g: 13, b: 20 } } })
    .composite([
      { input: cardWithLbl, left: 0, top: 0 },
      { input: dividerH(FLOW_W), left: 0, top: FLOW_CARD_H },
      { input: heroWithLbl, left: 0, top: FLOW_CARD_H + 2 },
    ])
    .png()
    .toFile(outFile);
  console.log('  ✓', outFile.split('/').at(-1));
}

await flowBoard(homeCardBuf, resolve(OUT, '01-bybit-desktop-top.png'), 'bybit exchange page — no_glow hero', resolve(OUT, '09-homepage-card-to-bybit-flow.png'));
await flowBoard(homeCardBuf, resolve(OUT, '04-mexc-desktop-top.png'),  'mexc exchange page — soft_glow hero',  resolve(OUT, '10-homepage-card-to-mexc-flow.png'));

await browser.close();
console.log(`\n✅ All 10 screenshots saved to ${OUT}`);
