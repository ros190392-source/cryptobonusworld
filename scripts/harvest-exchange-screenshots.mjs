#!/usr/bin/env node
/**
 * harvest-exchange-screenshots.mjs — CryptoBonusWorld Autonomous Screenshot Harvester v1
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Fully automated exchange screenshot capture pipeline:
 *   1. Launches headless Chromium (or headed with --headed)
 *   2. Loads saved session from .auth/{exchange}.json if available
 *   3. Navigates to each safe category URL in the route map
 *   4. Injects privacy blur CSS before every screenshot
 *   5. Captures and saves raw screenshots to _raw-screenshots/
 *   6. Processes through sharp pipeline (crop → resize → frame → WebP)
 *   7. Saves processed files to public/screenshots/
 *   8. Generates approval queue reports
 *
 * NEVER CAPTURES:
 *   ✗  KYC documents / identity verification
 *   ✗  Withdrawal pages
 *   ✗  API key management
 *   ✗  Security settings
 *   ✗  Wallet addresses or QR codes (blurred if visible)
 *   ✗  Account balances (blurred if visible)
 *   ✗  Personal info (email, phone, name, UID)
 *
 * Usage:
 *   node scripts/harvest-exchange-screenshots.mjs --exchange binance
 *   npm run screenshots:harvest:binance
 *   npm run screenshots:harvest:binance -- --dry-run
 *   npm run screenshots:harvest -- --exchange okx --category fees,spot,futures
 *
 * Options:
 *   --exchange  <slug>           Exchange to harvest (required)
 *   --category  <cat,cat,...>    Only harvest specific categories (default: all safe)
 *   --dry-run                   Print route map without opening browser
 *   --headed                    Run in visible browser (for debugging)
 *   --no-auth                   Skip loading saved session (public pages only)
 *   --no-process                Skip sharp processing (keep raw PNGs only)
 *   --no-blur                   Skip blur injection (UNSAFE — debug only)
 *   --timeout <ms>              Per-page timeout in ms (default: 20000)
 *   --verbose                   Extra diagnostic output
 */

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, rmSync,
} from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV       = process.argv.slice(2);
const flag       = (n)  => ARGV.includes(n);
const opt        = (n, fb) => { const i = ARGV.indexOf(n); return i !== -1 && i+1 < ARGV.length ? ARGV[i+1] : (fb ?? null); };
const optList    = (n)  => opt(n)?.split(',').map(s => s.trim()).filter(Boolean) ?? null;

const EXCHANGE   = opt('--exchange');
const CAT_FILTER = optList('--category');
const DRY_RUN    = flag('--dry-run');
const HEADED     = flag('--headed');
const NO_AUTH    = flag('--no-auth');
const NO_PROCESS = flag('--no-process');
const NO_BLUR    = flag('--no-blur');
const PAGE_TO    = parseInt(opt('--timeout', '20000'), 10);
const VERBOSE    = flag('--verbose');

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);
const die  = (...a) => { console.error('\n  ✖', ...a, '\n'); process.exit(1); };

// ── Route safety classifications ──────────────────────────────────────────────
// PUBLIC   — no login needed, no sensitive content possible
// AUTHED   — requires session, content is safe with blur applied
// SKIP     — never automate; sensitive content that cannot be safely blurred
// MANUAL   — page exists but is too complex or unreliable for automation

// ── Global blur CSS ───────────────────────────────────────────────────────────
// Applied to EVERY page before capture. Broad-stroke patterns.

const BLUR_CSS_GLOBAL = `
/* CryptoBonusWorld Safety Blur — injected before every screenshot */
/* Wallet addresses */
[class*="address" i]:not([class*="address-bar" i]):not([class*="email" i]) input,
[class*="wallet-address" i], [class*="coin-address" i],
input[type="text"][readonly]:not([class*="search" i]):not([class*="invite" i]),
/* QR codes — canvas elements are typically QR codes on deposit pages */
canvas[width="200"], canvas[width="182"], canvas[width="176"], canvas[width="160"],
canvas[width="180"], canvas[class*="qr" i],
img[alt*="qr" i], [class*="qr-code" i], [class*="qrcode" i],
/* Balances */
[class*="total-balance" i], [class*="asset-balance" i],
[class*="portfolio-value" i], [class*="account-balance" i],
/* UID / User ID */
[class*=" uid" i], [class*="user-id" i], [class*="account-id" i],
[class*="user-uid" i], [data-test-id*="uid" i],
/* Personal info */
[class*="profile-email" i], [class*="user-email" i],
[class*="profile-phone" i], [class*="user-phone" i],
/* Avatar (user photo) */
[class*="user-avatar" i] img, [class*="profile-avatar" i] img,
[class*="header-avatar" i] img
{
  filter: blur(10px) !important;
  pointer-events: none !important;
  user-select: none !important;
}
/* Ensure blurs aren't visible in outline/screenshot artifacts */
[style*="blur"] { outline: none !important; }
`;

// ── Per-exchange extra blur CSS ───────────────────────────────────────────────

const BLUR_CSS_EXCHANGE = {
  binance: `
    .bn-balance-account, [class*="bn-avatar"] img,
    [class*="asset-item-amount"], [class*="fiat-balance"],
    [data-bn-type*="balance"], .user-balance,
    .layout-header-right [class*="user"],
  `,
  okx: `
    .ok-portfolio-amount, [class*="ok-balance"],
    [class*="ok-user-email"], [class*="ok-uid"],
    .header-amount,
  `,
  mexc: `
    [class*="total-asset"], [class*="user-balance"],
    [class*="uid-text"], .layout-header__user-name,
  `,
  bitget: `
    [class*="bg-balance"], [class*="bg-uid"],
    [class*="user-info__email"], [class*="asset-amount"],
  `,
  bybit: `
    [class*="balance-amount"], [class*="wallet-amount"],
    [class*="user-uid"], [class*="header-uid"],
  `,
  bingx: `
    [class*="balance-amount"], [class*="user-uid"],
    [class*="user-info"] [class*="email"],
  `,
};

// ── Route map ─────────────────────────────────────────────────────────────────

const VIEWPORT_DESKTOP = { width: 1440, height: 900 };
const VIEWPORT_MOBILE  = { width: 390,  height: 844 };

const ROUTE_MAP = {

  // ────────────────────────────── BINANCE ──────────────────────────────────

  binance: {
    registration: {
      url: 'https://www.binance.com/en/register',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: 'input[type="email"], input[name="email"], h1',
      waitForTimeout: 2000,
      blurSelectors: [],
      notes: 'Registration form — email/phone field, clean session',
    },
    bonus: {
      url: 'https://www.binance.com/en/activity/referral',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="activity"], [class*="referral"], h1',
      waitForTimeout: 2500,
      blurSelectors: [],
      notes: 'Referral/welcome bonus page — up to 19,800 USDT',
    },
    fees: {
      url: 'https://www.binance.com/en/fee/schedule',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: 'table, [class*="fee-table"], [class*="fee"]',
      waitForTimeout: 2000,
      blurSelectors: [],
      notes: 'Fee schedule — spot 0.10%/0.10%, futures 0.02%/0.05%',
    },
    proof_of_reserves: {
      url: 'https://www.binance.com/en/proof-of-reserves',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="reserve"], h1',
      waitForTimeout: 2000,
      blurSelectors: [],
      notes: 'Proof-of-reserves — Merkle tree verification',
    },
    spot: {
      url: 'https://www.binance.com/en/trade/BTC_USDT',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="chart"], [class*="orderbook"]',
      waitForTimeout: 4000,  // Charts need time to render
      blurSelectors: [],
      notes: 'BTC/USDT spot trading interface',
    },
    futures: {
      url: 'https://www.binance.com/en/futures/BTCUSDT',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="futures"], [class*="chart"]',
      waitForTimeout: 4000,
      blurSelectors: [],
      notes: 'BTCUSDT USDM futures — 125x leverage',
    },
    p2p: {
      url: 'https://p2p.binance.com/en',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="p2p"], [class*="trade-type"], [class*="ad-list"]',
      waitForTimeout: 3000,
      blurSelectors: [
        '[class*="merchant-name"]', '[class*="user-name"]',
        '[class*="order-nickname"]',
      ],
      notes: 'P2P marketplace listing — buy/sell USDT',
    },
    deposit: {
      url: 'https://www.binance.com/en/my/wallet/account/main',
      safety: 'AUTHED',
      requiresAuth: true,
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="wallet"], [class*="asset-item"]',
      waitForTimeout: 3000,
      blurSelectors: [
        '[class*="balance"]', '[class*="amount"]',
        '[class*="asset-value"]', '[class*="total"]',
        '[class*="pnl"]',
      ],
      notes: 'Asset/wallet overview — all values blurred',
    },
    mobile_app: {
      url: 'https://apps.apple.com/us/app/binance-crypto-buy-bitcoin/id1436799971',
      safety: 'PUBLIC',
      viewport: VIEWPORT_MOBILE,
      fullPage: false,
      waitForSelector: '.we-screenshot, .product-hero__artwork, .we-artwork',
      waitForTimeout: 3000,
      blurSelectors: [],
      notes: 'Binance App Store listing',
    },
    kyc: {
      safety: 'SKIP',
      skipReason: 'identity_documents',
      notes: 'Contains KYC document upload and personal identity data',
    },
  },

  // ────────────────────────────── OKX ──────────────────────────────────────

  okx: {
    registration: {
      url: 'https://www.okx.com/join',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: 'input[type="email"], input[type="text"], h1',
      waitForTimeout: 2000,
      blurSelectors: [],
      notes: 'OKX registration form',
    },
    bonus: {
      url: 'https://www.okx.com/campaigns/new-user',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: 'h1, [class*="campaign"], [class*="banner"]',
      waitForTimeout: 2500,
      blurSelectors: [],
      notes: 'New user bonus — up to 10,000 USDT',
    },
    fees: {
      url: 'https://www.okx.com/fees',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: 'table, [class*="fee"]',
      waitForTimeout: 2000,
      blurSelectors: [],
      notes: 'Fee schedule',
    },
    proof_of_reserves: {
      url: 'https://www.okx.com/proof-of-reserves',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="reserve"], h1',
      waitForTimeout: 2000,
      blurSelectors: [],
      notes: 'OKX proof-of-reserves',
    },
    spot: {
      url: 'https://www.okx.com/trade-spot/btc-usdt',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="chart"], [class*="order-book"]',
      waitForTimeout: 4000,
      blurSelectors: [],
      notes: 'BTC/USDT spot trading',
    },
    futures: {
      url: 'https://www.okx.com/trade-futures/btc-usdt-swap',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="chart"]',
      waitForTimeout: 4000,
      blurSelectors: [],
      notes: 'BTC-USDT perpetual swap',
    },
    deposit: {
      url: 'https://www.okx.com/balance/recharge',
      safety: 'AUTHED',
      requiresAuth: true,
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="deposit"], [class*="recharge"]',
      waitForTimeout: 2500,
      blurSelectors: ['[class*="address"]', 'canvas', 'input[readonly]', '[class*="balance"]'],
      notes: 'Deposit page — blur address',
    },
    mobile_app: {
      url: 'https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470',
      safety: 'PUBLIC',
      viewport: VIEWPORT_MOBILE,
      fullPage: false,
      waitForSelector: '.we-screenshot, .product-hero__artwork',
      waitForTimeout: 3000,
      blurSelectors: [],
      notes: 'OKX App Store listing',
    },
    kyc: {
      safety: 'SKIP',
      skipReason: 'identity_documents',
      notes: 'Contains personal identity verification documents',
    },
    p2p: {
      safety: 'MANUAL',
      notes: 'OKX P2P availability varies by region — add to manual queue',
    },
  },

  // ────────────────────────────── MEXC ─────────────────────────────────────

  mexc: {
    registration: {
      url: 'https://www.mexc.com/register',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: 'input[type="email"], h1, [class*="register"]',
      waitForTimeout: 2000,
      blurSelectors: [],
      notes: 'MEXC registration — no KYC required',
    },
    bonus: {
      url: 'https://www.mexc.com/en-US/activity',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="activity"], h1',
      waitForTimeout: 2500,
      blurSelectors: [],
      notes: 'MEXC welcome bonus page',
    },
    fees: {
      url: 'https://www.mexc.com/fee',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: 'table, [class*="fee"]',
      waitForTimeout: 2000,
      blurSelectors: [],
      notes: 'Fee schedule — 0% maker',
    },
    spot: {
      url: 'https://www.mexc.com/exchange/BTC_USDT',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="chart"], [class*="order"]',
      waitForTimeout: 4000,
      blurSelectors: [],
      notes: 'BTC/USDT spot trading',
    },
    futures: {
      url: 'https://futures.mexc.com/exchange/BTC_USDT',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="chart"]',
      waitForTimeout: 4000,
      blurSelectors: [],
      notes: 'BTC/USDT perpetual futures — 200x',
    },
    p2p: {
      url: 'https://www.mexc.com/p2p',
      safety: 'PUBLIC',
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="p2p"], [class*="ad"]',
      waitForTimeout: 3000,
      blurSelectors: ['[class*="user-name"]', '[class*="merchant"]'],
      notes: 'MEXC P2P marketplace',
    },
    deposit: {
      url: 'https://www.mexc.com/assets/deposit',
      safety: 'AUTHED',
      requiresAuth: true,
      viewport: VIEWPORT_DESKTOP,
      fullPage: false,
      waitForSelector: '[class*="deposit"]',
      waitForTimeout: 2500,
      blurSelectors: ['[class*="address"]', 'canvas', 'input[readonly]'],
      notes: 'Deposit page',
    },
    mobile_app: {
      url: 'https://apps.apple.com/us/app/mexc-buy-sell-crypto-bitcoin/id1581119500',
      safety: 'PUBLIC',
      viewport: VIEWPORT_MOBILE,
      fullPage: false,
      waitForSelector: '.we-screenshot, .product-hero__artwork',
      waitForTimeout: 3000,
      blurSelectors: [],
      notes: 'MEXC App Store listing',
    },
    kyc: {
      safety: 'SKIP',
      skipReason: 'not_applicable',
      notes: 'KYC not required on MEXC — screenshot not needed',
    },
    proof_of_reserves: {
      safety: 'SKIP',
      skipReason: 'not_applicable',
      notes: 'PoR not published on MEXC',
    },
  },
};

// ── Processing helpers (inline sharp pipeline) ────────────────────────────────

const TARGET_WIDTHS   = { desktop: 1200, mobile: 390 };
const WEBP_QUALITY    = { desktop: 85,   mobile: 82  };
const FRAME_HEIGHT_PX = { desktop: 40,   mobile: 48  };

const EXCHANGE_URLS = {
  binance:'www.binance.com', okx:'www.okx.com', mexc:'www.mexc.com',
  bitget:'www.bitget.com', coinbase:'www.coinbase.com', bingx:'bingx.com',
  bybit:'www.bybit.com', 'gate-io':'www.gate.io', kucoin:'www.kucoin.com',
};

const CATEGORY_PATH_HINTS = {
  registration:'/register', kyc:'/verify', bonus:'/activity',
  deposit:'/assets/deposit', p2p:'/p2p', spot:'/trade/BTC-USDT',
  futures:'/futures/BTCUSDT', fees:'/fee',
  mobile_app:'App Store', proof_of_reserves:'/proof-of-reserves',
};

function generateDesktopFrame(exchange, category, width) {
  const domain   = EXCHANGE_URLS[exchange] ?? `${exchange}.com`;
  const pathHint = CATEGORY_PATH_HINTS[category] ?? '/';
  const dispUrl  = pathHint === 'App Store' ? `apps.apple.com — ${exchange}` : `${domain}${pathHint}`;
  const barW     = Math.min(460, Math.round(width * 0.38));
  const barX     = Math.round(width / 2 - barW / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40">
  <rect width="${width}" height="40" fill="#16162A"/>
  <line x1="0" y1="39.5" x2="${width}" y2="39.5" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <circle cx="20" cy="20" r="6" fill="#2D2D42"/>
  <circle cx="36" cy="20" r="6" fill="#2D2D42"/>
  <circle cx="52" cy="20" r="6" fill="#2D2D42"/>
  <rect x="${barX}" y="9" width="${barW}" height="22" rx="5" fill="#1E1E30"/>
  <rect x="${barX+10}" y="15" width="7" height="8" rx="1.5" fill="none" stroke="#6B7280" stroke-width="1.5"/>
  <path d="M ${barX+11} 15 L ${barX+11} 13 Q ${barX+13.5} 10 ${barX+16} 13 L ${barX+16} 15"
    fill="none" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round"/>
  <text x="${barX + barW/2 + 4}" y="24"
    font-family="Inter, -apple-system, sans-serif" font-size="12" fill="#9CA3AF" text-anchor="middle">${dispUrl}</text>
</svg>`;
}

async function processRawScreenshot(rawPath, exchange, category, device) {
  const { default: sharp } = await import('sharp');

  const mobileFramePath = join(ROOT, 'assets', 'browser-frame', 'frame-390-mobile.svg');
  const targetWidth     = TARGET_WIDTHS[device];
  const webpQuality     = WEBP_QUALITY[device];

  let pipeline = sharp(rawPath, { failOnError: false })
    .toColorspace('srgb')
    .withMetadata({})
    .trim({ background: { r: 255, g: 255, b: 255 }, threshold: 15 })
    .resize(targetWidth, null, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' });

  let buffer = await pipeline.toBuffer();
  const meta = await sharp(buffer).metadata();
  const W = meta.width;

  // Apply browser frame
  const composites = [];
  if (device === 'mobile' && existsSync(mobileFramePath)) {
    composites.push({ input: readFileSync(mobileFramePath), gravity: 'north', blend: 'over' });
  } else if (device === 'desktop') {
    composites.push({ input: Buffer.from(generateDesktopFrame(exchange, category, W)), gravity: 'north', blend: 'over' });
  }

  if (composites.length > 0) {
    buffer = await sharp(buffer).composite(composites).toBuffer();
  }

  const finalBuffer = await sharp(buffer)
    .webp({ quality: webpQuality, effort: 4, smartSubsample: true })
    .toBuffer();

  return finalBuffer;
}

// ── Cookie banner dismissal ───────────────────────────────────────────────────

async function dismissCookieBanner(page) {
  const COOKIE_BTNS = [
    // Generic
    '#onetrust-accept-btn-handler',
    '[data-testid="cookie-policy-dialog-accept-button"]',
    'button[class*="cookie"][class*="accept" i]',
    '[class*="consent-accept" i]',
    // Exchange-specific
    '[class*="bn-button"][class*="Accept" i]',  // Binance
    '.cookie-consent__accept',
  ];

  for (const sel of COOKIE_BTNS) {
    try {
      const btn = await page.$(sel);
      if (btn && await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(500);
        dbg(`Dismissed cookie banner: ${sel}`);
        return;
      }
    } catch { /* ignore */ }
  }
}

// ── Safety check ─────────────────────────────────────────────────────────────

const DANGER_PATTERNS = [
  // Never capture if these are visible and unblurred
  /private.?key/i, /seed.?phrase/i, /mnemonic/i,
  /withdrawal/i, /api.?key/i, /secret.?key/i,
];

async function safetyCheck(page, url) {
  const currentUrl = page.url();

  // If we got redirected to a known dangerous path, abort
  if (/\/(withdrawal|withdraw|api-key|security|2fa|backup|export-key)/i.test(currentUrl)) {
    return { safe: false, reason: `Redirected to sensitive page: ${currentUrl}` };
  }

  // Check page content for dangerous patterns
  try {
    const title = await page.title();
    for (const re of DANGER_PATTERNS) {
      if (re.test(title)) {
        return { safe: false, reason: `Page title contains sensitive keyword: ${title}` };
      }
    }
  } catch { /* ignore */ }

  return { safe: true };
}

// ── Capture one category ──────────────────────────────────────────────────────

async function captureCategory(context, exchange, category, routeConfig, date) {
  const rawDir = join(ROOT, '_raw-screenshots', exchange, category);
  if (!existsSync(rawDir)) mkdirSync(rawDir, { recursive: true });

  const rawFilename = `raw-${date}-${Date.now()}.png`;
  const rawPath     = join(rawDir, rawFilename);

  const device = routeConfig.viewport?.width < 600 ? 'mobile' : 'desktop';

  const page = await context.newPage();
  try {
    await page.setViewportSize(routeConfig.viewport ?? VIEWPORT_DESKTOP);

    dbg(`Navigating: ${routeConfig.url}`);

    // Navigate
    await page.goto(routeConfig.url, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_TO,
    });

    // Wait for network to settle
    try {
      await page.waitForLoadState('networkidle', { timeout: 8000 });
    } catch {
      dbg('Network idle timeout — continuing anyway');
    }

    // Safety check
    const safety = await safetyCheck(page, routeConfig.url);
    if (!safety.safe) {
      return { category, status: 'blocked_safety', reason: safety.reason, rawPath: null };
    }

    // Dismiss cookie banners
    await dismissCookieBanner(page);

    // Wait for expected element
    if (routeConfig.waitForSelector) {
      try {
        await page.waitForSelector(routeConfig.waitForSelector, { timeout: 10000 });
      } catch {
        dbg(`Expected selector not found: ${routeConfig.waitForSelector}`);
      }
    }

    // Extra wait for JS rendering (charts, animations)
    await page.waitForTimeout(routeConfig.waitForTimeout ?? 2000);

    // Inject blur CSS
    if (!NO_BLUR) {
      const blurCSS = BLUR_CSS_GLOBAL +
        (BLUR_CSS_EXCHANGE[exchange] ?? '') +
        (routeConfig.blurSelectors?.length > 0
          ? routeConfig.blurSelectors.join(',') + ' { filter: blur(10px) !important; }'
          : '');
      await page.addStyleTag({ content: blurCSS });
      await page.waitForTimeout(300); // Let blur render
    }

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      fullPage: routeConfig.fullPage ?? false,
      type: 'png',
    });

    // Save raw
    writeFileSync(rawPath, screenshotBuffer);
    dbg(`Raw saved: ${rawPath}`);

    return { category, status: 'captured', rawPath, device, error: null };

  } catch (e) {
    const reason = e.message.includes('timeout') ? 'TIMEOUT'
                 : e.message.includes('net::')   ? 'NETWORK_ERROR'
                 : 'ERROR';
    return { category, status: 'failed', reason, error: e.message, rawPath: null };
  } finally {
    await page.close();
  }
}

// ── Process captured screenshot ───────────────────────────────────────────────

async function processCapture(captureResult, exchange, category, date) {
  if (captureResult.status !== 'captured' || !captureResult.rawPath) {
    return captureResult;
  }

  if (NO_PROCESS) {
    return { ...captureResult, processedPath: null };
  }

  const device = captureResult.device ?? 'desktop';
  const outDir  = join(ROOT, 'public', 'screenshots', exchange, category);
  const outFile = `global-${device}-${date}.webp`;
  const outPath = join(outDir, outFile);

  try {
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const buffer = await processRawScreenshot(captureResult.rawPath, exchange, category, device);
    writeFileSync(outPath, buffer);
    dbg(`Processed: ${outPath}`);
    return {
      ...captureResult,
      processedPath: outPath,
      publicPath: `/screenshots/${exchange}/${category}/${outFile}`,
    };
  } catch (e) {
    warn(`Processing failed for ${category}: ${e.message}`);
    return { ...captureResult, processedPath: null, processError: e.message };
  }
}

// ── Approval queue ────────────────────────────────────────────────────────────

function generateApprovalQueue(exchange, results, date) {
  const items = results.map(r => ({
    id:            `${exchange}-${r.category}-${date}`,
    exchange,
    category:       r.category,
    rawPath:        r.rawPath?.replace(ROOT, '').replace(/\\/g, '/') ?? null,
    processedPath:  r.processedPath?.replace(ROOT, '').replace(/\\/g, '/') ?? null,
    publicPath:     r.publicPath ?? null,
    status:         r.processedPath ? 'pending_approval'
                  : r.status === 'captured' ? 'processing_failed'
                  : r.status === 'blocked_safety' ? 'safety_blocked'
                  : r.status === 'skipped' ? 'skipped'
                  : 'capture_failed',
    capturedAt:    date,
    device:        r.device ?? 'desktop',
    geo:           'GLOBAL',
    locale:        'en',
    blurApplied:   !NO_BLUR,
    reason:        r.reason ?? r.skipReason ?? null,
    notes:         r.notes ?? '',
    error:         r.error ?? null,
    verified:      false,
  }));

  const queueData = {
    generatedAt: new Date().toISOString(),
    exchange,
    capturedAt:  date,
    summary: {
      total:       items.length,
      pending:     items.filter(i => i.status === 'pending_approval').length,
      failed:      items.filter(i => i.status === 'capture_failed').length,
      skipped:     items.filter(i => i.status === 'skipped').length,
      safety:      items.filter(i => i.status === 'safety_blocked').length,
    },
    items,
  };

  return queueData;
}

function writeApprovalQueue(queueData) {
  const reportsDir = join(ROOT, 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  const jsonPath = join(reportsDir, 'screenshot-approval-queue.json');
  const mdPath   = join(reportsDir, 'screenshot-approval-queue.md');

  // JSON
  writeFileSync(jsonPath, JSON.stringify(queueData, null, 2), 'utf8');

  // Markdown
  const { exchange, capturedAt, summary, items } = queueData;
  const rows = items.map(item => {
    const icon = item.status === 'pending_approval' ? '⏳'
               : item.status === 'skipped'          ? '—'
               : item.status === 'safety_blocked'   ? '🛡'
               : '❌';
    return `| ${icon} | \`${item.category}\` | ${item.status} | ${item.processedPath ?? '—'} | ${item.notes || item.reason || ''} |`;
  }).join('\n');

  const md = `# Screenshot Approval Queue
**Exchange:** ${exchange}  **Captured:** ${capturedAt}  **Generated:** ${new Date().toISOString().slice(0,19)}Z

## Summary
| Metric | Count |
|---|---|
| Total | ${summary.total} |
| Pending approval | ${summary.pending} |
| Failed | ${summary.failed} |
| Skipped | ${summary.skipped} |
| Safety blocked | ${summary.safety} |

## Approve all pending:
\`\`\`bash
npm run screenshots:approve -- --exchange ${exchange} --approve-all
\`\`\`

## Items
| Status | Category | Queue Status | Processed Path | Notes |
|---|---|---|---|---|
${rows}

## How to approve
\`\`\`bash
# Approve one:
npm run screenshots:approve -- --approve ${exchange}/fees

# Approve all pending for this exchange:
npm run screenshots:approve -- --exchange ${exchange} --approve-all

# Reject with reason:
npm run screenshots:approve -- --reject ${exchange}/deposit --reason "address visible"
\`\`\`

*Approval updates \`src/data/evidence/${exchange}.json\` with \`verified: true\`*
`;

  writeFileSync(mdPath, md, 'utf8');
  return { jsonPath, mdPath };
}

function writeManualQueue(exchange, failedItems) {
  if (failedItems.length === 0) return;

  const reportsDir = join(ROOT, 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  const mdPath = join(reportsDir, 'manual-screenshot-queue.md');
  const date = new Date().toISOString().slice(0, 7);

  const rows = failedItems.map(item =>
    `| \`${exchange}\` | \`${item.category}\` | \`${exchange}-${item.category}-${date}.png\` | ${item.reason ?? item.error ?? ''} |`
  ).join('\n');

  const md = `# Manual Screenshot Queue
**Generated:** ${new Date().toISOString().slice(0,19)}Z

Screenshots that could not be automated. Capture manually and place in \`_manual-screenshots/\`.

## Required captures
| Exchange | Category | Required filename | Reason |
|---|---|---|---|
${rows}

## Steps
1. Capture the screenshot manually (see \`reports/screenshot-capture-plan.md\`)
2. Save to: \`_manual-screenshots/{exchange}-{category}-${date}.png\`
3. Process: \`npm run screenshots:process:manual -- _manual-screenshots/{filename} --update-registry\`
4. Validate: \`npm run screenshots:check\`
`;

  writeFileSync(mdPath, md, 'utf8');
  log(`📋  Manual queue: reports/manual-screenshot-queue.md`);
}

// ── Dry-run output ────────────────────────────────────────────────────────────

function printDryRun(exchange, routes, authPath) {
  const hasAuth = existsSync(authPath);
  console.log('');
  log(`📸  Harvest Dry Run — ${exchange.toUpperCase()}`);
  log('─'.repeat(60));
  log(`  Auth session: ${hasAuth ? `✅ found at .auth/${exchange}.json` : '⚠  not found (AUTHED pages will be skipped)'}`);
  console.log('');

  const rows = Object.entries(routes).map(([cat, cfg]) => {
    const skip    = cfg.safety === 'SKIP' || cfg.safety === 'MANUAL';
    const needsAuth = cfg.requiresAuth && !hasAuth;
    const status  = skip       ? `SKIP (${cfg.skipReason ?? cfg.safety})`
                  : needsAuth  ? 'SKIP (no auth session)'
                  : `✓ ${cfg.safety}`;
    return `  ${(cat + '            ').slice(0,20)}  ${status.padEnd(30)}  ${cfg.url ?? '—'}`;
  });

  log(`  ${'Category'.padEnd(20)}  ${'Status'.padEnd(30)}  URL`);
  log('  ' + '─'.repeat(85));
  rows.forEach(r => console.log(r));
  console.log('');
  log(`  Output:  public/screenshots/${exchange}/{category}/global-desktop-2026-XX.webp`);
  log(`  Raw:     _raw-screenshots/${exchange}/{category}/raw-*.png`);
  log(`  Approve: npm run screenshots:approve -- --exchange ${exchange} --approve-all`);
  console.log('');
  log(`  To run for real:`);
  log(`    npm run screenshots:harvest -- --exchange ${exchange}`);
  if (!hasAuth) {
    log(`    (login first with: npm run screenshots:auth-login -- --exchange ${exchange})`);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!EXCHANGE) {
    console.log(`
  CryptoBonusWorld Screenshot Harvester v1

  Usage: node scripts/harvest-exchange-screenshots.mjs --exchange <slug>

  Supported: ${Object.keys(ROUTE_MAP).join(', ')}

  Options:
    --exchange  <slug>         Exchange to harvest
    --category  <cat,cat,...>  Only specific categories
    --dry-run                  Show route map without capturing
    --headed                   Visible browser
    --no-auth                  Skip saved session (public only)
    --no-process               Keep raw PNGs, skip WebP processing
    --no-blur                  Skip blur injection (UNSAFE — debug only)
    --timeout   <ms>           Per-page timeout (default: 20000)
    --verbose                  Extra output

  Examples:
    npm run screenshots:harvest:binance
    npm run screenshots:harvest:binance -- --dry-run
    npm run screenshots:harvest -- --exchange okx --category fees,spot,futures
    `);
    return;
  }

  const routes = ROUTE_MAP[EXCHANGE];
  if (!routes) die(`No route map for "${EXCHANGE}". Supported: ${Object.keys(ROUTE_MAP).join(', ')}`);

  const authPath = join(ROOT, '.auth', `${EXCHANGE}.json`);
  const hasAuth  = existsSync(authPath) && !NO_AUTH;
  const date     = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; })();

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    printDryRun(EXCHANGE, routes, authPath);
    return;
  }

  // ── Load playwright ───────────────────────────────────────────────────────
  const { chromium } = await import('playwright').catch(() =>
    die('Playwright not installed. Run: npm install -D playwright && npx playwright install chromium'));

  // ── Launch browser ────────────────────────────────────────────────────────
  const browser = await chromium.launch({
    headless: !HEADED,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const contextOptions = {
    viewport: VIEWPORT_DESKTOP,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'UTC',
    ...(hasAuth ? { storageState: authPath } : {}),
  };

  const context = await browser.newContext(contextOptions);

  console.log('');
  log(`📸  Harvesting ${EXCHANGE.toUpperCase()} — ${date}`);
  log('─'.repeat(60));
  log(`  Auth session: ${hasAuth ? '✅ loaded' : '⚠  not found (public pages only)'}`);
  if (NO_BLUR) warn('Blur disabled — !!! review screenshots before approving !!!');
  console.log('');

  const results = [];

  // ── Capture each category ─────────────────────────────────────────────────
  const categoriesToRun = Object.entries(routes)
    .filter(([cat]) => !CAT_FILTER || CAT_FILTER.includes(cat));

  for (const [category, routeConfig] of categoriesToRun) {
    const pad = (category + '                  ').slice(0, 20);

    // Skip/Manual handling
    if (routeConfig.safety === 'SKIP') {
      log(`  ${pad}  — SKIP  ${routeConfig.skipReason ?? ''}`);
      results.push({ category, status: 'skipped', skipReason: routeConfig.skipReason, notes: routeConfig.notes });
      continue;
    }

    if (routeConfig.safety === 'MANUAL') {
      log(`  ${pad}  — MANUAL (add to manual queue)`);
      results.push({ category, status: 'manual', notes: routeConfig.notes });
      continue;
    }

    if (routeConfig.requiresAuth && !hasAuth) {
      log(`  ${pad}  ⚠ SKIP (auth required — run screenshots:auth-login first)`);
      results.push({ category, status: 'auth_required', notes: routeConfig.notes });
      continue;
    }

    // Capture
    process.stdout.write(`  ${pad}  ⏳ capturing...`);
    const captureResult = await captureCategory(context, EXCHANGE, category, routeConfig, date);

    if (captureResult.status === 'captured') {
      // Process
      const processed = await processCapture(captureResult, EXCHANGE, category, date);
      results.push({ ...processed, notes: routeConfig.notes });
      const size = processed.processedPath && existsSync(processed.processedPath)
        ? ` (${(readFileSync(processed.processedPath).length / 1024).toFixed(0)}KB)`
        : '';
      process.stdout.write(`\r  ${pad}  ✅ done${size}\n`);
    } else {
      results.push({ ...captureResult, notes: routeConfig.notes });
      process.stdout.write(`\r  ${pad}  ❌ ${captureResult.reason ?? captureResult.status}\n`);
    }
  }

  await browser.close();

  // ── Write approval queue ─────────────────────────────────────────────────
  const queueData = generateApprovalQueue(EXCHANGE, results, date);
  const { jsonPath, mdPath } = writeApprovalQueue(queueData);

  // ── Manual fallback queue ────────────────────────────────────────────────
  const manualItems = results.filter(r =>
    r.status === 'manual' || r.status === 'failed' || r.status === 'capture_failed' ||
    r.status === 'auth_required' || r.status === 'blocked_safety'
  );
  writeManualQueue(EXCHANGE, manualItems);

  // ── Summary ──────────────────────────────────────────────────────────────
  const { summary } = queueData;
  console.log('');
  log('─'.repeat(60));
  log(`  Total:    ${summary.total}`);
  log(`  Captured: ${summary.pending} ready for approval`);
  if (summary.failed  > 0) log(`  Failed:   ${summary.failed}`);
  if (summary.skipped > 0) log(`  Skipped:  ${summary.skipped}`);
  console.log('');
  log(`📋  Approval queue: reports/screenshot-approval-queue.md`);
  log(`\n  Next step:`);
  log(`    npm run screenshots:approve -- --exchange ${EXCHANGE} --approve-all`);
  log(`    (or review reports/screenshot-approval-queue.md first)`);
  console.log('');
}

main().catch(e => {
  console.error('\n  ✖ Harvest error:', e.message);
  if (VERBOSE) console.error(e.stack);
  process.exit(1);
});
