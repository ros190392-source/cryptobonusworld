#!/usr/bin/env node
import { chromium } from 'playwright';
import { default as sharp } from 'sharp';
import { mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = resolve(ROOT, 'reports/visual/mexc-4-image-custom-pack-preview');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://127.0.0.1:4322';

const browser = await chromium.launch();

async function openPage(vp, url) {
  const p = await browser.newPage({ viewport: vp });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  return p;
}

async function save(buf, file) {
  await sharp(buf).png().toFile(resolve(OUT, file));
  console.log('  ✓', file);
}

function divH(w) {
  return Buffer.from(`<svg width="${w}" height="3" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="3" fill="#1e2330"/></svg>`);
}

// ── 01: Homepage MEXC card desktop
console.log('── 01 Homepage MEXC card desktop ──');
{
  const p = await openPage({ width: 1440, height: 900 }, BASE + '/');
  await p.evaluate(() => document.getElementById('exchanges')?.scrollIntoView({ behavior: 'instant' }));
  await p.waitForTimeout(400);
  await save(await p.screenshot(), '01-homepage-mexc-card-desktop.png');
  await p.close();
}

// ── 02: Homepage MEXC card mobile
console.log('── 02 Homepage MEXC card mobile ──');
{
  const p = await openPage({ width: 390, height: 844 }, BASE + '/');
  await save(await p.screenshot(), '02-homepage-mexc-card-mobile.png');
  await p.close();
}

// ── 03: MEXC page top hero desktop
console.log('── 03 MEXC top hero desktop ──');
{
  const p = await openPage({ width: 1440, height: 800 }, BASE + '/mexc/');
  await save(await p.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 680 } }), '03-mexc-page-top-hero-desktop.png');
  await p.close();
}

// ── 04: MEXC page bottom hero desktop
console.log('── 04 MEXC bottom hero desktop ──');
{
  const p = await openPage({ width: 1440, height: 900 }, BASE + '/mexc/');
  const heroes = await p.locator('.brand-hero').all();
  if (heroes.length >= 2) {
    await heroes[1].evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    await p.waitForTimeout(400);
  }
  await save(await p.screenshot(), '04-mexc-page-bottom-hero-desktop.png');
  await p.close();
}

// ── 05: MEXC page top hero mobile
console.log('── 05 MEXC top hero mobile ──');
{
  const p = await openPage({ width: 390, height: 844 }, BASE + '/mexc/');
  await save(await p.screenshot({ clip: { x: 0, y: 0, width: 390, height: 700 } }), '05-mexc-page-top-hero-mobile.png');
  await p.close();
}

// ── 06: MEXC article image desktop
console.log('── 06 MEXC article image desktop ──');
{
  const p = await openPage({ width: 1440, height: 900 }, BASE + '/mexc/');
  const img = p.locator('img[src*="mexc-article"]').first();
  await img.waitFor();
  await img.evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
  await p.waitForTimeout(400);
  const box = await img.boundingBox();
  const pad = 24;
  await save(await p.screenshot({
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width:  Math.min(1440, box.width  + pad * 2),
      height: Math.min(900,  box.height + pad * 2),
    }
  }), '06-mexc-article-image-desktop.png');
  await p.close();
}

// ── 07: MEXC article image mobile
console.log('── 07 MEXC article image mobile ──');
{
  const p = await openPage({ width: 390, height: 844 }, BASE + '/mexc/');
  const img = p.locator('img[src*="mexc-article"]').first();
  await img.waitFor();
  await img.evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
  await p.waitForTimeout(400);
  await save(await p.screenshot(), '07-mexc-article-image-mobile.png');
  await p.close();
}

// ── 08: OG meta check
console.log('── 08 OG meta check ──');
{
  const p = await openPage({ width: 1440, height: 200 }, BASE + '/mexc/');
  const ogPath      = await p.locator('meta[property="og:image"]').getAttribute('content') ?? 'not found';
  const twitterPath = await p.locator('meta[name="twitter:image"]').getAttribute('content') ?? 'not found';
  const isV3   = ogPath.includes('mexc-og-final-v3');
  const color  = isV3 ? '#4ade80' : '#f87171';
  const label  = isV3 ? '✓ OG META: mexc v3 ACTIVE' : '✗ OG META: NOT v3';
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const svg = Buffer.from(
    `<svg width="1440" height="130" xmlns="http://www.w3.org/2000/svg">
      <rect width="1440" height="130" fill="#0f1117"/>
      <text x="40" y="38"  font-family="monospace" font-size="13" fill="#64748b">og:image</text>
      <text x="160" y="38" font-family="monospace" font-size="13" fill="${color}">${esc(ogPath)}</text>
      <text x="40" y="72"  font-family="monospace" font-size="13" fill="#64748b">twitter:image</text>
      <text x="200" y="72" font-family="monospace" font-size="13" fill="${color}">${esc(twitterPath)}</text>
      <text x="40" y="110" font-family="monospace" font-size="17" font-weight="bold" fill="${color}">${label}</text>
    </svg>`
  );
  await sharp(svg).png().toFile(resolve(OUT, '08-mexc-og-meta-check.png'));
  console.log('  ✓ 08-mexc-og-meta-check.png  og=' + ogPath);
  await p.close();
}

// ── 09: Homepage → MEXC page flow board
console.log('── 09 Homepage → MEXC flow ──');
{
  const FW = 1440, R1 = 320, R2 = 380;

  const hp = await openPage({ width: 1440, height: 900 }, BASE + '/');
  await hp.evaluate(() => document.getElementById('exchanges')?.scrollIntoView({ behavior: 'instant' }));
  await hp.waitForTimeout(400);
  const homeBuf = await hp.screenshot({ clip: { x: 0, y: 0, width: FW, height: R1 + 60 } });
  await hp.close();

  const mx = await openPage({ width: 1440, height: 900 }, BASE + '/mexc/');
  const heroBuf = await mx.screenshot({ clip: { x: 0, y: 0, width: FW, height: 480 } });
  await mx.close();

  const esc = s => s.replace(/&/g,'&amp;');
  const lbl1 = Buffer.from(`<svg width="${FW}" height="${R1}" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="260" height="26" rx="4" fill="rgba(0,0,0,.65)"/><text x="22" y="28" font-family="monospace" font-size="13" font-weight="bold" fill="#94a3b8">homepage — mexc card</text></svg>`);
  const lbl2 = Buffer.from(`<svg width="${FW}" height="${R2}" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="330" height="26" rx="4" fill="rgba(0,0,0,.65)"/><text x="22" y="28" font-family="monospace" font-size="13" font-weight="bold" fill="#22d3ee">mexc exchange page — custom hero</text></svg>`);

  const r1 = await sharp(homeBuf).resize({ width: FW, height: R1, fit: 'cover', position: 'top' }).png().toBuffer();
  const r2 = await sharp(heroBuf).resize({ width: FW, height: R2, fit: 'cover', position: 'top' }).png().toBuffer();
  const c1 = await sharp(r1).composite([{ input: lbl1, blend: 'over' }]).png().toBuffer();
  const c2 = await sharp(r2).composite([{ input: lbl2, blend: 'over' }]).png().toBuffer();

  await sharp({ create: { width: FW, height: R1 + 3 + R2, channels: 3, background: { r: 11, g: 13, b: 20 } } })
    .composite([
      { input: c1, left: 0, top: 0 },
      { input: divH(FW), left: 0, top: R1 },
      { input: c2, left: 0, top: R1 + 3 },
    ])
    .png().toFile(resolve(OUT, '09-homepage-to-mexc-page-flow.png'));
  console.log('  ✓ 09-homepage-to-mexc-page-flow.png');
}

// ── 10: Bybit vs MEXC homepage cards comparison
console.log('── 10 Bybit vs MEXC cards comparison ──');
{
  const FW = 1440, H = 600;
  const p = await openPage({ width: 1440, height: 900 }, BASE + '/');
  await p.evaluate(() => document.getElementById('exchanges')?.scrollIntoView({ behavior: 'instant' }));
  await p.waitForTimeout(400);

  const cards = await p.locator('a.ec').all();
  if (cards.length >= 2) {
    const b = await cards[0].boundingBox();
    const m = await cards[1].boundingBox();
    const pad = 16;
    const x1 = Math.max(0, Math.min(b.x, m.x) - pad);
    const y1 = Math.max(0, Math.min(b.y, m.y) - pad);
    const x2 = Math.min(FW, Math.max(b.x + b.width, m.x + m.width) + pad);
    const y2 = Math.min(900, Math.max(b.y + b.height, m.y + m.height) + pad);
    await save(await p.screenshot({ clip: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } }), '10-bybit-vs-mexc-homepage-cards.png');
  } else {
    await save(await p.screenshot({ clip: { x: 0, y: 0, width: FW, height: H } }), '10-bybit-vs-mexc-homepage-cards.png');
  }
  await p.close();
}

await browser.close();
console.log('\n✅ All 10 screenshots → ' + OUT);
