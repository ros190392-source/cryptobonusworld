#!/usr/bin/env node
/**
 * screenshot-bybit-factory-pack-v1-preview.mjs
 *
 * Visual review for Bybit factory pack v1 install.
 * New v2 images are now live in the built site; preview server runs on port 4322.
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = resolve(ROOT, 'reports/visual/bybit-factory-pack-v1-preview');
mkdirSync(OUT, { recursive: true });

const { default: sharp } = await import('sharp');
const browser = await chromium.launch();

const BASE    = 'http://localhost:4322';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

// ── Helpers ───────────────────────────────────────────────────────────────────
async function openPage(viewport, url) {
  const p = await browser.newPage({ viewport });
  await p.goto(url, { waitUntil: 'networkidle' });
  return p;
}

async function shot(page, outFile, clip) {
  const buf = await page.screenshot({ clip });
  await sharp(buf).png().toFile(outFile);
  console.log('  ✓', outFile.split(/[\\/]/).at(-1));
  return buf;
}

function divH(w) { return Buffer.from(`<svg width="${w}" height="3" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="3" fill="#1e2330"/></svg>`); }
function divV(h) { return Buffer.from(`<svg width="3" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="3" height="${h}" fill="#1e2330"/></svg>`); }

function badge(text, w, h, bottom = true) {
  const tw = text.length * 9 + 24;
  const y = bottom ? h - 42 : 10;
  const ty = bottom ? h - 22 : 30;
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="${y}" width="${tw}" height="28" rx="4" fill="rgba(0,0,0,0.72)"/>
      <text x="22" y="${ty}" font-family="monospace" font-size="14" font-weight="bold" fill="#e2e8f0">${text}</text>
    </svg>`
  );
}

async function labelled(buf, text, w, h, bottom = true) {
  const resized = await sharp(buf).resize({ width: w, height: h, fit: 'cover', position: 'top' }).png().toBuffer();
  return sharp(resized).composite([{ input: badge(text, w, h, bottom), blend: 'over' }]).png().toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// 01: Homepage — Bybit card desktop
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── 01 Homepage card desktop ──');
const homeD = await openPage(DESKTOP, `${BASE}/`);
// Find the Bybit exchange card
const bybitCard = homeD.locator('[data-exchange="bybit"], .exchange-card:has-text("Bybit"), a[href="/bybit/"]').first();
let cardBox = null;
try {
  await bybitCard.waitFor({ timeout: 3000 });
  cardBox = await bybitCard.boundingBox();
} catch {
  cardBox = null;
}

// If card found, capture it with context; otherwise capture the card grid area
let b01;
if (cardBox) {
  const pad = 40;
  b01 = await shot(homeD, resolve(OUT, '01-homepage-bybit-card-desktop.png'), {
    x: Math.max(0, cardBox.x - pad),
    y: Math.max(0, cardBox.y - pad),
    width: Math.min(1440, cardBox.width + pad * 2),
    height: Math.min(900, cardBox.height + pad * 2),
  });
} else {
  // Fallback: scroll to find exchange section and capture it
  await homeD.evaluate(() => window.scrollTo(0, 400));
  await homeD.waitForTimeout(150);
  b01 = await shot(homeD, resolve(OUT, '01-homepage-bybit-card-desktop.png'), {
    x: 0, y: 0, width: 1440, height: 700,
  });
}
await homeD.close();

// ─────────────────────────────────────────────────────────────────────────────
// 02: Homepage — Bybit card mobile
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 02 Homepage card mobile ──');
const homeM = await openPage(MOBILE, `${BASE}/`);
await homeM.evaluate(() => window.scrollTo(0, 0));
const b02 = await shot(homeM, resolve(OUT, '02-homepage-bybit-card-mobile.png'), {
  x: 0, y: 0, width: 390, height: 700,
});
await homeM.close();

// ─────────────────────────────────────────────────────────────────────────────
// 03: Bybit page — top hero desktop (no_glow hero + logo slot unchanged)
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 03 Bybit page top hero desktop ──');
const bybitD = await openPage(DESKTOP, `${BASE}/bybit/`);
const b03 = await shot(bybitD, resolve(OUT, '03-bybit-page-top-hero-desktop.png'), {
  x: 0, y: 0, width: 1440, height: 480,
});

// ─────────────────────────────────────────────────────────────────────────────
// 04: Bybit page — article image desktop
// Scroll to the article image block
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 04 Bybit article image desktop ──');
const articleImg = bybitD.locator('img[src*="bybit-article"]').first();
let b04;
try {
  await articleImg.waitFor({ timeout: 3000 });
  await articleImg.scrollIntoViewIfNeeded();
  await bybitD.waitForTimeout(200);
  const imgBox = await articleImg.boundingBox();
  const pad = 32;
  b04 = await shot(bybitD, resolve(OUT, '04-bybit-article-image-desktop.png'), {
    x: Math.max(0, imgBox.x - pad),
    y: Math.max(0, imgBox.y - pad),
    width: Math.min(1440, imgBox.width + pad * 2),
    height: Math.min(900, imgBox.height + pad * 2),
  });
} catch {
  // Fallback: scroll to middle of page and capture
  await bybitD.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await bybitD.waitForTimeout(200);
  b04 = await shot(bybitD, resolve(OUT, '04-bybit-article-image-desktop.png'), {
    x: 0, y: 0, width: 1440, height: 700,
  });
}
await bybitD.close();

// ─────────────────────────────────────────────────────────────────────────────
// 05: Bybit page — article image mobile
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 05 Bybit article image mobile ──');
const bybitM = await openPage(MOBILE, `${BASE}/bybit/`);
const articleImgM = bybitM.locator('img[src*="bybit-article"]').first();
let b05;
try {
  await articleImgM.waitFor({ timeout: 3000 });
  await articleImgM.scrollIntoViewIfNeeded();
  await bybitM.waitForTimeout(200);
  const imgBox = await articleImgM.boundingBox();
  const pad = 24;
  b05 = await shot(bybitM, resolve(OUT, '05-bybit-article-image-mobile.png'), {
    x: Math.max(0, imgBox.x - pad),
    y: Math.max(0, imgBox.y - pad),
    width: Math.min(390, imgBox.width + pad * 2),
    height: Math.min(500, imgBox.height + pad * 2),
  });
} catch {
  await bybitM.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await bybitM.waitForTimeout(200);
  b05 = await shot(bybitM, resolve(OUT, '05-bybit-article-image-mobile.png'), {
    x: 0, y: 0, width: 390, height: 500,
  });
}
await bybitM.close();

// ─────────────────────────────────────────────────────────────────────────────
// 06: OG meta check — text report embedded in an image
// Read the og:image meta from the live page HTML
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 06 OG meta check ──');
const ogCheckPage = await openPage(DESKTOP, `${BASE}/bybit/`);
const ogMeta   = await ogCheckPage.locator('meta[property="og:image"]').getAttribute('content');
const twitterMeta = await ogCheckPage.locator('meta[name="twitter:image"]').getAttribute('content');
const ogTitle  = await ogCheckPage.locator('meta[property="og:image:width"]').getAttribute('content').catch(() => null);
await ogCheckPage.close();

const OG_W = 900, OG_H = 200;
const ogLabel = ogMeta ?? 'NOT FOUND';
const ogColor = ogMeta?.includes('v2') ? '#4ade80' : '#f87171';
const svgOg = Buffer.from(
  `<svg width="${OG_W}" height="${OG_H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${OG_W}" height="${OG_H}" fill="#0f1117"/>
    <text x="24" y="42"  font-family="monospace" font-size="13" fill="#64748b">og:image (bybit/index.astro)</text>
    <text x="24" y="72"  font-family="monospace" font-size="14" font-weight="bold" fill="${ogColor}">${ogLabel}</text>
    <text x="24" y="110" font-family="monospace" font-size="13" fill="#64748b">twitter:image</text>
    <text x="24" y="136" font-family="monospace" font-size="14" font-weight="bold" fill="${ogColor}">${twitterMeta ?? 'NOT FOUND'}</text>
    <text x="24" y="175" font-family="monospace" font-size="12" fill="${ogColor}">${ogMeta?.includes('v2') ? '✓ v2 image active' : '✗ still pointing to v1'}</text>
  </svg>`
);
await sharp(svgOg).png().toFile(resolve(OUT, '06-bybit-og-meta-check.png'));
console.log('  ✓ 06-bybit-og-meta-check.png');
console.log('    og:image →', ogMeta);

// ─────────────────────────────────────────────────────────────────────────────
// 07: Before / after card comparison
// Left = v1 (if file exists), Right = v2
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 07 Before/after card ──');
{
  const v1Path = resolve(ROOT, 'public/media/exchanges/bybit/final/bybit-card-final-v1-1200x800.jpg');
  const v2Path = resolve(ROOT, 'public/media/exchanges/bybit/final/bybit-card-final-v2-1200x800.jpg');
  const CW = 600, CH = 400;

  let leftBuf, rightBuf;
  if (existsSync(v1Path)) {
    leftBuf  = await sharp(v1Path).resize({ width: CW, height: CH, fit: 'cover', position: 'top' }).png().toBuffer();
    leftBuf  = await sharp(leftBuf).composite([{ input: badge('v1 (OLD)', CW, CH, false), blend: 'over' }]).png().toBuffer();
  } else {
    leftBuf = Buffer.from(
      `<svg width="${CW}" height="${CH}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${CW}" height="${CH}" fill="#1e2330"/>
        <text x="${CW/2}" y="${CH/2}" text-anchor="middle" font-family="monospace" font-size="16" fill="#64748b">v1 not found</text>
      </svg>`
    );
    leftBuf = await sharp(leftBuf).png().toBuffer();
  }

  rightBuf = await sharp(v2Path).resize({ width: CW, height: CH, fit: 'cover', position: 'top' }).png().toBuffer();
  rightBuf = await sharp(rightBuf).composite([{ input: badge('v2 (NEW)', CW, CH, false), blend: 'over' }]).png().toBuffer();

  await sharp({ create: { width: CW * 2 + 3, height: CH, channels: 3, background: { r: 8, g: 10, b: 15 } } })
    .composite([
      { input: leftBuf,  left: 0,        top: 0 },
      { input: divV(CH), left: CW,       top: 0 },
      { input: rightBuf, left: CW + 3,   top: 0 },
    ])
    .png()
    .toFile(resolve(OUT, '07-bybit-card-before-after.png'));
  console.log('  ✓ 07-bybit-card-before-after.png');
}

// ─────────────────────────────────────────────────────────────────────────────
// 08: Homepage → Bybit page flow (3 rows: homepage card → hero → article image)
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 08 Homepage → Bybit page flow ──');
{
  const FW = 1440, R1H = 300, R2H = 300, R3H = 280;

  // Row 1: homepage (top, showing exchange cards)
  const homeStrip = await sharp(b02 /* mobile, we'll use desktop b01 as source */)
    .resize({ width: FW, height: R1H, fit: 'cover', position: 'top' })
    .png().toBuffer();

  // Use a fresh desktop homepage screenshot
  const homeD2 = await openPage(DESKTOP, `${BASE}/`);
  await homeD2.waitForTimeout(100);
  const homeFull = await homeD2.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 600 } });
  await homeD2.close();
  const row1 = await sharp(homeFull).resize({ width: FW, height: R1H, fit: 'cover', position: 'top' }).png().toBuffer();

  // Row 2: Bybit hero
  const row2 = await sharp(b03).resize({ width: FW, height: R2H, fit: 'cover', position: 'top' }).png().toBuffer();

  // Row 3: article image from the v2 file directly (most reliable)
  const v2Art = resolve(ROOT, 'public/media/exchanges/bybit/final/bybit-article-final-v2-1200x675.jpg');
  const row3 = await sharp(v2Art).resize({ width: FW, height: R3H, fit: 'cover', position: 'top' }).png().toBuffer();

  function flowLabel(text, color, w, h) {
    return Buffer.from(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="${text.length * 9 + 24}" height="26" rx="4" fill="rgba(0,0,0,0.65)"/>
        <text x="22" y="28" font-family="monospace" font-size="13" font-weight="bold" fill="${color}">${text}</text>
      </svg>`
    );
  }
  const r1l = await sharp(row1).composite([{ input: flowLabel('homepage — exchange cards', '#94a3b8', FW, R1H), blend: 'over' }]).png().toBuffer();
  const r2l = await sharp(row2).composite([{ input: flowLabel('bybit page — no_glow hero (unchanged)', '#60a5fa', FW, R2H), blend: 'over' }]).png().toBuffer();
  const r3l = await sharp(row3).composite([{ input: flowLabel('bybit article image — v2 NEW', '#4ade80', FW, R3H), blend: 'over' }]).png().toBuffer();

  const totalH = R1H + 3 + R2H + 3 + R3H;
  await sharp({ create: { width: FW, height: totalH, channels: 3, background: { r: 11, g: 13, b: 20 } } })
    .composite([
      { input: r1l, left: 0, top: 0 },
      { input: divH(FW), left: 0, top: R1H },
      { input: r2l, left: 0, top: R1H + 3 },
      { input: divH(FW), left: 0, top: R1H + 3 + R2H },
      { input: r3l, left: 0, top: R1H + 3 + R2H + 3 },
    ])
    .png()
    .toFile(resolve(OUT, '08-bybit-flow-homepage-to-page.png'));
  console.log('  ✓ 08-bybit-flow-homepage-to-page.png');
}

await browser.close();
console.log(`\n✅ All 8 screenshots → ${OUT}`);
console.log(`og:image active: ${ogMeta}`);
