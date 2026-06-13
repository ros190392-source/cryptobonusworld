/**
 * batch-binance-ready.mjs
 * Process all inbox/Binance/ screenshots → binance-ready/
 * Applies blur to emails, QR codes, and activation codes.
 * Run: node scripts/batch-binance-ready.mjs
 */

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dirname, '..');
const INBOX = resolve(ROOT, 'inbox', 'Binance');
const OUT   = resolve(ROOT, 'binance-ready');

const MAX_WIDTH      = 1440;
const WEBP_QUALITY   = 88;
const BLUR_SIGMA     = 18;
const CROP_PADDING   = 60;   // px around detected content
const CROP_THRESHOLD = 8;    // avg brightness 0–255; below = background
const CROP_MIN_BORDER = 0.08; // crop only if black border >= 8% on any side

// [inputFile, outputName, blurRegions]
// Blur coords are in SCALED (post-resize) space
const FILES = [
  // Step 1 — Landing page (empty form)
  ['new1-reg-no-email.png',   'bn-01-landing-empty', []],
  // Step 2 — Landing with email entered (blur username before @)
  ['new2-reg-email.png',      'bn-02-landing-email-blurred',    [{ x: 853, y: 207, w: 153, h: 25 }]],
  // Step 2b — Another landing with email entered (longer username)
  ['binance-email-click-approve-fules.png', 'bn-02b-landing-email-entered-blurred', [{ x: 853, y: 207, w: 180, h: 25 }]],
  // Step 3 — CAPTCHA (car grid)
  ['new3-capcha.png',         'bn-03-captcha-cars', []],
  // Step 3b — CAPTCHA (airplane grid)
  ['capcha-airplanes.png',    'bn-03b-captcha-airplanes', []],
  // Step 4 — "Verify your email" screen (blur username in body text)
  ['new-4-sent-email.png',    'bn-04-verify-email-blurred',     [{ x: 583, y: 195, w: 140, h: 22 }]],
  // Step 4b — "Verify your email" with code entry field (blur username in text)
  ['verif-email.png',         'bn-04b-verify-code-entry-blurred', [{ x: 583, y: 195, w: 154, h: 22 }]],
  // Step 5 — Activation email (blur code 362095)
  ['new-5-email-code-6-digits.png', 'bn-05-activation-email-blurred', [{ x: 237, y: 218, w: 110, h: 42 }]],
  // Step 6 — Create password
  ['new6-password.png',       'bn-06-create-password', []],
  // Step 7 — Welcome aboard (GOLD — CRYPTOBONW code confirmed)
  ['new7-1.png',              'bn-07-welcome-desktop', []],
  ['new7-2.png',              'bn-07-welcome-medium',  []],
  ['new7-4.png',              'bn-07-welcome-tablet',  []],
  ['new7-5.png',              'bn-07-welcome-mobile',  []],
  ['new-3.png',               'bn-07-welcome-mobile-success', []],
  // Step 8 — KYC country/doc selection
  ['new-8-1.png',             'bn-08-kyc-country-select', []],
  ['new-8-2.png',             'bn-08-kyc-ukraine-mobile', []],
  ['new-8-3.png',             'bn-08-kyc-ukraine-full',   []],
  ['new-8-4.png',             'bn-08-kyc-continue',       []],
  ['8-verif-ukraine.png',     'bn-08-kyc-ukraine-doctype-full', []],
  // Step 9 — Document Verification with QR (blur QR code)
  ['9-1.png',  'bn-09-docverif-qr-desktop-blurred',  [{ x: 661, y: 346, w: 118, h: 120 }]],
  ['9-2.png',  'bn-09-docverif-qr-desktop2-blurred', [{ x: 661, y: 363, w: 114, h: 114 }]],
  ['9-3.png',  'bn-09-docverif-qr-mobile-blurred',   [{ x: 252, y: 413, w: 134, h: 142 }]],
  // Step 10 — Upload ID document
  ['10-1.png', 'bn-10-upload-id-desktop', []],
  ['10-2.png', 'bn-10-upload-id-mobile',  []],
  // Step 11 — Rewards / ongoing tasks dashboard
  ['11.png',   'bn-11-rewards-tasks', []],
  // Legacy screenshots (historical reference)
  ['1411.png',   'bn-legacy-600usd-landing',  []],
  ['141111.png', 'bn-legacy-100usd-landing',  []],
  // Bonus 19800 landing (clean)
  ['binance19800.png', 'bn-01c-landing-19800-empty', []],
];

async function autoCrop(buf) {
  // Clone before passing to Sharp — native code can detach the underlying ArrayBuffer
  const scanBuf = Buffer.from(buf);
  const { data, info } = await sharp(scanBuf).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let minX = width, minY = height, maxX = 0, maxY = 0;

  // Skip 5px inset from each edge to avoid browser chrome / anti-aliasing artifacts
  const INSET = 5;
  for (let y = INSET; y < height - INSET; y++) {
    for (let x = INSET; x < width - INSET; x++) {
      const i = (y * width + x) * channels;
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 > CROP_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX >= maxX || minY >= maxY) return { buf, cropped: false };

  // Only crop if there's a significant black border on at least one side
  const hasTopBorder    = minY  > height * CROP_MIN_BORDER;
  const hasBottomBorder = (height - maxY) > height * CROP_MIN_BORDER;
  const hasLeftBorder   = minX  > width  * CROP_MIN_BORDER;
  const hasRightBorder  = (width - maxX) > width  * CROP_MIN_BORDER;

  if (!hasTopBorder && !hasBottomBorder && !hasLeftBorder && !hasRightBorder) {
    return { buf, cropped: false };
  }

  const left   = Math.max(0, minX - CROP_PADDING);
  const top    = Math.max(0, minY - CROP_PADDING);
  const right  = Math.min(width,  maxX + CROP_PADDING);
  const bottom = Math.min(height, maxY + CROP_PADDING);

  // Clone again for the extract pass — same reason
  const cropped = await sharp(Buffer.from(buf))
    .extract({ left, top, width: right - left, height: bottom - top })
    .png()
    .toBuffer();

  return { buf: cropped, cropped: true, from: `${width}×${height}`, to: `${right - left}×${bottom - top}` };
}

async function applyBlur(buf, regions) {
  if (!regions.length) return buf;
  // Clone before every Sharp call — native libvips can detach the ArrayBuffer
  const m = await sharp(Buffer.from(buf)).metadata();
  const composites = [];
  for (const r of regions) {
    const left   = Math.max(0, Math.round(r.x));
    const top    = Math.max(0, Math.round(r.y));
    const width  = Math.min(Math.round(r.w), m.width  - left);
    const height = Math.min(Math.round(r.h), m.height - top);
    if (width < 1 || height < 1) continue;
    const blurred = await sharp(Buffer.from(buf))
      .extract({ left, top, width, height })
      .blur(BLUR_SIGMA)
      .toBuffer();
    composites.push({ input: blurred, left, top });
  }
  if (!composites.length) return buf;
  return sharp(Buffer.from(buf)).composite(composites).png().toBuffer();
}

async function processFile(inputFile, outputName, blurRegions) {
  const inputPath  = resolve(INBOX, inputFile);
  const outputPath = resolve(OUT, outputName + '.webp');

  const meta = await sharp(inputPath).metadata();

  let pipeline = sharp(inputPath).toColorspace('srgb');
  if (meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  pipeline = pipeline.modulate({ brightness: 1.03, saturation: 1.05 });
  let buf = await pipeline.removeAlpha().png().toBuffer();

  // 1. Blur (coords in scaled pre-crop space)
  if (blurRegions.length) buf = await applyBlur(buf, blurRegions);

  // 2. Auto-crop black borders
  const cropResult = await autoCrop(buf);
  buf = cropResult.buf;

  // 3. WebP
  const finalBuf  = await sharp(buf).webp({ quality: WEBP_QUALITY }).toBuffer();
  const finalMeta = await sharp(finalBuf).metadata();
  writeFileSync(outputPath, finalBuf);

  const tags = [
    blurRegions.length ? '[BLURRED]' : '',
    cropResult.cropped ? `[CROP ${cropResult.from}→${cropResult.to}]` : '',
  ].filter(Boolean).join('  ');

  console.log(`  ✅  ${outputName}.webp  (${finalMeta.width}×${finalMeta.height}, ${Math.round(finalBuf.length / 1024)} KB)  ${tags}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`\n  Processing ${FILES.length} screenshots → binance-ready/\n`);

  let ok = 0, err = 0;
  for (const [input, output, blur] of FILES) {
    try {
      await processFile(input, output, blur);
      ok++;
    } catch (e) {
      console.error(`  ✖  ${input}: ${e.message}`);
      err++;
    }
  }

  console.log(`\n  Done — ${ok} OK, ${err} errors`);
  console.log(`  Folder: ${OUT}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
