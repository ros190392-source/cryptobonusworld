#!/usr/bin/env node
/**
 * screenshot-logo-slot-audit-v1.mjs
 * Captures 7 screenshots for the page promo logo slot audit.
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = resolve(ROOT, 'reports/visual/page-promo-logo-slot-audit-v1');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:4326';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

// Hero section clip — top 480px captures the full promo block
const HERO_CLIP = { x: 0, y: 0, width: DESKTOP.width, height: 480 };
const HERO_CLIP_M = { x: 0, y: 0, width: MOBILE.width, height: 420 };

const browser = await chromium.launch();

// ── DESKTOP helpers ───────────────────────────────────────────────────────────
async function desktopPage(url) {
  const p = await browser.newPage({ viewport: DESKTOP });
  await p.goto(url, { waitUntil: 'networkidle' });
  return p;
}

async function screenshotTop(page, file) {
  await page.screenshot({ path: file, clip: HERO_CLIP });
  console.log('  ✓', file.split('/').at(-1));
}

async function screenshotBottom(page, file) {
  // Find the second .brand-hero (bottom closing block) and scroll into view
  const heroes = page.locator('.brand-hero');
  const count = await heroes.count();
  const bottomHero = heroes.nth(count - 1);
  await bottomHero.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await bottomHero.boundingBox();
  const vp = page.viewportSize();
  const clipH = Math.min(box.height, vp.height, 480);
  await page.screenshot({
    path: file,
    clip: { x: 0, y: Math.max(0, box.y), width: vp.width, height: clipH },
  });
  console.log('  ✓', file.split('/').at(-1));
}

// ── MOBILE helper ─────────────────────────────────────────────────────────────
async function mobilePage(url) {
  const p = await browser.newPage({ viewport: MOBILE });
  await p.goto(url, { waitUntil: 'networkidle' });
  return p;
}

// ── 1–4: Individual top/bottom ────────────────────────────────────────────────
console.log('Taking desktop screenshots...');

const bybitD = await desktopPage(`${BASE}/bybit/`);
const mexcD  = await desktopPage(`${BASE}/mexc/`);

await screenshotTop   (bybitD, resolve(OUT, '01-bybit-top-logo-desktop.png'));
await screenshotBottom(bybitD, resolve(OUT, '02-bybit-bottom-logo-desktop.png'));
await screenshotTop   (mexcD,  resolve(OUT, '03-mexc-top-logo-desktop.png'));
await screenshotBottom(mexcD,  resolve(OUT, '04-mexc-bottom-logo-desktop.png'));

// ── 5: Bybit vs MEXC top desktop side-by-side ─────────────────────────────────
console.log('Taking comparison screenshots...');

const { default: sharp } = await import('sharp');

const bybitTopBuf = await bybitD.screenshot({ clip: HERO_CLIP });
const mexcTopBuf  = await mexcD.screenshot({ clip: HERO_CLIP });

// Scroll bybitD back to top first
await bybitD.evaluate(() => window.scrollTo(0, 0));
await mexcD.evaluate(() => window.scrollTo(0, 0));

const HW = Math.round(DESKTOP.width / 2); // 720
const HH = HERO_CLIP.height;              // 480
const divSvg = Buffer.from(`<svg width="2" height="${HH}" xmlns="http://www.w3.org/2000/svg"><rect width="2" height="${HH}" fill="rgba(255,255,255,0.25)"/></svg>`);

function labelSvg(text, w, h) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="${h - 44}" width="${text.length * 11 + 24}" height="32" rx="4" fill="rgba(0,0,0,0.55)"/>
      <text x="24" y="${h - 23}" font-family="monospace" font-size="18" font-weight="bold" fill="#e2e8f0">${text}</text>
    </svg>`
  );
}

const bybitHalf = await sharp(bybitTopBuf).resize({ width: HW, height: HH, fit: 'cover' }).toBuffer();
const mexcHalf  = await sharp(mexcTopBuf).resize({ width: HW, height: HH, fit: 'cover' }).toBuffer();

const bybitLabelled = await sharp(bybitHalf).composite([{ input: labelSvg('Bybit (no_glow)', HW, HH), blend: 'over' }]).toBuffer();
const mexcLabelled  = await sharp(mexcHalf).composite([{ input: labelSvg('MEXC (soft_glow)', HW, HH), blend: 'over' }]).toBuffer();

await sharp({ create: { width: HW*2 + 2, height: HH, channels: 3, background: { r: 0, g: 0, b: 0 } } })
  .composite([
    { input: bybitLabelled, left: 0,        top: 0 },
    { input: divSvg,        left: HW,        top: 0 },
    { input: mexcLabelled,  left: HW + 2,    top: 0 },
  ])
  .png()
  .toFile(resolve(OUT, '05-bybit-vs-mexc-top-desktop.png'));
console.log('  ✓ 05-bybit-vs-mexc-top-desktop.png');

// ── 6: Bybit vs MEXC bottom desktop side-by-side ──────────────────────────────
const bybitHeroes = bybitD.locator('.brand-hero');
const mexcHeroes  = mexcD.locator('.brand-hero');
const bybitBotHero = bybitHeroes.nth(await bybitHeroes.count() - 1);
const mexcBotHero  = mexcHeroes.nth(await mexcHeroes.count() - 1);

await bybitBotHero.scrollIntoViewIfNeeded();
await mexcBotHero.scrollIntoViewIfNeeded();
await bybitD.waitForTimeout(200);
await mexcD.waitForTimeout(200);

const bybitBotBox = await bybitBotHero.boundingBox();
const mexcBotBox  = await mexcBotHero.boundingBox();

const bybitBotBuf = await bybitD.screenshot({
  clip: { x: 0, y: Math.max(0, bybitBotBox.y), width: DESKTOP.width, height: Math.min(bybitBotBox.height, 480) },
});
const mexcBotBuf = await mexcD.screenshot({
  clip: { x: 0, y: Math.max(0, mexcBotBox.y), width: DESKTOP.width, height: Math.min(mexcBotBox.height, 480) },
});

const bybitBotHalf = await sharp(bybitBotBuf).resize({ width: HW, height: HH, fit: 'cover', position: 'top' }).toBuffer();
const mexcBotHalf  = await sharp(mexcBotBuf).resize({ width: HW, height: HH, fit: 'cover', position: 'top' }).toBuffer();

const bybitBotLbl = await sharp(bybitBotHalf).composite([{ input: labelSvg('Bybit bottom', HW, HH), blend: 'over' }]).toBuffer();
const mexcBotLbl  = await sharp(mexcBotHalf).composite([{ input: labelSvg('MEXC bottom', HW, HH), blend: 'over' }]).toBuffer();

await sharp({ create: { width: HW*2 + 2, height: HH, channels: 3, background: { r: 0, g: 0, b: 0 } } })
  .composite([
    { input: bybitBotLbl, left: 0,     top: 0 },
    { input: divSvg,      left: HW,    top: 0 },
    { input: mexcBotLbl,  left: HW+2,  top: 0 },
  ])
  .png()
  .toFile(resolve(OUT, '06-bybit-vs-mexc-bottom-desktop.png'));
console.log('  ✓ 06-bybit-vs-mexc-bottom-desktop.png');

// ── 7: Bybit vs MEXC mobile top ───────────────────────────────────────────────
console.log('Taking mobile screenshots...');

const bybitM = await mobilePage(`${BASE}/bybit/`);
const mexcM  = await mobilePage(`${BASE}/mexc/`);

const bybitMTopBuf = await bybitM.screenshot({ clip: HERO_CLIP_M });
const mexcMTopBuf  = await mexcM.screenshot({ clip: HERO_CLIP_M });

const MW = MOBILE.width;   // 390
const MH = HERO_CLIP_M.height; // 420
const mDiv = Buffer.from(`<svg width="2" height="${MH}" xmlns="http://www.w3.org/2000/svg"><rect width="2" height="${MH}" fill="rgba(255,255,255,0.25)"/></svg>`);

function labelSvgM(text) {
  return Buffer.from(
    `<svg width="${MW}" height="${MH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="${MH - 36}" width="${text.length * 9 + 20}" height="26" rx="3" fill="rgba(0,0,0,0.55)"/>
      <text x="18" y="${MH - 18}" font-family="monospace" font-size="14" font-weight="bold" fill="#e2e8f0">${text}</text>
    </svg>`
  );
}

const bybitMLbl = await sharp(bybitMTopBuf).composite([{ input: labelSvgM('Bybit mobile'), blend: 'over' }]).toBuffer();
const mexcMLbl  = await sharp(mexcMTopBuf).composite([{ input: labelSvgM('MEXC mobile'), blend: 'over' }]).toBuffer();

await sharp({ create: { width: MW*2 + 2, height: MH, channels: 3, background: { r: 0, g: 0, b: 0 } } })
  .composite([
    { input: bybitMLbl, left: 0,     top: 0 },
    { input: mDiv,      left: MW,    top: 0 },
    { input: mexcMLbl,  left: MW+2,  top: 0 },
  ])
  .png()
  .toFile(resolve(OUT, '07-bybit-vs-mexc-mobile-top.png'));
console.log('  ✓ 07-bybit-vs-mexc-mobile-top.png');

await browser.close();
console.log(`\n✅ All 7 screenshots saved to ${OUT}`);
