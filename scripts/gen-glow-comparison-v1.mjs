#!/usr/bin/env node
/**
 * gen-glow-comparison-v1.mjs
 * Creates visual comparison images for the 3-level glow system review.
 */

import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC  = resolve(ROOT, 'public/media/hero-backgrounds');
const OUT  = resolve(ROOT, 'reports/visual/hero-glow-levels-v1');

mkdirSync(OUT, { recursive: true });

const NO_GLOW    = resolve(SRC, 'cbw-hero-neutral-no-glow-v2.png');
const SOFT_GLOW  = resolve(SRC, 'cbw-hero-neutral-logo-glow-v2.png');
const STRONG_GLOW = resolve(SRC, 'cbw-hero-neutral-strong-glow-v1.png');

// ── Display size: 1440×480 (how the hero renders in-browser at desktop) ──────
const DW = 1440;
const DH = 480;

// ── Resize one source image to display size ───────────────────────────────────
async function resize(src) {
  return sharp(src)
    .resize({ width: DW, height: DH, fit: 'cover', position: 'centre' })
    .toBuffer();
}

// ── Label overlay (white text in lower-left corner) ──────────────────────────
function labelSvg(text, w = DW, h = DH) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="${h - 44}" width="${text.length * 11 + 24}" height="32" rx="4" fill="rgba(0,0,0,0.55)"/>
      <text x="24" y="${h - 23}" font-family="monospace" font-size="18" font-weight="bold" fill="#e2e8f0">${text}</text>
    </svg>`
  );
}

// ── 1. Individual files ───────────────────────────────────────────────────────
console.log('Generating individual review images...');

const [ngBuf, sgBuf, stBuf] = await Promise.all([
  resize(NO_GLOW),
  resize(SOFT_GLOW),
  resize(STRONG_GLOW),
]);

await sharp(ngBuf)
  .composite([{ input: labelSvg('no_glow'), blend: 'over' }])
  .png({ compressionLevel: 8 })
  .toFile(resolve(OUT, '01-no-glow.png'));
console.log('  ✓ 01-no-glow.png');

await sharp(sgBuf)
  .composite([{ input: labelSvg('soft_glow'), blend: 'over' }])
  .png({ compressionLevel: 8 })
  .toFile(resolve(OUT, '02-soft-glow.png'));
console.log('  ✓ 02-soft-glow.png');

await sharp(stBuf)
  .composite([{ input: labelSvg('strong_glow (fixed)'), blend: 'over' }])
  .png({ compressionLevel: 8 })
  .toFile(resolve(OUT, '03-strong-glow-fixed.png'));
console.log('  ✓ 03-strong-glow-fixed.png');

// ── 2. soft vs strong side-by-side (labelled halves) ─────────────────────────
console.log('Generating soft vs strong comparison...');

// Resize to half-width for the comparison panel
const HW = Math.round(DW / 2); // 720
const HH = DH;                  // 480

async function resizeHalf(src) {
  return sharp(src)
    .resize({ width: HW, height: HH, fit: 'cover', position: 'centre' })
    .toBuffer();
}

const [sgHalf, stHalf] = await Promise.all([
  resizeHalf(SOFT_GLOW),
  resizeHalf(STRONG_GLOW),
]);

// Add labels to each half
const sgLabelledBuf = await sharp(sgHalf)
  .composite([{ input: labelSvg('soft_glow', HW, HH), blend: 'over' }])
  .toBuffer();
const stLabelledBuf = await sharp(stHalf)
  .composite([{ input: labelSvg('strong_glow', HW, HH), blend: 'over' }])
  .toBuffer();

// Draw a thin 2px separator line SVG
const dividerSvg = Buffer.from(
  `<svg width="2" height="${HH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="2" height="${HH}" fill="rgba(255,255,255,0.3)"/>
  </svg>`
);

// Stitch horizontally: [soft] [divider] [strong]
const compW = HW + 2 + HW; // 1442
await sharp({
  create: { width: compW, height: HH, channels: 3, background: { r: 0, g: 0, b: 0 } },
})
  .composite([
    { input: sgLabelledBuf, left: 0,        top: 0 },
    { input: dividerSvg,    left: HW,        top: 0 },
    { input: stLabelledBuf, left: HW + 2,    top: 0 },
  ])
  .png({ compressionLevel: 8 })
  .toFile(resolve(OUT, '04-soft-vs-strong-comparison.png'));
console.log('  ✓ 04-soft-vs-strong-comparison.png');

// ── 3. Three-level side-by-side ───────────────────────────────────────────────
console.log('Generating three-level comparison...');

const TW = Math.round(DW / 3); // 480
const TH = Math.round(DH / 2); // 240

async function resizeThird(src) {
  return sharp(src)
    .resize({ width: TW, height: TH, fit: 'cover', position: 'centre' })
    .toBuffer();
}

const [ngT, sgT, stT] = await Promise.all([
  resizeThird(NO_GLOW),
  resizeThird(SOFT_GLOW),
  resizeThird(STRONG_GLOW),
]);

function labelSvgThird(text) { return labelSvg(text, TW, TH); }

const ngLT = await sharp(ngT).composite([{ input: labelSvgThird('no_glow'), blend: 'over' }]).toBuffer();
const sgLT = await sharp(sgT).composite([{ input: labelSvgThird('soft_glow'), blend: 'over' }]).toBuffer();
const stLT = await sharp(stT).composite([{ input: labelSvgThird('strong_glow'), blend: 'over' }]).toBuffer();

const div1 = Buffer.from(`<svg width="2" height="${TH}" xmlns="http://www.w3.org/2000/svg"><rect width="2" height="${TH}" fill="rgba(255,255,255,0.3)"/></svg>`);
const div2 = Buffer.from(`<svg width="2" height="${TH}" xmlns="http://www.w3.org/2000/svg"><rect width="2" height="${TH}" fill="rgba(255,255,255,0.3)"/></svg>`);

const tripleW = TW + 2 + TW + 2 + TW;
await sharp({
  create: { width: tripleW, height: TH, channels: 3, background: { r: 0, g: 0, b: 0 } },
})
  .composite([
    { input: ngLT, left: 0,            top: 0 },
    { input: div1, left: TW,           top: 0 },
    { input: sgLT, left: TW + 2,       top: 0 },
    { input: div2, left: TW*2 + 2,     top: 0 },
    { input: stLT, left: TW*2 + 4,     top: 0 },
  ])
  .png({ compressionLevel: 8 })
  .toFile(resolve(OUT, '05-three-level-comparison.png'));
console.log('  ✓ 05-three-level-comparison.png');

console.log(`\n✅ All comparison images saved to ${OUT}`);
