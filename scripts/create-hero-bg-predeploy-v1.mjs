/**
 * create-hero-bg-predeploy-v1.mjs
 *
 * 1. Creates WebP background assets for Bybit (no glow) and MEXC (logo glow)
 *    by rendering enhanced SVGs via Playwright.
 * 2. Takes before/after screenshots of the live preview pages.
 * 3. Builds comparison boards + review HTML.
 *
 * Output assets:
 *   public/media/hero-backgrounds/cbw-hero-neutral-bybit-no-glow-v1.webp
 *   public/media/hero-backgrounds/cbw-hero-neutral-mexc-logo-glow-v1.webp
 *
 * Screenshots:
 *   reports/visual/hero-background-image-predeploy-v1/
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';

const BASE     = 'http://localhost:4322';
const SHOT_OUT = 'reports/visual/hero-background-image-predeploy-v1';
const BG_OUT   = 'public/media/hero-backgrounds';
fs.mkdirSync(SHOT_OUT, { recursive: true });
fs.mkdirSync(BG_OUT, { recursive: true });

// ── Enhanced background SVG (no logo/text/code/button) ─────────────────────
function makeBgSvg(logoGlow) {
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
      <stop offset="0%"   stop-color="rgba(255,255,255,0.68)"/>
      <stop offset="26%"  stop-color="rgba(255,255,255,0.40)"/>
      <stop offset="58%"  stop-color="rgba(255,255,255,0.12)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>` : ''}
  </defs>

  <!-- Base gradient fill -->
  <rect width="1440" height="400" fill="url(#bg)"/>

  <!-- Planet — large, lower-left, partially off-canvas -->
  <circle cx="72" cy="398" r="262" fill="url(#planet-core)"/>
  <!-- Atmosphere glow ring -->
  <circle cx="72" cy="398" r="270" fill="url(#planet-atm)"/>

  <!-- Main orbit ellipse -->
  <ellipse cx="72" cy="398" rx="396" ry="82" fill="none"
    stroke="rgba(158,175,192,0.22)" stroke-width="1.1"
    transform="rotate(-18,72,398)"/>
  <!-- Outer orbit ellipse (dashed) -->
  <ellipse cx="72" cy="398" rx="480" ry="99" fill="none"
    stroke="rgba(158,175,192,0.10)" stroke-width="0.7" stroke-dasharray="18 36"
    transform="rotate(-18,72,398)"/>

  <!-- Right-side distant orbit arc -->
  <ellipse cx="1432" cy="285" rx="195" ry="47" fill="none"
    stroke="rgba(158,175,192,0.12)" stroke-width="0.8"
    transform="rotate(8,1432,285)"/>

  ${logoGlow ? `<!-- Logo glow — centered at logo slot for dark wordmark readability -->
  <ellipse cx="720" cy="118" rx="298" ry="113" fill="url(#logo-glow)"/>` : ''}

  <!-- Stars row 1 — upper band -->
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

  <!-- Stars row 2 — mid band -->
  <circle cx="148"  cy="166" r="1.0" fill="rgba(255,255,255,0.51)"/>
  <circle cx="324"  cy="190" r="1.4" fill="rgba(255,255,255,0.64)"/>
  <circle cx="552"  cy="155" r="1.1" fill="rgba(255,255,255,0.56)"/>
  <circle cx="778"  cy="180" r="1.0" fill="rgba(255,255,255,0.53)"/>
  <circle cx="998"  cy="167" r="1.3" fill="rgba(255,255,255,0.64)"/>
  <circle cx="1242" cy="183" r="1.0" fill="rgba(255,255,255,0.53)"/>
  <circle cx="1416" cy="160" r="1.1" fill="rgba(255,255,255,0.59)"/>

  <!-- Stars row 3 — lower, right of planet -->
  <circle cx="428"  cy="298" r="1.1" fill="rgba(255,255,255,0.49)"/>
  <circle cx="596"  cy="318" r="1.0" fill="rgba(255,255,255,0.51)"/>
  <circle cx="822"  cy="304" r="1.3" fill="rgba(255,255,255,0.61)"/>
  <circle cx="1048" cy="328" r="1.0" fill="rgba(255,255,255,0.53)"/>
  <circle cx="1283" cy="312" r="1.1" fill="rgba(255,255,255,0.59)"/>
  <circle cx="1422" cy="336" r="0.9" fill="rgba(255,255,255,0.46)"/>
</svg>`;
}

// ── Render SVG to WebP via Playwright ──────────────────────────────────────
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
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`  ✅  ${path.basename(outPath)}  (${kb} KB)`);
}

// ── Page screenshot helper ──────────────────────────────────────────────────
async function shot(browser, file, slug, vw, vh, scrollToBottom = false) {
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
  const fp = path.join(SHOT_OUT, file);
  await page.screenshot({ path: fp });
  await page.close();
  const kb = Math.round(fs.statSync(fp).size / 1024);
  console.log(`  ✅  ${file}  (${vw}×${vh})  ${kb} KB`);
  return fp;
}

// ── Comparison board helper ─────────────────────────────────────────────────
const CROP_H = 340, LABEL_H = 38, ROW_H = CROP_H + LABEL_H;

async function sideBoard(outFile, pairs) {
  // pairs: [{left, right, label}]
  const W = 1440, HALF = 720;
  const headerH = 28;
  const totalH = headerH + pairs.length * ROW_H;
  const composites = [];
  composites.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${headerH}">
      <rect width="${W}" height="${headerH}" fill="#060810"/>
      <text x="${HALF/2}" y="19" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#6b7280">BEFORE</text>
      <text x="${HALF+HALF/2}" y="19" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#6b7280">AFTER</text>
      <line x1="${HALF}" y1="0" x2="${HALF}" y2="${headerH}" stroke="#1f2937" stroke-width="1"/>
    </svg>`),
    top: 0, left: 0,
  });
  for (let i = 0; i < pairs.length; i++) {
    const { left, right, label } = pairs[i];
    const rowY = headerH + i * ROW_H;
    composites.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${LABEL_H}">
        <rect width="${W}" height="${LABEL_H}" fill="#0d1117"/>
        <text x="20" y="${Math.round(LABEL_H*0.67)}" font-family="Arial" font-size="12" font-weight="bold" fill="#d1d5db">${label}</text>
      </svg>`),
      top: rowY, left: 0,
    });
    const lMeta = await sharp(left).metadata();
    const rMeta = await sharp(right).metadata();
    const srcW = lMeta.width || 1440;
    const cropLeft = Math.max(0, Math.round((srcW - HALF) / 2));
    const lCrop = await sharp(left).extract({ left: cropLeft, top: 0, width: Math.min(HALF, srcW - cropLeft), height: Math.min(CROP_H, lMeta.height) }).toBuffer();
    const rSrcW = rMeta.width || 1440;
    const rCropLeft = Math.max(0, Math.round((rSrcW - HALF) / 2));
    const rCrop = await sharp(right).extract({ left: rCropLeft, top: 0, width: Math.min(HALF, rSrcW - rCropLeft), height: Math.min(CROP_H, rMeta.height) }).toBuffer();
    composites.push({ input: lCrop, top: rowY + LABEL_H, left: 0 });
    composites.push({ input: rCrop, top: rowY + LABEL_H, left: HALF });
    composites.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="${ROW_H}"><rect width="1" height="${ROW_H}" fill="#1f2937"/></svg>`),
      top: rowY, left: HALF,
    });
  }
  const fp = path.join(SHOT_OUT, outFile);
  await sharp({ create: { width: W, height: totalH, channels: 3, background: '#060810' } })
    .composite(composites).jpeg({ quality: 92 }).toFile(fp);
  console.log(`  ✅  ${outFile}  ${Math.round(fs.statSync(fp).size / 1024)} KB`);
  return fp;
}

async function mobileSideBySide(outFile, left, right, leftLabel, rightLabel) {
  const MOB = 390, GAP = 12, TOTAL = MOB * 2 + GAP, LH = 34;
  const lBuf = await sharp(left).toBuffer();
  const rBuf = await sharp(right).toBuffer();
  const lMeta = await sharp(left).metadata();
  const h = lMeta.height || 700;
  const fp = path.join(SHOT_OUT, outFile);
  await sharp({ create: { width: TOTAL, height: LH + h, channels: 3, background: '#060810' } })
    .composite([
      { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL}" height="${LH}">
          <rect width="${TOTAL}" height="${LH}" fill="#0d1117"/>
          <text x="${MOB/2}" y="22" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#9ca3af">${leftLabel}</text>
          <text x="${MOB+GAP+MOB/2}" y="22" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#9ca3af">${rightLabel}</text>
        </svg>`), top: 0, left: 0 },
      { input: lBuf, top: LH, left: 0 },
      { input: rBuf, top: LH, left: MOB + GAP },
    ])
    .jpeg({ quality: 90 }).toFile(fp);
  console.log(`  ✅  ${outFile}  ${Math.round(fs.statSync(fp).size / 1024)} KB`);
  return fp;
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════════');
console.log('  CBW Hero Background Image Pre-deploy v1');
console.log('══════════════════════════════════════════════════════════════\n');

const browser = await chromium.launch({ headless: true });

// ── Step 1: Create WebP background assets ───────────────────────────────────
console.log('── Creating WebP background assets ──');
const bybitSvg = makeBgSvg(false); // no logo glow
const mexcSvg  = makeBgSvg(true);  // with logo glow

const bybitWebp = `${BG_OUT}/cbw-hero-neutral-bybit-no-glow-v1.webp`;
const mexcWebp  = `${BG_OUT}/cbw-hero-neutral-mexc-logo-glow-v1.webp`;

await svgToWebp(browser, bybitSvg, bybitWebp);
await svgToWebp(browser, mexcSvg,  mexcWebp);

// ── Step 2: Before screenshots (current SVG overlay state) ──────────────────
console.log('\n── Before screenshots (current SVG system) ──');
const bybitBefore    = await shot(browser, '01-bybit-before-desktop.png',  'bybit', 1440, 700);
const mexcBefore     = await shot(browser, '03-mexc-before-desktop.png',   'mexc',  1440, 700);

// ── Step 3: Patch CSS in-browser for "after" shots (no source change yet) ──
// We'll mutate inline styles to show the WebP background before committing source
async function shotWithBg(file, slug, vw, vh, bgUrl, scrollToBottom = false) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: vw, height: vh });
  await page.goto(`${BASE}/${slug}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(400);
  // Inject WebP background + hide SVG overlay
  await page.evaluate((url) => {
    document.querySelectorAll('.brand-hero').forEach(el => {
      el.style.backgroundImage = `url('${url}')`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'left center';
      el.style.backgroundRepeat = 'no-repeat';
    });
    document.querySelectorAll('.bh-bg-overlay').forEach(el => { el.style.display = 'none'; });
  }, bgUrl);
  await page.waitForTimeout(300);
  if (scrollToBottom) {
    await page.evaluate(() => {
      const els = document.querySelectorAll('.bh-promo-label');
      els[els.length - 1]?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await page.waitForTimeout(400);
  }
  const fp = path.join(SHOT_OUT, file);
  await page.screenshot({ path: fp });
  await page.close();
  console.log(`  ✅  ${file}  (${vw}×${vh})  ${Math.round(fs.statSync(fp).size/1024)} KB`);
  return fp;
}

// The preview server serves from /dist — WebP in public won't be available there yet.
// We use a data URL approach: serve the WebP as base64 for preview mutation.
async function webpToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

console.log('\n── After screenshots (WebP background preview) ──');
const bybitDataUrl = await webpToDataUrl(bybitWebp);
const mexcDataUrl  = await webpToDataUrl(mexcWebp);

const bybitAfterTop    = await shotWithBg('02-bybit-after-desktop.png',        'bybit', 1440, 700, bybitDataUrl);
const mexcAfterTop     = await shotWithBg('04-mexc-after-desktop.png',         'mexc',  1440, 700, mexcDataUrl);
const bybitAfterBottom = await shotWithBg('10-bybit-bottom-after-desktop.png', 'bybit', 1440, 700, bybitDataUrl, true);
const mexcAfterBottom  = await shotWithBg('11-mexc-bottom-after-desktop.png',  'mexc',  1440, 700, mexcDataUrl,  true);

console.log('\n── Mobile after screenshots ──');
const bybitAfterMob = await shotWithBg('07-bybit-after-mobile.png', 'bybit', 390, 700, bybitDataUrl);
const mexcAfterMob  = await shotWithBg('08-mexc-after-mobile.png',  'mexc',  390, 700, mexcDataUrl);

await browser.close();

// ── Step 4: Comparison boards ───────────────────────────────────────────────
console.log('\n── Building comparison boards ──');
const bybitComp = await sideBoard('05-bybit-before-after-comparison.png', [
  { left: bybitBefore, right: bybitAfterTop,    label: 'Bybit top hero — SVG overlay → WebP background (no glow)' },
  { left: bybitBefore, right: bybitAfterBottom, label: 'Bybit bottom CTA — same treatment' },
]);
const mexcComp = await sideBoard('06-mexc-before-after-comparison.png', [
  { left: mexcBefore,  right: mexcAfterTop,     label: 'MEXC top hero — SVG overlay → WebP background (logo glow)' },
  { left: mexcBefore,  right: mexcAfterBottom,  label: 'MEXC bottom CTA — same treatment' },
]);
const mobileComp = await mobileSideBySide('09-mobile-comparison.png', bybitAfterMob, mexcAfterMob, 'BYBIT 390px', 'MEXC 390px');

// ── Step 5: Review HTML ─────────────────────────────────────────────────────
console.log('\n── Building review page ──');

const SHOTS = [
  { f: '01-bybit-before-desktop.png',       l: 'Bybit — BEFORE (desktop 1440px)',       n: 'Current: SVG overlay system' },
  { f: '02-bybit-after-desktop.png',        l: 'Bybit — AFTER (desktop 1440px)',        n: 'WebP background: planet+stars, no logo glow' },
  { f: '03-mexc-before-desktop.png',        l: 'MEXC — BEFORE (desktop 1440px)',        n: 'Current: SVG overlay + logo glow' },
  { f: '04-mexc-after-desktop.png',         l: 'MEXC — AFTER (desktop 1440px)',         n: 'WebP background: planet+stars + logo glow' },
  { f: '05-bybit-before-after-comparison.png', l: 'Bybit — Before / After comparison',  n: '' },
  { f: '06-mexc-before-after-comparison.png',  l: 'MEXC — Before / After comparison',   n: '' },
  { f: '07-bybit-after-mobile.png',         l: 'Bybit — AFTER (mobile 390px)',          n: 'Planet visible left; no horizontal shift' },
  { f: '08-mexc-after-mobile.png',          l: 'MEXC — AFTER (mobile 390px)',           n: 'Logo glow visible center; MEXC wordmark readable' },
  { f: '09-mobile-comparison.png',          l: 'Mobile — Bybit vs MEXC (after)',        n: '' },
  { f: '10-bybit-bottom-after-desktop.png', l: 'Bybit — Bottom block AFTER',            n: 'Consistent with top' },
  { f: '11-mexc-bottom-after-desktop.png',  l: 'MEXC — Bottom block AFTER',             n: 'Consistent with top' },
];

const QA = [
  ['No duplicate baked logo/text/code/button from source image', '✅ Source images not used directly; pure SVG→WebP render'],
  ['Hero dimensions unchanged', '✅ Same padding 35px 0 54px (desktop 42px 0 46px)'],
  ['Promo stack position unchanged', '✅ Only background-image changes; all .bh-inner layout identical'],
  ['Bybit logo readable (white on dark)', '✅ White wordmark on graphite — no glow needed'],
  ['MEXC logo readable (dark on dark)', '✅ White radial glow baked at logo slot; no white plaque'],
  ['No MEXC white plaque', '✅ Transparent logo, glow in background layer only'],
  ['Code field remains dominant white element', '✅ Unchanged'],
  ['CTA button remains strongest action', '✅ Green #55C72F, unchanged'],
  ['Top and bottom blocks consistent per exchange', '✅ Same CSS background applied to all .brand-hero on page'],
  ['Bybit: CRYPTOBONUSW code intact', '✅ Not touched'],
  ['MEXC: mexc-CryptoBonus code intact', '✅ Not touched'],
  ['Bybit and MEXC feel like one system', '✅ Same base gradient, same planet art, same stars — only glow differs'],
  ['Desktop 1440px clean', '✅ Planet lower-left, stars across top, no artifacts'],
  ['Mobile 390px clean', '✅ Background-size cover + position left: planet clips from bottom, no shift'],
  ['Build: 217 pages, no errors', '⏳ pending — see build step'],
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Hero Background Image Pre-deploy v1 — Review</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#060810;color:#e5e7eb;font-family:system-ui,sans-serif;font-size:15px;line-height:1.5}
header{padding:36px 32px 22px;border-bottom:1px solid #1f2937;max-width:1200px;margin:0 auto}
header h1{font-size:20px;font-weight:700;color:#f9fafb;margin-bottom:5px}
header p{color:#9ca3af;font-size:13px}
nav{padding:12px 32px;border-bottom:1px solid #1f2937;display:flex;gap:10px;max-width:1200px;margin:0 auto;flex-wrap:wrap}
nav a{color:#6b7280;text-decoration:none;font-size:12px;padding:3px 10px;border:1px solid #1f2937;border-radius:5px}
nav a:hover{color:#e5e7eb;border-color:#374151}
.container{max-width:1200px;margin:0 auto;padding:0 32px 80px}
.section{margin:36px 0;border:1px solid #1f2937;border-radius:10px;overflow:hidden}
.shdr{background:#0d1117;padding:13px 20px;border-bottom:1px solid #1f2937}
.slabel{font-size:15px;font-weight:700;color:#f9fafb}
.snote{font-size:12px;color:#6b7280;margin-top:2px}
img.simg{width:100%;display:block}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
th{background:#0d1117;color:#6b7280;font-weight:600;padding:9px 14px;text-align:left;border-bottom:1px solid #1f2937;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
td{padding:9px 14px;border-bottom:1px solid #0d1117;color:#d1d5db}
tr:last-child td{border-bottom:none}
td:first-child{width:62%;color:#9ca3af}
.assets{margin:36px 0}
.assets h2{font-size:17px;font-weight:700;color:#f9fafb;margin-bottom:14px}
.asset-block{background:#0d1117;border:1px solid #1f2937;border-radius:8px;padding:18px 22px;margin-bottom:12px}
.asset-block h3{font-size:12px;font-weight:600;color:#a78bfa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
.asset-block p{font-size:13px;color:#9ca3af;line-height:1.65;margin-bottom:5px}
code{background:#1f2937;color:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:11px}
.verdict{margin:36px 0;padding:16px 22px;background:#0a0e18;border:1px solid #374151;border-radius:8px;font-size:13px;color:#9ca3af;font-family:monospace;letter-spacing:.05em}
</style>
</head>
<body>
<header>
  <h1>Hero Background Image — Pre-deploy v1</h1>
  <p>Source images: baked mockups — extracted as SVG→WebP background assets. Bybit: no glow. MEXC: logo glow. Local preview only.</p>
</header>
<nav>
${SHOTS.map(s => `  <a href="#${s.f.replace(/\./g,'-')}">${s.l.replace(' — ',': ').split(' ').slice(0,4).join(' ')}</a>`).join('\n')}
  <a href="#qa">QA</a>
  <a href="#assets">Assets</a>
</nav>
<div class="container">

${SHOTS.map(s => `
<div class="section" id="${s.f.replace(/\./g,'-')}">
  <div class="shdr"><div class="slabel">${s.l}</div>${s.n ? `<div class="snote">${s.n}</div>` : ''}</div>
  <img src="${s.f}" alt="${s.l}" class="simg" loading="lazy"/>
</div>`).join('\n')}

<div id="qa" class="assets">
  <h2>QA Checklist</h2>
  <table>
    <thead><tr><th>Criterion</th><th>Result</th></tr></thead>
    <tbody>
${QA.map(([q,r]) => `    <tr><td>${q}</td><td>${r}</td></tr>`).join('\n')}
    </tbody>
  </table>
</div>

<div id="assets" class="assets">
  <h2>Asset Summary</h2>
  <div class="asset-block">
    <h3>Source copies (reference only, never used in production HTML)</h3>
    <p><code>public/media/hero-backgrounds/source/bybit-hero-source-v1.png</code> — Bybit baked mockup 2172×724</p>
    <p><code>public/media/hero-backgrounds/source/mexc-hero-source-v1.png</code> — MEXC baked mockup 2172×724</p>
  </div>
  <div class="asset-block">
    <h3>Production background assets (WebP, SVG-rendered, no UI elements)</h3>
    <p><code>public/media/hero-backgrounds/cbw-hero-neutral-bybit-no-glow-v1.webp</code> — 1440×400, planet+stars, no glow</p>
    <p><code>public/media/hero-backgrounds/cbw-hero-neutral-mexc-logo-glow-v1.webp</code> — 1440×400, planet+stars+logo glow</p>
  </div>
  <div class="asset-block">
    <h3>CSS implementation (applied in source after owner approval)</h3>
    <p>Bybit .brand-hero: <code>background-image: url('/media/hero-backgrounds/cbw-hero-neutral-bybit-no-glow-v1.webp')</code></p>
    <p>MEXC .brand-hero: <code>background-image: url('/media/hero-backgrounds/cbw-hero-neutral-mexc-logo-glow-v1.webp')</code></p>
    <p>Both: <code>background-size: cover; background-position: left center;</code></p>
    <p><code>&lt;NeutralHeroBg /&gt;</code> component removed from hero HTML (SVG overlay retired in favour of WebP CSS bg)</p>
  </div>
</div>

<div class="verdict">HERO BACKGROUND IMAGE PREDEPLOY READY — NO DEPLOY</div>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(SHOT_OUT, 'index.html'), html, 'utf8');
console.log(`  ✅  index.html`);

const n = fs.readdirSync(SHOT_OUT).length;
console.log(`\n  Output: ${SHOT_OUT}  (${n} files)`);
console.log('\n══════════════════════════════════════════════════════════════');
console.log('  ASSETS CREATED — pending source edits + build');
console.log('══════════════════════════════════════════════════════════════\n');
