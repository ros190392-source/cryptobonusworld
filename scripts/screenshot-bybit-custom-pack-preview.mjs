#!/usr/bin/env node
import { chromium } from 'playwright';
import { default as sharp } from 'sharp';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = resolve(ROOT, 'reports/visual/bybit-4-image-custom-pack-preview');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://127.0.0.1:4322';

async function page(vp, url) {
  const p = await browser.newPage({ viewport: vp });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  return p;
}

const browser = await chromium.launch();

// 01 — homepage with Bybit card
console.log('── 01 Homepage Bybit card ──');
{
  const p = await page({ width: 1440, height: 900 }, BASE + '/');
  await p.evaluate(() => document.getElementById('exchanges')?.scrollIntoView({ behavior: 'instant' }));
  await p.waitForTimeout(300);
  await sharp(await p.screenshot()).png().toFile(resolve(OUT, '01-homepage-bybit-card.png'));
  console.log('  ✓ 01-homepage-bybit-card.png');
  await p.close();
}

// 02 — Bybit desktop top hero
console.log('── 02 Bybit top hero desktop ──');
{
  const p = await page({ width: 1440, height: 800 }, BASE + '/bybit/');
  await sharp(await p.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 700 } })).png().toFile(resolve(OUT, '02-bybit-top-hero-desktop.png'));
  console.log('  ✓ 02-bybit-top-hero-desktop.png');
  await p.close();
}

// 03 — Bybit desktop bottom hero
console.log('── 03 Bybit bottom hero desktop ──');
{
  const p = await page({ width: 1440, height: 900 }, BASE + '/bybit/');
  const heroes = await p.locator('.brand-hero').all();
  if (heroes.length >= 2) {
    await heroes[1].evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    await p.waitForTimeout(400);
  }
  await sharp(await p.screenshot()).png().toFile(resolve(OUT, '03-bybit-bottom-hero-desktop.png'));
  console.log('  ✓ 03-bybit-bottom-hero-desktop.png');
  await p.close();
}

// 04 — Bybit mobile top hero
console.log('── 04 Bybit top hero mobile ──');
{
  const p = await page({ width: 390, height: 844 }, BASE + '/bybit/');
  await sharp(await p.screenshot({ clip: { x: 0, y: 0, width: 390, height: 700 } })).png().toFile(resolve(OUT, '04-bybit-top-hero-mobile.png'));
  console.log('  ✓ 04-bybit-top-hero-mobile.png');
  await p.close();
}

// 05 — Article image section
console.log('── 05 Article image ──');
{
  const p = await page({ width: 1440, height: 900 }, BASE + '/bybit/');
  const img = p.locator('img[src*="bybit-article"]').first();
  await img.waitFor();
  await img.evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
  await p.waitForTimeout(400);
  const box = await img.boundingBox();
  const pad = 24;
  await sharp(await p.screenshot({
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width:  Math.min(1440, box.width  + pad * 2),
      height: Math.min(900,  box.height + pad * 2),
    }
  })).png().toFile(resolve(OUT, '05-bybit-article-image.png'));
  console.log('  ✓ 05-bybit-article-image.png');
  await p.close();
}

// 06 — OG meta check
console.log('── 06 OG meta check ──');
{
  const p = await page({ width: 1440, height: 600 }, BASE + '/bybit/');
  const ogPath      = await p.locator('meta[property="og:image"]').getAttribute('content')      ?? 'not found';
  const twitterPath = await p.locator('meta[name="twitter:image"]').getAttribute('content')     ?? 'not found';
  const isV3  = ogPath.includes('v3');
  const color = isV3 ? '#4ade80' : '#f87171';
  const label = isV3 ? '✓ OG META: v3 ACTIVE' : '✗ OG META: NOT v3';

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
  await sharp(svg).png().toFile(resolve(OUT, '06-og-meta-check.png'));
  console.log('  ✓ 06-og-meta-check.png  og=' + ogPath);
  await p.close();
}

await browser.close();
console.log('\n✅ All 6 screenshots → ' + OUT);
