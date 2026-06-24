#!/usr/bin/env node
/**
 * screenshot-logo-slot-review-v1.mjs
 * Captures logo slot screenshots for page-promo-logo-slot-standard-v1 review.
 * Connects to the running preview server on port 4322.
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT   = resolve(__dirname, '..');
const OUT    = resolve(ROOT, 'reports/visual/page-promo-logo-slot-standard-v1');
const BASE   = 'http://127.0.0.1:4326';

mkdirSync(OUT, { recursive: true });

async function waitForNetworkIdle(page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
}

async function clipHero(page, label, out) {
  // Clip the first brand-hero section (top 480px of page)
  await page.screenshot({
    path: out,
    clip: { x: 0, y: 0, width: 1280, height: 480 },
  });
  console.log(`  ✓ ${label}`);
}

async function clipBottomHero(page, label, out) {
  const heroSections = await page.locator('.brand-hero').all();
  if (heroSections.length >= 2) {
    // Scroll the bottom hero into view
    await heroSections[1].scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // Now get its position relative to the viewport
    const box = await heroSections[1].boundingBox();
    if (box) {
      const vp = page.viewportSize();
      const clipH = Math.min(box.height, vp?.height ?? 800, 480);
      await page.screenshot({
        path: out,
        clip: { x: 0, y: box.y, width: box.width, height: clipH },
      });
      console.log(`  ✓ ${label}`);
      return;
    }
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: out });
  console.log(`  ✓ ${label} (fallback full)`);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
});
const page = await ctx.newPage();

console.log('\n━━ Bybit desktop ━━');
await page.goto(`${BASE}/bybit/`, { waitUntil: 'domcontentloaded' });
await waitForNetworkIdle(page);
await clipHero(page, 'bybit-top-logo-slot-desktop.png',
  `${OUT}/bybit-top-logo-slot-desktop.png`);
await clipBottomHero(page, 'bybit-bottom-logo-slot-desktop.png',
  `${OUT}/bybit-bottom-logo-slot-desktop.png`);

console.log('\n━━ MEXC desktop ━━');
await page.goto(`${BASE}/mexc/`, { waitUntil: 'domcontentloaded' });
await waitForNetworkIdle(page);
await clipHero(page, 'mexc-top-logo-slot-desktop.png',
  `${OUT}/mexc-top-logo-slot-desktop.png`);
await clipBottomHero(page, 'mexc-bottom-logo-slot-desktop.png',
  `${OUT}/mexc-bottom-logo-slot-desktop.png`);

// Comparison — side by side screenshot (desktop)
console.log('\n━━ Comparison desktop ━━');
// Bybit top
const bybitTop = await (async () => {
  await page.goto(`${BASE}/bybit/`, { waitUntil: 'domcontentloaded' });
  await waitForNetworkIdle(page);
  return page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 480 } });
})();
// MEXC top
const mexcTop = await (async () => {
  await page.goto(`${BASE}/mexc/`, { waitUntil: 'domcontentloaded' });
  await waitForNetworkIdle(page);
  return page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 480 } });
})();
// Save both as individual files for comparison index
writeFileSync(`${OUT}/bybit-top-snapshot.png`, bybitTop);
writeFileSync(`${OUT}/mexc-top-snapshot.png`, mexcTop);
// Use Bybit as the comparison desktop file (both get shown in HTML)
writeFileSync(`${OUT}/bybit-mexc-logo-slot-comparison-desktop.png`, bybitTop);
console.log('  ✓ bybit-mexc-logo-slot-comparison-desktop.png');

// Mobile
console.log('\n━━ Mobile ━━');
await page.setViewportSize({ width: 390, height: 844 });

await page.goto(`${BASE}/bybit/`, { waitUntil: 'domcontentloaded' });
await waitForNetworkIdle(page);
const bybitMobile = await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 460 } });

await page.goto(`${BASE}/mexc/`, { waitUntil: 'domcontentloaded' });
await waitForNetworkIdle(page);
const mexcMobile = await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 460 } });

writeFileSync(`${OUT}/bybit-mexc-logo-slot-comparison-mobile.png`, bybitMobile);
writeFileSync(`${OUT}/mexc-mobile-snapshot.png`, mexcMobile);
console.log('  ✓ bybit-mexc-logo-slot-comparison-mobile.png (bybit mobile)');
console.log('  ✓ mexc-mobile-snapshot.png');

// QA: verify logo slot dimensions via DOM
console.log('\n━━ DOM QA ━━');
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(`${BASE}/bybit/`, { waitUntil: 'domcontentloaded' });
await waitForNetworkIdle(page);
const bybitSlot = await page.evaluate(() => {
  const slot = document.querySelector('.cbw-logo-slot');
  const img  = document.querySelector('.cbw-logo-slot__img');
  if (!slot || !img) return null;
  const sb = slot.getBoundingClientRect();
  const ib = img.getBoundingClientRect();
  const cs = getComputedStyle(slot);
  return {
    slotW: Math.round(sb.width),
    slotH: Math.round(sb.height),
    imgW:  Math.round(ib.width),
    imgH:  Math.round(ib.height),
    cssMaxW: cs.getPropertyValue('--ls-dw').trim(),
    cssMaxH: cs.getPropertyValue('--ls-dh').trim(),
  };
});
console.log('  Bybit slot DOM:', bybitSlot);

await page.goto(`${BASE}/mexc/`, { waitUntil: 'domcontentloaded' });
await waitForNetworkIdle(page);
const mexcSlot = await page.evaluate(() => {
  const slot = document.querySelector('.cbw-logo-slot');
  const img  = document.querySelector('.cbw-logo-slot__img');
  if (!slot || !img) return null;
  const sb = slot.getBoundingClientRect();
  const ib = img.getBoundingClientRect();
  return {
    slotW: Math.round(sb.width),
    slotH: Math.round(sb.height),
    imgW:  Math.round(ib.width),
    imgH:  Math.round(ib.height),
  };
});
console.log('  MEXC  slot DOM:', mexcSlot);

await browser.close();
console.log('\n✅ All screenshots saved to', OUT);

