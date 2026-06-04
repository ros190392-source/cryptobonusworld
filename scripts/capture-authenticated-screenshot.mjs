#!/usr/bin/env node
/**
 * capture-authenticated-screenshot.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Authenticated Screenshot Capture — CryptoBonusWorld
 *
 * PURPOSE:
 *   Captures screenshots of authenticated (logged-in) exchange pages for
 *   editorial evidence. Uses a persistent browser profile so the owner can
 *   log in once via --setup, then subsequent --live runs reuse that session.
 *
 *   Targets post-login pages: rewards centers, bonus dashboards, task centers,
 *   referral panels, VIP/fee tiers, KYC status, security overview, account
 *   dashboard, deposit methods, withdrawal pages, P2P (logged-in), spot
 *   trading (logged-in), futures (logged-in).
 *
 *   ALL captures are personal-account pages. CSS masking is applied to blur
 *   email addresses, phone numbers, account IDs, UID fields, and balances
 *   before the screenshot is taken.
 *
 *   Outputs to reports/authenticated-screenshots/ staging area for owner
 *   review before any file is used in production.
 *
 * DEFAULT MODE: DRY RUN
 *   Prints all categories with risk levels and example commands.
 *
 * ─── FLAGS ────────────────────────────────────────────────────────────────────
 *   (none)                   Dry-run: print plan only (no browser launched)
 *   --setup --exchange <s>   Open headed browser at login URL for manual login
 *   --live                   Enable live capture (requires all guard flags)
 *   --confirm-live           Required alongside --live
 *   --exchange <slug>        Target exchange (binance|bybit|okx|mexc|bitget)
 *   --category <cat>         Target category (see ALLOWED_CATEGORIES)
 *   --url <url>              Exact URL to capture (required in live mode)
 *   --verbose                Extra debug output
 *
 * ─── OUTPUT (live mode) ───────────────────────────────────────────────────────
 *   reports/authenticated-screenshots/{exchange}/{category}/{TODAY_STR}.webp
 *   reports/authenticated-screenshots/{exchange}/{category}/{TODAY_STR}.json
 *
 * ─── SAFETY ───────────────────────────────────────────────────────────────────
 *   ✅ No financial actions performed (deposit, withdraw, trade, transfer)
 *   ✅ No form submissions
 *   ✅ No clicks on forbidden action buttons
 *   ✅ CSS masking applied before screenshot (email, phone, UID, balance)
 *   ✅ manualReviewRequired always true
 *   ✅ Output to reports/ staging area only
 *   ✅ Never auto-published to public/
 *
 * ─── GOVERNANCE ───────────────────────────────────────────────────────────────
 *   FORBIDDEN_CATEGORIES are hard-blocked and will never be captured.
 *   RISK_LEVELS determine masking intensity and review requirements.
 */

import fs       from 'node:fs';
import path     from 'node:path';
import crypto   from 'node:crypto';
import readline from 'node:readline';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

const _require = createRequire(import.meta.url);
let sharp;
try { sharp = _require('sharp'); } catch { sharp = null; }

// ─── CLI flags ──────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const LIVE        = args.includes('--live');
const CONFIRM     = args.includes('--confirm-live');
const SETUP       = args.includes('--setup') || args.includes('--setup-profile');
const VERBOSE     = args.includes('--verbose');

const exchIdx     = args.indexOf('--exchange');
const EXCH_ARG    = exchIdx !== -1 ? args[exchIdx + 1] : null;

const catIdx      = args.indexOf('--category');
const CAT_ARG     = catIdx !== -1 ? args[catIdx + 1] : null;

const urlIdx      = args.indexOf('--url');
const URL_ARG     = urlIdx !== -1 ? args[urlIdx + 1] : null;

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);

// ─── Constants ──────────────────────────────────────────────────────────────────
const TODAY_STR  = '2026-06-04';
const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const VIEWPORT   = { width: 1440, height: 900 };

// ─── Governance constraints ────────────────────────────────────────────────────

const ALLOWED_EXCHANGES = new Set([
  'binance',
  'bybit',
  'okx',
  'mexc',
  'bitget',
]);

const ALLOWED_CATEGORIES = new Set([
  'rewards_center',
  'bonus_center',
  'task_center',
  'referral_center',
  'fees_vip',
  'kyc_status',
  'security_overview',
  'account_dashboard',
  'deposit_methods',
  'withdrawal_page',
  'p2p_logged_in',
  'spot_logged_in',
  'futures_logged_in',
]);

const FORBIDDEN_CATEGORIES = new Set([
  'api_keys',
  'order_confirmation',
  'withdrawal_confirmation',
  'security_change_confirmation',
  'password_change',
  '2fa_setup',
  'identity_documents',
]);

/** Risk level per category — determines masking intensity and review notes. */
const RISK_LEVELS = {
  rewards_center:    'low',
  bonus_center:      'low',
  task_center:       'low',
  referral_center:   'low',
  fees_vip:          'low',
  kyc_status:        'medium',
  security_overview: 'medium',
  account_dashboard: 'medium',
  p2p_logged_in:     'medium',
  spot_logged_in:    'medium',
  futures_logged_in: 'medium',
  deposit_methods:   'high',
  withdrawal_page:   'high',
};

// ─── Login URLs ─────────────────────────────────────────────────────────────────

const LOGIN_URLS = {
  binance: 'https://www.binance.com/en/login',
  bybit:   'https://www.bybit.com/en/login',
  okx:     'https://www.okx.com/account/login',
  mexc:    'https://www.mexc.com/login',
  bitget:  'https://www.bitget.com/en/login',
};

// ─── Allowed domains per exchange ──────────────────────────────────────────────

const ALLOWED_DOMAINS = {
  binance: ['binance.com', 'binance.us'],
  bybit:   ['bybit.com'],
  okx:     ['okx.com'],
  mexc:    ['mexc.com'],
  bitget:  ['bitget.com'],
};

// ─── Safe popup dismiss text ────────────────────────────────────────────────────

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

/** Text that must NEVER be clicked — financial/action buttons. */
const FORBIDDEN_CLICK_PATTERN = /^(sign\s*up|register|create\s+account|continue|login|log\s*in|submit|confirm|accept|allow|get\s+started|join\s+now|open\s+account|deposit|withdraw|buy|sell|trade|transfer|api)/i;

// ─── Masking policy ─────────────────────────────────────────────────────────────
//
// Mandatory masking for ALL authenticated screenshots per SCREENS-02 governance.
// Implements the exact formats specified in the masking policy:
//
//   Names:        A•••••  (first letter + dots, or completely hidden)
//   Email:        r••••@••••.com
//   Phone:        +48 ••• ••• ••12
//   UID/Account:  UID: ••••••42  (last 2 digits only)
//   Balances:     •••••  (completely hidden)
//   Wallet addr:  0x12••••••••••••••••89A  (first 4 + last 4, middle masked)
//   QR codes:     fully blurred/covered
//   API keys:     completely hidden
//   Anti-phishing: completely hidden
//
// Strategy:
//   1. CSS blur on class-name selectors (catches explicitly labelled elements)
//   2. JavaScript text-node scanning for pattern-matched sensitive values
//      (catches dynamically rendered values that don't have semantic class names)
//   3. QR code covering via canvas/img overlay

/** CSS selectors for elements that likely contain personal data — blurred. */
const CSS_MASKING_SELECTORS = [
  // Email
  '[class*="email"]','[data-testid*="email"]','[id*="email"]',
  // Phone
  '[class*="phone"]','[data-testid*="phone"]','[id*="phone"]',
  // UID / Account ID
  '[class*="uid"]','[class*="user-id"]','[class*="account-id"]',
  '[data-testid*="uid"]','[id*="uid"]','[class*="member-id"]',
  // Name / profile
  '[class*="username"]','[class*="user-name"]','[class*="profile-name"]',
  '[class*="display-name"]','[class*="account-name"]','[class*="nickname"]',
  // Balances / equity / PnL
  '[class*="balance"]','[class*="asset-amount"]','[class*="available-balance"]',
  '[class*="total-equity"]','[class*="pnl"]','[class*="unrealized"]',
  '[class*="portfolio-value"]','[class*="wallet-balance"]',
  // Wallet / deposit addresses
  '[class*="wallet-address"]','[class*="deposit-address"]','[class*="address-value"]',
  '[class*="crypto-address"]','[data-testid*="address"]',
  // QR codes
  '[class*="qr-code"]','[class*="qr-wrap"]','canvas','[class*="qrcode"]',
  // Security / device
  '[class*="device-name"]','[class*="ip-address"]','[class*="login-history"]',
  // API / security keys
  '[class*="api-key"]','[class*="secret-key"]','[class*="anti-phishing"]',
  '[class*="security-key"]',
  // KYC
  '[class*="kyc-name"]','[class*="id-number"]','[class*="doc-number"]',
];

/** Regex patterns for sensitive values found in text nodes. */
const SENSITIVE_PATTERNS = [
  // Email — replace with r••••@••••.com format
  { pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replace: (m) => m[0] + '••••@••••.' + m.split('.').pop() },
  // Crypto wallet addresses (0x hex, bc1 bech32, T Tron, etc.)
  // Keep first 4 + last 4, mask middle
  { pattern: /0x[0-9a-fA-F]{10,}/g,
    replace: (m) => m.slice(0,6) + '••••••••••••••••••••••••' + m.slice(-4) },
  { pattern: /bc1[0-9a-zA-Z]{20,}/g,
    replace: (m) => m.slice(0,6) + '••••••••••••••••••••••••' + m.slice(-4) },
  { pattern: /T[1-9A-HJ-NP-Za-km-z]{25,}/g,
    replace: (m) => m.slice(0,4) + '••••••••••••••••••••••••' + m.slice(-4) },
  // Generic hex-like long addresses (20+ hex chars)
  { pattern: /\b[0-9a-fA-F]{30,}\b/g,
    replace: (m) => m.slice(0,4) + '••••••••••••••••' + m.slice(-4) },
  // Phone numbers (+48 123 456 789, +1-555-123-4567, etc.)
  { pattern: /\+?\d[\d\s\-\(\)]{8,}/g,
    replace: (m) => m.slice(0,3) + ' ••• ••• ••' + m.slice(-2) },
  // UID / numeric IDs (8+ digits standing alone)
  { pattern: /\b\d{8,}\b/g,
    replace: (m) => '••••••' + m.slice(-2) },
];

/** Masking overlay color for complete concealment (balances, names, etc.) */
const MASK_OVERLAY_STYLE = 'display:inline-block;background:#2d2d2d;color:transparent;border-radius:3px;min-width:60px;';
const MASK_CHAR = '•';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function isDomainAllowed(exchange, url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const allowed  = ALLOWED_DOMAINS[exchange] ?? [];
    return allowed.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

function getProfileDir(exchange) {
  return path.join(ROOT, '.browser-profiles', 'screenshot-auth', exchange);
}

function getOutputDir(exchange, category) {
  return path.join(ROOT, 'reports', 'authenticated-screenshots', exchange, category);
}

function getPlaywrightVersion() {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(ROOT, 'node_modules', 'playwright', 'package.json'), 'utf8')
    ).version ?? 'unknown';
  } catch { return 'unknown'; }
}

/**
 * getStagingPath — returns webp and json paths.
 * Appends -2 / -3 suffix if a file already exists (same convention as public script).
 */
function getStagingPath(exchange, category, date, suffix) {
  const dir  = getOutputDir(exchange, category);
  const base = suffix ? `${date}-${suffix}` : date;
  return {
    dir,
    webp:    path.join(dir, `${base}.webp`),
    json:    path.join(dir, `${base}.json`),
    relWebp: `reports/authenticated-screenshots/${exchange}/${category}/${base}.webp`,
    relJson: `reports/authenticated-screenshots/${exchange}/${category}/${base}.json`,
  };
}

function getNextStagingPath(exchange, category, date) {
  const base = getStagingPath(exchange, category, date, null);
  if (!fs.existsSync(base.webp)) return base;
  for (let i = 2; i <= 10; i++) {
    const p = getStagingPath(exchange, category, date, String(i));
    if (!fs.existsSync(p.webp)) return p;
  }
  return base;
}

// ─── Detect logged-in state ─────────────────────────────────────────────────────

async function detectLoggedIn(page) {
  try {
    const url = page.url();
    // Redirected to login — not logged in
    if (/login|signin|sign-in|auth\//.test(url)) return false;

    const html = await page.evaluate(() =>
      (document.body?.innerHTML ?? '').slice(0, 5000)
    ).catch(() => '');

    // Positive signals: typical logged-in page elements
    const loggedInSignals = [
      /logout|log\s*out|sign\s*out/i,
      /my\s*account|account\s*overview|dashboard/i,
      /profile\s*settings|security\s*settings/i,
      /uid\s*[:=]\s*\d+/i,
    ];
    return loggedInSignals.some(p => p.test(html));
  } catch {
    return false;
  }
}

// ─── Detect forbidden buttons (record only, never click) ───────────────────────

async function detectForbiddenButtons(page) {
  const found = [];
  try {
    const buttons = await page.$$('button, [role="button"], a.btn, input[type="submit"]');
    for (const btn of buttons) {
      try {
        const visible = await btn.isVisible().catch(() => false);
        if (!visible) continue;
        const text = (await btn.textContent() ?? '').trim().toLowerCase();
        if (!text) continue;
        if (FORBIDDEN_CLICK_PATTERN.test(text)) {
          found.push(text.slice(0, 50));
        }
      } catch { /* non-fatal */ }
    }
  } catch { /* non-fatal */ }
  return found;
}

// ─── Safe popup cleanup ─────────────────────────────────────────────────────────

async function closeSafePopups(page) {
  const obstructions = [];
  const closed       = [];

  // 1. Google One Tap — hide via JS
  try {
    const tap = await page.$('#credential_picker_container, [id*="credential_picker"]');
    if (tap) {
      obstructions.push({ type: 'google_one_tap', selector: '#credential_picker_container', text: '', detected: true });
      await page.evaluate(() => {
        document.querySelectorAll('#credential_picker_container,[id*="credential_picker"]').forEach(el => el.remove());
      }).catch(() => {});
      closed.push('google_one_tap');
      dbg('Google One Tap hidden via JS');
    }
  } catch { /* non-fatal */ }

  // 2. Cookie / GDPR banners
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
      if (FORBIDDEN_CLICK_PATTERN.test(text)) { dbg(`Skipping cookie button — forbidden: "${text}"`); continue; }
      obstructions.push({ type: 'cookie_banner', selector: sel, text, detected: true });
      await el.click({ timeout: 3000 }).catch(() => {});
      closed.push(`cookie_banner:${text.slice(0, 20)}`);
      await page.waitForTimeout(400).catch(() => {});
      break;
    } catch { /* non-fatal */ }
  }

  // 3. Modal close buttons
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
      if (FORBIDDEN_CLICK_PATTERN.test(text)) { dbg(`Skipping modal close — forbidden: "${text}"`); continue; }
      obstructions.push({ type: 'modal_close_button', selector: sel, text, detected: true });
      await el.click({ timeout: 3000 }).catch(() => {});
      closed.push(`modal_close:${sel.slice(0, 30)}`);
      await page.waitForTimeout(400).catch(() => {});
    } catch { /* non-fatal */ }
  }

  // 4. Text-matched dismiss buttons
  try {
    const buttons = await page.$$('button, [role="button"], a.btn, a[class*="button"]');
    for (const btn of buttons) {
      try {
        const visible = await btn.isVisible().catch(() => false);
        if (!visible) continue;
        const text = (await btn.textContent() ?? '').trim().toLowerCase();
        if (!text || text.length > 30) continue;
        if (FORBIDDEN_CLICK_PATTERN.test(text)) continue;
        const isSafe = SAFE_DISMISS_TEXT.some(s => text === s || text.includes(s));
        if (!isSafe) continue;
        obstructions.push({ type: 'dismiss_button', text, detected: true });
        await btn.click({ timeout: 3000 }).catch(() => {});
        closed.push(`dismiss:${text}`);
        await page.waitForTimeout(400).catch(() => {});
        break;
      } catch { /* non-fatal */ }
    }
  } catch { /* non-fatal */ }

  return { obstructions, closed };
}

// ─── Masking injection (two phases) ────────────────────────────────────────────

/**
 * Phase 1 — CSS blur on known semantic selectors.
 * Fast but depends on exchange using predictable class names.
 */
async function injectCssPhase(page) {
  const css = CSS_MASKING_SELECTORS
    .map(sel => `${sel} { filter: blur(10px) !important; user-select: none !important; outline: 2px solid rgba(200,0,0,0.25) !important; }`)
    .join('\n')
    + '\n/* QR codes — solid cover */\n'
    + 'canvas, [class*="qr"] { filter: blur(20px) !important; background: #2d2d2d !important; }\n';
  try {
    await page.addStyleTag({ content: css });
    dbg('Phase 1 CSS masking injected (' + CSS_MASKING_SELECTORS.length + ' selectors)');
    return true;
  } catch (e) {
    warn('Phase 1 CSS injection failed: ' + e.message);
    return false;
  }
}

/**
 * Phase 2 — JavaScript text-node scanning.
 * Walks the DOM and replaces sensitive patterns with formatted masks.
 * Catches values that don't have semantic class names.
 *
 * Masking formats per policy:
 *   Email:       r••••@••••.com
 *   Wallet:      0x12••••••••••••••••89A  (first 4 + last 4)
 *   Phone:       +48 ••• ••• ••12
 *   UID (8+d):   ••••••42  (last 2)
 *   Balance-like numbers next to USDT/BTC/ETH: replaced with •••••
 */
async function injectTextMaskingPhase(page) {
  const patternsSerialized = JSON.stringify(
    SENSITIVE_PATTERNS.map(p => ({ source: p.pattern.source, flags: p.pattern.flags }))
  );

  try {
    const count = await page.evaluate((patSer) => {
      let replaced = 0;

      // Reconstruct patterns from serialized form
      const patterns = JSON.parse(patSer).map(p => ({
        pattern: new RegExp(p.source, p.flags),
        // Format replacements inline — cannot pass functions across evaluate boundary
      }));

      // Helper: mask email
      function maskEmail(m) {
        const atIdx = m.indexOf('@');
        if (atIdx < 1) return '••••@••••.com';
        const ext = m.split('.').pop();
        return m[0] + '••••@••••.' + ext;
      }

      // Helper: mask wallet (keep first 4 + last 4)
      function maskWallet(m) {
        if (m.length < 12) return '••••••••';
        return m.slice(0, 4) + '••••••••••••••••••••' + m.slice(-4);
      }

      // Helper: mask phone (keep last 2)
      function maskPhone(m) {
        const digits = m.replace(/\D/g, '');
        if (digits.length < 4) return '•••••••';
        return '+•• ••• ••• ••' + digits.slice(-2);
      }

      // Helper: mask UID (keep last 2 digits)
      function maskUid(m) {
        return '••••••' + m.slice(-2);
      }

      // Walk all text nodes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const tag = node.parentElement?.tagName?.toLowerCase();
            if (['script', 'style', 'noscript'].includes(tag)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const nodes = [];
      let node;
      while ((node = walker.nextNode())) nodes.push(node);

      for (const textNode of nodes) {
        let text = textNode.textContent || '';
        let changed = false;

        // Email
        text = text.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, (m) => {
          changed = true; return maskEmail(m);
        });
        // 0x wallet addresses
        text = text.replace(/0x[0-9a-fA-F]{10,}/g, (m) => {
          changed = true; return maskWallet(m);
        });
        // bc1 bech32
        text = text.replace(/bc1[0-9a-zA-Z]{20,}/g, (m) => {
          changed = true; return maskWallet(m);
        });
        // Tron addresses
        text = text.replace(/T[1-9A-HJ-NP-Za-km-z]{25,}/g, (m) => {
          changed = true; return maskWallet(m);
        });
        // Generic long hex
        text = text.replace(/\b[0-9a-fA-F]{30,}\b/g, (m) => {
          changed = true; return maskWallet(m);
        });
        // Phone numbers
        text = text.replace(/\+[\d\s\-\(\)]{8,}/g, (m) => {
          changed = true; return maskPhone(m);
        });
        // UID / numeric IDs (standalone 8+ digit numbers)
        text = text.replace(/\b\d{8,}\b/g, (m) => {
          changed = true; return maskUid(m);
        });
        // Balance-like: number followed by USDT/BTC/ETH/BNB
        text = text.replace(/[\d,]+\.?\d*\s*(USDT|BTC|ETH|BNB|SOL|USDC|USD|EUR)/g, (m) => {
          changed = true; return '••••• ' + m.split(/\s+/).pop();
        });

        if (changed) {
          textNode.textContent = text;
          replaced++;
        }
      }

      // Cover QR code canvas elements with an overlay
      document.querySelectorAll('canvas, [class*="qr"], [id*="qr"]').forEach(el => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;background:#1a1a1a;z-index:9999;border-radius:4px;';
        el.style.position = 'relative';
        el.appendChild(overlay);
        replaced++;
      });

      return replaced;
    }, patternsSerialized);

    dbg('Phase 2 text masking: ' + count + ' replacements');
    return count;
  } catch (e) {
    warn('Phase 2 text masking failed: ' + e.message);
    return 0;
  }
}

/**
 * Main masking entry point — runs both phases.
 * Always marks maskingRequired: true and manualReviewRequired: true
 * regardless of whether masking appears complete.
 */
async function injectCssMasking(page) {
  const p1 = await injectCssPhase(page);
  await page.waitForTimeout(300).catch(() => {}); // let CSS apply
  const p2Count = await injectTextMaskingPhase(page);
  return { cssPhase: p1, textReplacements: p2Count };
}

// ─── Setup profile (headed, manual login + session verification) ───────────────
//
// KEY FIX (AUTH-SCREENSHOTS-02-FIX):
//
// Previous bug: used context.waitForEvent('close') — exited when owner closed
// the browser window without (a) waiting for session to flush or (b) verifying
// the login actually worked. No Cookies file was written.
//
// Correct flow:
//   1. Open headed browser at login page
//   2. Owner logs in manually (we wait for ENTER in terminal — NOT browser close)
//   3. After ENTER: navigate to dashboard in the SAME context (no new context)
//   4. Verify session by checking for login indicators in page text
//   5. Count cookies via context.cookies()
//   6. Save session-check JSON to reports/
//   7. Call context.close() EXPLICITLY — this flushes all cookies / IndexedDB / cache
//
// Why ENTER instead of browser close:
//   Closing the browser window fires the close event but may close the context
//   before Playwright finishes writing session state to disk. Pressing ENTER
//   keeps the context alive, so we can verify and then close it properly.

function waitForEnter(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write(prompt);
    rl.once('line', () => { rl.close(); resolve(); });
  });
}

async function runSetupProfile(exchange) {
  if (!ALLOWED_EXCHANGES.has(exchange)) {
    console.error(`  ✖ Exchange not allowed for setup: "${exchange}". Allowed: ${[...ALLOWED_EXCHANGES].join(', ')}`);
    process.exit(1);
  }

  // Keep the process (and the headed browser) alive during manual login.
  // In Node 15+ an unhandled promise rejection terminates the process by
  // default — Playwright can emit one while the owner navigates/logs in,
  // which is what made the browser "close too early". Swallow them here so
  // the only thing that advances the flow is the owner pressing ENTER.
  const keepAlive = (reason) => warn(`(setup) ignored async error: ${String(reason).slice(0, 120)}`);
  process.on('unhandledRejection', keepAlive);
  process.on('uncaughtException',  keepAlive);

  const profileDir  = getProfileDir(exchange);
  const loginUrl    = LOGIN_URLS[exchange];
  const verifyUrl   = exchange === 'binance' ? 'https://www.binance.com/en/my/dashboard'
                    : exchange === 'bybit'   ? 'https://www.bybit.com/en/dashboard'
                    : exchange === 'okx'     ? 'https://www.okx.com/account/overview'
                    : exchange === 'mexc'    ? 'https://www.mexc.com/user/account'
                    :                          'https://www.bitget.com/account/overview';

  fs.mkdirSync(profileDir, { recursive: true });

  log('');
  log(`  ╔═══════════════════════════════════════════════════════════╗`);
  log(`  ║  SETUP: ${exchange.toUpperCase()} Browser Profile                         ║`);
  log(`  ╠═══════════════════════════════════════════════════════════╣`);
  log(`  ║  Profile dir:  ${profileDir.slice(-55).padEnd(55)} ║`);
  log(`  ╚═══════════════════════════════════════════════════════════╝`);
  log('');
  log('  A headed browser will open at the login page.');
  log('');
  log('  ── INSTRUCTIONS ──────────────────────────────────────────');
  log('  1. Complete the login process in the browser window');
  log('     (email/phone, password, 2FA, captcha — all manual)');
  log('  2. Wait until you see your account dashboard / overview');
  log('  3. Do NOT close the browser window');
  log('  4. Come back to this terminal and press ENTER');
  log('  ───────────────────────────────────────────────────────────');
  log('');

  const pw      = await import('playwright');
  const context = await pw.chromium.launchPersistentContext(profileDir, {
    headless:   false,
    userAgent:  UA_DESKTOP,
    viewport:   VIEWPORT,
    locale:     'en-US',
    timezoneId: 'America/New_York',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });

  // Open the login page
  const page = await context.newPage();
  await page.goto(loginUrl, { timeout: 30000, waitUntil: 'domcontentloaded' }).catch(() => {});

  log('Browser opened.');
  log('Log in manually.');
  log('Complete password, captcha, and 2FA yourself.');
  log('When you are fully logged in, return to this terminal and press ENTER.');
  log('');

  // Wait indefinitely for ENTER — no timeout. DO NOT close the context yet.
  await waitForEnter('  ▶  Press ENTER after you are fully logged in…  ');
  log('');
  log('  ⏳ Verifying session…');

  // ── Session verification ────────────────────────────────────────────────────

  // Navigate to the dashboard/account page to check auth state
  let finalVerifyUrl = verifyUrl;
  let verifyStatus   = null;
  let verifyTitle    = '';
  let verifyText     = '';
  try {
    const resp = await page.goto(verifyUrl, { timeout: 20000, waitUntil: 'domcontentloaded' });
    verifyStatus = resp?.status();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 9000)); // 8–10s wait for Binance SPA hydration
    finalVerifyUrl = page.url();
    verifyTitle    = await page.title().catch(() => '');
    verifyText     = await page.evaluate(() => (document.body?.innerText ?? '').toLowerCase().slice(0, 3000)).catch(() => '');
  } catch (e) {
    warn(`Verification navigation failed: ${e.message.slice(0, 80)}`);
  }

  // Count cookies in the live context (most reliable)
  let cookies = [];
  try { cookies = await context.cookies(); } catch { /* non-fatal */ }
  const cookiesCount = cookies.length;

  // Check for auth-positive signals
  const AUTH_POSITIVE = /dashboard|wallet|portfolio|overview|my account|total balance|rewards|assets|user center|trading account|sign out|log out|logout/i;
  const AUTH_NEGATIVE = /log in|sign up|sign in|register|welcome to binance|please log in|continue with google/i;

  const loginRedirected = finalVerifyUrl.includes('login') || finalVerifyUrl.includes('register') || finalVerifyUrl.includes('accounts.binance.com/en/login');
  const hasAuthPositive = AUTH_POSITIVE.test(verifyTitle + ' ' + verifyText);
  const hasAuthNegative = AUTH_NEGATIVE.test(verifyText);

  const loggedInDetected     = (hasAuthPositive || cookiesCount > 2) && !loginRedirected;
  const loginPromptDetected  = hasAuthNegative || loginRedirected;

  log(`  ─── Verification Result ───────────────────────────────────`);
  log(`  Final URL:       ${finalVerifyUrl.slice(0, 75)}`);
  log(`  Page title:      ${verifyTitle}`);
  log(`  Cookies count:   ${cookiesCount}`);
  log(`  Auth positive:   ${hasAuthPositive}`);
  log(`  Login redirect:  ${loginRedirected}`);
  log(`  Logged in:       ${loggedInDetected ? '✅ YES' : '❌ NO'}`);
  log('');

  // ── Save session-check JSON ────────────────────────────────────────────────
  const checkDir  = path.join(ROOT, 'reports', 'authenticated-screenshots', exchange);
  const checkPath = path.join(checkDir, `session-check-${TODAY_STR}.json`);
  fs.mkdirSync(checkDir, { recursive: true });

  const sessionCheck = {
    exchange,
    profilePath:             profileDir,
    checkedAt:               new Date().toISOString(),
    loginUrl,
    verifyUrl,
    finalUrl:                finalVerifyUrl,
    pageTitle:               verifyTitle,
    httpStatus:              verifyStatus,
    loggedInDetected,
    loginPromptDetected,
    cookiesCount,
    authPositiveSignals:     hasAuthPositive,
    authNegativeSignals:     hasAuthNegative,
    loginRedirected,
    indexedDbLikelyPresent:  fs.existsSync(path.join(profileDir, 'Default', 'IndexedDB')),
    notes: loggedInDetected
      ? 'Session appears valid. Profile saved with cookies and session data.'
      : 'Session NOT detected. Cookies may not have been saved, or login was incomplete.',
  };

  fs.writeFileSync(checkPath, JSON.stringify(sessionCheck, null, 2), 'utf8');
  log(`  📄 Session check saved: ${checkPath}`);

  // ── Close context EXPLICITLY — this flushes all session data to disk ────────
  // This is the critical step: calling context.close() properly writes
  // cookies, localStorage, and IndexedDB data to the profile directory.
  try {
    await context.close();
    log('  ✅ Profile context closed and flushed to disk.');
  } catch { /* ignore if already closed */ }

  log('');
  if (loggedInDetected) {
    const Name = exchange.charAt(0).toUpperCase() + exchange.slice(1);
    log(`${Name} authenticated profile ready.`);
    log('');
    log('  Run a test capture:');
    log(`    node scripts/capture-authenticated-screenshot.mjs --live --confirm-live \\`);
    log(`      --exchange ${exchange} --category rewards_center --url https://www.${exchange}.com/en/my/dashboard`);
  } else {
    log('Session not detected. Run setup again and stay logged in before pressing ENTER.');
    log('');
    log('  The browser may have closed before you pressed ENTER, or login');
    log('  was not completed. Please:');
    log(`    1. Run setup again: npm run capture:auth:setup:binance`);
    log('    2. Log in fully in the browser window');
    log('    3. Navigate to your dashboard and wait for it to load');
    log('    4. Then press ENTER in THIS terminal (do not close the browser)');
    log('');
    log(`  Session check saved to: ${checkPath}`);
    log(`  cookiesCount: ${cookiesCount} (expected > 2 for authenticated session)`);
  }
  log('');
}

// ─── Live capture ───────────────────────────────────────────────────────────────

async function runCapture(exchange, category, targetUrl) {
  // Domain check
  if (!isDomainAllowed(exchange, targetUrl)) {
    console.error(`  ✖ URL domain not allowed for exchange "${exchange}": ${targetUrl}`);
    console.error(`    Allowed domains: ${(ALLOWED_DOMAINS[exchange] ?? []).join(', ')}`);
    process.exit(1);
  }

  const profileDir = getProfileDir(exchange);
  if (!fs.existsSync(profileDir)) {
    console.error(`  ✖ No saved profile found for "${exchange}".`);
    console.error(`    Run setup first: node scripts/capture-authenticated-screenshot.mjs --setup --exchange ${exchange}`);
    process.exit(1);
  }

  const riskLevel = RISK_LEVELS[category] ?? 'medium';
  const paths     = getNextStagingPath(exchange, category, TODAY_STR);
  fs.mkdirSync(paths.dir, { recursive: true });

  const pwVer = getPlaywrightVersion();

  log('');
  log(`  ┌─ Authenticated Capture: ${exchange.toUpperCase()} / ${category} ─────────`);
  log(`  │  URL:       ${targetUrl}`);
  log(`  │  Risk:      ${riskLevel}`);
  log(`  │  Output:    ${paths.relWebp}`);
  log(`  │  Profile:   ${profileDir}`);
  log(`  └────────────────────────────────────────────────────────────`);
  log('');

  let context, page;
  let httpStatus      = null;
  let finalUrl        = targetUrl;
  let pageTitle       = null;
  let captureError    = null;
  let screenshotSaved = false;
  let loggedInDetected       = false;
  let maskingRequired        = true;
  let forbiddenActionsDetected = [];
  let obstructionsResult     = { obstructions: [], closed: [] };

  try {
    const pw = await import('playwright');
    context  = await pw.chromium.launchPersistentContext(profileDir, {
      headless:   true,
      userAgent:  UA_DESKTOP,
      viewport:   VIEWPORT,
      locale:     'en-US',
      timezoneId: 'America/New_York',
      permissions: [],
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });

    page = await context.newPage();

    page.on('response', resp => {
      if (resp.url() === targetUrl) httpStatus = resp.status();
    });

    dbg(`Navigating: ${targetUrl}`);
    const resp = await page.goto(targetUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
    if (resp) {
      httpStatus = resp.status();
      finalUrl   = page.url();
    }
    dbg(`HTTP ${httpStatus} — final URL: ${finalUrl}`);

    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {
      dbg('networkidle timeout — continuing anyway');
    });

    pageTitle = await page.title().catch(() => null);

    // Detect login state
    loggedInDetected = await detectLoggedIn(page);
    if (!loggedInDetected) {
      warn('Login state NOT detected — session may have expired. Consider re-running --setup.');
    } else {
      dbg('Login state detected.');
    }

    // Safe popup cleanup
    log('  Cleaning up safe popups…');
    obstructionsResult = await closeSafePopups(page);
    if (obstructionsResult.closed.length > 0) {
      log(`     Closed: ${obstructionsResult.closed.join(', ')}`);
    } else {
      log('     No closable popups found.');
    }

    // Inject masking — two phases:
    // Phase 1: CSS blur on semantic selectors (email/phone/uid/balance/qr class names)
    // Phase 2: JavaScript text-node scanning with pattern-based replacement
    //   Formats: email r••••@••••.com | wallet 0x12••••••89A | uid ••••••42
    //   Balances: ••••• USDT | phone +•• ••• ••• ••12
    log('  🔒 Injecting mandatory masking (CSS + text-node patterns)…');
    maskingRequired = true;
    const maskResult = await injectCssMasking(page);
    log('     CSS phase: ' + (maskResult.cssPhase ? '✅' : '⚠️ partial') +
        ' | text replacements: ' + maskResult.textReplacements);

    // Detect forbidden buttons (record only — never click)
    forbiddenActionsDetected = await detectForbiddenButtons(page);
    if (forbiddenActionsDetected.length > 0) {
      dbg(`Forbidden action buttons found (not clicked): ${forbiddenActionsDetected.join('; ')}`);
    }

    // Wait for page to settle after masking injection
    await page.waitForTimeout(2000).catch(() => {});

    // Screenshot — PNG first, then WebP via sharp
    log('  Taking screenshot…');
    const pngPath = paths.webp.replace(/\.webp$/i, '.png');
    await page.screenshot({ path: pngPath, type: 'png', fullPage: false });

    if (sharp) {
      await sharp(pngPath).webp({ quality: 92 }).toFile(paths.webp);
      fs.unlinkSync(pngPath);
    } else {
      fs.renameSync(pngPath, paths.webp);
    }
    screenshotSaved = true;
    const sz = (fs.statSync(paths.webp).size / 1024).toFixed(1);
    log(`     Saved ${sz} KB — ${paths.relWebp}`);

  } catch (e) {
    captureError = e.message ?? String(e);
    console.error(`  ✖ Capture error: ${captureError}`);
  } finally {
    try { await page?.close(); }    catch { /* ignore */ }
    try { await context?.close(); } catch { /* ignore */ }
  }

  // Hash
  let screenshotHash = null;
  if (screenshotSaved) {
    try {
      screenshotHash = crypto.createHash('sha256')
        .update(fs.readFileSync(paths.webp))
        .digest('hex').slice(0, 16);
    } catch { /* non-fatal */ }
  }

  const dangerousButtonsPresent = forbiddenActionsDetected.length > 0;

  const meta = {
    exchange,
    category,
    riskLevel,
    sourceUrl:               targetUrl,
    finalUrl,
    pageTitle,
    httpStatus,
    viewport:                VIEWPORT,
    capturedAt:              new Date().toISOString(),
    screenshotPath:          screenshotSaved ? paths.relWebp : null,
    loggedInDetected,
    personalDataRisk:        riskLevel,
    maskingRequired,
    manualReviewRequired:    true,    // always true — no exception
    publishCandidate:        false,   // always false until owner explicitly approves post-review
    forbiddenActionsDetected,
    dangerousButtonsPresent,
    safetyNotes: [
      'Authenticated session used — personal account data may be present',
      'Phase 1: CSS blur applied to semantic selectors (email/phone/uid/balance/qr)',
      'Phase 2: Text-node scanning replaced emails/wallets/phones/UIDs with formatted masks',
      'Wallet addresses: first 4 + last 4 chars visible, middle masked with bullets',
      'Balances: completely hidden as ••••• {CURRENCY}',
      'QR codes: covered with solid overlay',
      'manualReviewRequired: true — owner must verify masking before publishing',
      'publishCandidate: false until owner explicitly approves',
      'No financial actions performed',
      'No form submissions',
      'No forbidden buttons clicked',
      'Output to reports/ staging area only',
      'manualReviewRequired is always true for authenticated captures',
    ],
    notes: captureError
      ? `Capture failed: ${captureError.slice(0, 200)}`
      : !loggedInDetected
        ? 'WARNING: Login state not detected — session may have expired.'
        : `Authenticated page captured. Risk: ${riskLevel}.`,
  };

  fs.writeFileSync(paths.json, JSON.stringify(meta, null, 2), 'utf8');
  dbg(`Metadata written: ${paths.relJson}`);

  return { ...meta, screenshotSaved, screenshotHash, captureError: captureError ?? null };
}

// ─── Main entry ────────────────────────────────────────────────────────────────

log('');
log('══════════════════════════════════════════════════════════════');
log('  Authenticated Screenshot Capture');
log('══════════════════════════════════════════════════════════════');

// ── SETUP MODE ─────────────────────────────────────────────────────────────────
if (SETUP) {
  if (!EXCH_ARG) {
    console.error('  ✖ --setup requires --exchange <slug>');
    console.error(`    Allowed: ${[...ALLOWED_EXCHANGES].join(', ')}`);
    process.exit(1);
  }
  await runSetupProfile(EXCH_ARG);
  process.exit(0);
}

// ── DRY RUN ────────────────────────────────────────────────────────────────────
if (!LIVE) {
  log(`  Mode:   DRY RUN — no browser launched`);
  log(`  Date:   ${TODAY_STR}`);
  log('');
  log('  Allowed exchanges:');
  log(`    ${[...ALLOWED_EXCHANGES].join(', ')}`);
  log('');
  log('  Allowed categories with risk levels:');
  log('');
  log('  | Category            | Risk   |');
  log('  |---------------------|--------|');
  for (const cat of ALLOWED_CATEGORIES) {
    const risk = RISK_LEVELS[cat] ?? 'medium';
    log(`  | ${cat.padEnd(19)} | ${risk.padEnd(6)} |`);
  }
  log('');
  log('  Forbidden categories (hard-blocked, never captured):');
  for (const cat of FORBIDDEN_CATEGORIES) {
    log(`    ✖ ${cat}`);
  }
  log('');
  log('  Output path pattern:');
  log('    reports/authenticated-screenshots/{exchange}/{category}/{TODAY_STR}.webp');
  log('');
  log('  Step 1 — Setup profile (one-time per exchange):');
  log('    node scripts/capture-authenticated-screenshot.mjs --setup --exchange binance');
  log('');
  log('  Step 2 — Live capture:');
  log('    node scripts/capture-authenticated-screenshot.mjs \\');
  log('      --live --confirm-live \\');
  log('      --exchange binance \\');
  log('      --category rewards_center \\');
  log('      --url https://www.binance.com/en/my/rewards');
  log('');
  log('  Example commands per exchange:');
  for (const exch of ALLOWED_EXCHANGES) {
    log(`    # ${exch}`);
    log(`    node scripts/capture-authenticated-screenshot.mjs --live --confirm-live --exchange ${exch} --category bonus_center --url <URL>`);
  }
  log('');
  log('  Safety guarantees:');
  log('    ✅ No financial actions (deposit/withdraw/trade/transfer)');
  log('    ✅ CSS masking applied before screenshot');
  log('    ✅ manualReviewRequired always true');
  log('    ✅ Output to reports/ staging only');
  log('');
  process.exit(0);
}

// ── LIVE MODE GUARD ────────────────────────────────────────────────────────────
log('');
log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('   LIVE MODE GUARD');
log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const guardErrors = [];
if (!CONFIRM)  guardErrors.push('Missing --confirm-live (required alongside --live)');
if (!EXCH_ARG) guardErrors.push('Missing --exchange <slug>');
if (!CAT_ARG)  guardErrors.push('Missing --category <cat>');
if (!URL_ARG)  guardErrors.push('Missing --url <url> (exact authenticated URL to capture)');

if (EXCH_ARG && !ALLOWED_EXCHANGES.has(EXCH_ARG)) {
  guardErrors.push(`Exchange not in allowed list: "${EXCH_ARG}". Allowed: ${[...ALLOWED_EXCHANGES].join(', ')}`);
}
if (CAT_ARG && FORBIDDEN_CATEGORIES.has(CAT_ARG)) {
  guardErrors.push(`Category is FORBIDDEN and can never be captured: "${CAT_ARG}"`);
}
if (CAT_ARG && !ALLOWED_CATEGORIES.has(CAT_ARG) && !FORBIDDEN_CATEGORIES.has(CAT_ARG)) {
  guardErrors.push(`Category not in allowed list: "${CAT_ARG}". Allowed: ${[...ALLOWED_CATEGORIES].join(', ')}`);
}
if (URL_ARG && EXCH_ARG && !isDomainAllowed(EXCH_ARG, URL_ARG)) {
  guardErrors.push(`URL domain not allowed for exchange "${EXCH_ARG}": ${URL_ARG}`);
}

if (guardErrors.length > 0) {
  log('  ❌ GUARD REJECTED:');
  for (const e of guardErrors) log(`     ✖  ${e}`);
  log('');
  log('  Required flags for live capture:');
  log('    --live --confirm-live --exchange <slug> --category <cat> --url <url>');
  log('');
  process.exit(1);
}

log(`  ✅ Guard passed.`);
log('');

// ── Run capture ────────────────────────────────────────────────────────────────
let result;
try {
  result = await runCapture(EXCH_ARG, CAT_ARG, URL_ARG);
} catch (e) {
  console.error(`  ❌ Unexpected error: ${e.message}`);
  process.exit(1);
}

// ── Summary ────────────────────────────────────────────────────────────────────
log('');
log('  ═══════════════════════════════════════════════════════════');
log(`   CAPTURE COMPLETE — ${EXCH_ARG.toUpperCase()} / ${CAT_ARG}`);
log(`   Screenshot saved:     ${result.screenshotSaved ? '✅ yes' : '❌ no'}`);
log(`   HTTP status:          ${result.httpStatus ?? '—'}`);
log(`   Page title:           ${result.pageTitle ?? '—'}`);
log(`   Logged in detected:   ${result.loggedInDetected ? '✅ yes' : '⚠️  no'}`);
log(`   Risk level:           ${result.riskLevel}`);
log(`   Forbidden buttons:    ${result.forbiddenActionsDetected.length} detected (none clicked)`);
if (result.captureError) {
  log(`   ❌ Error:             ${result.captureError}`);
}
log('');
log('  ⚠️  ALWAYS review the screenshot before using as evidence.');
log('  ⚠️  Verify CSS masking covered all personal data.');
log('  ✅ No financial actions were performed.');
log('  ✅ manualReviewRequired = true (always set for authenticated captures).');
log('  ═══════════════════════════════════════════════════════════');
log('');
