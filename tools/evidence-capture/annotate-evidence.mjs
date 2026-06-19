/**
 * CBW Evidence Annotator
 *
 * Adds visual annotations (arrows, highlights, labels) to a RAW evidence
 * screenshot and saves the result as a PROCESSED annotated copy.
 *
 * Rules:
 *   - RAW file is NEVER modified
 *   - Output always goes to processed/<viewport>/<slug>-annotated.png
 *   - Annotation metadata is written to manifest.json under mobile.annotation
 *   - SITE file is created separately after approved_for_site = true
 *
 * Usage:
 *   node tools/evidence-capture/annotate-evidence.mjs <exchange> <locale> [options]
 *
 * Options:
 *   --viewport=mobile-390      which raw slot to annotate (default: mobile-390)
 *   --target=referral_code     annotation target preset (default: referral_code)
 *   --dry-run                  preview config without writing files
 *
 * Annotation presets (per exchange/locale/viewport):
 *   referral_code  — orange curved arrow pointing at referral code input field
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');
const CONFIG    = JSON.parse(fs.readFileSync(path.join(__dirname, 'exchanges.config.json'), 'utf8'));

// ── CLI ───────────────────────────────────────────────────────────────────────
const args         = process.argv.slice(2);
const exchange     = args[0];
const locale       = args[1];
const viewportArg  = args.find(a => a.startsWith('--viewport='))?.split('=')[1] ?? 'mobile-390';
const targetArg    = args.find(a => a.startsWith('--target='))?.split('=')[1] ?? 'referral_code';
const dryRun       = args.includes('--dry-run');

if (!exchange || !locale) {
  console.error('Usage: node annotate-evidence.mjs <exchange> <locale> [--viewport=mobile-390] [--target=referral_code]');
  process.exit(1);
}

const exchangeConf = CONFIG[exchange];
if (!exchangeConf) { console.error(`Exchange not found: ${exchange}`); process.exit(1); }
const localeConf   = exchangeConf.locales[locale];
if (!localeConf)   { console.error(`Locale not found: ${locale}`); process.exit(1); }

const EVIDENCE_BASE = path.join(ROOT, 'evidence', exchange, locale);

const log  = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);
const fail = (msg) => { console.log(`  ❌ ${msg}`); process.exit(1); };

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

// ── Annotation presets ────────────────────────────────────────────────────────
// Each preset defines an SVG overlay for a specific exchange/locale/viewport.
// Coordinates are relative to the CROPPED processed image (after browser chrome removed).
//
// Samsung Internet on Galaxy S21+ 1080×2400:
//   Crop: top=201 (toolbar end), bottom=2400-252=2148 (bottom nav start) → 1080×1947
//
// Field positions in 1080×1947 (estimated from captured screenshots):
//   CRYPTOBONUSW input:  y ≈ 950–1045,  x ≈ 60–1020
//   Field center:        x=540, y=1000
//   Arrow tip target:    x=400, y=990  (left-of-center of the green text)

// ── CBW Annotation Standard (v1) ─────────────────────────────────────────────
//
// All exchange referral-code screenshots use this visual language:
//
//   ELEMENT          VALUE
//   ─────────────────────────────────────────────────────
//   Color            #f7a600  (CBW brand gold — NOT red, red = error in UX)
//   Rectangle stroke 6px
//   Rectangle radius 10px  (rounded corners)
//   Rectangle fill   none (outline only — fill distracts from code text)
//   Arrow stroke     12px
//   Arrow direction  ↙ diagonal — starts OUTSIDE rect (upper-right),
//                    tip lands on the referral code TEXT itself
//                    Pro rule: arrow starts outside = "look here" entry vector
//   Arrow head       55px back, ±26px wings (inline polygon, no SVG markers)
//
// Field coordinates are calibrated per exchange / locale / viewport / device.
// Samsung Internet on Galaxy S21+ (1080×2400), crop top=201 bottom=252:
//   Cropped output = 1080×1947
//   Referral Code label + input field → rect x=30 y=1110 w=1020 h=205 (bottom=1315)
//   Arrow: from (930,920) → tip (1040,1113) at rect top-right corner
//     dx=110, dy=193, len≈222; unit=(0.495,0.869); perp=(-0.869,0.495)
//     base 30px back = (1025,1087); wings ±13px → left=(1014,1093), right=(1036,1081)
//
// ── Arrow builder (shared across presets) ────────────────────────────────────
// Arrow body stops at arrowhead base — no line stub through the tip.
function arrowSVG(sx, sy, tx, ty, { stroke = 11, back = 52, wing = 24, color = '#f7a600' } = {}) {
  const dx = tx - sx, dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const bx = tx - ux * back, by = ty - uy * back;
  const lx = (bx + px * wing).toFixed(1), ly = (by + py * wing).toFixed(1);
  const rx2 = (bx - px * wing).toFixed(1), ry2 = (by - py * wing).toFixed(1);
  return `
  <line x1="${sx}" y1="${sy}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}"
        stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"/>
  <polygon points="${lx},${ly} ${rx2},${ry2} ${tx},${ty}" fill="${color}"/>`;
}

// ── CBW standard annotation preset (Style C — short diagonal) ────────────────
// Device: Samsung Galaxy S21+ (1080×2400), Samsung Internet browser
// Crop:   top=201px (toolbar), bottom=252px (nav) → 1080×1947
//
// Rect:   x=30 y=1110 w=1020 h=205 rx=10  ← full Referral Code label + input
// Arrow:  from (480,1050) ↙ tip=(280,1215)  ← short ~230px diagonal,
//         starts just above rect (above Email field end), hits CRYPTOBONUSW text
//         stroke=13, back=56, wing=28, color=#f7a600
//         ~21% of image width — professional help-doc standard range (20-30%)
const PRESETS = {
  bybit: {
    'global-en': {
      'mobile-390': {
        referral_code: {
          label: 'Referral code auto-filled',
          color: '#f7a600',
          svgOverlay: (w, h) => `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <!-- Gold rectangle: Referral Code label + input field (CBW standard v1) -->
  <rect x="30" y="1110" width="1020" height="205"
        fill="none" stroke="#f7a600" stroke-width="7" rx="10"/>
  <!-- Short diagonal arrow: starts above rect, tip at CRYPTOBONUSW text (~230px) -->
  ${arrowSVG(480, 1050, 280, 1215, { stroke: 13, back: 56, wing: 28, color: '#f7a600' })}
</svg>`,
        },
      },
    },
  },
};

// ── Load manifest ─────────────────────────────────────────────────────────────
function loadManifest() {
  const f = path.join(EVIDENCE_BASE, 'manifest.json');
  if (!fs.existsSync(f)) fail(`manifest.json not found at ${f}`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function saveManifest(m) {
  const f = path.join(EVIDENCE_BASE, 'manifest.json');
  fs.writeFileSync(f, JSON.stringify(m, null, 2), 'utf8');
  log(`Manifest updated: ${path.relative(ROOT, f)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\nCBW Evidence Annotator`);
console.log(`Exchange:  ${exchange} / ${locale}`);
console.log(`Viewport:  ${viewportArg}  Target: ${targetArg}`);
console.log();

// 1. Locate raw file
const manifest = loadManifest();
const slot      = viewportArg.startsWith('desktop') ? 'desktop' : 'mobile';
const rawRel    = manifest[slot]?.raw;
if (!rawRel) fail(`No raw file recorded in manifest for slot "${slot}". Run capture first.`);
const rawAbsolute = path.join(ROOT, rawRel.replace(/\\/g, '/'));
if (!fs.existsSync(rawAbsolute)) fail(`Raw file not found: ${rawAbsolute}`);

const rawSize = fs.statSync(rawAbsolute).size;
info(`Raw file: ${rawRel} (${Math.round(rawSize / 1024)} KB)`);

// 2. Find annotation preset
const preset = PRESETS[exchange]?.[locale]?.[viewportArg]?.[targetArg];
if (!preset) {
  fail(`No preset for ${exchange}/${locale}/${viewportArg}/${targetArg}. Add it to PRESETS in this script.`);
}
info(`Preset: "${preset.label}" (${preset.color})`);

// 3. Determine crop parameters (browser chrome removal)
// Samsung Internet on S21+: top=201, bottom nav=252px
// Other configs can be added here as needed.
const cropTop = 201;
const cropBottomPad = 252;

if (dryRun) {
  info('--dry-run: config OK, no files written.');
  console.log({ rawAbsolute, preset: { label: preset.label, color: preset.color }, cropTop, cropBottomPad });
  process.exit(0);
}

// 4. Read raw image metadata
const meta = await sharp(rawAbsolute).metadata();
info(`Raw dimensions: ${meta.width}×${meta.height}`);

const cropH = meta.height - cropBottomPad - cropTop;
info(`Cropped content area: ${meta.width}×${cropH} (removed top=${cropTop}px, bottom=${cropBottomPad}px)`);

// 5. Build SVG overlay
const svgStr = preset.svgOverlay(meta.width, cropH);
const svgBuf = Buffer.from(svgStr);

// 6. Write annotated output (never overwrites raw)
const processedDir  = path.join(EVIDENCE_BASE, 'processed', viewportArg);
const annotatedSlug = `01-signup-page-annotated.png`;
const annotatedFile = path.join(processedDir, annotatedSlug);
ensureDir(processedDir);

await sharp(rawAbsolute)
  .extract({ left: 0, top: cropTop, width: meta.width, height: cropH })
  .composite([{ input: svgBuf, top: 0, left: 0 }])
  .png()
  .toFile(annotatedFile);

const outSize = fs.statSync(annotatedFile).size;
log(`Annotated: ${path.relative(ROOT, annotatedFile)} (${Math.round(outSize / 1024)} KB, ${meta.width}×${cropH})`);

// 7. Also write clean crop (no annotation) alongside, for reference
const cleanFile = path.join(processedDir, '01-signup-page.png');
await sharp(rawAbsolute)
  .extract({ left: 0, top: cropTop, width: meta.width, height: cropH })
  .png()
  .toFile(cleanFile);
log(`Clean crop:  ${path.relative(ROOT, cleanFile)} (${Math.round(fs.statSync(cleanFile).size / 1024)} KB)`);

// 8. Update manifest
manifest[slot].processed = path.relative(ROOT, cleanFile).replace(/\//g, '\\');
manifest[slot].annotated  = path.relative(ROOT, annotatedFile).replace(/\//g, '\\');
manifest[slot].annotation = {
  type:             'arrow',
  target:           targetArg,
  color:            preset.color,
  label:            preset.label,
  generated_from:   rawRel,
  generated_at:     new Date().toISOString(),
  viewport:         viewportArg,
  crop_top_px:      cropTop,
  crop_bottom_px:   cropBottomPad,
  output_dimensions: `${meta.width}×${cropH}`,
};
saveManifest(manifest);

console.log(`
══ DONE ══════════════════════════════════════════════════════
  Raw (untouched):  ${rawRel}
  Clean crop:       ${path.relative(ROOT, cleanFile)}
  Annotated:        ${path.relative(ROOT, annotatedFile)}

  Next step: review annotated screenshot, then set approved_for_site = true
  in manifest.json to unlock site copy creation.
  Site output path: public/media/exchanges/${exchange}/evidence/${locale}/${exchange}-signup-code-applied-mobile.png
`);
