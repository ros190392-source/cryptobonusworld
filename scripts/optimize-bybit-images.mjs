// One-time script: resize + optimize Bybit article and card images
// Usage: node scripts/optimize-bybit-images.mjs
// Safe: read-only on source PNGs, writes new JPG files only

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Resolve sharp from project node_modules
const require = createRequire(import.meta.url);
const sharp = require(path.join(root, 'node_modules', 'sharp'));

const tasks = [
  {
    label: 'Article banner',
    src: path.join(root, 'public/media/exchanges/bybit/article/bybit-article-1200x675.png'),
    dst: path.join(root, 'public/media/exchanges/bybit/article/bybit-article-1200x675.jpg'),
    width: 1200,
    height: 675,
    quality: 90,
  },
  {
    label: 'Homepage card',
    src: path.join(root, 'public/media/exchanges/bybit/cards/bybit-card-1200x800.png'),
    dst: path.join(root, 'public/media/exchanges/bybit/cards/bybit-card-1200x800.jpg'),
    width: 1200,
    height: 800,
    quality: 90,
  },
];

for (const t of tasks) {
  console.log(`\n── ${t.label}`);
  console.log(`   src: ${path.relative(root, t.src)}`);
  console.log(`   dst: ${path.relative(root, t.dst)}`);

  const srcInfo = await sharp(t.src).metadata();
  const srcSize = fs.statSync(t.src).size;
  console.log(`   source: ${srcInfo.width}×${srcInfo.height}, ${(srcSize / 1024).toFixed(0)} KB`);

  await sharp(t.src)
    .resize(t.width, t.height, {
      fit: 'cover',
      position: 'centre',
      kernel: 'lanczos3',
    })
    .jpeg({ quality: t.quality, mozjpeg: true })
    .toFile(t.dst);

  const dstInfo = await sharp(t.dst).metadata();
  const dstSize = fs.statSync(t.dst).size;
  console.log(`   output: ${dstInfo.width}×${dstInfo.height}, ${(dstSize / 1024).toFixed(0)} KB`);

  // If file is still large, try lower quality
  if (dstSize > 400 * 1024) {
    console.log(`   ⚠ still large (${(dstSize/1024).toFixed(0)} KB > 400 KB), retrying at quality 82...`);
    await sharp(t.src)
      .resize(t.width, t.height, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(t.dst);
    const retry = fs.statSync(t.dst).size;
    console.log(`   output (q82): ${(retry / 1024).toFixed(0)} KB`);
  }

  console.log(`   ✓ done`);
}

console.log('\n✅ All done. Source PNGs not modified.');
