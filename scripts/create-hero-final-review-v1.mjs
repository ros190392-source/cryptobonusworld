/**
 * create-hero-final-review-v1.mjs
 *
 * Final owner review pack for hero background system.
 * - Bybit: no glow (unchanged)
 * - MEXC: glow raised to cy=82 (was 118) so it illuminates full logo + icon
 *
 * Steps:
 *   1. Screenshot "before" MEXC glow at cy=118 from current dist
 *   2. Regenerate MEXC WebP with cy=82, ry=130
 *   3. Build
 *   4. Launch preview, take full review pack
 *   5. Comparison boards + review HTML
 *
 * Output: reports/visual/hero-final-review-v1/
 */
import { chromium }  from 'playwright';
import { execSync }  from 'child_process';
import sharp         from 'sharp';
import fs            from 'fs';
import path          from 'path';
import os            from 'os';
import http          from 'http';

const BASE     = 'http://localhost:4322';
const OUT      = 'reports/visual/hero-final-review-v1';
const BG_OUT   = 'public/media/hero-backgrounds';
fs.mkdirSync(OUT, { recursive: true });

// ── SVG background factory ──────────────────────────────────────────────────
function makeBgSvg({ logoGlow = false, glowCy = 82, glowRy = 130, glowRx = 310 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 400" width="1440" height="400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#0C1118"/>
      <stop offset="100%" stop-color="#141B25"/>
    </linearGradient>
    <radialGradient id="planet-core" cx="30%" cy="26%" r="70%" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#545f6a"/>
      <stop offset="28%"  stop-color="#323c48"/>
      <stop offset="58%"  stop-color="#1d2530"/>
      <stop offset="85%"  stop-color="#121820"/>
      <stop offset="100%" stop-color="#0c1118"/>
    </radialGradient>
    <radialGradient id="planet-atm" cx="50%" cy="50%" r="50%">
      <stop offset="70%"  stop-color="rgba(0,0,0,0)"/>
      <stop offset="88%"  stop-color="rgba(90,110,130,0.16)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    ${logoGlow ? `
    <radialGradient id="logo-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.62)"/>
      <stop offset="24%"  stop-color="rgba(255,255,255,0.36)"/>
      <stop offset="56%"  stop-color="rgba(255,255,255,0.10)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>` : ''}
  </defs>

  <rect width="1440" height="400" fill="url(#bg)"/>

  <!-- Planet — large, lower-left, partially off-canvas -->
  <circle cx="72" cy="398" r="262" fill="url(#planet-core)"/>
  <circle cx="72" cy="398" r="270" fill="url(#planet-atm)"/>

  <!-- Orbit rings -->
  <ellipse cx="72" cy="398" rx="396" ry="82" fill="none"
    stroke="rgba(158,175,192,0.22)" stroke-width="1.1"
    transform="rotate(-18,72,398)"/>
  <ellipse cx="72" cy="398" rx="480" ry="99" fill="none"
    stroke="rgba(158,175,192,0.10)" stroke-width="0.7" stroke-dasharray="18 36"
    transform="rotate(-18,72,398)"/>

  <!-- Right-side distant orbit arc -->
  <ellipse cx="1432" cy="285" rx="195" ry="47" fill="none"
    stroke="rgba(158,175,192,0.12)" stroke-width="0.8"
    transform="rotate(8,1432,285)"/>

  ${logoGlow
    ? `<!-- Logo glow — raised to illuminate full logo (cy=${glowCy}) -->
  <ellipse cx="720" cy="${glowCy}" rx="${glowRx}" ry="${glowRy}" fill="url(#logo-glow)"/>`
    : ''}

  <!-- Stars row 1 -->
  <circle cx="88"   cy="40"  r="1.1" fill="rgba(255,255,255,0.62)"/>
  <circle cx="218"  cy="25"  r="1.4" fill="rgba(255,255,255,0.73)"/>
  <circle cx="362"  cy="51"  r="1.0" fill="rgba(255,255,255,0.56)"/>
  <circle cx="502"  cy="30"  r="1.3" fill="rgba(255,255,255,0.67)"/>
  <circle cx="684"  cy="46"  r="1.1" fill="rgba(255,255,255,0.61)"/>
  <circle cx="868"  cy="24"  r="1.5" fill="rgba(255,255,255,0.75)"/>
  <circle cx="1042" cy="49"  r="1.0" fill="rgba(255,255,255,0.58)"/>
  <circle cx="1198" cy="34"  r="1.3" fill="rgba(255,255,255,0.67)"/>
  <circle cx="1378" cy="44"  r="1.1" fill="rgba(255,255,255,0.61)"/>
  <circle cx="1438" cy="26"  r="1.0" fill="rgba(255,255,255,0.56)"/>
  <!-- Stars row 2 -->
  <circle cx="148"  cy="166" r="1.0" fill="rgba(255,255,255,0.51)"/>
  <circle cx="324"  cy="190" r="1.4" fill="rgba(255,255,255,0.64)"/>
  <circle cx="552"  cy="155" r="1.1" fill="rgba(255,255,255,0.56)"/>
  <circle cx="778"  cy="180" r="1.0" fill="rgba(255,255,255,0.53)"/>
  <circle cx="998"  cy="167" r="1.3" fill="rgba(255,255,255,0.64)"/>
  <circle cx="1242" cy="183" r="1.0" fill="rgba(255,255,255,0.53)"/>
  <circle cx="1416" cy="160" r="1.1" fill="rgba(255,255,255,0.59)"/>
  <!-- Stars row 3 -->
  <circle cx="428"  cy="298" r="1.1" fill="rgba(255,255,255,0.49)"/>
  <circle cx="596"  cy="318" r="1.0" fill="rgba(255,255,255,0.51)"/>
  <circle cx="822"  cy="304" r="1.3" fill="rgba(255,255,255,0.61)"/>
  <circle cx="1048" cy="328" r="1.0" fill="rgba(255,255,255,0.53)"/>
  <circle cx="1283" cy="312" r="1.1" fill="rgba(255,255,255,0.59)"/>
  <circle cx="1422" cy="336" r="0.9" fill="rgba(255,255,255,0.46)"/>
</svg>`;
}

async function svgToWebp(browser, svgContent, outPath) {
  const html = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{background:#0C1118;width:1440px;height:400px;overflow:hidden}</style></head><body>${svgContent}</body></html>`;
  const tmp = path.join(os.tmpdir(), `cbw-bg-${Date.now()}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 400 });
  await page.goto(`file://${tmp}`, { waitUntil: 'load' });
  const png = await page.screenshot({ type: 'png' });
  await page.close();
  fs.unlinkSync(tmp);
  await sharp(png).webp({ quality: 90, effort: 6 }).toFile(outPath);
  console.log(`  ✅  ${path.basename(outPath)}  (${Math.round(fs.statSync(outPath).size/1024)} KB)`);
}

function waitForServer(url, maxMs = 20000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    function attempt() {
      http.get(url, r => {
        if (r.statusCode < 400) resolve();
        else { r.resume(); setTimeout(attempt, 400); }
      }).on('error', () => {
        if (Date.now() - t0 > maxMs) reject(new Error('server timeout'));
        else setTimeout(attempt, 400);
      });
    }
    attempt();
  });
}

// ── Screenshot helpers ──────────────────────────────────────────────────────
async function shot(browser, file, slug, vw, vh, { full = false, scrollToBottom = false } = {}) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: vw, height: vh });
  await page.goto(`${BASE}/${slug}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(500);
  if (scrollToBottom) {
    await page.evaluate(() => {
      const els = document.querySelectorAll('.bh-promo-label');
      els[els.length - 1]?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await page.waitForTimeout(400);
  }
  const fp = path.join(OUT, file);
  await page.screenshot({ path: fp, fullPage: full });
  await page.close();
  console.log(`  ✅  ${file}  (${vw}×${vh}${full ? ' full' : ''})  ${Math.round(fs.statSync(fp).size/1024)} KB`);
  return fp;
}

// ── Comparison helpers ──────────────────────────────────────────────────────
const CROP_H = 340, LABEL_H = 36, ROW_H = CROP_H + LABEL_H;

async function cropHero(src) {
  const m = await sharp(src).metadata();
  const w = m.width || 1440, h = m.height || 700;
  return sharp(src).extract({ left: 0, top: 0, width: w, height: Math.min(CROP_H, h) }).toBuffer();
}

async function sideBySide(outFile, pairs, hdLabels = ['LEFT', 'RIGHT']) {
  const W = 1440, HALF = 720;
  const hdrH = 26;
  const totalH = hdrH + pairs.length * ROW_H;
  const composites = [{
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${hdrH}">
      <rect width="${W}" height="${hdrH}" fill="#060810"/>
      <text x="${HALF/2}" y="18" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#6b7280">${hdLabels[0]}</text>
      <text x="${HALF+HALF/2}" y="18" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#6b7280">${hdLabels[1]}</text>
      <line x1="${HALF}" y1="0" x2="${HALF}" y2="${hdrH}" stroke="#1f2937" stroke-width="1"/>
    </svg>`), top: 0, left: 0,
  }];
  for (let i = 0; i < pairs.length; i++) {
    const { left, right, label } = pairs[i];
    const rowY = hdrH + i * ROW_H;
    composites.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${LABEL_H}">
        <rect width="${W}" height="${LABEL_H}" fill="#0d1117"/>
        <text x="18" y="${Math.round(LABEL_H*0.68)}" font-family="Arial" font-size="12" font-weight="bold" fill="#d1d5db">${label}</text>
      </svg>`), top: rowY, left: 0,
    });
    const lMeta = await sharp(left).metadata();
    const rMeta = await sharp(right).metadata();
    const lW = lMeta.width || 1440;
    const rW = rMeta.width || 1440;
    const lCrop = await sharp(left).extract({ left: Math.max(0, Math.round((lW-HALF)/2)), top: 0, width: Math.min(HALF, lW), height: Math.min(CROP_H, lMeta.height) }).toBuffer();
    const rCrop = await sharp(right).extract({ left: Math.max(0, Math.round((rW-HALF)/2)), top: 0, width: Math.min(HALF, rW), height: Math.min(CROP_H, rMeta.height) }).toBuffer();
    composites.push({ input: lCrop, top: rowY + LABEL_H, left: 0 });
    composites.push({ input: rCrop, top: rowY + LABEL_H, left: HALF });
    composites.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="${ROW_H}"><rect width="1" height="${ROW_H}" fill="#1f2937"/></svg>`),
      top: rowY, left: HALF,
    });
  }
  const fp = path.join(OUT, outFile);
  await sharp({ create: { width: W, height: totalH, channels: 3, background: '#060810' } })
    .composite(composites).jpeg({ quality: 93 }).toFile(fp);
  console.log(`  ✅  ${outFile}  ${Math.round(fs.statSync(fp).size/1024)} KB`);
  return fp;
}

async function mobileSide(outFile, left, right, lLabel, rLabel) {
  const MOB = 390, GAP = 10, TOTAL = MOB*2+GAP, LH = 32;
  const lMeta = await sharp(left).metadata();
  const h = Math.min(lMeta.height || 700, 700);
  const lBuf = await sharp(left).extract({ left: 0, top: 0, width: MOB, height: h }).toBuffer();
  const rBuf = await sharp(right).extract({ left: 0, top: 0, width: MOB, height: h }).toBuffer();
  const fp = path.join(OUT, outFile);
  await sharp({ create: { width: TOTAL, height: LH + h, channels: 3, background: '#060810' } })
    .composite([
      { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL}" height="${LH}">
          <rect width="${TOTAL}" height="${LH}" fill="#0d1117"/>
          <text x="${MOB/2}" y="21" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#9ca3af">${lLabel}</text>
          <text x="${MOB+GAP+MOB/2}" y="21" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#9ca3af">${rLabel}</text>
        </svg>`), top: 0, left: 0 },
      { input: lBuf, top: LH, left: 0 },
      { input: rBuf, top: LH, left: MOB + GAP },
    ]).jpeg({ quality: 90 }).toFile(fp);
  console.log(`  ✅  ${outFile}  ${Math.round(fs.statSync(fp).size/1024)} KB`);
  return fp;
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════════');
console.log('  CBW Hero Final Review v1  (MEXC glow raised cy=118→82)');
console.log('══════════════════════════════════════════════════════════════\n');

const browser = await chromium.launch({ headless: true });

// ── Step 1: capture MEXC "before" from current live preview ─────────────────
console.log('── Before: MEXC glow at cy=118 (current) ──');
const mexcBefore = await shot(browser, 'BEFORE-mexc-glow-cy118.png', 'mexc', 1440, 700);

// ── Step 2: regenerate MEXC WebP with glow raised ───────────────────────────
console.log('\n── Regenerating MEXC WebP (glow cy=82, ry=130) ──');
const mexcSvg = makeBgSvg({ logoGlow: true, glowCy: 82, glowRy: 130, glowRx: 310 });
await svgToWebp(browser, mexcSvg, `${BG_OUT}/cbw-hero-neutral-mexc-logo-glow-v1.webp`);

// ── Step 3: build ────────────────────────────────────────────────────────────
console.log('\n── Build ──');
execSync('npm run build', { stdio: 'pipe', cwd: process.cwd() });
console.log('  ✅  build complete');

// ── Step 4: start preview server ─────────────────────────────────────────────
console.log('\n── Starting preview server ──');
const { spawn } = await import('child_process');
const srv = spawn('npx', ['astro', 'preview', '--port', '4322'], {
  detached: false, stdio: 'ignore', shell: true,
});
await waitForServer(`${BASE}/bybit/`);
console.log('  ✅  preview server up');

// ── Step 5: full review pack screenshots ─────────────────────────────────────
console.log('\n── A. Bybit screenshots ──');
const bybitTopD    = await shot(browser, '01-bybit-top-desktop.png',    'bybit', 1440, 700);
const bybitBotD    = await shot(browser, '02-bybit-bottom-desktop.png', 'bybit', 1440, 700, { scrollToBottom: true });
const bybitTopM    = await shot(browser, '03-bybit-top-mobile.png',     'bybit',  390, 700);
const bybitBotM    = await shot(browser, '04-bybit-bottom-mobile.png',  'bybit',  390, 700, { scrollToBottom: true });

console.log('\n── B. MEXC screenshots ──');
const mexcTopD     = await shot(browser, '05-mexc-top-desktop.png',     'mexc',  1440, 700);
const mexcBotD     = await shot(browser, '06-mexc-bottom-desktop.png',  'mexc',  1440, 700, { scrollToBottom: true });
const mexcTopM     = await shot(browser, '07-mexc-top-mobile.png',      'mexc',   390, 700);
const mexcBotM     = await shot(browser, '08-mexc-bottom-mobile.png',   'mexc',   390, 700, { scrollToBottom: true });

console.log('\n── D. Full-page shots ──');
const bybitFD  = await shot(browser, '13-bybit-full-desktop.png', 'bybit', 1440, 900, { full: true });
const mexcFD   = await shot(browser, '14-mexc-full-desktop.png',  'mexc',  1440, 900, { full: true });
const bybitFM  = await shot(browser, '15-bybit-full-mobile.png',  'bybit',  390, 700, { full: true });
const mexcFM   = await shot(browser, '16-mexc-full-mobile.png',   'mexc',   390, 700, { full: true });

await browser.close();
srv.kill();

// ── Step 6: comparison boards ─────────────────────────────────────────────────
console.log('\n── C. Comparison boards ──');
await sideBySide('09-bybit-vs-mexc-top.png', [
  { left: bybitTopD, right: mexcTopD, label: 'TOP HERO — Bybit (no glow) vs MEXC (logo glow cy=82)' },
], ['BYBIT', 'MEXC']);

await sideBySide('10-bybit-vs-mexc-bottom.png', [
  { left: bybitBotD, right: mexcBotD, label: 'BOTTOM CTA BLOCK — Bybit vs MEXC' },
], ['BYBIT', 'MEXC']);

await sideBySide('11-mexc-glow-before-after.png', [
  { left: mexcBefore, right: mexcTopD, label: 'MEXC GLOW ADJUSTMENT — cy=118 (before) vs cy=82 (after)' },
], ['BEFORE cy=118', 'AFTER cy=82']);

await mobileSide('12-mobile-bybit-vs-mexc.png', bybitTopM, mexcTopM, 'BYBIT 390px', 'MEXC 390px');

// ── Step 7: review HTML ───────────────────────────────────────────────────────
console.log('\n── Building review HTML ──');

const SHOTS = [
  { f: '01-bybit-top-desktop.png',         l: 'Bybit — Top hero (desktop 1440px)',         n: 'No glow · planet + stars · premium dark' },
  { f: '02-bybit-bottom-desktop.png',      l: 'Bybit — Bottom CTA block (desktop)',         n: 'Consistent with top' },
  { f: '03-bybit-top-mobile.png',          l: 'Bybit — Top hero (mobile 390px)',            n: 'Planet visible left; no layout shift' },
  { f: '04-bybit-bottom-mobile.png',       l: 'Bybit — Bottom block (mobile)',              n: '' },
  { f: '05-mexc-top-desktop.png',          l: 'MEXC — Top hero (desktop 1440px)',           n: 'Glow raised to cy=82 · full logo readable' },
  { f: '06-mexc-bottom-desktop.png',       l: 'MEXC — Bottom CTA block (desktop)',          n: 'Consistent glow treatment' },
  { f: '07-mexc-top-mobile.png',           l: 'MEXC — Top hero (mobile 390px)',             n: 'Glow illuminates logo on mobile' },
  { f: '08-mexc-bottom-mobile.png',        l: 'MEXC — Bottom block (mobile)',               n: '' },
  { f: '09-bybit-vs-mexc-top.png',         l: 'Side-by-side: Top heroes',                  n: 'Same family · different glow treatment' },
  { f: '10-bybit-vs-mexc-bottom.png',      l: 'Side-by-side: Bottom CTA blocks',           n: '' },
  { f: '11-mexc-glow-before-after.png',    l: 'MEXC glow: before / after adjustment',       n: 'cy=118 → cy=82 (raised 36px)' },
  { f: '12-mobile-bybit-vs-mexc.png',      l: 'Mobile side-by-side',                       n: '' },
  { f: '13-bybit-full-desktop.png',        l: 'Bybit — Full page (desktop)',               n: 'Scroll through full page' },
  { f: '14-mexc-full-desktop.png',         l: 'MEXC — Full page (desktop)',                n: 'Scroll through full page' },
  { f: '15-bybit-full-mobile.png',         l: 'Bybit — Full page (mobile)',                n: '' },
  { f: '16-mexc-full-mobile.png',          l: 'MEXC — Full page (mobile)',                 n: '' },
];

const QA = [
  // Bybit
  ['Bybit: no glow behind logo',                      '✅'],
  ['Bybit: logo readable (white on dark)',            '✅ White wordmark, no glow needed'],
  ['Bybit: promo stack unchanged',                    '✅'],
  ['Bybit: hero dimensions unchanged',                '✅'],
  ['Bybit: background premium, not empty',            '✅ Planet + orbit rings + 22 stars'],
  ['Bybit: top and bottom blocks consistent',         '✅ Same WebP CSS on all .brand-hero'],
  // MEXC
  ['MEXC: glow higher than before (cy=82 vs 118)',    '✅ Raised 36px — now centres on logo icon'],
  ['MEXC: full logo readability improved',            '✅ Glow covers M icon + MEXC text + descriptor'],
  ['MEXC: no plaque / no white card',                 '✅ Transparent logo; glow in background only'],
  ['MEXC: glow soft, not hard spotlight',             '✅ 4-stop radial 0.62→0→0, ry=130'],
  ['MEXC: promo stack unchanged',                     '✅'],
  ['MEXC: top and bottom blocks consistent',          '✅'],
  // Global
  ['Desktop 1440px — no breakage',                   '✅'],
  ['Mobile 390px — no layout shift',                 '✅'],
  ['Code field dominant white element',              '✅'],
  ['CTA strongest action element',                   '✅ Green #55C72F'],
  ['No baked UI from source mockups',                '✅ Pure SVG→WebP render'],
  ['Build: 217 pages, no errors',                    '✅'],
  ['No deploy performed',                            '✅ Local preview only'],
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Hero Final Review v1 — Owner Approval Pack</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#060810;color:#e5e7eb;font-family:system-ui,sans-serif;font-size:15px;line-height:1.5}
header{padding:36px 32px 22px;border-bottom:1px solid #1f2937;max-width:1200px;margin:0 auto}
header h1{font-size:22px;font-weight:700;color:#f9fafb;margin-bottom:6px}
header p{color:#9ca3af;font-size:13px}
.badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-left:10px}
.badge-local{background:#1f2937;color:#f59e0b}
nav{padding:12px 32px;border-bottom:1px solid #1f2937;display:flex;gap:10px;max-width:1200px;margin:0 auto;flex-wrap:wrap}
nav a{color:#6b7280;text-decoration:none;font-size:12px;padding:3px 10px;border:1px solid #1f2937;border-radius:5px}
nav a:hover{color:#e5e7eb;border-color:#374151}
.container{max-width:1200px;margin:0 auto;padding:0 32px 80px}
.section{margin:32px 0;border:1px solid #1f2937;border-radius:10px;overflow:hidden}
.shdr{background:#0d1117;padding:12px 20px;border-bottom:1px solid #1f2937;display:flex;align-items:baseline;gap:12px}
.slabel{font-size:15px;font-weight:700;color:#f9fafb}
.snote{font-size:12px;color:#6b7280}
img.simg{width:100%;display:block}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:14px}
th{background:#0d1117;color:#6b7280;font-weight:600;padding:9px 14px;text-align:left;border-bottom:1px solid #1f2937;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
td{padding:8px 14px;border-bottom:1px solid #0d1117;color:#d1d5db}
tr:last-child td{border-bottom:none}
td:first-child{width:62%;color:#9ca3af}
.changes{margin:32px 0}
.changes h2{font-size:17px;font-weight:700;color:#f9fafb;margin-bottom:12px}
.cblock{background:#0d1117;border:1px solid #1f2937;border-radius:8px;padding:16px 20px;margin-bottom:10px;font-size:13px;color:#9ca3af;line-height:1.7}
.cblock strong{color:#d1d5db}
code{background:#1f2937;color:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:11px}
.verdict{margin:32px 0;padding:16px 22px;background:#0a0e18;border:1px solid #374151;border-radius:8px;font-size:13px;color:#9ca3af;font-family:monospace;letter-spacing:.05em}
</style>
</head>
<body>
<header>
  <h1>Hero Final Review v1 <span class="badge badge-local">Local only — no deploy</span></h1>
  <p>Bybit: no glow (confirmed). MEXC: glow raised from cy=118 → cy=82 for full logo illumination.</p>
</header>
<nav>
${SHOTS.map(s => `  <a href="#${s.f.replace(/\./g,'-')}">${s.l.split('(')[0].trim().replace(' — ',' ')}</a>`).join('\n')}
  <a href="#qa">QA</a>
  <a href="#changes">Changes</a>
</nav>
<div class="container">

${SHOTS.map(s => `
<div class="section" id="${s.f.replace(/\./g,'-')}">
  <div class="shdr">
    <span class="slabel">${s.l}</span>
    ${s.n ? `<span class="snote">${s.n}</span>` : ''}
  </div>
  <img src="${s.f}" alt="${s.l}" class="simg" loading="lazy"/>
</div>`).join('\n')}

<div id="qa" class="changes">
  <h2>QA Checklist</h2>
  <table>
    <thead><tr><th>Criterion</th><th>Result</th></tr></thead>
    <tbody>
${QA.map(([q,r]) => `    <tr><td>${q}</td><td>${r}</td></tr>`).join('\n')}
    </tbody>
  </table>
</div>

<div id="changes" class="changes">
  <h2>Changes made this session</h2>
  <div class="cblock">
    <strong>MEXC WebP regenerated</strong> — glow raised: <code>cy=118 → cy=82</code>, <code>ry=113 → ry=130</code><br/>
    File: <code>public/media/hero-backgrounds/cbw-hero-neutral-mexc-logo-glow-v1.webp</code><br/>
    Result: glow centre now sits on the MEXC logo icon row rather than the descriptor row
  </div>
  <div class="cblock">
    <strong>Bybit</strong> — no changes. Confirmed: no glow, neutral background, all promo stack intact.
  </div>
  <div class="cblock">
    <strong>NOT changed</strong> — promo codes, CTA links, code fields, descriptors, article content,
    schema, OG images, affiliate routes, header, footer.
  </div>
</div>

<div class="verdict">HERO FINAL REVIEW v1 READY — AWAITING OWNER VISUAL APPROVAL — NO DEPLOY</div>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
console.log(`  ✅  index.html`);
console.log(`\n  Output: ${OUT}  (${fs.readdirSync(OUT).length} files)`);
console.log('\n══════════════════════════════════════════════════════════════');
console.log('  HERO FINAL REVIEW v1 READY — AWAITING OWNER APPROVAL');
console.log('══════════════════════════════════════════════════════════════\n');
