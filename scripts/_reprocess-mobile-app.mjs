#!/usr/bin/env node
// One-shot script: re-process mobile_app raw PNG with the fixed pipeline (no trim on mobile)
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const rawDir   = join(ROOT, '_raw-screenshots', 'binance', 'mobile_app');
const outDir   = join(ROOT, 'public', 'screenshots', 'binance', 'mobile_app');
const outPath  = join(outDir, 'global-mobile-2026-06.webp');
const framePath = join(ROOT, 'assets', 'browser-frame', 'frame-390-mobile.svg');

// Find the raw PNG
const rawFiles = readdirSync(rawDir).filter(f => f.endsWith('.png'));
if (!rawFiles.length) { console.error('No raw PNG found in', rawDir); process.exit(1); }
const rawPath = join(rawDir, rawFiles[rawFiles.length - 1]); // most recent
console.log('Raw:', rawPath);

const { default: sharp } = await import('sharp');

// Step 1: read raw, resize to 390px WITHOUT trim
let buf = await sharp(rawPath, { failOnError: false })
  .toColorspace('srgb')
  .resize(390, null, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
  .toBuffer();

let meta = await sharp(buf).metadata();
console.log('After resize:', meta.width, 'x', meta.height);

// Step 2: if narrower than 390px, pad to 390px with dark bg (#16162A)
if ((meta.width ?? 0) < 390) {
  const ext = 390 - (meta.width ?? 0);
  buf = await sharp(buf)
    .extend({
      left: Math.floor(ext / 2), right: Math.ceil(ext / 2),
      top: 0, bottom: 0,
      background: { r: 22, g: 22, b: 42, alpha: 1 },
    })
    .toBuffer();
  meta = await sharp(buf).metadata();
  console.log('After pad:', meta.width, 'x', meta.height);
}

// Step 3: composite mobile frame (390px wide SVG)
if (existsSync(framePath)) {
  const frameSvg = readFileSync(framePath);
  buf = await sharp(buf)
    .composite([{ input: frameSvg, gravity: 'north', blend: 'over' }])
    .toBuffer();
  console.log('Mobile frame composited');
} else {
  console.warn('Mobile frame SVG not found at', framePath);
}

// Step 4: export WebP q82
const final = await sharp(buf)
  .webp({ quality: 82, effort: 4, smartSubsample: true })
  .toBuffer();

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, final);

const finalMeta = await sharp(final).metadata();
console.log('');
console.log('Output:     ', outPath);
console.log('Dimensions: ', finalMeta.width, 'x', finalMeta.height);
console.log('Size:       ', (final.length / 1024).toFixed(0), 'KB');
console.log('Done ✓');
