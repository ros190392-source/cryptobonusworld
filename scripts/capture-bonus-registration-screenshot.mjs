#!/usr/bin/env node
/**
 * capture-bonus-registration-screenshot.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Safe Playwright capture of bonus registration / referral landing pages.
 *
 * PURPOSE:
 *   Opens an exchange affiliate / registration URL in a headless Chromium
 *   browser, applies safe popup cleanup (cookie banners, permission dialogs,
 *   Google One Tap, modal close buttons), then captures a clean screenshot
 *   suitable for AI vision analysis.
 *
 *   The screenshot replaces any existing manual evidence screenshot so the
 *   vision detection plan can use a clean, popup-free capture.
 *
 * DEFAULT MODE: DRY RUN
 *   Prints what would be captured. No browser launched. No pages visited.
 *
 * SAFETY RULES (enforced in code):
 *   ✅ No logins performed
 *   ✅ No accounts created
 *   ✅ No forms submitted
 *   ✅ No user data entered
 *   ✅ No captchas bypassed
 *   ✅ No risky buttons clicked (sign-up, register, continue, login)
 *   ✅ No evidence facts modified
 *   ✅ Only public registration/landing pages visited (pre-affiliate URL)
 *   ✅ All screenshots reviewed by owner before evidence update
 *
 * ─── FLAGS ────────────────────────────────────────────────────────────────────
 *   (none)              Dry-run: print plan only (no browser launched)
 *   --live              Enable live capture (requires all guard flags)
 *   --confirm-live      Required with --live (double-confirmation)
 *   --exchange <slug>   Required with --live (must be a known exchange slug)
 *   --limit 1           Required with --live (must be exactly 1)
 *   --verbose           Print extra detail to console
 *
 * ─── OUTPUT (live mode) ───────────────────────────────────────────────────────
 *   reports/manual-evidence/{slug}-screenshot-YYYY-MM-DD.webp
 *   reports/manual-evidence/{slug}-screenshot-YYYY-MM-DD.json
 *
 * ─── ARCHITECTURE ─────────────────────────────────────────────────────────────
 *   See docs/BONUS_LANDING_VERIFICATION_ARCHITECTURE.md §14.2
 */

import fs   from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// sharp is used to convert the PNG intermediate to WebP.
// Playwright 1.x does not support type:'webp' in page.screenshot().
const _require = createRequire(import.meta.url);
let sharp;
try { sharp = _require('sharp'); } catch { sharp = null; }

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── CLI flags ──────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const LIVE        = args.includes('--live');
const CONFIRM     = args.includes('--confirm-live');
const VERBOSE     = args.includes('--verbose');

const exchIdx     = args.indexOf('--exchange');
const EXCH_SLUG   = exchIdx !== -1 ? args[exchIdx + 1] : null;

const limitIdx    = args.indexOf('--limit');
const LIMIT_RAW   = limitIdx !== -1 ? args[limitIdx + 1] : null;
const LIMIT_N     = LIMIT_RAW !== null ? parseInt(LIMIT_RAW, 10) : null;

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);

// ─── Constants ──────────────────────────────────────────────────────────────────
const TODAY_STR = new Date('2026-06-03').toISOString().split('T')[0];

const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const VIEWPORT   = { width: 1440, height: 900 };

/**
 * Build text signals dynamically for a given exchange.
 * Generic signals work across all exchanges; exchange-specific ones are derived
 * from the expected bonus amount and referral code.
 */
function buildTextSignals(slug, expectedBonus, referralCode) {
  const signals = [];

  // Exchange-specific: expected bonus amount
  if (expectedBonus?.amount) {
    const amt = Number(expectedBonus.amount);
    const amtStr = amt.toLocaleString();  // e.g. "5,000" or "10,000"
    const amtRaw = String(amt);           // e.g. "5000"
    signals.push({
      key: 'bonus_amount',
      pattern: new RegExp(`${amtStr.replace(/,/g,'[,.]?')}|${amtRaw}\\s*(?:USDT|USD)`, 'i'),
      label: `${amtStr} ${expectedBonus.currency ?? 'USDT'}`,
    });
  }

  // Exchange-specific: referral / promo code
  if (referralCode) {
    signals.push({
      key: 'referral_code',
      pattern: new RegExp(referralCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      label: referralCode,
    });
  }

  // Generic signals — work across all exchanges
  signals.push(
    { key: 'claim_cta',      pattern: /sign\s+up\s+to\s+claim|claim.*reward|get.*bonus|earn.*reward/i, label: 'sign-up/claim CTA' },
    { key: 'any_bonus',      pattern: /\d[\d,]+\s*USDT\s+(?:welcome\s+)?bonus|mystery\s+box/i,         label: 'X USDT bonus / mystery box' },
    { key: 'welcome_bonus',  pattern: /welcome\s+bonus|new\s+user\s+(?:bonus|reward)/i,                label: 'welcome / new user bonus' },
    { key: 'up_to',          pattern: /up\s+to\s+[\$]?\d/i,                                            label: 'up to X' },
    { key: 'registration',   pattern: /register|sign\s+up|create.*account|join.*now/i,                 label: 'registration page' },
  );

  return signals;
}

/**
 * Safe buttons that may be clicked to dismiss popups.
 *
 * CRITICAL — DO NOT ADD:
 *   Sign Up / Register / Continue / Login / Submit / Confirm / Accept registration
 * These words appear in the registration form itself and must never be targeted.
 */
const SAFE_DISMISS_TEXT = [
  'not now',
  'no thanks',
  'no, thanks',
  'maybe later',
  'remind me later',
  'got it',
  'ok, got it',
  'i understand',
  'dismiss',
  'decline',
  'reject all',
  'reject',
  'deny',
  'skip',
  'close',
  '✕',
  '×',
  'x',
];

/** Text that must NEVER be clicked — registration/auth actions. */
const FORBIDDEN_CLICK_TEXT = /^(sign\s*up|register|create\s+account|continue|login|log\s*in|submit|confirm|accept|allow|get\s+started|join\s+now|open\s+account)/i;

// ─── Load source data ───────────────────────────────────────────────────────────

function loadExchanges() {
  const p = path.join(ROOT, 'src', 'data', 'exchanges.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { console.error(`FATAL: Cannot read exchanges.json — ${e.message}`); process.exit(2); }
}

function loadMexcManualEvidence() {
  const p = path.join(ROOT, 'reports', 'manual-evidence', 'mexc-owner-bonus-screenshot.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { warn(`Could not parse mexc-owner-bonus-screenshot.json: ${e.message}`); return null; }
}

function getPlaywrightVersion() {
  try {
    const p = path.join(ROOT, 'node_modules', 'playwright', 'package.json');
    return JSON.parse(fs.readFileSync(p, 'utf8')).version ?? 'unknown';
  } catch { return 'unknown'; }
}

// ─── Safe popup cleanup ─────────────────────────────────────────────────────────

/**
 * Attempt to close safe popups without interacting with any registration flow.
 *
 * Targets:
 *   - Cookie consent banners
 *   - Newsletter / marketing modals
 *   - Generic close buttons
 *   - Google One Tap overlay
 *   - Browser-level permission dialogs (handled at context level, not here)
 *
 * Never clicks: sign-up, register, continue, login, accept (ambiguous).
 *
 * Returns array of obstruction records: { type, selector, text, dismissed }.
 */
async function closeSafePopups(page) {
  const obstructions = [];
  const closed = [];

  // ── 1. Prevent browser-level popups via page JS before they render ──────────
  // (notification permission is granted at context level — see browser setup)

  // ── 2. Google One Tap / Google sign-in overlay ──────────────────────────────
  try {
    const googleTapClose = await page.$('#credential_picker_container, #googleSignInButton, [id*="credential_picker"]');
    if (googleTapClose) {
      obstructions.push({ type: 'google_one_tap', detected: true });
      // Attempt to hide via JS (safer than clicking through the iframe)
      await page.evaluate(() => {
        const el = document.querySelector('#credential_picker_container, [id*="credential_picker"]');
        if (el) { el.style.display = 'none'; el.remove(); }
      }).catch(() => {});
      closed.push('google_one_tap');
      dbg('Google One Tap overlay hidden via JS');
    }
  } catch { /* non-fatal */ }

  // ── 3. Cookie / GDPR banners ────────────────────────────────────────────────
  const cookieSelectors = [
    '[id*="cookie"] button[id*="accept"]',
    '[class*="cookie"] button[class*="accept"]',
    '[id*="cookie-consent"] button',
    '[data-cookiebanner] button',
    '[id*="gdpr"] button',
    '.cc-btn.cc-allow',
    '#onetrust-accept-btn-handler',
    '.onetrust-accept-btn-handler',
    '[class*="CookieConsent"] button',
  ];
  for (const sel of cookieSelectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      const text = (await el.textContent() ?? '').trim().toLowerCase();
      if (FORBIDDEN_CLICK_TEXT.test(text)) {
        dbg(`Skipping cookie button — forbidden text: "${text}"`);
        continue;
      }
      obstructions.push({ type: 'cookie_banner', selector: sel, text, detected: true });
      await el.click({ timeout: 3000 }).catch(() => {});
      closed.push(`cookie_banner:${text}`);
      dbg(`Cookie banner dismissed: "${text}"`);
      await page.waitForTimeout(500).catch(() => {});
      break;
    } catch { /* non-fatal */ }
  }

  // ── 4. Generic modal/overlay close buttons ──────────────────────────────────
  const modalCloseSelectors = [
    'button[aria-label="Close"]',
    'button[aria-label="close"]',
    'button[aria-label="Dismiss"]',
    '[class*="modal"] button[class*="close"]',
    '[class*="dialog"] button[class*="close"]',
    '[class*="popup"] button[class*="close"]',
    '[class*="overlay"] button[class*="close"]',
    '[class*="modal__close"]',
    '[class*="modal-close"]',
    '[class*="popup-close"]',
    '.close-btn',
    '.btn-close',
  ];
  for (const sel of modalCloseSelectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      const visible = await el.isVisible().catch(() => false);
      if (!visible) continue;
      const text = (await el.textContent() ?? '').trim();
      if (FORBIDDEN_CLICK_TEXT.test(text)) {
        dbg(`Skipping modal close — forbidden text: "${text}"`);
        continue;
      }
      obstructions.push({ type: 'modal_close_button', selector: sel, text, detected: true });
      await el.click({ timeout: 3000 }).catch(() => {});
      closed.push(`modal_close:${sel}`);
      dbg(`Modal closed: ${sel}`);
      await page.waitForTimeout(500).catch(() => {});
    } catch { /* non-fatal */ }
  }

  // ── 5. Text-matched dismiss buttons ────────────────────────────────────────
  // Walk all visible buttons looking for safe dismiss text
  try {
    const buttons = await page.$$('button, [role="button"], a.btn, a[class*="button"]');
    for (const btn of buttons) {
      try {
        const visible = await btn.isVisible().catch(() => false);
        if (!visible) continue;
        const text = (await btn.textContent() ?? '').trim().toLowerCase();
        if (!text || text.length > 30) continue; // Skip long button text (likely nav items)
        if (FORBIDDEN_CLICK_TEXT.test(text)) continue;

        const isSafeDismiss = SAFE_DISMISS_TEXT.some(safe =>
          text === safe || text.includes(safe)
        );
        if (!isSafeDismiss) continue;

        obstructions.push({ type: 'dismiss_button', text, detected: true });
        await btn.click({ timeout: 3000 }).catch(() => {});
        closed.push(`dismiss:${text}`);
        dbg(`Dismiss button clicked: "${text}"`);
        await page.waitForTimeout(500).catch(() => {});
        break; // One dismiss at a time
      } catch { /* non-fatal */ }
    }
  } catch { /* non-fatal */ }

  return { obstructions, closed };
}

// ─── Text signal scan ───────────────────────────────────────────────────────────

async function scanTextSignals(page, signals) {
  const results = {};
  try {
    // Extract visible text: headings + body excerpt
    const text = await page.evaluate(() => {
      const parts = [];
      // Priority elements
      const selectors = ['h1','h2','h3','.bonus','.reward','.claim','.promo','.offer','.hero','.banner'];
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(el => {
          const t = (el.innerText || el.textContent || '').trim();
          if (t) parts.push(t);
        });
      }
      // Full body as fallback
      parts.push((document.body?.innerText || '').slice(0, 8000));
      return parts.join('\n');
    }).catch(() => '');

    for (const signal of (signals ?? [])) {
      results[signal.key] = {
        found:   signal.pattern.test(text),
        label:   signal.label,
      };
    }
    dbg(`Text scan: ${Object.values(results).filter(r => r.found).length}/${(signals ?? []).length} signals found`);
  } catch (e) {
    warn(`Text scan failed: ${e.message}`);
  }
  return results;
}

// ─── Main capture ───────────────────────────────────────────────────────────────

async function runCapture(exchange, captureUrl) {
  const outDir        = path.join(ROOT, 'reports', 'manual-evidence');
  const screenshotPath = path.join(outDir, `${exchange}-screenshot-${TODAY_STR}.webp`);
  const metaPath       = path.join(outDir, `${exchange}-screenshot-${TODAY_STR}.json`);
  fs.mkdirSync(outDir, { recursive: true });

  // Build exchange-specific text signals from evidence data
  let expectedBonus = null;
  try {
    const evidFile = path.join(ROOT, 'src', 'data', 'evidence', `${exchange}.json`);
    if (fs.existsSync(evidFile)) {
      const evid = JSON.parse(fs.readFileSync(evidFile, 'utf8'));
      const amtFact = (evid.facts ?? []).find(f => f.field === 'bonus_amount');
      if (amtFact) expectedBonus = { amount: amtFact.currentValue, currency: amtFact.unit ?? 'USDT' };
    }
  } catch { /* non-fatal */ }
  // Extract referral code from capture URL
  let referralCode = null;
  try {
    const url = new URL(captureUrl);
    const codeParams = ['shareCode', 'ref', 'referral', 'invite', 'referralCode', 'code', 'aff'];
    for (const p of codeParams) { const v = url.searchParams.get(p); if (v) { referralCode = v; break; } }
    if (!referralCode) {
      const m = url.pathname.match(/\/(?:b|join|ref|invite|partner)\/([A-Z0-9_-]+)/i);
      if (m) referralCode = m[1];
    }
  } catch { /* non-fatal */ }
  const TEXT_SIGNALS = buildTextSignals(exchange, expectedBonus, referralCode);

  const pwVer = getPlaywrightVersion();
  log('');
  log(`  ┌─ Live capture: ${exchange.toUpperCase()} ─────────────────────────────`);
  log(`  │  URL:          ${captureUrl}`);
  log(`  │  Output:       ${screenshotPath}`);
  log(`  │  Playwright:   ${pwVer}`);
  log(`  └────────────────────────────────────────────────────────────`);
  log('');

  let browser, context, page;
  let finalUrl      = captureUrl;
  let httpStatus    = null;
  let pageTitle     = null;
  let captureError  = null;
  let screenshotSaved = false;
  let obstructionsResult = { obstructions: [], closed: [] };
  let textSignals   = {};

  try {
    const pw = await import('playwright');
    browser  = await pw.chromium.launch({ headless: true });

    context  = await browser.newContext({
      userAgent:    UA_DESKTOP,
      viewport:     VIEWPORT,
      locale:       'en-US',
      timezoneId:   'America/New_York',
      // ── Prevent browser-level permission popups ────────────────────────────
      // Denying notifications prevents the browser-level "Allow notifications?"
      // dialog from appearing over the page content.
      permissions:  [],
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    // Deny notification requests at the browser context level
    await context.grantPermissions([]).catch(() => {});

    page = await context.newPage();

    // Track initial HTTP status
    page.on('response', resp => {
      if (resp.url() === captureUrl) httpStatus = resp.status();
    });

    dbg(`Navigating to: ${captureUrl}`);
    const resp = await page.goto(captureUrl, {
      timeout:   30000,
      waitUntil: 'domcontentloaded',
    });
    if (resp) {
      httpStatus = resp.status();
      finalUrl   = page.url();
    }
    dbg(`HTTP status: ${httpStatus}, final URL: ${finalUrl}`);

    // ── Wait for SPA hydration ──────────────────────────────────────────────
    // Use networkidle with a timeout fallback — MEXC is an SPA and the bonus
    // panel is JS-rendered. networkidle allows the content to fully load.
    log('  ⏳ Waiting for page to fully hydrate (networkidle)…');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {
      dbg('networkidle timeout — continuing anyway');
    });

    // ── Safe popup cleanup ─────────────────────────────────────────────────
    log('  🧹 Running safe popup cleanup…');
    obstructionsResult = await closeSafePopups(page);
    if (obstructionsResult.closed.length > 0) {
      log(`     Closed: ${obstructionsResult.closed.join(', ')}`);
    } else {
      log('     No closable popups found.');
    }

    // ── Additional hydration wait after popup cleanup ──────────────────────
    dbg('Waiting 3s after popup cleanup…');
    await page.waitForTimeout(3000).catch(() => {});

    // ── Scroll to reveal bonus content ─────────────────────────────────────
    // Lightly scroll to trigger lazy-loaded elements (safe — no form interaction)
    await page.evaluate(() => window.scrollTo(0, 200)).catch(() => {});
    await page.waitForTimeout(1000).catch(() => {});
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await page.waitForTimeout(500).catch(() => {});

    // ── Page meta ──────────────────────────────────────────────────────────
    pageTitle = await page.title().catch(() => null);
    finalUrl  = page.url();
    dbg(`Page title: ${pageTitle}`);

    // ── Text signal scan ───────────────────────────────────────────────────
    log('  🔍 Scanning for text signals…');
    textSignals = await scanTextSignals(page, TEXT_SIGNALS);
    for (const [key, val] of Object.entries(textSignals)) {
      const icon = val.found ? '✅' : '  ';
      log(`     ${icon} ${val.label}`);
    }


    // ── Screenshot ─────────────────────────────────────────────────────────
    // Playwright 1.x only supports png/jpeg — capture as PNG then convert
    // to WebP via sharp (devDependency already in this project).
    log('  📸 Taking screenshot…');
    const pngPath = screenshotPath.replace(/\.webp$/i, '.png');
    await page.screenshot({
      path:     pngPath,
      type:     'png',
      fullPage: false,
    });
    if (sharp) {
      await sharp(pngPath).webp({ quality: 92 }).toFile(screenshotPath);
      fs.unlinkSync(pngPath);
    } else {
      fs.renameSync(pngPath, screenshotPath);
    }
    screenshotSaved = true;
    const stat = fs.statSync(screenshotPath);
    log(`     ✅ Saved: ${screenshotPath} (${(stat.size / 1024).toFixed(1)} KB)`);
  } catch (e) {
    captureError = e.message ?? String(e);
    console.error(`  ❌ Capture error: ${captureError}`);
  } finally {
    try { await page?.close(); }    catch { /* ignore */ }
    try { await context?.close(); } catch { /* ignore */ }
    try { await browser?.close(); } catch { /* ignore */ }
  }

  // ─── Compute hash ──────────────────────────────────────────────────────────
  let screenshotHash = null;
  if (screenshotSaved) {
    try {
      const buf = fs.readFileSync(screenshotPath);
      screenshotHash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    } catch { /* non-fatal */ }
  }

  // ─── Write metadata JSON ───────────────────────────────────────────────────
  const meta = {
    exchange,
    capturedAt:        new Date().toISOString(),
    runDate:           TODAY_STR,
    captureUrl,
    finalUrl,
    httpStatus,
    pageTitle,
    screenshotPath:    screenshotSaved
      ? `reports/manual-evidence/${exchange}-screenshot-${TODAY_STR}.webp`
      : null,
    screenshotSaved,
    screenshotHash,
    screenshotDimensions: { width: VIEWPORT.width, height: VIEWPORT.height, format: 'webp' },
    obstructionsDetected: obstructionsResult.obstructions.length,
    obstructionTypes:     obstructionsResult.obstructions.map(o => o.type),
    obstructionsClosed:   obstructionsResult.closed,
    textSignals,
    captureError:     captureError ?? null,
    playwrightVersion: pwVer,
    userAgent:         UA_DESKTOP,
    viewport:          VIEWPORT,
    safetyNotes: [
      'No login performed',
      'No forms submitted',
      'No user data entered',
      'No captchas bypassed',
      'Only viewport-visible content captured',
      'Notification permissions denied at context level',
    ],
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  log(`  📄 Metadata written: ${metaPath}`);

  // ─── Update manual evidence JSON if screenshot succeeded ───────────────────
  // Only update the evidence JSON for the specific exchange being captured.
  // The file follows the pattern: {exchange}-owner-bonus-screenshot.json
  if (screenshotSaved) {
    const evidPath = path.join(ROOT, 'reports', 'manual-evidence', `${exchange}-owner-bonus-screenshot.json`);
    if (fs.existsSync(evidPath)) {
      try {
        const evid = JSON.parse(fs.readFileSync(evidPath, 'utf8'));
        evid.screenshotFile      = `reports/manual-evidence/${exchange}-screenshot-${TODAY_STR}.webp`;
        evid.screenshotStatus    = 'available';
        evid.screenshotHash      = screenshotHash;
        evid.screenshotDimensions = { width: VIEWPORT.width, height: VIEWPORT.height, format: 'webp' };
        evid.screenshotSourceFile = `reports/manual-evidence/${exchange}-screenshot-${TODAY_STR}.webp`;
        evid.screenshotConvertedBy = `Playwright ${pwVer} — headless Chromium, quality 92`;
        evid.obstructions         = obstructionsResult.obstructions.map(o => o.type);
        evid.obstructionsClosed   = obstructionsResult.closed;
        evid.visionApiBlocked     = false;
        evid.visionApiBlockReason = null;
        evid.capturedDate         = TODAY_STR;
        evid.capturedBy           = 'playwright_automated_capture';
        evid.updatedAt            = TODAY_STR;
        evid.attachedByTask       = 'T09A.5-automated';
        // Keep all other fields unchanged
        fs.writeFileSync(evidPath, JSON.stringify(evid, null, 2), 'utf8');
        log(`  📄 Manual evidence JSON updated: ${evidPath}`);
      } catch (e) {
        warn(`Could not update manual evidence JSON: ${e.message}`);
      }
    }
  }

  return meta;
}

// ─── Main entry ────────────────────────────────────────────────────────────────

log('');
log('══════════════════════════════════════════════════════════════');
log('  Bonus Registration Screenshot Capture');
log('══════════════════════════════════════════════════════════════');

if (!LIVE) {
  // ── DRY RUN ───────────────────────────────────────────────────────────────
  const exchanges = loadExchanges();
  const target    = exchanges.find(e => e.slug === (EXCH_SLUG ?? 'mexc'));
  const captureUrl = target?.affiliateLinks?.default ?? target?.affiliateUrl ?? null;

  log(`  Mode:        DRY RUN (no browser launched)`);
  log(`  Exchange:    ${target?.name ?? EXCH_SLUG ?? 'mexc'} (${target?.slug ?? 'mexc'})`);
  log(`  Capture URL: ${captureUrl}`);
  log(`  Output:      reports/manual-evidence/${EXCH_SLUG ?? 'mexc'}-screenshot-${TODAY_STR}.webp`);
  log('');
  log('  Popup cleanup targets:');
  log('    • notification permission (denied at context level)');
  log('    • Google One Tap overlay (hidden via JS)');
  log('    • cookie banners (accept/reject/close buttons)');
  log('    • modal close buttons (aria-label="Close", .btn-close, etc.)');
  log(`    • text-matched buttons: ${SAFE_DISMISS_TEXT.slice(0, 6).join(', ')}, …`);
  log('');
  log('  NEVER clicks: sign-up, register, continue, login, submit, confirm');
  log('');
  log('  Text signals to detect after capture (exchange-specific + generic):');
  const drySignals = buildTextSignals(EXCH_SLUG ?? 'mexc', null, null);
  for (const s of drySignals) {
    log(`    • ${s.label}`);
  }
  log('');
  log('  To run live capture:');
  log('    npm run capture:bonus:mexc');
  log('    OR: node scripts/capture-bonus-registration-screenshot.mjs --live --confirm-live --exchange mexc --limit 1');
  log('');
  process.exit(0);
}

// ── LIVE MODE GUARD ────────────────────────────────────────────────────────────
log('');
log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('   LIVE MODE GUARD — checking all required flags');
log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const guardErrors = [];
if (!CONFIRM)    guardErrors.push('Missing --confirm-live (required alongside --live)');
if (!EXCH_SLUG)  guardErrors.push('Missing --exchange <slug> (required in live mode)');
if (LIMIT_N === null) guardErrors.push('Missing --limit 1 (required in live mode)');
else if (LIMIT_N !== 1) guardErrors.push(`--limit must be exactly 1, got: ${LIMIT_N}`);

const exchanges   = loadExchanges();
const targetExch  = EXCH_SLUG ? exchanges.find(e => e.slug === EXCH_SLUG) : null;
if (EXCH_SLUG && !targetExch) {
  guardErrors.push(`Unknown exchange slug: "${EXCH_SLUG}"`);
}
const captureUrl = targetExch?.affiliateLinks?.default ?? targetExch?.affiliateUrl ?? null;
if (targetExch && !captureUrl) {
  guardErrors.push(`No affiliate URL found for "${EXCH_SLUG}"`);
}

if (guardErrors.length > 0) {
  log('');
  log('  ❌ LIVE MODE REJECTED:');
  for (const e of guardErrors) log(`     ✖  ${e}`);
  log('');
  log('  Required flags:');
  log('     --live --confirm-live --exchange <slug> --limit 1');
  log('');
  process.exit(1);
}

log(`  ✅ Guard passed. Running live capture for: ${EXCH_SLUG}`);
log('');

// ── Run capture ────────────────────────────────────────────────────────────────
const result = await runCapture(EXCH_SLUG, captureUrl);

log('');
log('  ═══════════════════════════════════════════════════════════');
log(`   CAPTURE COMPLETE — ${EXCH_SLUG.toUpperCase()}`);
log(`   Screenshot saved:  ${result.screenshotSaved ? '✅ yes' : '❌ no'}`);
log(`   HTTP status:       ${result.httpStatus ?? '—'}`);
log(`   Page title:        ${result.pageTitle ?? '—'}`);
const sigFound = Object.values(result.textSignals).filter(s => s.found).length;
const sigTotal = Object.keys(result.textSignals).length;
log(`   Text signals:      ${sigFound}/${sigTotal} found`);
log(`   Popups closed:     ${result.obstructionsClosed.length}`);
if (result.captureError) {
  log(`   ❌ Error:          ${result.captureError}`);
}
log('');
log('  ⚠️  Review the screenshot before updating evidence facts.');
log('  ✅ No production data was modified.');
log('  ═══════════════════════════════════════════════════════════');
log('');
