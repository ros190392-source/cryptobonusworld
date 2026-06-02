#!/usr/bin/env node
/**
 * auth-login-exchange.mjs — CryptoBonusWorld Exchange Session Saver
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Opens a visible Chromium browser, navigates to the exchange login page, and
 * waits for the user to log in manually. Once login is detected, saves the
 * session state (cookies + localStorage) to .auth/{exchange}.json.
 *
 * SECURITY RULES:
 *   ✓  Saves only session cookies/localStorage — no passwords stored
 *   ✓  .auth/ is gitignored — session files never committed
 *   ✓  Session is valid only on this machine
 *   ✗  Never pass --password to this script — passwords stay in your head
 *
 * Usage:
 *   npm run screenshots:auth-login -- --exchange binance
 *   node scripts/auth-login-exchange.mjs --exchange okx
 *   node scripts/auth-login-exchange.mjs --exchange mexc --timeout 600
 *
 * Options:
 *   --exchange <slug>     Exchange to login to (required)
 *   --timeout  <seconds>  Max wait time for login (default: 300s = 5 min)
 *   --verify              Navigate to a private page to verify session after save
 *   --clear               Delete existing session before starting
 *   --verbose             Extra diagnostic output
 *
 * After running:
 *   .auth/{exchange}.json is created
 *   Run:  npm run screenshots:harvest:binance
 */

import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const AUTH_DIR  = join(ROOT, '.auth');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV      = process.argv.slice(2);
const flag      = (n) => ARGV.includes(n);
const opt       = (n, fb) => { const i = ARGV.indexOf(n); return i !== -1 && i+1 < ARGV.length ? ARGV[i+1] : (fb ?? null); };

const EXCHANGE  = opt('--exchange');
const TIMEOUT_S = parseInt(opt('--timeout', '300'), 10);
const VERIFY    = flag('--verify');
const CLEAR     = flag('--clear');
const VERBOSE   = flag('--verbose');

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);
const die  = (...a) => { console.error('\n  ✖', ...a, '\n'); process.exit(1); };

// ── Exchange config ───────────────────────────────────────────────────────────

const EXCHANGES = {
  binance:  {
    loginUrl: 'https://www.binance.com/en/login',
    verifyUrl: 'https://www.binance.com/en/my/dashboard',
    successSelectors: ['[class*="header-user"]', '[class*="user-center"]', '[data-test-id*="user"]'],
    name: 'Binance',
  },
  okx: {
    loginUrl: 'https://www.okx.com/account/login',
    verifyUrl: 'https://www.okx.com/account/overview',
    successSelectors: ['[class*="user-info"]', '[class*="header-login-info"]', '.ok-user-dropdown'],
    name: 'OKX',
  },
  mexc: {
    loginUrl: 'https://www.mexc.com/login',
    verifyUrl: 'https://www.mexc.com/assets',
    successSelectors: ['[class*="user-info"]', '[class*="logged-in"]', '.layout-header__user'],
    name: 'MEXC',
  },
  bitget: {
    loginUrl: 'https://www.bitget.com/login',
    verifyUrl: 'https://www.bitget.com/account/overview',
    successSelectors: ['[class*="user-avatar"]', '[class*="header-user"]'],
    name: 'Bitget',
  },
  bybit: {
    loginUrl: 'https://www.bybit.com/en/login',
    verifyUrl: 'https://www.bybit.com/user/assets/home',
    successSelectors: ['[class*="user-name"]', '.user-center', '[data-testid*="user"]'],
    name: 'Bybit',
  },
  bingx: {
    loginUrl: 'https://bingx.com/en-us/account/login/',
    verifyUrl: 'https://bingx.com/en-us/asset/',
    successSelectors: ['[class*="user-avatar"]', '[class*="header-user"]'],
    name: 'BingX',
  },
  coinbase: {
    loginUrl: 'https://login.coinbase.com/',
    verifyUrl: 'https://www.coinbase.com/dashboard',
    successSelectors: ['[data-testid="portfolio"]', '[class*="dashboard"]'],
    name: 'Coinbase',
  },
  'gate-io': {
    loginUrl: 'https://www.gate.io/login',
    verifyUrl: 'https://www.gate.io/myaccount',
    successSelectors: ['[class*="user-info"]', '.user-nickname'],
    name: 'Gate.io',
  },
  kucoin: {
    loginUrl: 'https://www.kucoin.com/ucenter/signin',
    verifyUrl: 'https://www.kucoin.com/ucenter/overview',
    successSelectors: ['[class*="user-info"]', '.username'],
    name: 'KuCoin',
  },
  htx: {
    loginUrl: 'https://www.htx.com/en-us/user/login/',
    verifyUrl: 'https://www.htx.com/en-us/finance/',
    successSelectors: ['[class*="user-info"]', '.user-avatar'],
    name: 'HTX',
  },
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!EXCHANGE) {
    console.log(`
  CryptoBonusWorld — Exchange Session Saver

  Usage: node scripts/auth-login-exchange.mjs --exchange <slug>

  Supported exchanges:
    ${Object.keys(EXCHANGES).join(', ')}

  Options:
    --exchange <slug>     Exchange to login to (required)
    --timeout  <seconds>  Login timeout (default: 300)
    --verify              Verify session after saving
    --clear               Delete existing session first
    --verbose             Extra output

  Example:
    npm run screenshots:auth-login -- --exchange binance
    node scripts/auth-login-exchange.mjs --exchange okx --timeout 600
`);
    return;
  }

  const exConfig = EXCHANGES[EXCHANGE];
  if (!exConfig) die(`Unknown exchange: "${EXCHANGE}". Supported: ${Object.keys(EXCHANGES).join(', ')}`);

  const authPath = join(AUTH_DIR, `${EXCHANGE}.json`);

  // ── Clear existing session ────────────────────────────────────────────────
  if (CLEAR && existsSync(authPath)) {
    unlinkSync(authPath);
    log(`Cleared existing session: .auth/${EXCHANGE}.json`);
  }

  // ── Create .auth/ dir ─────────────────────────────────────────────────────
  if (!existsSync(AUTH_DIR)) {
    mkdirSync(AUTH_DIR, { recursive: true });
    // Write .gitignore inside .auth/ as extra protection
    writeFileSync(join(AUTH_DIR, '.gitignore'), '*\n');
    dbg('Created .auth/ directory with .gitignore');
  }

  // ── Load playwright ───────────────────────────────────────────────────────
  const { chromium } = await import('playwright').catch(() =>
    die('Playwright not installed. Run: npm install -D playwright && npx playwright install chromium'));

  // ── Launch headed browser ─────────────────────────────────────────────────
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--window-size=1440,900',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'UTC',
  });

  const page = await context.newPage();

  console.log('');
  log(`🔐  ${exConfig.name} Session Saver`);
  log('─'.repeat(52));
  console.log('');
  log(`  1. A browser window will open at ${exConfig.loginUrl}`);
  log(`  2. Log in manually — complete any 2FA`);
  log(`  3. Session saves automatically when login is detected`);
  log(`  4. Do NOT close the browser — wait for confirmation`);
  console.log('');
  log(`  Timeout: ${TIMEOUT_S}s   Auth file: .auth/${EXCHANGE}.json`);
  console.log('');

  // ── Navigate to login ─────────────────────────────────────────────────────
  try {
    await page.goto(exConfig.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    warn(`Navigation issue: ${e.message}. Browser is still open — try logging in manually.`);
  }

  log(`⏳  Waiting for login... (${TIMEOUT_S}s timeout)`);

  // ── Wait for login success ────────────────────────────────────────────────
  // Strategy 1: URL leaves the login/register path
  // Strategy 2: A known logged-in element appears
  // Strategy 3: Timeout fallback

  let loginDetected = false;
  const deadline = Date.now() + TIMEOUT_S * 1000;

  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);

    // Check URL
    const url = page.url();
    const isStillOnLogin = /\/(login|register|signin|sign-in|log-in)/i.test(url);

    if (!isStillOnLogin && !url.includes('loginUrl')) {
      dbg(`URL changed: ${url}`);

      // Check for known logged-in elements
      for (const sel of exConfig.successSelectors) {
        const el = await page.$(sel).catch(() => null);
        if (el) {
          loginDetected = true;
          dbg(`Login element found: ${sel}`);
          break;
        }
      }

      if (!loginDetected) {
        // URL changed but no success element — may be loading
        // Give it a few more seconds
        await page.waitForTimeout(3000);
        for (const sel of exConfig.successSelectors) {
          const el = await page.$(sel).catch(() => null);
          if (el) { loginDetected = true; break; }
        }
      }

      if (loginDetected) break;
    }
  }

  if (!loginDetected) {
    warn(`Login not automatically detected within ${TIMEOUT_S}s.`);
    warn(`Saving session anyway — it may be valid.`);
    warn(`If harvest fails, re-run this script to refresh the session.`);
  }

  // ── Wait for network to settle after login ────────────────────────────────
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch {
    dbg('Network did not reach idle — saving anyway');
  }

  // ── Save session state ────────────────────────────────────────────────────
  await context.storageState({ path: authPath });
  log(`\n✅  Session saved: .auth/${EXCHANGE}.json`);

  // ── Verify session if requested ───────────────────────────────────────────
  if (VERIFY && exConfig.verifyUrl) {
    log(`\n🔍  Verifying session at ${exConfig.verifyUrl}...`);
    try {
      await page.goto(exConfig.verifyUrl, { waitUntil: 'networkidle', timeout: 20000 });
      const verifyUrl = page.url();
      const isLoginPage = /\/(login|register|signin)/i.test(verifyUrl);
      if (isLoginPage) {
        warn('Verification failed — session may have expired or login was incomplete');
        warn('Re-run this script to capture a fresh session');
      } else {
        log(`✅  Session verified: ${verifyUrl}`);
      }
    } catch (e) {
      warn(`Verification navigation failed: ${e.message}`);
    }
  }

  await browser.close();

  console.log('');
  log(`Session ready. Next step:`);
  log(`  npm run screenshots:harvest -- --exchange ${EXCHANGE}`);
  log(`  npm run screenshots:harvest:${EXCHANGE}`);
  console.log('');
}

main().catch(e => {
  console.error('\n  ✖ Auth error:', e.message);
  if (VERBOSE) console.error(e.stack);
  process.exit(1);
});
