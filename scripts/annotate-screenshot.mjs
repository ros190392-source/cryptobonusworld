#!/usr/bin/env node
/**
 * annotate-screenshot.mjs — CryptoBonusWorld Annotation Composer v1
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Applies editorial annotations to a processed screenshot. Reads annotation
 * config from assets/annotations/{exchange}-{category}-{date}.json and
 * composites the overlay using sharp + dynamic SVG generation.
 *
 * Supported annotation types (from _schema.json):
 *   arrow      — thin cubic bezier arrow with premium arrowhead
 *   callout    — glassmorphism dark callout bubble
 *   focus      — soft purple glow ring around a UI region
 *   step       — numbered step badge (#6C63FF circle)
 *   highlight  — subtle filled rectangle highlight
 *   blur       — native sharp blur (extract → blur → composite)
 *
 * Usage:
 *   node scripts/annotate-screenshot.mjs <screenshot-path> [options]
 *
 *   --config  <path>    Annotation JSON config (default: auto-detect from path)
 *   --out     <path>    Output path (default: overwrites input)
 *   --suffix  <str>     Append suffix before extension instead of overwrite
 *                       e.g. --suffix -annotated → binance-reg-annotated.webp
 *   --dry-run           Preview without writing
 *   --verbose           Extra diagnostic output
 *
 * Auto-config detection:
 *   Given /screenshots/binance/registration/global-desktop-2026-06.webp
 *   Looks for: assets/annotations/binance-registration-2026-06.json
 *
 * Examples:
 *   node scripts/annotate-screenshot.mjs public/screenshots/binance/registration/global-desktop-2026-06.webp
 *   node scripts/annotate-screenshot.mjs raw.webp --config my-config.json --suffix -v2
 *
 * Style guide: docs/screenshot-style-guide.md
 * Pipeline:    scripts/process-screenshot.mjs
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV    = process.argv.slice(2);
const flag    = (n)  => ARGV.includes(n);
const opt     = (n)  => { const i = ARGV.indexOf(n); return i !== -1 && i+1 < ARGV.length ? ARGV[i+1] : null; };

const SOURCE  = ARGV.find(a => !a.startsWith('--'));
const CFG_OVR = opt('--config');
const OUT_OVR = opt('--out');
const SUFFIX  = opt('--suffix');
const DRY_RUN = flag('--dry-run');
const VERBOSE = flag('--verbose');

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);
const die  = (...a) => { console.error('\n  ✖', ...a, '\n'); process.exit(1); };

// ── Design system constants ───────────────────────────────────────────────────

const DS = {
  accent:         '#6C63FF',
  accentRgb:      '108,99,255',
  arrowOpacity:   0.82,
  arrowStroke:    2.5,
  arrowheadLen:   10,
  arrowheadWidth: 6,
  calloutBg:      'rgba(0,0,0,0.72)',
  calloutFg:      '#FFFFFF',
  calloutRadius:  10,
  calloutPadX:    14,
  calloutPadY:    7,
  calloutFont:    'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  calloutFontSz:  13,
  focusFill:      'rgba(108,99,255,0.07)',
  focusStroke:    'rgba(108,99,255,0.62)',
  focusStrokeW:   1.5,
  focusGlowColor: 'rgba(108,99,255,0.18)',
  focusGlowPad:   4,
  stepFill:       '#6C63FF',
  stepFillOp:     0.92,
  stepRadius:     16,
  hlFill:         'rgba(108,99,255,0.07)',
  hlStroke:       'rgba(108,99,255,0.55)',
  hlStrokeW:      1.5,
};

// ── Config detection ──────────────────────────────────────────────────────────

/**
 * Given a screenshot path like:
 *   public/screenshots/binance/registration/global-desktop-2026-06.webp
 * Returns the annotation config path:
 *   assets/annotations/binance-registration-2026-06.json
 */
function detectConfigPath(screenshotPath) {
  const parts = screenshotPath.replace(/\\/g, '/').split('/');
  // Find the screenshots/{exchange}/{category}/{filename} pattern
  const ssIdx = parts.findIndex(p => p === 'screenshots');
  if (ssIdx !== -1 && parts.length > ssIdx + 3) {
    const exchange = parts[ssIdx + 1];
    const category = parts[ssIdx + 2];
    const filename = parts[ssIdx + 3];
    // Extract YYYY-MM from filename like global-desktop-2026-06.webp
    const dateMatch = filename.match(/(\d{4}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : null;
    if (date) {
      return join(ROOT, 'assets', 'annotations', `${exchange}-${category}-${date}.json`);
    }
  }
  return null;
}

function loadConfig(configPath) {
  if (!existsSync(configPath))
    die(`Annotation config not found: ${configPath}`);
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (e) {
    die(`Failed to parse annotation config: ${e.message}`);
  }
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function r(n, p = 1) {
  return Number(n.toFixed(p));
}

// ── Arrow generation ──────────────────────────────────────────────────────────

/**
 * Generate a curved arrow from [x1,y1] to [x2,y2].
 * Curve style: cubic bezier with natural S-bend.
 * Arrowhead: filled polygon at tip, rotated to tangent angle.
 */
function generateArrow(ann) {
  const [x1, y1] = ann.from;
  const [x2, y2] = ann.to;
  const style = ann.style ?? 'curved';

  let cp1x, cp1y, cp2x, cp2y;
  const dx = x2 - x1, dy = y2 - y1;

  if (style === 'straight') {
    // Slightly offset control points for a very gentle curve
    cp1x = x1 + dx * 0.33; cp1y = y1 + dy * 0.33;
    cp2x = x1 + dx * 0.67; cp2y = y1 + dy * 0.67;
  } else if (style === 'elbow') {
    // L-shape: horizontal then vertical
    cp1x = x2; cp1y = y1;
    cp2x = x2; cp2y = y1 + dy * 0.8;
  } else {
    // curved (default) — natural S-bend
    cp1x = x1 + dx * 0.25; cp1y = y1 + dy * 0.05;
    cp2x = x1 + dx * 0.75; cp2y = y1 + dy * 0.95;
  }

  // Arrowhead: angle = tangent at endpoint = direction from cp2 to endpoint
  const angle    = Math.atan2(y2 - cp2y, x2 - cp2x);
  const aLen     = DS.arrowheadLen;
  const aWidth   = DS.arrowheadWidth;
  const sinA     = Math.sin(angle), cosA = Math.cos(angle);

  const px1 = r(x2 - aLen * cosA + aWidth * sinA);
  const py1 = r(y2 - aLen * sinA - aWidth * cosA);
  const px2 = r(x2 - aLen * cosA - aWidth * sinA);
  const py2 = r(y2 - aLen * sinA + aWidth * cosA);

  const color   = ann.color ?? DS.accent;
  const opacity = ann.opacity ?? DS.arrowOpacity;
  const sw      = ann.strokeWidth ?? DS.arrowStroke;

  return `
  <!-- Arrow -->
  <path d="M ${r(x1)} ${r(y1)} C ${r(cp1x)} ${r(cp1y)} ${r(cp2x)} ${r(cp2y)} ${r(x2)} ${r(y2)}"
    fill="none"
    stroke="${esc(color)}" stroke-width="${sw}" stroke-opacity="${opacity}"
    stroke-linecap="round" stroke-linejoin="round"
    filter="url(#arrowShadow)"/>
  <polygon points="${r(x2)},${r(y2)} ${px1},${py1} ${px2},${py2}"
    fill="${esc(color)}" fill-opacity="${opacity + 0.05}"/>`;
}

// ── Callout generation ────────────────────────────────────────────────────────

/**
 * Generate a glassmorphism callout bubble.
 * anchor: [cx, cy] — where the callout tip points toward
 * side: 'above'|'below'|'left'|'right' — which side of anchor the box is on
 */
function generateCallout(ann) {
  const text   = esc(ann.text ?? '');
  const [ax, ay] = ann.anchor;
  const side   = ann.side ?? 'above';
  const style  = ann.style ?? 'glass';

  // Estimate box dimensions
  const charWidth  = 7.2; // Inter 13px approx
  const maxWidth   = 240;
  const minWidth   = 80;
  const boxW = Math.min(maxWidth, Math.max(minWidth, text.length * charWidth + DS.calloutPadX * 2));
  const boxH = 34;
  const tipGap = 14;

  let bx, by;
  switch (side) {
    case 'below': bx = ax - boxW / 2; by = ay + tipGap; break;
    case 'left':  bx = ax - boxW - tipGap; by = ay - boxH / 2; break;
    case 'right': bx = ax + tipGap; by = ay - boxH / 2; break;
    default:      bx = ax - boxW / 2; by = ay - boxH - tipGap; break; // above
  }
  bx = r(bx); by = r(by);

  const fill   = style === 'solid' ? '#1E1E30' : DS.calloutBg;
  const cx     = r(bx + boxW / 2);
  const cy     = r(by + boxH / 2 + 4.5);

  let connectorLine = '';
  if (ann.arrowLine) {
    // Thin connector line from callout center-bottom to anchor
    const lcx = r(bx + boxW / 2);
    const lcy = r(side === 'above' ? by + boxH : by);
    connectorLine = `<line x1="${lcx}" y1="${lcy}" x2="${r(ax)}" y2="${r(ay)}"
      stroke="${DS.accent}" stroke-width="1.5" stroke-opacity="0.5" stroke-dasharray="4,3"/>`;
  }

  return `
  <!-- Callout -->
  ${connectorLine}
  <rect x="${bx}" y="${by}" width="${r(boxW)}" height="${boxH}" rx="${DS.calloutRadius}"
    fill="${fill}" filter="url(#calloutShadow)"/>
  <text x="${cx}" y="${cy}"
    font-family="${DS.calloutFont}" font-size="${DS.calloutFontSz}" font-weight="500"
    fill="${DS.calloutFg}" text-anchor="middle">${text}</text>`;
}

// ── Focus ring generation ─────────────────────────────────────────────────────

/**
 * Soft focus glow ring around a rectangular region.
 * rect: [x, y, w, h]
 */
function generateFocusRing(ann) {
  const [x, y, w, h] = ann.rect;
  const radius    = ann.radius ?? 6;
  const intensity = ann.intensity ?? 'normal';

  const glowPad  = intensity === 'subtle' ? 3 : intensity === 'strong' ? 6 : DS.focusGlowPad;
  const glowOp   = intensity === 'subtle' ? 0.12 : intensity === 'strong' ? 0.28 : 0.18;
  const strokeOp = intensity === 'subtle' ? 0.45 : intensity === 'strong' ? 0.80 : 0.62;

  return `
  <!-- Focus glow (outer halo) -->
  <rect x="${r(x - glowPad)}" y="${r(y - glowPad)}"
    width="${r(w + glowPad * 2)}" height="${r(h + glowPad * 2)}"
    rx="${radius + glowPad}"
    fill="none" stroke="rgba(${DS.accentRgb},${glowOp})" stroke-width="${glowPad * 1.5}"/>
  <!-- Focus ring -->
  <rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${radius}"
    fill="rgba(${DS.accentRgb},0.07)"
    stroke="rgba(${DS.accentRgb},${strokeOp})" stroke-width="${DS.focusStrokeW}"/>`;
}

// ── Step badge generation ─────────────────────────────────────────────────────

/**
 * Numbered circular step badge. n: 1-9. x,y: center.
 */
function generateStepBadge(ann) {
  const { n, x, y } = ann;
  const rad  = DS.stepRadius;
  const label = ann.label ? esc(ann.label) : null;

  return `
  <!-- Step badge #${n} -->
  <circle cx="${r(x)}" cy="${r(y)}" r="${rad}"
    fill="${DS.stepFill}" fill-opacity="${DS.stepFillOp}"
    filter="url(#arrowShadow)"/>
  <text x="${r(x)}" y="${r(y + 5)}"
    font-family="${DS.calloutFont}" font-size="15" font-weight="700"
    fill="#FFFFFF" text-anchor="middle">${n}</text>
  ${label ? `<text x="${r(x)}" y="${r(y + rad + 14)}"
    font-family="${DS.calloutFont}" font-size="11" font-weight="500"
    fill="rgba(${DS.accentRgb},0.85)" text-anchor="middle">${label}</text>` : ''}`;
}

// ── Highlight generation ──────────────────────────────────────────────────────

function generateHighlight(ann) {
  const [x, y, w, h] = ann.rect;
  const radius = ann.radius ?? 4;
  const color  = ann.color ?? DS.accent;
  // Parse hex to rgba for fill
  return `
  <!-- Highlight -->
  <rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${radius}"
    fill="${DS.hlFill}"
    stroke="${DS.hlStroke}" stroke-width="${DS.hlStrokeW}"/>`;
}

// ── SVG overlay builder ───────────────────────────────────────────────────────

/**
 * Build the full SVG overlay string from the visual annotation list.
 * Blur annotations are handled separately via sharp.
 */
function buildSVGOverlay(visualAnnotations, width, height) {
  const elements = [];

  for (const ann of visualAnnotations) {
    switch (ann.type) {
      case 'arrow':     elements.push(generateArrow(ann));     break;
      case 'callout':   elements.push(generateCallout(ann));   break;
      case 'focus':     elements.push(generateFocusRing(ann)); break;
      case 'step':      elements.push(generateStepBadge(ann)); break;
      case 'highlight': elements.push(generateHighlight(ann)); break;
      default:
        warn(`Unknown annotation type "${ann.type}" — skipped`);
    }
  }

  if (elements.length === 0) return null;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <!-- Arrow drop shadow -->
    <filter id="arrowShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="2" stdDeviation="3.5" flood-color="rgba(${DS.accentRgb},0.32)"/>
    </filter>
    <!-- Callout drop shadow -->
    <filter id="calloutShadow" x="-20%" y="-30%" width="140%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.35)"/>
    </filter>
  </defs>
${elements.join('\n')}
</svg>`;
}

// ── Sharp blur regions ────────────────────────────────────────────────────────

async function applyBlurRegions(sharp, imageBuffer, blurAnnotations, W, H) {
  if (blurAnnotations.length === 0) return imageBuffer;

  const composites = [];
  for (const ann of blurAnnotations) {
    const [x, y, w, h] = ann.rect;
    const left   = Math.max(0, Math.round(x));
    const top    = Math.max(0, Math.round(y));
    const width  = Math.min(Math.round(w), W - left);
    const height = Math.min(Math.round(h), H - top);
    if (width < 1 || height < 1) continue;

    try {
      const blurred = await sharp(imageBuffer)
        .extract({ left, top, width, height })
        .blur(ann.radius ?? 12)
        .toBuffer();
      composites.push({ input: blurred, left, top });
      dbg(`Blur [${left},${top},${width},${height}] reason=${ann.reason ?? 'other'}`);
    } catch (e) {
      warn(`Blur region failed: ${e.message}`);
    }
  }

  if (composites.length === 0) return imageBuffer;
  return sharp(imageBuffer).composite(composites).toBuffer();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SOURCE) {
    console.log(`
  CryptoBonusWorld Annotation Composer v1

  Usage: node scripts/annotate-screenshot.mjs <screenshot> [options]

    --config  <path>    Annotation JSON (default: auto-detect from screenshot path)
    --out     <path>    Output path (default: overwrite input)
    --suffix  <str>     Add suffix instead of overwrite: --suffix -ann
    --dry-run           Preview without writing
    --verbose           Extra output

  Auto-config detection:
    public/screenshots/binance/registration/global-desktop-2026-06.webp
    → assets/annotations/binance-registration-2026-06.json

  Annotation config schema: assets/annotations/_schema.json
  Example config:           assets/annotations/example-binance-registration.json
`);
    return;
  }

  if (!existsSync(SOURCE)) die(`Screenshot not found: ${SOURCE}`);

  console.log('');
  log('✏️   CryptoBonusWorld Annotation Composer v1');
  log('─'.repeat(52));
  if (DRY_RUN) log('[DRY RUN — no files written]');
  console.log('');

  // ── Load config ────────────────────────────────────────────────────────
  const configPath = CFG_OVR ?? detectConfigPath(SOURCE);
  if (!configPath) die('Cannot auto-detect annotation config path. Use --config <file>.');

  log(`  Config    ${configPath.replace(ROOT, '').replace(/\\/g, '/')}`);

  const config = loadConfig(configPath);
  const { annotations = [], exchange, category } = config;

  const blurAnnotations   = annotations.filter(a => a.type === 'blur');
  const visualAnnotations = annotations.filter(a => a.type !== 'blur');

  dbg(`Annotations: ${annotations.length} total (${blurAnnotations.length} blur, ${visualAnnotations.length} visual)`);

  // ── Load sharp ─────────────────────────────────────────────────────────
  const { default: sharp } = await import('sharp').catch(() =>
    die('sharp not available. Run: npm install sharp'));

  // ── Load screenshot + probe ────────────────────────────────────────────
  let imageBuffer = readFileSync(SOURCE);
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width, H = meta.height;

  log(`  Screenshot ${W}×${H}px`);

  // ── Apply blur regions ─────────────────────────────────────────────────
  if (blurAnnotations.length > 0) {
    log(`  Blurring  ${blurAnnotations.length} region(s)`);
    imageBuffer = await applyBlurRegions(sharp, imageBuffer, blurAnnotations, W, H);
  }

  // ── Build SVG overlay ──────────────────────────────────────────────────
  const svgOverlay = buildSVGOverlay(visualAnnotations, W, H);

  if (svgOverlay) {
    dbg(`SVG overlay generated (${svgOverlay.length} chars)`);
    try {
      imageBuffer = await sharp(imageBuffer)
        .composite([{ input: Buffer.from(svgOverlay), blend: 'over', gravity: 'northwest' }])
        .toBuffer();
      log(`  Overlaid  ${visualAnnotations.length} visual annotation(s)`);
    } catch (e) {
      warn(`SVG compositing failed: ${e.message}. Saving without visual annotations.`);
    }
  } else {
    log('  Visual    no visual annotations in config');
  }

  // ── Re-export as WebP ──────────────────────────────────────────────────
  const finalBuffer = await sharp(imageBuffer)
    .webp({ quality: 88, effort: 4 })
    .toBuffer();

  // ── Determine output path ──────────────────────────────────────────────
  let outPath = OUT_OVR;
  if (!outPath) {
    if (SUFFIX) {
      const ext  = extname(SOURCE);
      const base = SOURCE.slice(0, SOURCE.length - ext.length);
      outPath    = `${base}${SUFFIX}${ext}`;
    } else {
      outPath = SOURCE; // overwrite
    }
  }

  const sizeMb = (finalBuffer.length / 1024 / 1024).toFixed(2);
  log(`  Output    ${outPath.replace(ROOT, '').replace(/\\/g, '/')}`);
  log(`  Size      ${W}×${H}px  ${sizeMb} MB`);

  if (!DRY_RUN) {
    const outDir = dirname(outPath);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, finalBuffer);
    log(`\n✅  Annotated: ${basename(outPath)}`);
  } else {
    log(`\n[dry-run]  Would write: ${basename(outPath)}`);
  }

  console.log('');
  log(`🔍  Validate: npm run screenshots:check`);
  console.log('');
}

main().catch(e => {
  console.error('\n  ✖ Annotation error:', e.message);
  if (VERBOSE) console.error(e.stack);
  process.exit(1);
});
