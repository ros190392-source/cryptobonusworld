#!/usr/bin/env node
/**
 * process-screenshot.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * CryptoBonusWorld — Screenshot Processing Pipeline v1
 *
 * Takes a raw screenshot from anywhere on disk and:
 *   1.  Detects exchange + category from filename (or CLI flags)
 *   2.  Optimizes the image (strips metadata, normalises color space)
 *   3.  Converts to WebP
 *   4.  Resizes to target width (1200px desktop / 390px mobile)
 *   5.  Composites a browser frame template (if available in assets/)
 *   6.  Generates annotation-layer metadata (architecture only — no auto-annotate)
 *   7.  Builds the standardized metadata JSON snippet
 *   8.  Outputs the standardized filename
 *   9.  Moves file to public/screenshots/{exchange}/{category}/
 *  10.  Validates / updates the evidence JSON registry entry
 *
 * Usage:
 *   node scripts/process-screenshot.mjs <source-file> [options]
 *
 * Options:
 *   --exchange  <slug>        Override detected exchange (e.g. binance)
 *   --category  <cat>         Override detected category (e.g. registration)
 *   --geo       <geo>         Geographic variant (default: global)
 *   --device    <device>      desktop | mobile (default: auto-detect from width)
 *   --date      <yyyy-mm>     Capture date (default: current month)
 *   --locale    <locale>      Locale code (default: en)
 *   --notes     <text>        Editorial notes to embed in metadata
 *   --no-frame                Skip browser frame compositing
 *   --dry-run                 Show what would happen; don't write any files
 *   --update-registry         Automatically patch evidence JSON (default: false)
 *   --verbose                 Extra diagnostic output
 *
 * Examples:
 *   node scripts/process-screenshot.mjs ~/Downloads/binance-reg.png
 *   node scripts/process-screenshot.mjs ~/raw.jpg --exchange okx --category kyc
 *   node scripts/process-screenshot.mjs ~/shot.png --dry-run --verbose
 *
 * Output:
 *   public/screenshots/{exchange}/{category}/{geo}-{device}-{yyyy-mm}.webp
 *   Prints JSON snippet ready to paste into src/data/evidence/{exchange}.json
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  'registration', 'kyc', 'bonus', 'deposit', 'p2p',
  'spot', 'futures', 'fees', 'mobile_app', 'proof_of_reserves',
]);

const VALID_EXCHANGES = new Set([
  'binance', 'okx', 'mexc', 'bitget', 'coinbase', 'bingx',
  'bybit', 'gate-io', 'kucoin', 'htx', 'coinex', 'phemex', 'bitunix', 'lbank',
]);

const VALID_GEOS     = new Set(['global', 'us', 'eu', 'asia', 'pl', 'tr', 'id', 'hi']);
const VALID_DEVICES  = new Set(['desktop', 'mobile']);
const VALID_LOCALES  = new Set(['en', 'ru', 'pl', 'tr', 'es', 'pt', 'id', 'hi']);

/** Target output width in pixels */
const TARGET_WIDTHS = { desktop: 1200, mobile: 390 };

/** WebP quality settings */
const WEBP_QUALITY = { desktop: 85, mobile: 82 };

/** Category → common filename keyword patterns for auto-detection */
const CATEGORY_PATTERNS = {
  registration: /\b(reg(ister|istration)?|signup|sign.?up|account.?creat)\b/i,
  kyc:          /\b(kyc|verify|verif(ication)?|id.?check|identity)\b/i,
  bonus:        /\b(bonus|reward|promo|welcome|offer|campaign)\b/i,
  deposit:      /\b(deposit|fund|wallet|asset|recharge)\b/i,
  p2p:          /\b(p2p|peer|otc|trade.?chat)\b/i,
  spot:         /\b(spot|trade|market|chart|orderbook)\b/i,
  futures:      /\b(futur|perp(etual)?|swap|leverage|margin)\b/i,
  fees:         /\b(fee|rate|schedule|pricing|cost|vip.?level)\b/i,
  mobile_app:   /\b(mobile|app|ios|android|iphone|phone)\b/i,
  proof_of_reserves: /\b(proof|reserve|por|merkle|audit)\b/i,
};

/** Exchange → common filename keyword patterns for auto-detection */
const EXCHANGE_PATTERNS = {
  binance:  /\bbinance\b/i,
  okx:      /\b(okx|okex)\b/i,
  mexc:     /\bmexc\b/i,
  bitget:   /\bbitget\b/i,
  coinbase: /\bcoinbase\b/i,
  bingx:    /\bbingx\b/i,
  bybit:    /\bbybit\b/i,
  'gate-io':/\b(gate\.?io|gateio)\b/i,
  kucoin:   /\bkucoin\b/i,
  htx:      /\b(htx|huobi)\b/i,
  coinex:   /\bcoinex\b/i,
  phemex:   /\bphemex\b/i,
  bitunix:  /\bbitunix\b/i,
  lbank:    /\blbank\b/i,
};

// ── CLI arg parsing ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function flag(name) {
  return args.includes(name);
}

function opt(name, fallback = null) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}

const SOURCE_FILE    = args.find(a => !a.startsWith('--'));
const OPT_EXCHANGE   = opt('--exchange');
const OPT_CATEGORY   = opt('--category');
const OPT_GEO        = opt('--geo', 'global');
const OPT_DEVICE     = opt('--device');
const OPT_DATE       = opt('--date');
const OPT_LOCALE     = opt('--locale', 'en');
const OPT_NOTES      = opt('--notes', '');
const NO_FRAME       = flag('--no-frame');
const DRY_RUN        = flag('--dry-run');
const UPDATE_REG     = flag('--update-registry');
const VERBOSE        = flag('--verbose');

// ── Logging ───────────────────────────────────────────────────────────────────

const log  = (...a) => console.log(' ', ...a);
const info = (...a) => VERBOSE && console.log('  ℹ', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);
const err  = (...a) => { console.error('  ✖', ...a); process.exit(1); };

// ── Step helpers ──────────────────────────────────────────────────────────────

/**
 * STEP 1 — Detect exchange and category from filename.
 * Returns { exchange, category } — either may be null if undetectable.
 */
function detectFromFilename(filename) {
  let exchange = null;
  let category = null;

  for (const [ex, re] of Object.entries(EXCHANGE_PATTERNS)) {
    if (re.test(filename)) { exchange = ex; break; }
  }

  for (const [cat, re] of Object.entries(CATEGORY_PATTERNS)) {
    if (re.test(filename)) { category = cat; break; }
  }

  return { exchange, category };
}

/**
 * STEP 7 — Build the canonical month string for the output filename.
 * Uses --date flag or current month.
 */
function resolveDate(optDate) {
  if (optDate) {
    if (/^\d{4}-\d{2}$/.test(optDate)) return optDate;
    warn(`--date "${optDate}" is not in YYYY-MM format; using current month.`);
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * STEP 8 — Build the standardized output filename (relative to category folder).
 * Format: {geo}-{device}-{yyyy-mm}.webp
 * Note: exchange + category are encoded in the folder structure, not the filename.
 */
function buildFilename(geo, device, date) {
  return `${geo}-${device}-${date}.webp`;
}

/**
 * STEP 9 — Resolve the destination directory and ensure it exists.
 */
function resolveDestDir(exchange, category) {
  return join(ROOT, 'public', 'screenshots', exchange, category);
}

/**
 * STEP 7 — Generate the metadata JSON snippet for the evidence registry.
 */
function buildMetadataSnippet(exchange, category, geo, device, date, locale, notes, outputPath) {
  const publicPath = `/screenshots/${exchange}/${category}/${geo}-${device}-${date}.webp`;
  return {
    status: 'available',
    path: publicPath,
    capturedAt: date,
    geo: geo.toUpperCase(),
    locale,
    device,
    verified: false,
    notes: notes || '',
  };
}

/**
 * STEP 10 — Read evidence JSON, update the screenshot entry, write back.
 * Only runs when --update-registry is passed.
 */
function updateEvidenceRegistry(exchange, category, snippet) {
  const evidencePath = join(ROOT, 'src', 'data', 'evidence', `${exchange}.json`);
  if (!existsSync(evidencePath)) {
    warn(`Evidence file not found: ${evidencePath}. Registry not updated.`);
    return false;
  }

  let ev;
  try {
    ev = JSON.parse(readFileSync(evidencePath, 'utf8'));
  } catch (e) {
    warn(`Failed to parse evidence JSON: ${e.message}. Registry not updated.`);
    return false;
  }

  if (!ev.screenshots) ev.screenshots = {};

  const prev = ev.screenshots[category];
  ev.screenshots[category] = {
    status: snippet.status,
    path: snippet.path,
    capturedAt: snippet.capturedAt,
    geo: snippet.geo,
    device: snippet.device,
    notes: snippet.notes || '',
  };

  if (prev?.status === 'available' && prev?.path !== snippet.path) {
    info(`Registry: replaced ${prev.path} → ${snippet.path}`);
  }

  if (!DRY_RUN) {
    writeFileSync(evidencePath, JSON.stringify(ev, null, 2) + '\n', 'utf8');
    log(`✅ Updated evidence registry: ${evidencePath}`);
  } else {
    log(`[dry-run] Would update evidence registry: ${evidencePath}`);
  }
  return true;
}

/**
 * Attempt to load sharp. Returns null if not available.
 * We do a dynamic import to get a helpful error instead of a crash.
 */
async function loadSharp() {
  try {
    const { default: sharp } = await import('sharp');
    return sharp;
  } catch {
    return null;
  }
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

async function main() {
  // ── Guard: source file required ──────────────────────────────────────────
  if (!SOURCE_FILE) {
    console.log(`
  Usage: node scripts/process-screenshot.mjs <source-file> [options]

  Options:
    --exchange  <slug>   Override detected exchange
    --category  <cat>    Override detected category
    --geo       <geo>    Geographic variant (default: global)
    --device    <device> desktop | mobile (default: auto)
    --date      <yyyy-mm> Capture date (default: current month)
    --locale    <locale> Locale code (default: en)
    --notes     <text>   Editorial notes
    --no-frame           Skip browser frame compositing
    --dry-run            Preview only, no files written
    --update-registry    Auto-patch evidence JSON
    --verbose            Extra output

  Example:
    node scripts/process-screenshot.mjs ~/Downloads/binance-registration.png
    `.trim());
    process.exit(0);
  }

  if (!existsSync(SOURCE_FILE)) {
    err(`Source file not found: ${SOURCE_FILE}`);
  }

  console.log('');
  log(`📸 CryptoBonusWorld Screenshot Pipeline v1`);
  log(`${'─'.repeat(56)}`);
  if (DRY_RUN) log(`[DRY RUN MODE — no files will be written]`);
  console.log('');

  // ── STEP 1: Detect exchange + category ───────────────────────────────────
  const filename = basename(SOURCE_FILE, extname(SOURCE_FILE));
  const detected = detectFromFilename(filename);

  const exchange = OPT_EXCHANGE ?? detected.exchange;
  const category = OPT_CATEGORY ?? detected.category;

  info(`Filename:   ${basename(SOURCE_FILE)}`);
  info(`Detected:   exchange=${detected.exchange ?? 'none'}, category=${detected.category ?? 'none'}`);
  info(`Resolved:   exchange=${exchange ?? 'UNKNOWN'}, category=${category ?? 'UNKNOWN'}`);

  if (!exchange || !VALID_EXCHANGES.has(exchange)) {
    err(`Cannot determine exchange from filename "${filename}". Use --exchange <slug>.`);
  }
  if (!category || !VALID_CATEGORIES.has(category)) {
    err(`Cannot determine category from filename "${filename}". Use --category <cat>.`);
  }

  log(`  Exchange:  ${exchange}`);
  log(`  Category:  ${category}`);

  // ── Resolve options ───────────────────────────────────────────────────────
  const geo    = VALID_GEOS.has(OPT_GEO.toLowerCase()) ? OPT_GEO.toLowerCase() : 'global';
  const date   = resolveDate(OPT_DATE);

  // ── STEP 2 + 3: Load sharp, probe image, determine device ────────────────
  const sharp = await loadSharp();
  if (!sharp) {
    err(`sharp is not available. Run: npm install sharp`);
  }

  log(`  Source:    ${SOURCE_FILE}`);

  const meta = await sharp(SOURCE_FILE).metadata();
  info(`Source size: ${meta.width}×${meta.height} px, format=${meta.format}`);

  const detectedDevice = (meta.width && meta.width < 600) ? 'mobile' : 'desktop';
  const device = OPT_DEVICE && VALID_DEVICES.has(OPT_DEVICE) ? OPT_DEVICE : detectedDevice;
  const locale = VALID_LOCALES.has(OPT_LOCALE) ? OPT_LOCALE : 'en';

  log(`  Device:    ${device}${OPT_DEVICE ? '' : ' (auto-detected)'}`);
  log(`  Geo:       ${geo}`);
  log(`  Date:      ${date}`);

  // ── STEP 4: Resize to target width ───────────────────────────────────────
  const targetWidth   = TARGET_WIDTHS[device];
  const webpQuality   = WEBP_QUALITY[device];
  const shouldResize  = meta.width && meta.width > targetWidth;

  info(`Resize:     ${meta.width}px → ${shouldResize ? targetWidth : meta.width}px (target: ${targetWidth}px)`);

  // ── STEP 5: Browser frame ─────────────────────────────────────────────────
  const framePath = join(ROOT, 'assets', 'browser-frame',
    device === 'mobile' ? 'frame-390-mobile.svg' : 'frame-1440-dark.svg');
  const frameExists = existsSync(framePath);

  if (!NO_FRAME && !frameExists) {
    info(`Browser frame template not found at ${framePath} — skipping frame compositing.`);
  }
  if (!NO_FRAME && frameExists) {
    info(`Browser frame: ${framePath}`);
  }

  // ── STEP 6: Annotation layer ──────────────────────────────────────────────
  const annotDir  = join(ROOT, 'assets', 'annotations');
  const annotFile = join(annotDir, `${exchange}-${category}-${date}.svg`);
  const annotExists = existsSync(annotFile);

  info(`Annotation layer: ${annotExists ? annotFile : 'none (not present)'}`);

  // ── STEP 8: Build output filename ────────────────────────────────────────
  const outFilename = buildFilename(geo, device, date);
  const destDir     = resolveDestDir(exchange, category);
  const destPath    = join(destDir, outFilename);
  const publicPath  = `/screenshots/${exchange}/${category}/${outFilename}`;

  log(`  Output:    ${destPath.replace(ROOT, '').replace(/\\/g, '/')}`);
  log('');

  // ── Build the sharp pipeline ──────────────────────────────────────────────
  let pipeline = sharp(SOURCE_FILE, { failOnError: false })
    // Normalize to sRGB, strip all metadata
    .toColorspace('srgb')
    .withMetadata({ icc: undefined });

  // Resize if needed
  if (shouldResize) {
    pipeline = pipeline.resize(targetWidth, null, {
      fit: 'inside',
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    });
  }

  // Composite browser frame if available and not suppressed
  if (!NO_FRAME && frameExists) {
    try {
      const frameBuffer = readFileSync(framePath);
      pipeline = pipeline.composite([{
        input: frameBuffer,
        gravity: 'north',
        blend: 'over',
      }]);
      info(`Composited browser frame.`);
    } catch (e) {
      warn(`Frame compositing failed: ${e.message}. Continuing without frame.`);
    }
  }

  // Composite annotation layer if present
  if (annotExists) {
    try {
      const annotBuffer = readFileSync(annotFile);
      pipeline = pipeline.composite([{
        input: annotBuffer,
        blend: 'over',
        gravity: 'northwest',
      }]);
      info(`Composited annotation layer: ${annotFile}`);
    } catch (e) {
      warn(`Annotation compositing failed: ${e.message}. Continuing without annotations.`);
    }
  }

  // Convert to WebP
  pipeline = pipeline.webp({
    quality: webpQuality,
    effort: 4,
    smartSubsample: true,
  });

  // ── STEP 9: Write file ────────────────────────────────────────────────────
  if (!DRY_RUN) {
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
      info(`Created directory: ${destDir}`);
    }

    const { data, info: sharpInfo } = await pipeline.toBuffer({ resolveWithObject: true });
    writeFileSync(destPath, data);

    const sizeMb = (data.length / 1024 / 1024).toFixed(2);
    log(`✅ Written: ${basename(destPath)} (${sharpInfo.width}×${sharpInfo.height}, ${sizeMb} MB)`);
  } else {
    // Dry-run: probe the output without writing
    const { info: sharpInfo } = await pipeline.toBuffer({ resolveWithObject: true });
    log(`[dry-run] Would write: ${basename(destPath)} (${sharpInfo.width}×${sharpInfo.height})`);
  }

  // ── STEP 7: Generate metadata snippet ────────────────────────────────────
  const snippet = buildMetadataSnippet(exchange, category, geo, device, date, locale, OPT_NOTES, publicPath);

  // ── STEP 10: Validate / update evidence registry ─────────────────────────
  let registryUpdated = false;
  if (UPDATE_REG) {
    registryUpdated = updateEvidenceRegistry(exchange, category, snippet);
  }

  // ── Output ────────────────────────────────────────────────────────────────
  console.log('');
  log(`${'─'.repeat(56)}`);
  log(`📋 Metadata snippet — paste into src/data/evidence/${exchange}.json`);
  log(`   under "screenshots" → "${category}":`);
  console.log('');
  console.log(JSON.stringify({ [category]: snippet }, null, 2)
    .split('\n').map(l => '   ' + l).join('\n'));
  console.log('');

  if (!registryUpdated) {
    log(`  To auto-update registry, rerun with --update-registry`);
  }

  log(`🔍 Validate with: npm run screenshots:check`);
  console.log('');
}

main().catch(e => {
  console.error('');
  console.error('  ✖ Pipeline error:', e.message);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
