#!/usr/bin/env node
/**
 * process-screenshot.mjs — CryptoBonusWorld Screenshot Processing Pipeline v2
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Converts any raw screenshot into a premium editorial-grade WebP with:
 *   · Auto-detect exchange + category from filename
 *   · Auto-crop uniform borders (removes browser chrome)
 *   · Resize to target width (1200px desktop / 390px mobile)
 *   · Dynamic browser frame compositing (SVG generated in-script, no dep)
 *   · Optional step badge overlay (--step N)
 *   · Blur regions from JSON config (--blur-config)
 *   · Screenshot color treatment (--style natural|enhanced|flat)
 *   · WebP export at optimised quality
 *   · Metadata JSON snippet generation
 *   · Evidence registry auto-update (--update-registry)
 *   · AI prep file generation (--ai-prep)
 *
 * Usage:
 *   node scripts/process-screenshot.mjs <source> [options]
 *
 *   --exchange  <slug>         Override detected exchange
 *   --category  <cat>          Override detected category
 *   --geo       <geo>          GLOBAL|US|EU|ASIA (default: global)
 *   --device    <device>       desktop|mobile (default: auto from width)
 *   --date      <yyyy-mm>      Capture month (default: current)
 *   --locale    <locale>       en|ru|pl etc (default: en)
 *   --notes     <text>         Registry notes
 *   --step      <n>            Add step badge 1-9 to corner
 *   --blur-config <file.json>  JSON file with blur rect array: [[x,y,w,h,reason],...]
 *   --style     <name>         natural (default) | enhanced | flat
 *   --no-frame                 Skip browser frame
 *   --no-crop                  Skip auto-crop
 *   --update-registry          Patch evidence JSON automatically
 *   --ai-prep                  Generate assets/annotations/{ex}-{cat}-{date}.ai-prep.json
 *   --out       <path>         Override output path
 *   --dry-run                  Preview pipeline without writing
 *   --verbose                  Extra diagnostic output
 *
 * Style guide: docs/screenshot-style-guide.md
 * Annotation:  scripts/annotate-screenshot.mjs
 */

import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV = process.argv.slice(2);
const flag = (n)       => ARGV.includes(n);
const opt  = (n, fb)   => { const i = ARGV.indexOf(n); return i !== -1 && i+1 < ARGV.length ? ARGV[i+1] : (fb ?? null); };

const SOURCE     = ARGV.find(a => !a.startsWith('--'));
const OPT_EX     = opt('--exchange');
const OPT_CAT    = opt('--category');
const OPT_GEO    = (opt('--geo') ?? 'global').toLowerCase();
const OPT_DEVICE = opt('--device');
const OPT_DATE   = opt('--date');
const OPT_LOCALE = opt('--locale', 'en');
const OPT_NOTES  = opt('--notes', '');
const OPT_STEP   = opt('--step') ? parseInt(opt('--step'), 10) : null;
const OPT_BLUR   = opt('--blur-config');
const OPT_STYLE  = opt('--style', 'natural');
const OPT_OUT    = opt('--out');
const NO_FRAME   = flag('--no-frame');
const NO_CROP    = flag('--no-crop');
const UPDATE_REG = flag('--update-registry');
const AI_PREP    = flag('--ai-prep');
const DRY_RUN    = flag('--dry-run');
const VERBOSE    = flag('--verbose');

// ── Logging ───────────────────────────────────────────────────────────────────

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);
const die  = (...a) => { console.error('\n  ✖', ...a, '\n'); process.exit(1); };

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_EXCHANGES = new Set([
  'binance','okx','mexc','bitget','coinbase','bingx',
  'bybit','gate-io','kucoin','htx','coinex','phemex','bitunix','lbank',
]);
const VALID_CATEGORIES = new Set([
  'registration','kyc','bonus','deposit','p2p',
  'spot','futures','fees','mobile_app','proof_of_reserves',
]);

const TARGET_WIDTHS  = { desktop: 1200, mobile: 390 };
const WEBP_QUALITY   = { desktop: 85,   mobile: 82  };
const FRAME_HEIGHT   = { desktop: 40,   mobile: 48  };

// Exchange → canonical display URL (for browser frame)
const EXCHANGE_URLS = {
  binance:'www.binance.com', okx:'www.okx.com', mexc:'www.mexc.com',
  bitget:'www.bitget.com', coinbase:'www.coinbase.com', bingx:'bingx.com',
  bybit:'www.bybit.com', 'gate-io':'www.gate.io', kucoin:'www.kucoin.com',
  htx:'www.htx.com', coinex:'www.coinex.com', phemex:'phemex.com',
  bitunix:'www.bitunix.com', lbank:'www.lbank.com',
};

const CATEGORY_PATH_HINTS = {
  registration:'/register', kyc:'/verify', bonus:'/activity',
  deposit:'/assets/deposit', p2p:'/p2p', spot:'/trade/BTC-USDT',
  futures:'/futures/BTCUSDT', fees:'/fee', mobile_app:'App Store',
  proof_of_reserves:'/proof-of-reserves',
};

// ── Filename-based detection ──────────────────────────────────────────────────

const EX_PATTERNS = {
  binance: /\bbinance\b/i, okx: /\b(okx|okex)\b/i, mexc: /\bmexc\b/i,
  bitget: /\bbitget\b/i, coinbase: /\bcoinbase\b/i, bingx: /\bbingx\b/i,
  bybit: /\bbybit\b/i, 'gate-io': /\b(gate\.?io|gateio)\b/i,
  kucoin: /\bkucoin\b/i, htx: /\b(htx|huobi)\b/i, coinex: /\bcoinex\b/i,
  phemex: /\bphemex\b/i, bitunix: /\bbitunix\b/i, lbank: /\blbank\b/i,
};

const CAT_PATTERNS = {
  registration:      /\b(reg|signup|sign.?up|account.?creat|register)\b/i,
  kyc:               /\b(kyc|verif|identity|id.?check)\b/i,
  bonus:             /\b(bonus|reward|promo|welcome|offer|campaign)\b/i,
  deposit:           /\b(deposit|fund|wallet|asset|recharge)\b/i,
  p2p:               /\b(p2p|peer|otc)\b/i,
  spot:              /\b(spot|trade|market|chart)\b/i,
  futures:           /\b(futur|perp|swap|leverage|margin)\b/i,
  fees:              /\b(fee|rate|schedule|pricing|vip)\b/i,
  mobile_app:        /\b(mobile|app|ios|android|iphone)\b/i,
  proof_of_reserves: /\b(proof|reserve|por|merkle)\b/i,
};

function detectFromFilename(filename) {
  let exchange = null, category = null;
  for (const [ex, re] of Object.entries(EX_PATTERNS))
    if (re.test(filename)) { exchange = ex; break; }
  for (const [cat, re] of Object.entries(CAT_PATTERNS))
    if (re.test(filename)) { category = cat; break; }
  return { exchange, category };
}

// ── Date helper ───────────────────────────────────────────────────────────────

function resolveDate() {
  if (OPT_DATE && /^\d{4}-\d{2}$/.test(OPT_DATE)) return OPT_DATE;
  if (OPT_DATE) warn(`--date "${OPT_DATE}" is not YYYY-MM, using current month`);
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

// ── Browser frame generation (no external file) ───────────────────────────────

/**
 * Generate a dark desktop browser chrome SVG string.
 * Composited at gravity:north — overlays the top 40px of the screenshot.
 * Shows a realistic URL bar with exchange domain + category path hint.
 */
function generateDesktopFrame(exchange, category, width) {
  const domain    = EXCHANGE_URLS[exchange] ?? `${exchange}.com`;
  const pathHint  = CATEGORY_PATH_HINTS[category] ?? '/';
  const displayUrl = pathHint === 'App Store'
    ? `apps.apple.com — ${exchange}`
    : `${domain}${pathHint}`;

  const barW = Math.min(460, Math.round(width * 0.38));
  const barX = Math.round(width / 2 - barW / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40">
  <!-- Chrome bar background -->
  <rect width="${width}" height="40" fill="#16162A"/>
  <!-- Bottom separator -->
  <line x1="0" y1="39.5" x2="${width}" y2="39.5" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <!-- Traffic lights — muted (no color) -->
  <circle cx="20" cy="20" r="6" fill="#2D2D42"/>
  <circle cx="36" cy="20" r="6" fill="#2D2D42"/>
  <circle cx="52" cy="20" r="6" fill="#2D2D42"/>

  <!-- URL bar -->
  <rect x="${barX}" y="9" width="${barW}" height="22" rx="5" fill="#1E1E30"/>

  <!-- Lock icon (simplified) -->
  <rect x="${barX + 10}" y="15" width="7" height="8" rx="1.5" fill="none" stroke="#6B7280" stroke-width="1.5"/>
  <path d="M ${barX + 11} 15 L ${barX + 11} 13 Q ${barX + 13.5} 10 ${barX + 16} 13 L ${barX + 16} 15"
    fill="none" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round"/>

  <!-- URL text -->
  <text x="${barX + barW / 2 + 4}" y="24"
    font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    font-size="12" fill="#9CA3AF" text-anchor="middle">${displayUrl}</text>
</svg>`;
}

/**
 * Load the static mobile frame SVG from assets/.
 */
function loadMobileFrame() {
  const framePath = join(ROOT, 'assets', 'browser-frame', 'frame-390-mobile.svg');
  if (!existsSync(framePath)) {
    warn('Mobile frame SVG not found at assets/browser-frame/frame-390-mobile.svg — skipping frame');
    return null;
  }
  return readFileSync(framePath);
}

// ── Step badge generation ─────────────────────────────────────────────────────

/**
 * Generate a numbered step badge SVG, composited at top-left corner.
 * Used with --step N. Renders as a #6C63FF circle with white number.
 */
function generateStepBadge(n, imageWidth, imageHeight) {
  const cx = 32, cy = imageHeight - 32;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}">
  <defs>
    <filter id="bs" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(108,99,255,0.45)"/>
    </filter>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="18" fill="#6C63FF" fill-opacity="0.92" filter="url(#bs)"/>
  <text x="${cx}" y="${cy + 5}"
    font-family="Inter, -apple-system, sans-serif"
    font-size="15" font-weight="700" fill="#FFFFFF" text-anchor="middle">${n}</text>
</svg>`);
}

// ── Blur region helpers ───────────────────────────────────────────────────────

/**
 * Load blur config from a JSON file.
 * Expected format: array of [x, y, w, h] or {rect:[x,y,w,h]} objects.
 */
function loadBlurConfig(filePath) {
  if (!existsSync(filePath)) {
    warn(`Blur config not found: ${filePath}`);
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.regions)) return data.regions;
    warn('Blur config format unrecognised — expected array');
    return [];
  } catch (e) {
    warn(`Failed to parse blur config: ${e.message}`);
    return [];
  }
}

/**
 * Apply blur to a list of image regions using sharp extract+blur+composite.
 * Each region: [x, y, width, height] or {rect:[x,y,w,h]}.
 * Returns an array of sharp composite objects to be spread into the pipeline.
 */
async function buildBlurComposites(sharp, inputBuffer, regions, imageWidth, imageHeight) {
  const composites = [];
  for (const r of regions) {
    const [x, y, w, h] = Array.isArray(r) ? r : r.rect ?? [];
    if (x == null || y == null || w == null || h == null) continue;

    // Clamp to image bounds
    const left   = Math.max(0, Math.round(x));
    const top    = Math.max(0, Math.round(y));
    const width  = Math.min(Math.round(w), imageWidth  - left);
    const height = Math.min(Math.round(h), imageHeight - top);

    if (width < 1 || height < 1) continue;

    try {
      const blurred = await sharp(inputBuffer)
        .extract({ left, top, width, height })
        .blur(12)
        .toBuffer();

      composites.push({ input: blurred, left, top });
      dbg(`Blur region: [${left},${top},${width},${height}]`);
    } catch (e) {
      warn(`Blur region [${left},${top},${width},${height}] failed: ${e.message}`);
    }
  }
  return composites;
}

// ── Color treatment ───────────────────────────────────────────────────────────

/**
 * Return sharp modulate/linear params based on --style.
 * natural  — subtle lift: +5% brightness, +8% saturation, very slight contrast
 * enhanced — noticeable pop: +10% brightness, +15% saturation, more contrast
 * flat     — no adjustment (raw output)
 */
function colorTreatment(sharp, style) {
  if (style === 'flat') return sharp;
  const opts = style === 'enhanced'
    ? { brightness: 1.08, saturation: 1.15 }
    : { brightness: 1.04, saturation: 1.06 };   // natural default
  return sharp.modulate(opts).linear(1.04, -(255 * 0.04 / 2)); // slight gamma lift
}

// ── Auto-crop ─────────────────────────────────────────────────────────────────

/**
 * Trim uniform-color borders from the edges.
 * Uses sharp's built-in trim() which removes bordering pixels matching the
 * corner color within a threshold. Stops browser chrome bleeding in.
 */
function applyCrop(sharpInst) {
  return sharpInst.trim({ background: { r: 255, g: 255, b: 255 }, threshold: 15 });
}

// ── Registry helpers ──────────────────────────────────────────────────────────

function updateEvidenceRegistry(exchange, category, snippet) {
  const evPath = join(ROOT, 'src', 'data', 'evidence', `${exchange}.json`);
  if (!existsSync(evPath)) {
    warn(`Evidence file not found: ${evPath}. Skipping registry update.`);
    return false;
  }
  let ev;
  try { ev = JSON.parse(readFileSync(evPath, 'utf8')); }
  catch (e) { warn(`Evidence JSON parse failed: ${e.message}`); return false; }

  if (!ev.screenshots) ev.screenshots = {};
  ev.screenshots[category] = {
    status:    snippet.status,
    path:      snippet.path,
    capturedAt:snippet.capturedAt,
    geo:       snippet.geo,
    device:    snippet.device,
    notes:     snippet.notes || '',
  };

  if (!DRY_RUN) {
    writeFileSync(evPath, JSON.stringify(ev, null, 2) + '\n', 'utf8');
    log(`✅ Registry updated: src/data/evidence/${exchange}.json`);
  } else {
    log(`[dry-run] Would update: src/data/evidence/${exchange}.json`);
  }
  return true;
}

// ── AI prep output ────────────────────────────────────────────────────────────

const EXPECTED_ELEMENTS = {
  registration:      ['email input','password input','submit button','terms checkbox','captcha'],
  kyc:               ['verification level','document upload','selfie upload','status badge'],
  bonus:             ['bonus amount','claim button','progress bar','terms link'],
  deposit:           ['deposit address','QR code','network selector','copy button'],
  p2p:               ['buy listings','sell listings','payment method filter'],
  spot:              ['chart','order book','buy/sell form','pair selector'],
  futures:           ['leverage selector','order form','liquidation price','funding rate'],
  fees:              ['fee table','maker fee','taker fee','VIP level tabs'],
  mobile_app:        ['app icon','screenshots','rating','download button'],
  proof_of_reserves: ['reserve ratio','asset breakdown','verification link'],
};

function writeAIPrepFile(exchange, category, date, screenshotPath, imageMeta) {
  const annotDir = join(ROOT, 'assets', 'annotations');
  if (!existsSync(annotDir)) mkdirSync(annotDir, { recursive: true });

  const prepPath = join(annotDir, `${exchange}-${category}-${date}.ai-prep.json`);
  const prep = {
    version: '1.0',
    exchange,
    category,
    screenshotPath,
    capturedAt: date,
    imageMeta: {
      width:       imageMeta.width,
      height:      imageMeta.height,
      format:      'webp',
      hasFrame:    !NO_FRAME,
      frameHeight: NO_FRAME ? 0 : FRAME_HEIGHT.desktop,
    },
    captureContext: {
      exchange,
      category,
      locale:    OPT_LOCALE,
      device:    imageMeta.device,
      expectedUIElements: EXPECTED_ELEMENTS[category] ?? [],
    },
    aiPromptTemplate: `You are an editorial screenshot annotator for a crypto exchange review site. The screenshot shows the ${category} page of ${exchange}. Identify the most important UI action a new user needs to perform. Suggest 1-3 annotations (arrow + callout, or focus ring) that guide the user's eye to that action. Expected UI elements: ${(EXPECTED_ELEMENTS[category] ?? []).join(', ')}. Follow these constraints: arrows use #6C63FF, 2.5px, rounded caps. Callouts use dark glass style. Max 3 annotations total. Return JSON matching assets/annotations/_schema.json.`,
    detectedRegions:       [],
    suggestedAnnotations:  [],
    generatedAt:           new Date().toISOString(),
    processedBy:           'process-screenshot.mjs v2',
  };

  if (!DRY_RUN) {
    writeFileSync(prepPath, JSON.stringify(prep, null, 2) + '\n', 'utf8');
    log(`🤖 AI prep written: assets/annotations/${exchange}-${category}-${date}.ai-prep.json`);
  } else {
    log(`[dry-run] Would write AI prep: ${exchange}-${category}-${date}.ai-prep.json`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SOURCE) {
    console.log(`
  CryptoBonusWorld Screenshot Pipeline v2

  Usage: node scripts/process-screenshot.mjs <source-file> [options]

    --exchange  <slug>          binance|okx|mexc|...
    --category  <cat>           registration|kyc|bonus|...
    --geo       <geo>           global (default)|us|eu|asia
    --device    <dev>           desktop (default)|mobile
    --date      <yyyy-mm>       2026-06 (defaults to current month)
    --step      <n>             Add step badge 1–9 to image
    --blur-config <file>        JSON with blur regions [[x,y,w,h],...]
    --style     <name>          natural (default)|enhanced|flat
    --no-frame                  Skip browser frame
    --no-crop                   Skip auto-crop
    --update-registry           Patch src/data/evidence/{exchange}.json
    --ai-prep                   Write annotation prep file
    --out       <path>          Override output path
    --dry-run                   Preview without writing
    --verbose                   Extra output

  Examples:
    node scripts/process-screenshot.mjs ~/Downloads/binance-reg.png
    node scripts/process-screenshot.mjs ~/raw.png --exchange okx --category kyc --update-registry
    node scripts/process-screenshot.mjs ~/raw.png --step 1 --ai-prep --dry-run
`);
    return;
  }

  if (!existsSync(SOURCE)) die(`Source file not found: ${SOURCE}`);

  console.log('');
  log('📸  CryptoBonusWorld Screenshot Pipeline v2');
  log('─'.repeat(58));
  if (DRY_RUN) log('[DRY RUN — no files written]');
  console.log('');

  // ── Step 1: Detect ──────────────────────────────────────────────────────
  const filename = basename(SOURCE, extname(SOURCE));
  const detected = detectFromFilename(filename);
  const exchange = OPT_EX  ?? detected.exchange;
  const category = OPT_CAT ?? detected.category;

  dbg(`Filename:  ${basename(SOURCE)}`);
  dbg(`Detected:  exchange=${detected.exchange ?? 'none'}, category=${detected.category ?? 'none'}`);

  if (!exchange || !VALID_EXCHANGES.has(exchange))
    die(`Cannot detect exchange from "${filename}". Use --exchange <slug>.`);
  if (!category || !VALID_CATEGORIES.has(category))
    die(`Cannot detect category from "${filename}". Use --category <cat>.`);

  const geo    = OPT_GEO;
  const date   = resolveDate();
  const locale = OPT_LOCALE;

  log(`  Exchange  ${exchange}`);
  log(`  Category  ${category}`);

  // ── Step 2: Load + probe ────────────────────────────────────────────────
  const { default: sharp } = await import('sharp').catch(() =>
    die('sharp not available. Run: npm install sharp'));

  const inputBuffer = readFileSync(SOURCE);
  const rawMeta     = await sharp(inputBuffer).metadata();

  dbg(`Source:    ${rawMeta.width}×${rawMeta.height}px, format=${rawMeta.format}`);

  const device = OPT_DEVICE === 'mobile' ? 'mobile'
               : OPT_DEVICE === 'desktop' ? 'desktop'
               : (rawMeta.width && rawMeta.width < 600) ? 'mobile' : 'desktop';

  const targetWidth = TARGET_WIDTHS[device];

  log(`  Device    ${device}${OPT_DEVICE ? '' : ' (auto)'}`);
  log(`  Geo       ${geo}`);
  log(`  Date      ${date}`);

  // ── Step 3: Build base pipeline ─────────────────────────────────────────
  let pipeline = sharp(inputBuffer, { failOnError: false })
    .toColorspace('srgb')
    .withMetadata({}); // strip all metadata

  // ── Step 3a: Auto-crop ──────────────────────────────────────────────────
  if (!NO_CROP) {
    pipeline = pipeline.trim({ background: { r: 255, g: 255, b: 255 }, threshold: 15 });
    dbg('Auto-crop: enabled');
  }

  // ── Step 4: Resize ──────────────────────────────────────────────────────
  pipeline = pipeline.resize(targetWidth, null, {
    fit: 'inside',
    withoutEnlargement: true,
    kernel: sharp.kernel.lanczos3,
  });

  // ── Step 5: Color treatment ─────────────────────────────────────────────
  pipeline = colorTreatment(pipeline, OPT_STYLE);
  dbg(`Style:     ${OPT_STYLE}`);

  // ── Get intermediate buffer for compositing dimensions ──────────────────
  let workingBuffer = await pipeline.toBuffer();
  let workingMeta   = await sharp(workingBuffer).metadata();
  const W = workingMeta.width;
  const H = workingMeta.height;

  dbg(`Working size: ${W}×${H}px`);

  // ── Step 6: Blur regions ────────────────────────────────────────────────
  const blurRegions = OPT_BLUR ? loadBlurConfig(OPT_BLUR) : [];
  let composites = [];

  if (blurRegions.length > 0) {
    dbg(`Blur regions: ${blurRegions.length}`);
    composites.push(...await buildBlurComposites(sharp, workingBuffer, blurRegions, W, H));
    if (composites.length > 0) {
      workingBuffer = await sharp(workingBuffer).composite(composites).toBuffer();
      composites = [];
    }
  }

  // ── Step 7: Browser frame ───────────────────────────────────────────────
  if (!NO_FRAME) {
    let frameSvg;
    if (device === 'mobile') {
      const mobileFrame = loadMobileFrame();
      if (mobileFrame) {
        composites.push({ input: mobileFrame, gravity: 'north', blend: 'over' });
        dbg('Frame:     mobile SVG composited');
      }
    } else {
      const frameSvgStr = generateDesktopFrame(exchange, category, W);
      composites.push({ input: Buffer.from(frameSvgStr), gravity: 'north', blend: 'over' });
      dbg('Frame:     desktop frame generated dynamically');
    }
  } else {
    dbg('Frame:     skipped (--no-frame)');
  }

  // ── Step 8: Step badge ──────────────────────────────────────────────────
  if (OPT_STEP !== null && OPT_STEP >= 1 && OPT_STEP <= 9) {
    composites.push({ input: generateStepBadge(OPT_STEP, W, H), blend: 'over' });
    dbg(`Step:      badge #${OPT_STEP} added`);
  }

  // ── Check for manual annotation SVG ────────────────────────────────────
  const annotPath = join(ROOT, 'assets', 'annotations', `${exchange}-${category}-${date}.svg`);
  if (existsSync(annotPath)) {
    composites.push({ input: readFileSync(annotPath), blend: 'over', gravity: 'northwest' });
    dbg(`Annotation: ${annotPath}`);
  }

  // ── Apply all composites ────────────────────────────────────────────────
  if (composites.length > 0) {
    workingBuffer = await sharp(workingBuffer).composite(composites).toBuffer();
  }

  // ── Step 9: WebP export ─────────────────────────────────────────────────
  const finalBuffer = await sharp(workingBuffer)
    .webp({ quality: WEBP_QUALITY[device], effort: 4, smartSubsample: true })
    .toBuffer();

  // ── Step 10: Write ──────────────────────────────────────────────────────
  const outFilename = `${geo}-${device}-${date}.webp`;
  const destDir     = OPT_OUT
    ? dirname(OPT_OUT)
    : join(ROOT, 'public', 'screenshots', exchange, category);
  const destPath    = OPT_OUT ?? join(destDir, outFilename);
  const publicPath  = `/screenshots/${exchange}/${category}/${outFilename}`;

  const finalMeta = await sharp(finalBuffer).metadata();
  const sizeMb    = (finalBuffer.length / 1024 / 1024).toFixed(2);

  log(`  Output    ${destPath.replace(ROOT, '').replace(/\\/g, '/')}`);
  log(`  Size      ${finalMeta.width}×${finalMeta.height}px  ${sizeMb} MB`);

  if (!DRY_RUN) {
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
    writeFileSync(destPath, finalBuffer);
    log(`\n✅  Written: ${basename(destPath)}`);
  } else {
    log(`\n[dry-run]  Would write: ${basename(destPath)}`);
  }

  // ── Step 11: Metadata JSON ──────────────────────────────────────────────
  const snippet = {
    status:    'available',
    path:      publicPath,
    capturedAt: date,
    geo:       geo.toUpperCase(),
    locale,
    device,
    verified:  false,
    notes:     OPT_NOTES || '',
  };

  // ── Step 12: Registry update ────────────────────────────────────────────
  if (UPDATE_REG) updateEvidenceRegistry(exchange, category, snippet);

  // ── Step 13: AI prep ────────────────────────────────────────────────────
  if (AI_PREP) writeAIPrepFile(exchange, category, date, publicPath, { ...finalMeta, device });

  // ── Output snippet ──────────────────────────────────────────────────────
  console.log('');
  log('─'.repeat(58));
  log(`📋  Paste into src/data/evidence/${exchange}.json → "screenshots" → "${category}":`);
  console.log('');
  console.log(JSON.stringify({ [category]: snippet }, null, 2)
    .split('\n').map(l => '   ' + l).join('\n'));
  console.log('');
  if (!UPDATE_REG) log('  Tip: rerun with --update-registry to patch automatically');
  log('🔍  Validate: npm run screenshots:check');
  if (!AI_PREP) log('🤖  AI prep:  rerun with --ai-prep to generate annotation stub');
  if (existsSync(join(ROOT, 'assets', 'annotations', `${exchange}-${category}-${date}.json`))) {
    log(`✏️   Annotate: node scripts/annotate-screenshot.mjs ${destPath}`);
  } else {
    log(`✏️   Annotate: create assets/annotations/${exchange}-${category}-${date}.json`);
    log(`    then run: node scripts/annotate-screenshot.mjs ${destPath}`);
  }
  console.log('');
}

main().catch(e => {
  console.error('\n  ✖ Pipeline error:', e.message);
  if (VERBOSE) console.error(e.stack);
  process.exit(1);
});
