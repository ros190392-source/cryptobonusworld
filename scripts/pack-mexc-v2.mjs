/**
 * pack-mexc-v2.mjs
 *
 * Processes owner-provided MEXC visual pack v2 images into
 * production-ready base and final files.
 *
 * Run: node scripts/pack-mexc-v2.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCES = [
  { file: 'C:/Users/ros19/Downloads/ChatGPT Image 22 июн. 2026 г., 18_12_57 (1).png', label: 'File 1 → OG' },
  { file: 'C:/Users/ros19/Downloads/ChatGPT Image 22 июн. 2026 г., 18_12_58 (2).png', label: 'File 2 → Article' },
  { file: 'C:/Users/ros19/Downloads/ChatGPT Image 22 июн. 2026 г., 18_13_00 (3).png', label: 'File 3 → Card' },
];

const TASKS = [
  {
    src:   SOURCES[0].file,
    base:  'public/media/exchanges/mexc/base/mexc-og-base-v2-1200x630.jpg',
    final: 'public/media/exchanges/mexc/final/mexc-og-final-v2-1200x630.jpg',
    w: 1200, h: 630,
  },
  {
    src:   SOURCES[1].file,
    base:  'public/media/exchanges/mexc/base/mexc-article-base-v2-1200x675.jpg',
    final: 'public/media/exchanges/mexc/final/mexc-article-final-v2-1200x675.jpg',
    w: 1200, h: 675,
  },
  {
    src:   SOURCES[2].file,
    base:  'public/media/exchanges/mexc/base/mexc-card-base-v2-1200x800.jpg',
    final: 'public/media/exchanges/mexc/final/mexc-card-final-v2-1200x800.jpg',
    w: 1200, h: 800,
  },
];

const JPEG_OPTS = { quality: 90, progressive: true };

for (const t of TASKS) {
  // Ensure dirs exist
  fs.mkdirSync(path.dirname(t.base), { recursive: true });
  fs.mkdirSync(path.dirname(t.final), { recursive: true });

  // Verify source exists
  if (!fs.existsSync(t.src)) {
    console.error('MISSING SOURCE: ' + t.src);
    process.exit(1);
  }

  // Resize/crop to exact target dimensions (cover = minimal crop, no distortion)
  await sharp(t.src)
    .resize(t.w, t.h, { fit: 'cover', position: 'centre' })
    .jpeg(JPEG_OPTS)
    .toFile(t.base);

  // Final = base (no additional overlay)
  fs.copyFileSync(t.base, t.final);

  // Verify output
  const baseMeta  = await sharp(t.base).metadata();
  const finalMeta = await sharp(t.final).metadata();
  const baseSize  = fs.statSync(t.base).size;
  const finalSize = fs.statSync(t.final).size;

  const baseName  = path.basename(t.base);
  const finalName = path.basename(t.final);

  const ok = baseMeta.width === t.w && baseMeta.height === t.h;
  console.log((ok ? '✅' : '❌') + ' ' + baseName.padEnd(46) + ' ' + baseMeta.width + 'x' + baseMeta.height + '  ' + (baseSize/1024).toFixed(1) + ' KB');
  console.log((ok ? '✅' : '❌') + ' ' + finalName.padEnd(46) + ' ' + finalMeta.width + 'x' + finalMeta.height + '  ' + (finalSize/1024).toFixed(1) + ' KB  (copy of base)');
  console.log('');
}

console.log('pack-mexc-v2 done.');
