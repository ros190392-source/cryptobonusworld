/**
 * pack-mexc-overlay.mjs
 *
 * Composites the official MEXC wordmark (mexc-wordmark-dark.png) onto
 * each base image and saves to final/.  Uses blend: 'screen' so the
 * near-black background of the wordmark dissolves into the dark image
 * background while the blue icon and near-white text remain visible.
 *
 * Run: node scripts/pack-mexc-overlay.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const WORDMARK = 'public/logos/mexc-wordmark-dark.png';

// Logo width targets per image size (proportional to canvas width)
const tasks = [
  {
    base:  'public/media/exchanges/mexc/base/mexc-card-base-v1-1200x800.jpg',
    final: 'public/media/exchanges/mexc/final/mexc-card-final-v1-1200x800.jpg',
    canvasW: 1200, canvasH: 800,
    logoW: 220,   // ~18% of width
    padX: 44, padY: 36,
  },
  {
    base:  'public/media/exchanges/mexc/base/mexc-og-base-v1-1200x630.jpg',
    final: 'public/media/exchanges/mexc/final/mexc-og-final-v1-1200x630.jpg',
    canvasW: 1200, canvasH: 630,
    logoW: 200,
    padX: 44, padY: 32,
  },
  {
    base:  'public/media/exchanges/mexc/base/mexc-article-base-v1-1200x675.jpg',
    final: 'public/media/exchanges/mexc/final/mexc-article-final-v1-1200x675.jpg',
    canvasW: 1200, canvasH: 675,
    logoW: 200,
    padX: 44, padY: 32,
  },
];

const wmMeta = await sharp(WORDMARK).metadata();
const WM_ASPECT = wmMeta.height / wmMeta.width; // 101/768 ≈ 0.1315

for (const t of tasks) {
  const logoH = Math.round(t.logoW * WM_ASPECT);

  // Resize the wordmark to target width
  const wmBuf = await sharp(WORDMARK)
    .resize(t.logoW, logoH, { fit: 'fill' })
    .png()
    .toBuffer();

  await sharp(t.base)
    .composite([{
      input: wmBuf,
      blend: 'screen',
      left: t.padX,
      top: t.padY,
    }])
    .jpeg({ quality: 90, progressive: true })
    .toFile(t.final);

  const stat = fs.statSync(t.final);
  const meta = await sharp(t.final).metadata();
  console.log(
    path.basename(t.final).padEnd(48),
    meta.width + 'x' + meta.height,
    (stat.size / 1024).toFixed(1) + ' KB',
    'logo ' + t.logoW + 'x' + logoH + ' @ (' + t.padX + ',' + t.padY + ')'
  );
}

console.log('\nDone — finals now carry the official MEXC wordmark overlay.');
