/**
 * inbox-process.mjs — One-command screenshot intake for CryptoBonusWorld
 *
 * Watches inbox/ for new screenshots and processes them:
 *   1. Resize + crop + WebP conversion via process-screenshot.mjs
 *   2. Annotation via annotate-screenshot.mjs (if config exists)
 *   3. Places in public/screenshots/<exchange>/steps/<name>.webp
 *   4. Prints the evidence JSON snippet to paste into data files
 *
 * Usage:
 *   node scripts/inbox-process.mjs <input-file> <output-name> [exchange] [annotations-json]
 *
 *   <input-file>        File in inbox/ or absolute path
 *   <output-name>       Desired filename without .webp
 *   [exchange]          binance (default)
 *   [annotations-json]  Inline JSON array of annotations
 *
 * Annotation format:
 *   [
 *     { "type": "arrow", "color": "blue",   "from": [x,y], "to": [x,y] },
 *     { "type": "arrow", "color": "orange", "from": [x,y], "to": [x,y] },
 *     { "type": "rect",  "color": "red",    "x": 100, "y": 200, "w": 300, "h": 50 }
 *   ]
 *
 * Arrow colors:
 *   blue   — points to a zone/section (#2563EB)
 *   orange — points to specific field/button (#F97316)
 *   red    — highlights/outlines a region (#EF4444)
 *
 * Examples:
 *   node scripts/inbox-process.mjs inbox/shot.png bn-reg-landing-jun26 binance
 *   node scripts/inbox-process.mjs inbox/shot.png bn-reg-email-blur-jun26 binance \
 *     '[{"type":"arrow","color":"orange","from":[300,180],"to":[370,150]},{"type":"rect","color":"red","x":60,"y":160,"w":400,"h":45}]'
 */

import sharp from 'sharp';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { resolve, dirname, basename, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────────

const COLORS = {
  blue:   { stroke: '#2563EB', fill: 'rgba(37,99,235,0.10)',  lineWidth: 3.5 },
  orange: { stroke: '#F97316', fill: 'rgba(249,115,22,0.10)', lineWidth: 3.5 },
  red:    { stroke: '#EF4444', fill: 'rgba(239,68,68,0.12)',  lineWidth: 3   },
  green:  { stroke: '#22C55E', fill: 'rgba(34,197,94,0.10)',  lineWidth: 3   },
};

const MAX_WIDTH    = 1440;
const WEBP_QUALITY = 88;
const BLUR_SIGMA   = 18;  // blur intensity for email/personal data regions

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawArrow(ctx, from, to, color) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const c = COLORS[color] ?? COLORS.orange;
  const headSize = 16;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  // Line end shortened to not overlap head
  const ex = x2 - Math.cos(angle) * headSize * 0.75;
  const ey = y2 - Math.sin(angle) * headSize * 0.75;

  ctx.save();

  // Shadow for visibility on any background
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 5;

  // Line
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = c.lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Arrowhead
  ctx.fillStyle = c.stroke;
  ctx.translate(x2, y2);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-headSize, -headSize * 0.38);
  ctx.lineTo(-headSize, headSize * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawRect(ctx, x, y, w, h, color, radius = 8) {
  const c = COLORS[color] ?? COLORS.red;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = c.stroke;
  ctx.fillStyle = c.fill;
  ctx.lineWidth = c.lineWidth;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCircle(ctx, cx, cy, r, color) {
  const c = COLORS[color] ?? COLORS.orange;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = c.stroke;
  ctx.fillStyle = c.fill;
  ctx.lineWidth = c.lineWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ── Blur region via sharp ─────────────────────────────────────────────────────

async function applyBlurRegions(buffer, regions) {
  if (!regions || regions.length === 0) return buffer;
  const meta = await sharp(buffer).metadata();
  const composites = [];

  for (const r of regions) {
    const left   = Math.max(0, Math.round(r.x));
    const top    = Math.max(0, Math.round(r.y));
    const width  = Math.min(Math.round(r.w), meta.width  - left);
    const height = Math.min(Math.round(r.h), meta.height - top);
    if (width < 1 || height < 1) continue;
    const blurred = await sharp(buffer)
      .extract({ left, top, width, height })
      .blur(BLUR_SIGMA)
      .toBuffer();
    composites.push({ input: blurred, left, top });
  }

  if (composites.length === 0) return buffer;
  return sharp(buffer).composite(composites).toBuffer();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [,, inputArg, outputName, exchangeArg, annotationsArg] = process.argv;

  if (!inputArg || !outputName) {
    console.log(`
  inbox-process.mjs — CryptoBonusWorld Screenshot Intake

  Usage:
    node scripts/inbox-process.mjs <input> <output-name> [exchange] [annotations-json]

  Arguments:
    <input>            File in inbox/ folder or absolute path
    <output-name>      Output filename without .webp  (e.g. bn-reg-landing-jun26)
    [exchange]         Exchange slug (default: binance)
    [annotations-json] JSON array of annotations (see below)

  Annotation types:
    { "type": "arrow",  "color": "blue|orange|red", "from": [x,y], "to": [x,y] }
    { "type": "rect",   "color": "blue|orange|red", "x": N, "y": N, "w": N, "h": N }
    { "type": "circle", "color": "blue|orange|red", "cx": N, "cy": N, "r": N }
    { "type": "blur",   "x": N, "y": N, "w": N, "h": N }

  Arrow color guide:
    blue   = zone / general area
    orange = specific field, button, action
    red    = warning / highlight

  Output: public/screenshots/<exchange>/steps/<output-name>.webp
`);
    process.exit(0);
  }

  // Resolve input path
  const inboxPath = resolve(ROOT, 'inbox', inputArg);
  const inputPath = existsSync(inboxPath) ? inboxPath
                  : existsSync(inputArg)  ? resolve(inputArg)
                  : null;

  if (!inputPath) {
    console.error(`✖  File not found: ${inputArg}`);
    console.error(`   Tried: ${inboxPath}`);
    console.error(`   Tried: ${resolve(inputArg)}`);
    process.exit(1);
  }

  const exchange   = exchangeArg ?? 'binance';
  const outputDir  = resolve(ROOT, 'public', 'screenshots', exchange, 'steps');
  const outputPath = resolve(outputDir, `${outputName}.webp`);

  let annotations = [];
  if (annotationsArg) {
    try { annotations = JSON.parse(annotationsArg); }
    catch (e) { console.error('✖  Invalid annotations JSON:', e.message); process.exit(1); }
  }

  mkdirSync(outputDir, { recursive: true });

  console.log('');
  console.log(`  📸  Processing: ${basename(inputPath)}`);
  console.log(`  →   Output:     public/screenshots/${exchange}/steps/${outputName}.webp`);
  if (annotations.length) console.log(`  ✏️   Annotations: ${annotations.length} items`);
  console.log('');

  // 1. Load + resize with sharp
  const rawMeta = await sharp(inputPath).metadata();
  console.log(`  Input:  ${rawMeta.width}×${rawMeta.height}px (${rawMeta.format})`);

  let pipeline = sharp(inputPath).toColorspace('srgb');
  if (rawMeta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  // Light quality enhancement
  pipeline = pipeline.modulate({ brightness: 1.03, saturation: 1.05 });

  let workBuf = await pipeline.removeAlpha().png().toBuffer();

  // 2. Apply blur regions first (before canvas annotations)
  const blurAnnotations = annotations.filter(a => a.type === 'blur');
  if (blurAnnotations.length) {
    workBuf = await applyBlurRegions(workBuf, blurAnnotations);
    console.log(`  Blurred ${blurAnnotations.length} region(s)`);
  }

  // 3. Draw vector annotations with canvas
  const drawAnnotations = annotations.filter(a => a.type !== 'blur');
  if (drawAnnotations.length) {
    const meta  = await sharp(workBuf).metadata();
    const canvas = createCanvas(meta.width, meta.height);
    const ctx    = canvas.getContext('2d');
    const img    = await loadImage(workBuf);
    ctx.drawImage(img, 0, 0, meta.width, meta.height);

    for (const ann of drawAnnotations) {
      switch (ann.type) {
        case 'arrow':  drawArrow(ctx, ann.from, ann.to, ann.color ?? 'orange'); break;
        case 'rect':   drawRect(ctx, ann.x, ann.y, ann.w, ann.h, ann.color ?? 'red'); break;
        case 'circle': drawCircle(ctx, ann.cx, ann.cy, ann.r ?? 30, ann.color ?? 'orange'); break;
      }
    }

    workBuf = canvas.toBuffer('image/png');
  }

  // 4. Convert to WebP and save
  const finalBuf  = await sharp(workBuf).webp({ quality: WEBP_QUALITY }).toBuffer();
  const finalMeta = await sharp(finalBuf).metadata();
  const sizeKB    = Math.round(finalBuf.length / 1024);

  writeFileSync(outputPath, finalBuf);

  console.log(`  Output: ${finalMeta.width}×${finalMeta.height}px  ${sizeKB} KB`);
  console.log(`  ✅  Saved: ${outputPath.replace(ROOT, '').replace(/\\/g, '/')}`);
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Check the image: open public/screenshots/' + exchange + '/steps/' + outputName + '.webp');
  console.log('  2. Update evidence JSON if needed');
  console.log('  3. Run: node scripts/deploy.mjs');
  console.log('');
}

main().catch(err => { console.error('✖ Error:', err.message); process.exit(1); });
