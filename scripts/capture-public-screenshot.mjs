#!/usr/bin/env node
/**
 * capture-public-screenshot.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Public Screenshot Capture — CryptoBonusWorld
 *
 * PURPOSE:
 *   Captures public (unauthenticated) screenshots of exchange pages for
 *   editorial evidence. Supports multiple categories: registration/bonus
 *   landing, fees, spot trading, P2P marketplace, proof of reserves.
 *
 *   ALL captured pages are PUBLIC — no login, no personal data, no financial
 *   actions. Outputs to reports/ staging area for owner review before any
 *   file is copied to public/.
 *
 * DEFAULT MODE: DRY RUN
 *   Prints the capture plan without visiting any pages.
 *
 * ─── FLAGS ────────────────────────────────────────────────────────────────────
 *   --dry-run           Print plan only (default, no browser launched)
 *   --live              Enable live capture (requires guard flags)
 *   --confirm-live      Required alongside --live
 *   --exchange <slug>   Target exchange (okx | mexc | bitget)
 *   --category <cat>    Target category (see ALLOWED_CATEGORIES)
 *   --batch <name>      Run a named batch (p1-public)
 *   --force             Overwrite existing screenshots
 *   --verbose           Extra debug output
 *
 * ─── OUTPUT ───────────────────────────────────────────────────────────────────
 *   reports/public-screenshots-staged/{exchange}/{category}/YYYY-MM-DD.webp
 *   reports/public-screenshots-staged/{exchange}/{category}/YYYY-MM-DD.json
 *   reports/public-screenshots-staged/public-screenshot-batch-YYYY-MM-DD.json
 *   reports/public-screenshots-staged/public-screenshot-batch-YYYY-MM-DD.md
 *
 * ─── GOVERNANCE ───────────────────────────────────────────────────────────────
 *   See docs/SCREENSHOT_COVERAGE_MATRIX.md for full rules.
 *   Public screenshots require owner review before being moved to public/.
 *
 * ─── SAFETY ───────────────────────────────────────────────────────────────────
 *   ✅ No login performed
 *   ✅ No forms submitted
 *   ✅ No user data entered
 *   ✅ No captchas bypassed
 *   ✅ Only public pages visited
 *   ✅ Blocked/login-required pages are flagged, not bypassed
 *   ✅ No evidence facts modified
 *   ✅ No automatic publishing to public/
 */

import fs     from 'node:fs';
import path   from 'node:path';
import crypto from 'node:crypto';
import { createRequire }   from 'node:module';
import { fileURLToPath }   from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

const _require = createRequire(import.meta.url);
let sharp;
try { sharp = _require('sharp'); } catch { sharp = null; }

// ─── CLI flags ──────────────────────────────────────────────────────────────────
const args         = process.argv.slice(2);
const DRY_RUN      = args.includes('--dry-run') || (!args.includes('--live'));
const LIVE         = args.includes('--live');
const CONFIRM      = args.includes('--confirm-live');
const FORCE        = args.includes('--force');
const VERBOSE      = args.includes('--verbose');

const exchIdx      = args.indexOf('--exchange');
const EXCH_ARG     = exchIdx !== -1 ? args[exchIdx + 1] : null;

const catIdx       = args.indexOf('--category');
const CAT_ARG      = catIdx !== -1 ? args[catIdx + 1] : null;

const batchIdx     = args.indexOf('--batch');
const BATCH_ARG    = batchIdx !== -1 ? args[batchIdx + 1] : null;

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);

// ─── Constants ──────────────────────────────────────────────────────────────────
const TODAY_STR    = new Date().toISOString().split('T')[0];
const UA_DESKTOP   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const VIEWPORT     = { width: 1440, height: 900 };

// ─── Governance constraints ────────────────────────────────────────────────────

const ALLOWED_EXCHANGES = new Set(['okx', 'mexc', 'bitget']);

const ALLOWED_CATEGORIES = new Set([
  'registration',
  'bonus_referral_landing',
  'fees',
  'spot',
  'p2p',
  'proof_of_reserves',
]);

// ─── URL catalogue ─────────────────────────────────────────────────────────────
// Derived from evidence/{slug}.json sources + known public URL patterns.
// Only confirmed-public, non-authenticated URLs. No guessing.

const PUBLIC_URLS = {
  okx: {
    registration:           'https://okx.com/join/CRYPTOBONUSW',
    bonus_referral_landing: 'https://okx.com/join/CRYPTOBONUSW',
    fees:                   'https://www.okx.com/fees',
    // OKX EU serves different URL structures than OKX global.
    // trade/btc-usdt and p2p-markets both 404 on EU. Correct URLs TBD — marked null.
    spot:                   null,
    p2p:                    null,
    proof_of_reserves:      'https://www.okx.com/proof-of-reserves',
  },
  mexc: {
    registration:           'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus',
    bonus_referral_landing: 'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus',
    fees:                   'https://www.mexc.com/fee',
    spot:                   'https://www.mexc.com/exchange/BTC_USDT',
    p2p:                    'https://www.mexc.com/otc/',
    proof_of_reserves:      null,  // MEXC does not publish a public PoR page
  },
  bitget: {
    registration:           'https://partner.bitget.com/bg/CryptoBonW',
    bonus_referral_landing: 'https://partner.bitget.com/bg/CryptoBonW',
    fees:                   'https://www.bitget.com/fee',
    spot:                   'https://www.bitget.com/spot/BTCUSDT',
    p2p:                    null,  // Bitget P2P URL not confirmed in evidence
    proof_of_reserves:      'https://www.bitget.com/proof-of-reserves',
  },
};

// ─── Batch definitions ─────────────────────────────────────────────────────────

const BATCHES = {
  'p1-public': [
    { exchange: 'okx',    category: 'registration'           },
    { exchange: 'okx',    category: 'bonus_referral_landing' },
    { exchange: 'okx',    category: 'fees'                   },
    { exchange: 'okx',    category: 'proof_of_reserves'      },
    { exchange: 'okx',    category: 'spot'                   },
    { exchange: 'okx',    category: 'p2p'                    },
    { exchange: 'mexc',   category: 'fees'                   },
    { exchange: 'mexc',   category: 'spot'                   },
    { exchange: 'bitget', category: 'registration'           },
    { exchange: 'bitget', category: 'fees'                   },
  ],
};

// ─── Block detection patterns ──────────────────────────────────────────────────

const BLOCK_PATTERNS = [
  { type: 'captcha',         pattern: /captcha|hcaptcha|recaptcha|challenge|cf-chl/i },
  { type: 'cloudflare',      pattern: /just a moment|cloudflare|checking your browser/i },
  { type: 'login_required',  pattern: /please\s+log\s*in|you must be logged in|sign in to continue|access denied/i },
  { type: 'geo_blocked',     pattern: /not available in your (country|region)|service unavailable.*region|451/i },
  { type: 'app_only',        pattern: /available.*app only|download.*app|open in app/i },
];

// ─── Safe popup close selectors ───────────────────────────────────────────────

const SAFE_DISMISS_TEXT = ['not now','no thanks','no, thanks','maybe later','got it','ok','okay','i understand','dismiss','decline','reject','skip','close','✕','×'];
const FORBIDDEN_CLICK   = /^(sign\s*up|register|create\s+account|continue|login|log\s*in|submit|confirm|deposit|withdraw|buy|sell|trade|transfer|api)/i;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function resolveUrl(exchange, category) {
  return PUBLIC_URLS[exchange]?.[category] ?? null;
}

function resolveStagingPath(exchange, category, date, suffix) {
  const dir = path.join(ROOT, 'reports', 'public-screenshots-staged', exchange, category);
  const base = suffix ? `${date}-${suffix}` : date;
  return {
    dir,
    webp: path.join(dir, `${base}.webp`),
    json: path.join(dir, `${base}.json`),
    relWebp: `reports/public-screenshots-staged/${exchange}/${category}/${base}.webp`,
    relJson: `reports/public-screenshots-staged/${exchange}/${category}/${base}.json`,
  };
}

function getNextAvailablePath(exchange, category, date) {
  const base = resolveStagingPath(exchange, category, date, null);
  if (!fs.existsSync(base.webp)) return base;
  for (let i = 2; i <= 10; i++) {
    const p = resolveStagingPath(exchange, category, date, String(i));
    if (!fs.existsSync(p.webp)) return p;
  }
  return base; // fallback — will overwrite with --force
}

function getPlaywrightVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'playwright', 'package.json'), 'utf8')).version ?? 'unknown';
  } catch { return 'unknown'; }
}

// ─── Safe popup cleanup ────────────────────────────────────────────────────────

async function closeSafePopups(page) {
  const closed = [];

  // 1. Cookie banners
  const cookieSelectors = [
    '#onetrust-accept-btn-handler', '.onetrust-accept-btn-handler',
    '[class*="cookie"] button[class*="accept"]', '.cc-btn.cc-allow',
  ];
  for (const sel of cookieSelectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      const text = (await el.textContent() ?? '').trim().toLowerCase();
      if (FORBIDDEN_CLICK.test(text)) continue;
      await el.click({ timeout: 3000 }).catch(() => {});
      closed.push(`cookie:${text.slice(0, 20)}`);
      await page.waitForTimeout(400).catch(() => {});
      break;
    } catch { /* non-fatal */ }
  }

  // 2. Google One Tap — hide via JS
  try {
    const tap = await page.$('#credential_picker_container, [id*="credential_picker"]');
    if (tap) {
      await page.evaluate(() => {
        document.querySelectorAll('#credential_picker_container,[id*="credential_picker"]').forEach(el => el.remove());
      }).catch(() => {});
      closed.push('google_one_tap');
    }
  } catch { /* non-fatal */ }

  // 3. Modal close buttons
  const closeSelectors = [
    'button[aria-label="Close"]','button[aria-label="close"]',
    '[class*="modal"] button[class*="close"]','[class*="dialog"] button[class*="close"]',
    '[class*="popup"] button[class*="close"]','.btn-close','[class*="modal__close"]',
  ];
  for (const sel of closeSelectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      const visible = await el.isVisible().catch(() => false);
      if (!visible) continue;
      const text = (await el.textContent() ?? '').trim();
      if (FORBIDDEN_CLICK.test(text)) continue;
      await el.click({ timeout: 3000 }).catch(() => {});
      closed.push(`modal:${sel.slice(0, 30)}`);
      await page.waitForTimeout(400).catch(() => {});
    } catch { /* non-fatal */ }
  }

  // 4. Text-matched dismiss buttons
  try {
    const buttons = await page.$$('button,[role="button"]');
    for (const btn of buttons) {
      try {
        const visible = await btn.isVisible().catch(() => false);
        if (!visible) continue;
        const text = (await btn.textContent() ?? '').trim().toLowerCase();
        if (!text || text.length > 25) continue;
        if (FORBIDDEN_CLICK.test(text)) continue;
        if (!SAFE_DISMISS_TEXT.some(s => text === s || text.includes(s))) continue;
        await btn.click({ timeout: 3000 }).catch(() => {});
        closed.push(`dismiss:${text}`);
        await page.waitForTimeout(400).catch(() => {});
        break;
      } catch { /* non-fatal */ }
    }
  } catch { /* non-fatal */ }

  return closed;
}

// ─── Block / login detection ───────────────────────────────────────────────────

async function detectBlocks(page, httpStatus) {
  const issues = [];

  // HTTP error codes
  if (httpStatus === 403) issues.push({ type: 'http_403', severity: 'blocked' });
  if (httpStatus === 404) issues.push({ type: 'http_404', severity: 'blocked' });
  if (httpStatus === 451) issues.push({ type: 'http_451_geo_blocked', severity: 'blocked' });

  // Page text scan
  try {
    const text = await page.evaluate(() => (document.body?.innerText ?? '').slice(0, 3000)).catch(() => '');
    for (const { type, pattern } of BLOCK_PATTERNS) {
      if (pattern.test(text)) {
        issues.push({ type, severity: type === 'captcha' || type === 'cloudflare' ? 'blocked' : 'needs_review' });
      }
    }

    // Login gate via URL change
    const url = page.url();
    if (/login|signin|sign-in|auth\//.test(url)) {
      issues.push({ type: 'login_redirect', severity: 'blocked' });
    }

    // Empty page
    if (text.trim().length < 100) {
      issues.push({ type: 'empty_page', severity: 'needs_review' });
    }
  } catch { /* non-fatal */ }

  return issues;
}

// ─── Single capture ────────────────────────────────────────────────────────────

async function captureOne(exchange, category, targetUrl) {
  const paths = FORCE
    ? resolveStagingPath(exchange, category, TODAY_STR, null)
    : getNextAvailablePath(exchange, category, TODAY_STR);

  fs.mkdirSync(paths.dir, { recursive: true });

  // Skip if exists and not forcing
  if (!FORCE && fs.existsSync(paths.webp)) {
    log(`  ⏭  ${exchange}/${category} — already exists (${paths.relWebp}). Pass --force to overwrite.`);
    return {
      exchange, category, sourceUrl: targetUrl, status: 'skipped_exists',
      screenshotPath: paths.relWebp, manualReviewRequired: false,
      publishCandidate: true, blocked: false, notes: 'Existing screenshot preserved.',
    };
  }

  log(`  📸 ${exchange}/${category}`);
  log(`     URL: ${targetUrl}`);

  const pwVer = getPlaywrightVersion();
  let browser, context, page;
  let httpStatus = null, finalUrl = targetUrl, pageTitle = null;
  let popupsClosed = [], blockIssues = [], captureError = null;
  let screenshotSaved = false;

  try {
    const pw = await import('playwright');
    browser   = await pw.chromium.launch({ headless: true });
    context   = await browser.newContext({
      userAgent:    UA_DESKTOP,
      viewport:     VIEWPORT,
      locale:       'en-US',
      timezoneId:   'America/New_York',
      permissions:  [],
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });
    await context.grantPermissions([]);
    page = await context.newPage();

    page.on('response', resp => {
      if (resp.url() === targetUrl || resp.url().startsWith(targetUrl.split('?')[0])) {
        httpStatus = resp.status();
      }
    });

    dbg(`Navigating: ${targetUrl}`);
    const resp = await page.goto(targetUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
    if (resp) { httpStatus = resp.status(); finalUrl = page.url(); }

    // Wait for hydration
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    pageTitle = await page.title().catch(() => null);
    dbg(`  title: ${pageTitle}`);
    dbg(`  final url: ${finalUrl}`);
    dbg(`  status: ${httpStatus}`);

    // Block detection BEFORE popup cleanup (don't interact with blocked pages)
    blockIssues = await detectBlocks(page, httpStatus);
    const hardBlocked = blockIssues.some(b => b.severity === 'blocked');
    if (hardBlocked) {
      log(`     🚫 Blocked (${blockIssues.map(b => b.type).join(', ')})`);
      // Still take a screenshot of the blocked state as evidence
    }

    if (!hardBlocked) {
      popupsClosed = await closeSafePopups(page);
      if (popupsClosed.length) {
        dbg(`  popups closed: ${popupsClosed.join(', ')}`);
        await page.waitForTimeout(1500).catch(() => {});
      }
      // Extra wait for JS-rendered content
      await page.waitForTimeout(2000).catch(() => {});
    }

    // Take screenshot — always PNG first, then convert if sharp available
    const pngPath = paths.webp.replace(/\.webp$/i, '.png');
    await page.screenshot({ path: pngPath, type: 'png', fullPage: false });

    if (sharp) {
      await sharp(pngPath).webp({ quality: 90 }).toFile(paths.webp);
      fs.unlinkSync(pngPath);
    } else {
      fs.renameSync(pngPath, paths.webp);
    }
    screenshotSaved = true;
    const sz = (fs.statSync(paths.webp).size / 1024).toFixed(1);
    log(`     ✅ Saved ${sz} KB — ${paths.relWebp}`);

  } catch (e) {
    captureError = e.message ?? String(e);
    console.error(`     ❌ ${captureError.slice(0, 120)}`);
  } finally {
    try { await page?.close(); }    catch { /* ignore */ }
    try { await context?.close(); } catch { /* ignore */ }
    try { await browser?.close(); } catch { /* ignore */ }
  }

  // Hash for change detection
  let screenshotHash = null;
  if (screenshotSaved) {
    try { screenshotHash = crypto.createHash('sha256').update(fs.readFileSync(paths.webp)).digest('hex').slice(0, 16); }
    catch { /* non-fatal */ }
  }

  const blocked       = blockIssues.some(b => b.severity === 'blocked');
  const captchaDetect = blockIssues.some(b => b.type === 'captcha' || b.type === 'cloudflare');
  const loginDetect   = blockIssues.some(b => b.type === 'login_required' || b.type === 'login_redirect');
  const needsReview   = blocked || !!captureError || blockIssues.some(b => b.severity === 'needs_review');

  const meta = {
    exchange, category,
    sourceUrl:             targetUrl,
    finalUrl,
    httpStatus,
    pageTitle,
    viewport:              VIEWPORT,
    capturedAt:            new Date().toISOString(),
    playwrightVersion:     getPlaywrightVersion(),
    userAgent:             UA_DESKTOP,
    screenshotPath:        screenshotSaved ? paths.relWebp : null,
    screenshotHash,
    popupsClosed,
    blocked,
    captchaDetected:       captchaDetect,
    loginRequiredDetected: loginDetect,
    blockIssues,
    personalDataRisk:      'none',
    publishCandidate:      screenshotSaved && !blocked && !captureError,
    manualReviewRequired:  needsReview,
    captureError:          captureError ?? null,
    notes: captureError
      ? `Capture failed: ${captureError.slice(0, 200)}`
      : blocked
        ? `Page blocked: ${blockIssues.map(b => b.type).join(', ')}`
        : 'Public page captured successfully.',
    safetyNotes: [
      'No login performed', 'No forms submitted', 'No evidence facts modified',
      'Output to reports/ staging area only', 'Manual review required before publishing',
    ],
  };

  fs.writeFileSync(paths.json, JSON.stringify(meta, null, 2), 'utf8');
  dbg(`  metadata written: ${paths.relJson}`);

  return {
    ...meta,
    status: captureError ? 'error' : blocked ? 'blocked' : 'captured',
  };
}

// ─── Build batch plan ──────────────────────────────────────────────────────────

function buildCaptureList() {
  // Single exchange+category
  if (LIVE && EXCH_ARG && CAT_ARG && !BATCH_ARG) {
    if (!ALLOWED_EXCHANGES.has(EXCH_ARG)) throw new Error(`Exchange not allowed: "${EXCH_ARG}". Allowed: ${[...ALLOWED_EXCHANGES].join(', ')}`);
    if (!ALLOWED_CATEGORIES.has(CAT_ARG)) throw new Error(`Category not allowed: "${CAT_ARG}". Allowed: ${[...ALLOWED_CATEGORIES].join(', ')}`);
    return [{ exchange: EXCH_ARG, category: CAT_ARG }];
  }
  // Named batch
  if (BATCH_ARG) {
    const batch = BATCHES[BATCH_ARG];
    if (!batch) throw new Error(`Unknown batch: "${BATCH_ARG}". Available: ${Object.keys(BATCHES).join(', ')}`);
    return batch;
  }
  if (LIVE) throw new Error('Live mode requires --exchange + --category, or --batch <name>');
  return []; // dry-run: empty
}

// ─── Write batch report ────────────────────────────────────────────────────────

function writeBatchReport(results, attempted) {
  const outDir  = path.join(ROOT, 'reports', 'public-screenshots-staged');
  const jsonPath = path.join(outDir, `public-screenshot-batch-${TODAY_STR}.json`);
  const mdPath   = path.join(outDir, `public-screenshot-batch-${TODAY_STR}.md`);

  const captured     = results.filter(r => r.status === 'captured');
  const blocked      = results.filter(r => r.status === 'blocked');
  const errored      = results.filter(r => r.status === 'error');
  const skipped      = results.filter(r => r.status === 'skipped_exists' || r.status === 'missing_url');
  const candidates   = results.filter(r => r.publishCandidate);
  const needsReview  = results.filter(r => r.manualReviewRequired);

  const report = {
    generatedAt: new Date().toISOString(),
    batchName: BATCH_ARG ?? 'single',
    date: TODAY_STR,
    attempted: attempted.length,
    captured: captured.length,
    blocked: blocked.length,
    errored: errored.length,
    skipped: skipped.length,
    publishCandidates: candidates.length,
    needsManualReview: needsReview.length,
    results,
    publishCandidateList: candidates.map(r => ({
      path: r.screenshotPath,
      exchange: r.exchange,
      category: r.category,
      pageTitle: r.pageTitle,
      httpStatus: r.httpStatus,
    })),
  };

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  const lines = [];
  lines.push(`# Public Screenshot Batch Report — ${TODAY_STR}`);
  lines.push('');
  lines.push(`> Batch: \`${BATCH_ARG ?? 'single'}\` | Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Attempted | ${attempted.length} |`);
  lines.push(`| ✅ Captured | ${captured.length} |`);
  lines.push(`| 🚫 Blocked | ${blocked.length} |`);
  lines.push(`| ❌ Error | ${errored.length} |`);
  lines.push(`| ⏭ Skipped | ${skipped.length} |`);
  lines.push(`| 📤 Publish candidates | ${candidates.length} |`);
  lines.push(`| 🔍 Needs manual review | ${needsReview.length} |`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push('| Exchange | Category | Status | HTTP | Publish? | Path |');
  lines.push('|----------|----------|--------|------|----------|------|');
  for (const r of results) {
    const icon = { captured: '✅', blocked: '🚫', error: '❌', skipped_exists: '⏭', missing_url: '⚠️' }[r.status] ?? '?';
    const path_ = r.screenshotPath ? `\`${r.screenshotPath.split('/').pop()}\`` : '—';
    lines.push(`| ${r.exchange} | \`${r.category}\` | ${icon} ${r.status} | ${r.httpStatus ?? '—'} | ${r.publishCandidate ? '✅' : '❌'} | ${path_} |`);
  }
  lines.push('');
  lines.push('## Publish Candidates');
  lines.push('');
  if (candidates.length === 0) {
    lines.push('_No publish candidates in this batch._');
  } else {
    lines.push('The following screenshots are recommended for owner review and publication to `public/screenshots/`:');
    lines.push('');
    for (const r of candidates) {
      lines.push(`- **${r.exchange}/${r.category}** — \`${r.screenshotPath}\``);
      lines.push(`  - HTTP ${r.httpStatus} | Title: ${r.pageTitle ?? '—'}`);
    }
  }
  lines.push('');
  if (needsReview.length > 0) {
    lines.push('## Needs Manual Review');
    lines.push('');
    for (const r of needsReview) {
      lines.push(`- **${r.exchange}/${r.category}** — ${r.notes}`);
    }
    lines.push('');
  }
  lines.push('## Safety Notes');
  lines.push('');
  lines.push('- ✅ No logins performed');
  lines.push('- ✅ No forms submitted');
  lines.push('- ✅ No evidence facts modified');
  lines.push('- ✅ All output to `reports/` staging area');
  lines.push('- ✅ No screenshots auto-published to `public/`');
  lines.push('');
  lines.push('*To publish: copy approved screenshots to `public/screenshots/{exchange}/{category}/` and update evidence registry.*');

  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
  return { jsonPath, mdPath };
}

// ─── Main ───────────────────────────────────────────────────────────────────────

log('');
log('══════════════════════════════════════════════════════════════');
log('  Public Screenshot Capture');
log('══════════════════════════════════════════════════════════════');

if (DRY_RUN && !LIVE) {
  // ── DRY RUN ─────────────────────────────────────────────────────────────────
  const batch = BATCHES['p1-public'];
  log(`  Mode:        DRY RUN — no pages visited`);
  log(`  Date:        ${TODAY_STR}`);
  log('');
  log('  Available batches:');
  for (const [name, items] of Object.entries(BATCHES)) {
    log(`    ${name} (${items.length} captures)`);
  }
  log('');
  log('  p1-public batch plan:');
  log('');
  log('  | # | Exchange | Category | URL |');
  log('  |---|----------|----------|-----|');
  for (let i = 0; i < batch.length; i++) {
    const { exchange, category } = batch[i];
    const url = resolveUrl(exchange, category);
    const urlShort = url ? url.replace('https://', '').slice(0, 50) : 'MISSING';
    log(`  | ${i+1} | ${exchange.padEnd(7)} | ${category.padEnd(22)} | ${urlShort} |`);
  }
  log('');
  log('  Output staging directory:');
  log('    reports/public-screenshots-staged/{exchange}/{category}/');
  log('');
  log('  To run live capture:');
  log('    npm run capture:public:p1');
  log('    OR: node scripts/capture-public-screenshot.mjs --live --confirm-live --exchange okx --category fees');
  log('');
  log('  See docs/SCREENSHOT_COVERAGE_MATRIX.md for governance rules.');
  log('');
  process.exit(0);
}

// ── LIVE MODE GUARD ────────────────────────────────────────────────────────────
log('');
log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('   LIVE MODE GUARD');
log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const guardErrors = [];
if (!CONFIRM) guardErrors.push('Missing --confirm-live');
if (!BATCH_ARG && !EXCH_ARG) guardErrors.push('Missing --exchange <slug> or --batch <name>');
if (!BATCH_ARG && !CAT_ARG && EXCH_ARG) guardErrors.push('Missing --category <cat> (required for single capture)');
if (EXCH_ARG && !ALLOWED_EXCHANGES.has(EXCH_ARG)) guardErrors.push(`Exchange not in allowed list: ${EXCH_ARG}`);
if (CAT_ARG && !ALLOWED_CATEGORIES.has(CAT_ARG)) guardErrors.push(`Category not in allowed list: ${CAT_ARG}`);
if (BATCH_ARG && !BATCHES[BATCH_ARG]) guardErrors.push(`Unknown batch: ${BATCH_ARG}`);

if (guardErrors.length > 0) {
  log('  ❌ GUARD REJECTED:');
  for (const e of guardErrors) log(`     ✖  ${e}`);
  log('');
  process.exit(1);
}
log(`  ✅ Guard passed.`);
log('');

// ── Build capture list ─────────────────────────────────────────────────────────
let captureList;
try { captureList = buildCaptureList(); }
catch (e) { console.error(`  ✖ ${e.message}`); process.exit(1); }

log(`  Captures planned: ${captureList.length}`);
log('');

// ── Run captures ───────────────────────────────────────────────────────────────
const results = [];
const outDir = path.join(ROOT, 'reports', 'public-screenshots-staged');
fs.mkdirSync(outDir, { recursive: true });

for (const { exchange, category } of captureList) {
  const url = resolveUrl(exchange, category);
  if (!url) {
    log(`  ⚠️  ${exchange}/${category} — no URL in catalogue (skipping)`);
    results.push({
      exchange, category,
      status: 'missing_url', sourceUrl: null, finalUrl: null,
      httpStatus: null, pageTitle: null, screenshotPath: null,
      blocked: false, captchaDetected: false, loginRequiredDetected: false,
      publishCandidate: false, manualReviewRequired: false,
      personalDataRisk: 'none',
      notes: 'No public URL found for this exchange/category combination.',
    });
    continue;
  }

  try {
    const result = await captureOne(exchange, category, url);
    results.push(result);
  } catch (e) {
    console.error(`  ❌ Unexpected error for ${exchange}/${category}: ${e.message}`);
    results.push({
      exchange, category, status: 'error', sourceUrl: url,
      finalUrl: null, httpStatus: null, pageTitle: null, screenshotPath: null,
      blocked: false, captchaDetected: false, loginRequiredDetected: false,
      publishCandidate: false, manualReviewRequired: true,
      personalDataRisk: 'none',
      captureError: e.message,
      notes: `Unexpected error: ${e.message.slice(0, 200)}`,
    });
  }

  // Stagger between captures
  if (captureList.length > 1) {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

// ── Summary ────────────────────────────────────────────────────────────────────
const captured   = results.filter(r => r.status === 'captured').length;
const blocked    = results.filter(r => r.status === 'blocked').length;
const errored    = results.filter(r => r.status === 'error').length;
const missing    = results.filter(r => r.status === 'missing_url').length;
const candidates = results.filter(r => r.publishCandidate).length;

log('');
log('  ═══════════════════════════════════════════════════════════');
log(`   BATCH COMPLETE — ${BATCH_ARG ?? `${EXCH_ARG}/${CAT_ARG}`}`);
log(`   Captured:   ${captured} / ${captureList.length}`);
log(`   Blocked:    ${blocked}`);
log(`   Errors:     ${errored}`);
log(`   Missing URL: ${missing}`);
log(`   Candidates: ${candidates} ready for owner review`);
log('');
log('  ⚠️  Review staged screenshots before publishing to public/');
log('  ✅ No evidence facts modified.');
log('  ✅ No production data changed.');
log('  ═══════════════════════════════════════════════════════════');
log('');

// ── Write batch report ─────────────────────────────────────────────────────────
const { jsonPath, mdPath } = writeBatchReport(results, captureList);
log(`  📄 Batch report JSON: ${jsonPath}`);
log(`  📄 Batch report MD:   ${mdPath}`);
log('');
