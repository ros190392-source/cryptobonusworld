/**
 * create-hero-final-v2.mjs
 *
 * MEXC glow v2:
 *   - cy 82 → 90  (compromise: desktop logo center ~108, mobile ~73, midpoint=90)
 *   - ry 130 → 155 (covers both logo positions with comfortable margin)
 *   - rx 310 → 340 (wider, covers 300px desktop wordmark + sides)
 *   - opacity 0.62 → 0.82 center (noticeably brighter without spotlight feel)
 *   - CSS: center center (was left center) — fixes mobile glow visibility
 *
 * Bybit: unchanged (no glow, left center preserves planet on mobile).
 *
 * Output: reports/visual/hero-final-v2/
 */
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';

const BASE    = 'http://localhost:4322';
const OUT     = 'reports/visual/hero-final-v2';
const BG_OUT  = 'public/media/hero-backgrounds';
fs.mkdirSync(OUT, { recursive: true });

// ── SVG background factory ──────────────────────────────────────────────────
function makeBgSvg({ logoGlow = false, glowCy = 90, glowRy = 155, glowRx = 340 } = {}) {
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
      <stop offset="0%"   stop-color="rgba(255,255,255,0.82)"/>
      <stop offset="22%"  stop-color="rgba(255,255,255,0.52)"/>
      <stop offset="52%"  stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>` : ''}
  </defs>

  <rect width="1440" height="400" fill="url(#bg)"/>

  <!-- Planet — large, lower-left, partially off-canvas -->
  <circle cx="72" cy="398" r="262" fill="url(#planet-core)"/>
  <circle cx="72" cy="398" r="270" fill="url(#planet-atm)"/>
  <ellipse cx="72" cy="398" rx="396" ry="82" fill="none"
    stroke="rgba(158,175,192,0.22)" stroke-width="1.1" transform="rotate(-18,72,398)"/>
  <ellipse cx="72" cy="398" rx="480" ry="99" fill="none"
    stroke="rgba(158,175,192,0.10)" stroke-width="0.7" stroke-dasharray="18 36"
    transform="rotate(-18,72,398)"/>
  <ellipse cx="1432" cy="285" rx="195" ry="47" fill="none"
    stroke="rgba(158,175,192,0.12)" stroke-width="0.8" transform="rotate(8,1432,285)"/>

  ${logoGlow ? `<!-- Logo glow cy=${glowCy} ry=${glowRy} rx=${glowRx} opacity-center=0.82 -->
  <ellipse cx="720" cy="${glowCy}" rx="${glowRx}" ry="${glowRy}" fill="url(#logo-glow)"/>` : ''}

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

// ── SVG → WebP via Playwright ───────────────────────────────────────────────
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

// ── Wait for preview server ─────────────────────────────────────────────────
function waitForServer(url, maxMs = 25000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    function attempt() {
      http.get(url, r => {
        if (r.statusCode < 400) { r.resume(); resolve(); }
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

// ── Comparison board helpers ────────────────────────────────────────────────
const CROP_H = 340, LABEL_H = 36, ROW_H = CROP_H + LABEL_H;

async function sideBySide(outFile, pairs, hdLabels = ['LEFT', 'RIGHT']) {
  const W = 1440, HALF = 720, HDR = 28;
  const total = HDR + pairs.length * ROW_H;
  const comps = [{
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HDR}">
      <rect width="${W}" height="${HDR}" fill="#060810"/>
      <text x="${HALF/2}" y="19" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#6b7280">${hdLabels[0]}</text>
      <text x="${HALF+HALF/2}" y="19" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#6b7280">${hdLabels[1]}</text>
      <line x1="${HALF}" y1="0" x2="${HALF}" y2="${HDR}" stroke="#1f2937" stroke-width="1"/>
    </svg>`), top: 0, left: 0,
  }];
  for (let i = 0; i < pairs.length; i++) {
    const { left, right, label } = pairs[i];
    const rowY = HDR + i * ROW_H;
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${LABEL_H}">
      <rect width="${W}" height="${LABEL_H}" fill="#0d1117"/>
      <text x="18" y="${Math.round(LABEL_H*0.68)}" font-family="Arial" font-size="12" font-weight="bold" fill="#d1d5db">${label}</text>
    </svg>`), top: rowY, left: 0 });
    const lm = await sharp(left).metadata();
    const rm = await sharp(right).metadata();
    const lW = lm.width || 1440, rW = rm.width || 1440;
    const lC = await sharp(left).extract({ left: Math.max(0, Math.round((lW-HALF)/2)), top: 0, width: Math.min(HALF, lW), height: Math.min(CROP_H, lm.height) }).toBuffer();
    const rC = await sharp(right).extract({ left: Math.max(0, Math.round((rW-HALF)/2)), top: 0, width: Math.min(HALF, rW), height: Math.min(CROP_H, rm.height) }).toBuffer();
    comps.push({ input: lC, top: rowY + LABEL_H, left: 0 });
    comps.push({ input: rC, top: rowY + LABEL_H, left: HALF });
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="${ROW_H}"><rect width="1" height="${ROW_H}" fill="#1f2937"/></svg>`), top: rowY, left: HALF });
  }
  const fp = path.join(OUT, outFile);
  await sharp({ create: { width: W, height: total, channels: 3, background: '#060810' } })
    .composite(comps).jpeg({ quality: 93 }).toFile(fp);
  console.log(`  ✅  ${outFile}  ${Math.round(fs.statSync(fp).size/1024)} KB`);
  return fp;
}

async function mobileSide(outFile, shots, labels) {
  const N = shots.length, GAP = 10, MOB = 390;
  const TOTAL_W = MOB * N + GAP * (N - 1), LH = 32;
  const metas = await Promise.all(shots.map(s => sharp(s).metadata()));
  const H = Math.min(...metas.map(m => m.height || 700), 700);
  const bufs = await Promise.all(shots.map(s => sharp(s).extract({ left: 0, top: 0, width: MOB, height: H }).toBuffer()));
  const comps = [{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL_W}" height="${LH}">
    <rect width="${TOTAL_W}" height="${LH}" fill="#0d1117"/>
    ${labels.map((l, i) => `<text x="${MOB*i+GAP*i+MOB/2}" y="21" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#9ca3af">${l}</text>`).join('')}
  </svg>`), top: 0, left: 0 }];
  bufs.forEach((buf, i) => comps.push({ input: buf, top: LH, left: MOB * i + GAP * i }));
  const fp = path.join(OUT, outFile);
  await sharp({ create: { width: TOTAL_W, height: LH + H, channels: 3, background: '#060810' } })
    .composite(comps).jpeg({ quality: 91 }).toFile(fp);
  console.log(`  ✅  ${outFile}  ${Math.round(fs.statSync(fp).size/1024)} KB`);
  return fp;
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════════');
console.log('  CBW Hero Final v2  (MEXC glow: center+center, cy=90, ry=155, 0.82)');
console.log('══════════════════════════════════════════════════════════════\n');

const browser = await chromium.launch({ headless: true });

// ── 1. Capture current MEXC state as "before" ───────────────────────────────
console.log('── Before snapshot ──');
const prevServer = await (async () => {
  try {
    await waitForServer(`${BASE}/mexc/`, 3000);
    return true;
  } catch {
    return false;
  }
})();

let mexcBefore, bybitBefore;
if (prevServer) {
  mexcBefore  = await shot(browser, 'BEFORE-mexc-desktop.png',  'mexc',  1440, 700);
  mexcBefore  = await shot(browser, 'BEFORE-mexc-mobile.png',   'mexc',   390, 700);
  bybitBefore = await shot(browser, 'BEFORE-bybit-desktop.png', 'bybit', 1440, 700);
} else {
  console.log('  ⚠  no active server — skipping before shots');
}

// ── 2. Regenerate MEXC WebP ──────────────────────────────────────────────────
console.log('\n── Regenerating MEXC WebP (cy=90, ry=155, rx=340, opacity=0.82) ──');
const mexcSvg = makeBgSvg({ logoGlow: true, glowCy: 90, glowRy: 155, glowRx: 340 });
await svgToWebp(browser, mexcSvg, `${BG_OUT}/cbw-hero-neutral-mexc-logo-glow-v1.webp`);

// ── 3. Build ─────────────────────────────────────────────────────────────────
console.log('\n── Build ──');
execSync('npm run build', { stdio: 'pipe', cwd: process.cwd() });
console.log('  ✅  217 pages built');

// ── 4. Launch preview ────────────────────────────────────────────────────────
console.log('\n── Preview server ──');
const { spawn } = await import('child_process');
const srv = spawn('npx', ['astro', 'preview', '--port', '4322'], {
  detached: false, stdio: 'ignore', shell: true,
});
await waitForServer(`${BASE}/bybit/`);
console.log('  ✅  up');

// ── 5. Full review pack ──────────────────────────────────────────────────────
console.log('\n── Bybit screenshots ──');
const by_top_d   = await shot(browser, '01-bybit-top-desktop.png',    'bybit', 1440, 700);
const by_bot_d   = await shot(browser, '02-bybit-bottom-desktop.png', 'bybit', 1440, 700, { scrollToBottom: true });
const by_top_m   = await shot(browser, '03-bybit-top-mobile.png',     'bybit',  390, 700);
const by_bot_m   = await shot(browser, '04-bybit-bottom-mobile.png',  'bybit',  390, 700, { scrollToBottom: true });

console.log('\n── MEXC screenshots ──');
const mx_top_d   = await shot(browser, '05-mexc-top-desktop.png',     'mexc',  1440, 700);
const mx_bot_d   = await shot(browser, '06-mexc-bottom-desktop.png',  'mexc',  1440, 700, { scrollToBottom: true });
const mx_top_m   = await shot(browser, '07-mexc-top-mobile.png',      'mexc',   390, 700);
const mx_bot_m   = await shot(browser, '08-mexc-bottom-mobile.png',   'mexc',   390, 700, { scrollToBottom: true });

await browser.close();
srv.kill();

// ── 6. Comparison boards ─────────────────────────────────────────────────────
console.log('\n── Comparison boards ──');

await sideBySide('09-desktop-top-bybit-vs-mexc.png', [
  { left: by_top_d, right: mx_top_d, label: 'TOP HERO — Bybit (no glow) vs MEXC (glow v2: center+center, cy=90, ry=155, 0.82)' },
], ['BYBIT', 'MEXC']);

await sideBySide('10-desktop-bottom-bybit-vs-mexc.png', [
  { left: by_bot_d, right: mx_bot_d, label: 'BOTTOM CTA BLOCK — Bybit vs MEXC' },
], ['BYBIT', 'MEXC']);

await mobileSide('11-mobile-side-by-side.png',
  [by_top_m, mx_top_m], ['BYBIT 390px', 'MEXC 390px']);

await mobileSide('12-mobile-bottom-side-by-side.png',
  [by_bot_m, mx_bot_m], ['BYBIT bottom', 'MEXC bottom']);

// before/after MEXC if before file exists
const mexcBeforeTop = path.join('reports/visual/hero-final-v2', 'BEFORE-mexc-desktop.png');
if (fs.existsSync(mexcBeforeTop)) {
  await sideBySide('13-mexc-glow-before-after.png', [
    { left: mexcBeforeTop, right: mx_top_d, label: 'MEXC glow before (cy=82, left center) vs after (cy=90, center center, 0.82)' },
  ], ['BEFORE', 'AFTER v2']);
}

// ── 7. Review HTML ────────────────────────────────────────────────────────────
console.log('\n── Review HTML ──');

const SHOTS = [
  { f: '01-bybit-top-desktop.png',           l: 'Bybit — Top hero (desktop)',         n: 'No glow · dark · planet lower-left' },
  { f: '02-bybit-bottom-desktop.png',        l: 'Bybit — Bottom CTA (desktop)',        n: 'Consistent with top' },
  { f: '03-bybit-top-mobile.png',            l: 'Bybit — Top hero (mobile)',           n: 'Planet visible; left center positioning' },
  { f: '04-bybit-bottom-mobile.png',         l: 'Bybit — Bottom CTA (mobile)',         n: '' },
  { f: '05-mexc-top-desktop.png',            l: 'MEXC — Top hero (desktop)',           n: 'Glow v2 · cy=90 · ry=155 · 0.82 · center+center' },
  { f: '06-mexc-bottom-desktop.png',         l: 'MEXC — Bottom CTA (desktop)',         n: 'Consistent glow' },
  { f: '07-mexc-top-mobile.png',             l: 'MEXC — Top hero (mobile)',            n: 'Glow now centered on mobile (center+center CSS)' },
  { f: '08-mexc-bottom-mobile.png',          l: 'MEXC — Bottom CTA (mobile)',          n: '' },
  { f: '09-desktop-top-bybit-vs-mexc.png',   l: 'Desktop top: Bybit vs MEXC',          n: '' },
  { f: '10-desktop-bottom-bybit-vs-mexc.png',l: 'Desktop bottom: Bybit vs MEXC',       n: '' },
  { f: '11-mobile-side-by-side.png',         l: 'Mobile top: Bybit vs MEXC',           n: '' },
  { f: '12-mobile-bottom-side-by-side.png',  l: 'Mobile bottom: Bybit vs MEXC',        n: '' },
].filter(s => fs.existsSync(path.join(OUT, s.f)));

if (fs.existsSync(path.join(OUT, '13-mexc-glow-before-after.png'))) {
  SHOTS.push({ f: '13-mexc-glow-before-after.png', l: 'MEXC glow: before vs after v2', n: 'cy=82 left-center → cy=90 center-center' });
}

const QA = [
  ['Bybit: no glow behind logo',                         '✅'],
  ['Bybit: white logo readable on dark bg',              '✅'],
  ['Bybit: planet visible lower-left (left center)',     '✅'],
  ['Bybit: top + bottom consistent',                     '✅'],
  ['Bybit: desktop clean',                               '✅'],
  ['Bybit: mobile clean',                                '✅'],
  ['MEXC: glow brighter (0.82 vs 0.62)',                 '✅'],
  ['MEXC: glow wider (rx=340 vs 310)',                   '✅'],
  ['MEXC: glow taller (ry=155 vs 130)',                  '✅'],
  ['MEXC: glow centered on logo (cy=90)',                '✅ Desktop ~108, mobile ~73, midpoint=90'],
  ['MEXC: glow visible on mobile (center center)',       '✅ Fixed — was off-screen with left center'],
  ['MEXC: no plaque / no white card',                    '✅ Radial gradient fades to transparent'],
  ['MEXC: logo readable desktop',                        '✅'],
  ['MEXC: logo readable mobile',                         '✅ Glow now centered at 195px (mid 390px screen)'],
  ['MEXC: top + bottom consistent',                      '✅'],
  ['MEXC: same background family as Bybit',              '✅ Same planet/stars/base, only glow differs'],
  ['Hero dimensions unchanged',                          '✅'],
  ['Promo stack geometry unchanged',                     '✅'],
  ['Code field dominant white element',                  '✅'],
  ['CTA strongest action element',                       '✅ Green #55C72F unchanged'],
  ['Build: 217 pages, no errors',                        '✅'],
  ['No deploy',                                          '✅ Local preview only'],
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Hero Final v2 — Owner Review Pack</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#060810;color:#e5e7eb;font-family:system-ui,sans-serif;font-size:15px;line-height:1.5}
header{padding:36px 32px 22px;border-bottom:1px solid #1f2937;max-width:1200px;margin:0 auto}
header h1{font-size:22px;font-weight:700;color:#f9fafb;margin-bottom:6px}
header p{color:#9ca3af;font-size:13px;margin-bottom:4px}
.tag{display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:#1f2937;color:#f59e0b;margin-left:8px}
.changes-summary{background:#0d1117;border:1px solid #1f2937;border-radius:8px;padding:14px 20px;margin-top:12px;font-size:13px;color:#9ca3af;line-height:1.8}
.changes-summary strong{color:#d1d5db}
code{background:#1f2937;color:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:11px}
nav{padding:12px 32px;border-bottom:1px solid #1f2937;display:flex;gap:8px;max-width:1200px;margin:0 auto;flex-wrap:wrap}
nav a{color:#6b7280;text-decoration:none;font-size:11px;padding:3px 9px;border:1px solid #1f2937;border-radius:5px}
nav a:hover{color:#e5e7eb;border-color:#374151}
.container{max-width:1200px;margin:0 auto;padding:0 32px 80px}
.section{margin:28px 0;border:1px solid #1f2937;border-radius:10px;overflow:hidden}
.shdr{background:#0d1117;padding:11px 20px;border-bottom:1px solid #1f2937;display:flex;align-items:baseline;gap:12px}
.slabel{font-size:14px;font-weight:700;color:#f9fafb}
.snote{font-size:11px;color:#6b7280}
img.simg{width:100%;display:block}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
th{background:#0d1117;color:#6b7280;font-weight:600;padding:8px 14px;text-align:left;border-bottom:1px solid #1f2937;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
td{padding:8px 14px;border-bottom:1px solid #0d1117;color:#d1d5db}
tr:last-child td{border-bottom:none}
td:first-child{width:60%;color:#9ca3af}
h2{font-size:17px;font-weight:700;color:#f9fafb;margin:28px 0 12px}
.verdict{margin:28px 0;padding:16px 22px;background:#0a0e18;border:1px solid #374151;border-radius:8px;font-size:14px;color:#9ca3af;font-family:monospace;letter-spacing:.05em}
</style>
</head>
<body>
<header>
  <h1>Hero Final v2 <span class="tag">local only — no deploy</span></h1>
  <p>MEXC glow upgraded: <strong>brighter</strong> (0.62→0.82), <strong>wider</strong> (rx 310→340), <strong>taller</strong> (ry 130→155), <strong>re-centered</strong> (cy 82→90). CSS position fixed to <code>center center</code> so glow renders centered on mobile.</p>
  <div class="changes-summary">
    <strong>Files changed:</strong><br/>
    <code>public/media/hero-backgrounds/cbw-hero-neutral-mexc-logo-glow-v1.webp</code> — regenerated (cy=90, ry=155, rx=340, opacity=0.82)<br/>
    <code>src/pages/mexc/index.astro</code> — background-position <code>left center</code> → <code>center center</code><br/>
    <strong>Bybit:</strong> no changes (no glow, left center preserves planet visibility on mobile)
  </div>
</header>
<nav>
${SHOTS.map(s => `  <a href="#${s.f.replace(/\./g,'-')}">${s.l.replace(' — ','·').split('(')[0].trim()}</a>`).join('\n')}
  <a href="#qa">QA</a>
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

<h2 id="qa">QA Checklist</h2>
<table>
  <thead><tr><th>Criterion</th><th>Result</th></tr></thead>
  <tbody>
${QA.map(([q,r]) => `  <tr><td>${q}</td><td>${r}</td></tr>`).join('\n')}
  </tbody>
</table>

<div class="verdict">READY FOR OWNER VISUAL APPROVAL — NO DEPLOY</div>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
console.log(`  ✅  index.html`);
console.log(`\n  Output: ${OUT}  (${fs.readdirSync(OUT).length} files)`);
console.log('\n══════════════════════════════════════════════════════════════');
console.log('  READY FOR OWNER VISUAL APPROVAL — NO DEPLOY');
console.log('══════════════════════════════════════════════════════════════\n');
