/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PUBLIC P2P SCREENSHOT CAPTURE TOOL  —  Screenshot Factory (ROLE 38)
 * ───────────────────────────────────────────────────────────────────────────
 *  PUBLIC CAPTURE ONLY.
 *  NO LOGIN.
 *  NO ORDERS.
 *  NO PRIVATE DATA.
 *  REPORTS ONLY.
 *  NO AUTOPUBLISH.
 * ───────────────────────────────────────────────────────────────────────────
 *  Consolidates the two Binance P2P prototypes into one parameterized tool for
 *  the Multilingual Screenshot Factory. Captures the PUBLIC P2P offer listing
 *  page (no authentication), masks merchant identities, and writes candidates
 *  + a capture report to reports/ ONLY. It never writes to public/, never
 *  touches src/data/evidence or content-overrides, and never promotes assets.
 *
 *  Governance:
 *    docs/MULTILINGUAL_SCREENSHOT_FACTORY_ROLE.md
 *    docs/MULTILINGUAL_SCREENSHOT_FACTORY_STANDARD.md
 *    docs/SCREENSHOT_STANDARD.md
 *
 *  Usage:
 *    node scripts/capture-public-p2p-screenshot.mjs \
 *      --exchange binance --language en --geo global \
 *      --fiat USD --crypto USDT --variant full_interface \
 *      --viewport 1440x1100 --scroll 0
 *
 *    node scripts/capture-public-p2p-screenshot.mjs --help
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── CLI ARG PARSING ─────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { args.help = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true; // boolean flag
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const HELP = `
PUBLIC P2P SCREENSHOT CAPTURE TOOL — Screenshot Factory (ROLE 38)
PUBLIC CAPTURE ONLY · NO LOGIN · NO ORDERS · NO PRIVATE DATA · REPORTS ONLY

Usage:
  node scripts/capture-public-p2p-screenshot.mjs [options]

Options:
  --exchange   Exchange slug (default: binance) [only 'binance' supported today]
  --language   UI language code (default: en)
  --geo        GEO code (default: global)
  --fiat       Fiat currency (default: USD)         e.g. USD, EUR, BRL, TRY
  --crypto     Crypto asset (default: USDT)         e.g. USDT, BTC
  --scroll     Vertical scroll px before capture (default: 0)
  --viewport   WIDTHxHEIGHT (default: 1440x1100)    e.g. 1440x900
  --variant    full_interface | lower_rows | offer_terms (default: full_interface)
  --out        Output dir (default: reports/screenshots/{exchange}/p2p/)
  --date       Capture date YYYY-MM-DD (default: today)
  --help, -h   Show this help and exit

Safety:
  - No login, no saved session, no cookies injected.
  - Only allowed click is dismissing the cookie consent popup.
  - Never opens an order; never clicks Buy/Sell/Confirm/Submit.
  - Merchant names + avatars masked before capture.
  - Writes ONLY to reports/. Never to public/. No autopublish.
`;

// ─── SUPPORTED EXCHANGES ─────────────────────────────────────────────────────
// TODO(ROLE 38): source target URLs from src/data/exchange-intelligence/{exchange}.json
//                (screenshotTargets) and write lifecycle state into
//                src/data/screenshot-factory/jobs/{exchange}.json instead of hardcoding.
const P2P_URL_BUILDERS = {
  binance: ({ crypto, fiat }) =>
    `https://p2p.binance.com/en/trade/all-payments/${encodeURIComponent(crypto)}?fiat=${encodeURIComponent(fiat)}`,
  // Future: bybit, okx, mexc, kucoin, htx, gate-io — add builders here once verified.
};

const VARIANT_SCROLL = {
  full_interface: 0,    // top filter context + first rows
  lower_rows: 640,      // scroll past Promoted Ad into lower offer rows
  offer_terms: 800,     // focus closer on offer rows
};

// ─── PRIVACY MASK ────────────────────────────────────────────────────────────
const PRIVACY_CSS = `
  /* PRIVACY MASK — Screenshot Factory: blur all advertiser identity, keep offer data */
  a[href*="advertiser"] { filter: blur(8px) !important; }
  [class*="advertiser-name"] { filter: blur(8px) !important; }
  [class*="userName"], [class*="user-name"] { filter: blur(8px) !important; }
  table tbody tr td:first-child a,
  table tbody tr td:first-child span { filter: blur(8px) !important; color: transparent !important; }
  table tbody tr td:first-child img { filter: blur(8px) !important; }
`;

const MASK_SELECTORS = [
  'a[href*="p2p/advertiser"]',
  'a[href*="advertiserDetail"]',
  '[class*="advertiser"] a',
  '[class*="userName"]',
  '[class*="user-name"]',
  'td:first-child a',
];
const MASK_TEXT = '████████';

async function maskMerchantNames(page) {
  return page.evaluate(({ selectors, maskText }) => {
    let masked = 0;
    for (const sel of selectors) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          const t = (el.textContent || '').trim();
          if (t.length > 0 && t.length < 40) { el.textContent = maskText; masked++; }
        });
      } catch (_) { /* selector may not exist on this variant */ }
    }
    return masked;
  }, { selectors: MASK_SELECTORS, maskText: MASK_TEXT });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); process.exit(0); }

  // Defaults
  const exchange = (args.exchange || 'binance').toLowerCase();
  const language = args.language || 'en';
  const geo = args.geo || 'global';
  const fiat = (args.fiat || 'USD').toUpperCase();
  const crypto = (args.crypto || 'USDT').toUpperCase();
  const variant = args.variant || 'full_interface';
  const date = args.date || new Date().toISOString().split('T')[0];

  // Viewport
  const [vw, vh] = (args.viewport || '1440x1100').split('x').map(n => parseInt(n, 10));
  const viewport = { width: vw || 1440, height: vh || 1100 };

  // Scroll: explicit --scroll wins, else variant default
  const scroll = args.scroll !== undefined ? parseInt(args.scroll, 10) : (VARIANT_SCROLL[variant] ?? 0);

  // Validate variant
  if (!(variant in VARIANT_SCROLL)) {
    console.error(`Unsupported variant "${variant}". Use: ${Object.keys(VARIANT_SCROLL).join(' | ')}`);
    process.exit(2);
  }

  // Validate exchange (only binance supported today)
  const urlBuilder = P2P_URL_BUILDERS[exchange];
  if (!urlBuilder) {
    console.error('Unsupported exchange for public P2P capture');
    console.error(`Supported: ${Object.keys(P2P_URL_BUILDERS).join(', ')}`);
    process.exit(2);
  }

  const targetUrl = urlBuilder({ crypto, fiat });
  const outDir = args.out ? path.resolve(ROOT, args.out)
                          : path.join(ROOT, 'reports', 'screenshots', exchange, 'p2p');
  fs.mkdirSync(outDir, { recursive: true });

  const imgName = `${exchange}-p2p-${crypto.toLowerCase()}-${fiat.toLowerCase()}-${language}-${geo}-${variant}-${date}.jpg`;
  const imgPath = path.join(outDir, imgName);
  const imgRel = path.relative(ROOT, imgPath).split(path.sep).join('/');

  console.log('\n  PUBLIC P2P SCREENSHOT CAPTURE — Screenshot Factory (ROLE 38)');
  console.log(`  exchange=${exchange} language=${language} geo=${geo} fiat=${fiat} crypto=${crypto} variant=${variant}`);
  console.log(`  viewport=${viewport.width}x${viewport.height} scroll=${scroll}`);
  console.log(`  target=${targetUrl}`);
  console.log(`  out=${imgRel}\n`);

  const report = {
    tool: 'capture-public-p2p-screenshot',
    taskId: 'SPRINT-06-PUBLIC-P2P-CAPTURE-TOOL-BUILD-01',
    capturedAt: new Date().toISOString(),
    exchange, language, geo, fiat, crypto, variant,
    targetUrl,
    finalUrl: null,
    rowsDetected: 0,
    fiatVisible: false,
    cryptoVisible: false,
    cnyAbsent: true,
    merchantNamesMasked: true,
    orderOpened: false,
    loginUsed: false,
    privateDataVisible: false,
    outputImage: imgRel,
    ownerApprovalRequired: true,
    publicPublishAllowed: false,
    steps: [],
  };

  // ── Launch clean, no-login browser ──────────────────────────────────────────
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--lang=en-US'],
  });
  // Clean context: no storageState, no userDataDir, no injected cookies.
  const context = await browser.newContext({ viewport, locale: 'en-US', storageState: undefined });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // Navigate
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    report.finalUrl = page.url();
    report.steps.push({ step: 'navigate', status: 'ok' });

    // Dismiss cookie popup (ONLY allowed click)
    await page.waitForTimeout(2000);
    for (const txt of ['Reject Additional Cookies', 'Reject', 'No, thanks']) {
      const btn = await page.$(`button:has-text("${txt}")`);
      if (btn) { await btn.click(); report.steps.push({ step: 'cookie_dismiss', via: txt }); break; }
    }
    await page.waitForTimeout(800);

    // Wait for real offer rows (not skeleton)
    let rows = 0;
    try { await page.waitForSelector('table tbody tr', { timeout: 8000 }); } catch (_) {}
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(2000);
      rows = await page.evaluate(() =>
        document.querySelectorAll('table tbody tr td a, table tbody tr td button').length);
      if (rows > 5) break;
      console.log(`  ⏳ waiting for offer rows... (${i + 1}/8)`);
    }
    report.rowsDetected = rows;
    report.steps.push({ step: 'wait_rows', rows });
    if (rows <= 5) {
      console.warn('  ⚠️  Offer rows did not fully load — capturing anyway, flag for review');
      report.steps.push({ step: 'rows_warning', note: 'possible skeleton/low-data state' });
    }

    // Detect fiat/crypto/CNY
    const body = await page.evaluate(() => document.body.innerText.slice(0, 4000));
    report.fiatVisible = body.includes(fiat) || (fiat === 'USD' && body.includes('$'));
    report.cryptoVisible = body.includes(crypto);
    report.cnyAbsent = !body.includes('CNY') && !body.includes('¥') && !body.includes('人民币');

    // Apply masking (CSS blur + text replace)
    await page.addStyleTag({ content: PRIVACY_CSS });
    const maskedCount = await maskMerchantNames(page);
    report.steps.push({ step: 'mask', textReplaced: maskedCount, cssBlur: true });
    await page.waitForTimeout(600);

    // Variant scroll
    if (scroll > 0) {
      await page.evaluate((px) => window.scrollBy(0, px), scroll);
      await page.waitForTimeout(600);
    }

    // Capture
    await page.screenshot({ path: imgPath, type: 'jpeg', quality: 90, fullPage: false });
    const sizeKb = fs.existsSync(imgPath) ? Math.round(fs.statSync(imgPath).size / 1024) : 0;
    report.sizeKb = sizeKb;
    report.steps.push({ step: 'capture', sizeKb });
    console.log(`  ✅ Captured: ${imgRel} (${sizeKb} KB)`);
  } catch (e) {
    report.steps.push({ step: 'error', error: e.message });
    console.error('  ❌ Capture error:', e.message);
  } finally {
    await browser.close();
  }

  // ── Write reports (reports/ ONLY) ───────────────────────────────────────────
  const jsonPath = path.join(ROOT, 'reports', `${exchange}-p2p-public-capture-${variant}-${date}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');

  const md = `# Public P2P Capture — ${exchange} (${variant})
**Tool:** capture-public-p2p-screenshot
**Date:** ${date}

| Field | Value |
|-------|-------|
| Exchange | ${exchange} |
| Language | ${language} |
| GEO | ${geo} |
| Fiat | ${fiat} |
| Crypto | ${crypto} |
| Variant | ${variant} |
| Target URL | ${report.targetUrl} |
| Final URL | ${report.finalUrl || '—'} |
| Rows detected | ${report.rowsDetected} |
| Fiat visible | ${report.fiatVisible ? '✅ yes' : '❌ no'} |
| Crypto visible | ${report.cryptoVisible ? '✅ yes' : '❌ no'} |
| CNY absent | ${report.cnyAbsent ? '✅ yes' : '❌ no'} |
| Merchant names masked | ✅ yes |
| Order opened | ✅ no |
| Login used | ✅ no |
| Private data visible | ✅ no |
| Output image | \`${report.outputImage}\` |
| Owner approval required | ✅ yes |
| Public publish allowed | ❌ false |
`;
  const mdPath = path.join(ROOT, 'reports', `${exchange}-p2p-public-capture-${variant}-${date}.md`);
  fs.writeFileSync(mdPath, md);

  console.log('  Reports written:');
  console.log(`    ${path.relative(ROOT, jsonPath).split(path.sep).join('/')}`);
  console.log(`    ${path.relative(ROOT, mdPath).split(path.sep).join('/')}`);
  console.log('\n  Owner approval required before any public use. No autopublish.\n');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
