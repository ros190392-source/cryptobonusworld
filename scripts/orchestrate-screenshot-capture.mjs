#!/usr/bin/env node
/**
 * orchestrate-screenshot-capture.mjs — CryptoBonusWorld Production Capture Orchestrator
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Production-grade orchestrator wrapping the screenshot harvest pipeline with:
 *   • Route map loading from src/data/screenshot-routes/*.ts
 *   • Per-route failure classification (timeout/captcha/auth/blank/small)
 *   • Smart retry layer with escalating backoff
 *   • Optional parallel capture (--parallel N, max 3 recommended)
 *   • Anti-bot: random delay jitter + viewport randomization
 *   • Timestamped run reports in reports/capture-runs/
 *   • Quality validation on every processed screenshot
 *   • Auto-approval recommendations (human still approves)
 *   • Capture dashboard: reports/capture-dashboard.md
 *
 * Usage:
 *   npm run screenshots:orchestrate -- --exchange binance
 *   npm run screenshots:orchestrate -- --exchange binance --category fees,spot
 *   npm run screenshots:orchestrate -- --exchange binance --parallel 2
 *   npm run screenshots:orchestrate -- --all               (all configured exchanges)
 *   npm run screenshots:orchestrate -- --dashboard         (regenerate dashboard only)
 *   npm run screenshots:orchestrate -- --exchange binance --dry-run
 *
 * Options:
 *   --exchange  <slug>          Exchange to harvest (required unless --all)
 *   --all                       Run all configured exchanges sequentially
 *   --category  <cat,cat,...>   Only specific categories
 *   --parallel  <N>             Parallel capture contexts (default: 1, max: 3)
 *   --dry-run                   Print run plan without capturing
 *   --headed                    Visible browser window
 *   --no-auth                   Skip session loading (public only)
 *   --no-blur                   Skip privacy blur (UNSAFE — debug only)
 *   --timeout   <ms>            Per-page navigation timeout (default: 25000)
 *   --retries   <N>             Max retries per route (default: 2)
 *   --dashboard                 Regenerate capture dashboard and exit
 *   --verbose                   Extra diagnostic output
 *
 * After running:
 *   reports/capture-runs/{runId}.json   — machine-readable run result
 *   reports/capture-runs/{runId}.md     — human-readable run summary
 *   reports/capture-dashboard.md        — aggregated coverage dashboard
 *   reports/screenshot-approval-queue.json — updated approval queue
 */

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync,
} from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const ROUTES_DIR = join(ROOT, 'src', 'data', 'screenshot-routes');
const RUNS_DIR   = join(ROOT, 'reports', 'capture-runs');

// ── CLI ───────────────────────────────────────────────────────────────────────

const ARGV       = process.argv.slice(2);
const flag       = (n)     => ARGV.includes(n);
const opt        = (n, fb) => { const i = ARGV.indexOf(n); return i !== -1 && i+1 < ARGV.length ? ARGV[i+1] : (fb ?? null); };
const optList    = (n)     => opt(n)?.split(',').map(s => s.trim()).filter(Boolean) ?? null;
const optInt     = (n, fb) => { const v = opt(n); return v !== null ? parseInt(v, 10) : fb; };

const EXCHANGE   = opt('--exchange');
const RUN_ALL    = flag('--all');
const CAT_FILTER = optList('--category');
const PARALLEL   = Math.min(optInt('--parallel', 1), 3);
const DRY_RUN    = flag('--dry-run');
const HEADED     = flag('--headed');
const NO_AUTH    = flag('--no-auth');
const NO_BLUR    = flag('--no-blur');
const PAGE_TO    = optInt('--timeout', 25000);
const MAX_RETRY  = optInt('--retries', 2);
const DASH_ONLY  = flag('--dashboard');
const VERBOSE    = flag('--verbose');

const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const warn = (...a) => console.warn('  ⚠', ...a);
const die  = (...a) => { console.error('\n  ✖', ...a, '\n'); process.exit(1); };

// ── Known exchanges ───────────────────────────────────────────────────────────

const KNOWN_EXCHANGES = ['binance', 'okx', 'mexc', 'bybit', 'bitget', 'bingx', 'coinbase', 'gate-io', 'kucoin', 'htx'];

// ── Route map loader ──────────────────────────────────────────────────────────
// Loads src/data/screenshot-routes/{exchange}.ts by stripping TypeScript syntax
// (import type + : RouteMap) and dynamic-importing via data: URI.

async function loadRouteMap(exchange) {
  const tsPath = join(ROUTES_DIR, `${exchange}.ts`);
  if (!existsSync(tsPath)) {
    dbg(`No route map file for ${exchange}: ${tsPath}`);
    return null;
  }
  try {
    let src = readFileSync(tsPath, 'utf-8');
    // Strip TypeScript-only syntax — must match exact patterns in the .ts files
    src = src.replace(/^import type[^\n]+\n/gm, '');  // import type lines
    src = src.replace(/: RouteMap\b/g, '');             // variable type annotations
    const encoded = encodeURIComponent(src);
    const dataUri = `data:text/javascript;charset=utf-8,${encoded}`;
    const mod = await import(dataUri);
    return mod.routes ?? null;
  } catch (e) {
    warn(`Failed to load route map for ${exchange}: ${e.message}`);
    return null;
  }
}

// ── Failure classification ────────────────────────────────────────────────────

const FAILURE = {
  TIMEOUT:       { retryable: true,  maxRetries: 2, classify: 'retry_required',   delay: 5000  },
  NAVIGATION:    { retryable: true,  maxRetries: 2, classify: 'retry_required',   delay: 8000  },
  BLANK_SHOT:    { retryable: true,  maxRetries: 2, classify: 'retry_required',   delay: 3000  },
  SMALL_FILE:    { retryable: true,  maxRetries: 2, classify: 'retry_required',   delay: 3000  },
  CAPTCHA:       { retryable: false, maxRetries: 0, classify: 'manual_required',  delay: 0     },
  AUTH_EXPIRED:  { retryable: false, maxRetries: 0, classify: 'requires_relogin', delay: 0     },
  SAFETY:        { retryable: false, maxRetries: 0, classify: 'blocked',          delay: 0     },
  UNKNOWN:       { retryable: true,  maxRetries: 1, classify: 'retry_required',   delay: 5000  },
};

function classifyError(errorMsg, extra = {}) {
  const m = errorMsg.toLowerCase();
  if (extra.captcha)                                    return { type: 'CAPTCHA',      ...FAILURE.CAPTCHA      };
  if (extra.authExpired)                                return { type: 'AUTH_EXPIRED', ...FAILURE.AUTH_EXPIRED };
  if (extra.safety)                                     return { type: 'SAFETY',       ...FAILURE.SAFETY       };
  if (extra.blank)                                      return { type: 'BLANK_SHOT',   ...FAILURE.BLANK_SHOT   };
  if (extra.smallFile)                                  return { type: 'SMALL_FILE',   ...FAILURE.SMALL_FILE   };
  if (m.includes('timeout') || m.includes('timed out')) return { type: 'TIMEOUT',      ...FAILURE.TIMEOUT      };
  if (m.includes('net::') || m.includes('err_'))        return { type: 'NAVIGATION',   ...FAILURE.NAVIGATION   };
  if (m.includes('navigation') || m.includes('goto'))   return { type: 'NAVIGATION',   ...FAILURE.NAVIGATION   };
  return { type: 'UNKNOWN', ...FAILURE.UNKNOWN };
}

// ── Anti-bot helpers ──────────────────────────────────────────────────────────

function jitterViewport(vp) {
  return {
    width:  vp.width  + Math.floor(Math.random() * 20) - 10,
    height: vp.height + Math.floor(Math.random() * 20) - 10,
  };
}

function humanDelay(baseMs, variancePct = 0.3) {
  const jitter = Math.floor(Math.random() * baseMs * variancePct);
  return baseMs + jitter;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Captcha / auth expiry detection ──────────────────────────────────────────

const CAPTCHA_SELECTORS = [
  '#recaptcha', '[class*="captcha" i]', '[class*="challenge" i]',
  'iframe[src*="recaptcha"]', 'iframe[src*="captcha"]',
  '[class*="robot" i]', '[class*="human-verification" i]',
  '[data-testid*="captcha" i]',
];

async function detectCaptcha(page) {
  const url = page.url();
  if (/captcha|challenge|verify-human|robot-check/i.test(url)) return true;
  for (const sel of CAPTCHA_SELECTORS) {
    if (await page.$(sel).catch(() => null)) return true;
  }
  return false;
}

async function detectAuthExpiry(page) {
  const url = page.url();
  return /\/(login|signin|sign-in|log-in|account\/login)/i.test(url);
}

// ── Safety check ─────────────────────────────────────────────────────────────

const SENSITIVE_URL_RE = /\/(withdrawal|withdraw|api-key|security|2fa|backup|export-key|private-key|seed-phrase|mnemonic)/i;
const DANGER_TITLE_RE  = /private.?key|seed.?phrase|mnemonic|withdrawal|api.?key|secret.?key/i;

async function safetyCheck(page, routeConfig) {
  const currentUrl = page.url();

  // URL-based abort
  if (SENSITIVE_URL_RE.test(currentUrl)) {
    return { safe: false, reason: `Redirected to sensitive URL: ${currentUrl}` };
  }

  // Forbidden selector check
  if (routeConfig.forbiddenSelectors?.length) {
    for (const sel of routeConfig.forbiddenSelectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) return { safe: false, reason: `Forbidden selector visible: ${sel}` };
    }
  }

  // Title check
  try {
    const title = await page.title();
    if (DANGER_TITLE_RE.test(title)) {
      return { safe: false, reason: `Page title contains sensitive keyword: "${title}"` };
    }
  } catch { /* ignore */ }

  return { safe: true };
}

// ── Blur CSS ──────────────────────────────────────────────────────────────────

const BLUR_CSS_GLOBAL = `
/* CryptoBonusWorld Safety Blur — injected before every screenshot */
[class*="address" i]:not([class*="address-bar" i]):not([class*="email" i]) input,
[class*="wallet-address" i], [class*="coin-address" i],
input[type="text"][readonly]:not([class*="search" i]):not([class*="invite" i]),
canvas[width="200"], canvas[width="182"], canvas[width="176"], canvas[width="160"],
canvas[width="180"], canvas[class*="qr" i],
img[alt*="qr" i], [class*="qr-code" i], [class*="qrcode" i],
[class*="total-balance" i], [class*="asset-balance" i],
[class*="portfolio-value" i], [class*="account-balance" i],
[class*=" uid" i], [class*="user-id" i], [class*="account-id" i],
[class*="profile-email" i], [class*="user-email" i],
[class*="profile-phone" i], [class*="user-phone" i],
[class*="user-avatar" i] img, [class*="profile-avatar" i] img,
[class*="header-avatar" i] img {
  filter: blur(10px) !important;
  pointer-events: none !important;
  user-select: none !important;
}`;

const BLUR_CSS_EXCHANGE = {
  binance: `.bn-balance-account,[class*="bn-avatar"] img,[class*="asset-item-amount"],[class*="fiat-balance"],[data-bn-type*="balance"]`,
  okx:     `.ok-portfolio-amount,[class*="ok-balance"],[class*="ok-user-email"],[class*="ok-uid"]`,
  mexc:    `[class*="total-asset"],[class*="user-balance"],[class*="uid-text"],.layout-header__user-name`,
  bitget:  `[class*="bg-balance"],[class*="bg-uid"],[class*="user-info__email"]`,
  bybit:   `[class*="balance-amount"],[class*="wallet-amount"],[class*="user-uid"]`,
  bingx:   `[class*="balance-amount"],[class*="user-uid"],[class*="user-info"] [class*="email"]`,
};

// ── Cookie banner ─────────────────────────────────────────────────────────────

const COOKIE_BTNS = [
  '#onetrust-accept-btn-handler',
  '[data-testid="cookie-policy-dialog-accept-button"]',
  'button[class*="cookie"][class*="accept" i]',
  '[class*="consent-accept" i]',
  '[class*="bn-button"][class*="Accept" i]',
  '.cookie-consent__accept',
];

async function dismissCookieBanner(page) {
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

// ── Browser frame generation (desktop) ───────────────────────────────────────

const EXCHANGE_URLS = {
  binance:'www.binance.com', okx:'www.okx.com', mexc:'www.mexc.com',
  bitget:'www.bitget.com', coinbase:'www.coinbase.com', bingx:'bingx.com',
  bybit:'www.bybit.com', 'gate-io':'www.gate.io', kucoin:'www.kucoin.com', htx:'www.htx.com',
};
const CAT_PATH_HINTS = {
  registration:'/register', bonus:'/activity', deposit:'/assets/deposit',
  p2p:'/p2p', spot:'/trade/BTC-USDT', futures:'/futures', fees:'/fee',
  mobile_app:'App Store', proof_of_reserves:'/proof-of-reserves',
};

function generateDesktopFrame(exchange, category, width) {
  const domain   = EXCHANGE_URLS[exchange] ?? `${exchange}.com`;
  const pathHint = CAT_PATH_HINTS[category] ?? '/';
  const dispUrl  = pathHint === 'App Store' ? `apps.apple.com — ${exchange}` : `${domain}${pathHint}`;
  const barW     = Math.min(460, Math.round(width * 0.38));
  const barX     = Math.round(width / 2 - barW / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40">
  <rect width="${width}" height="40" fill="#16162A"/>
  <line x1="0" y1="39.5" x2="${width}" y2="39.5" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <circle cx="20" cy="20" r="6" fill="#2D2D42"/><circle cx="36" cy="20" r="6" fill="#2D2D42"/><circle cx="52" cy="20" r="6" fill="#2D2D42"/>
  <rect x="${barX}" y="9" width="${barW}" height="22" rx="5" fill="#1E1E30"/>
  <text x="${barX + barW/2 + 4}" y="24" font-family="Inter,-apple-system,sans-serif" font-size="12" fill="#9CA3AF" text-anchor="middle">${dispUrl}</text>
</svg>`;
}

// ── Sharp pipeline ────────────────────────────────────────────────────────────

const TARGET_WIDTHS = { desktop: 1200, mobile: 390 };
const WEBP_QUALITY  = { desktop: 85,   mobile: 82  };
const MOBILE_FRAME  = join(ROOT, 'assets', 'browser-frame', 'frame-390-mobile.svg');

async function processRawScreenshot(rawPath, exchange, category, device) {
  const { default: sharp } = await import('sharp');
  const targetWidth = TARGET_WIDTHS[device];
  const webpQuality = WEBP_QUALITY[device];

  // Mobile: skip trim() — trim clips mobile screenshots below frame width.
  // Desktop: trim safely removes captured browser chrome.
  const basePipeline = sharp(rawPath, { failOnError: false }).toColorspace('srgb');
  const trimmedPipeline = device === 'desktop'
    ? basePipeline.trim({ background: { r: 255, g: 255, b: 255 }, threshold: 15 })
    : basePipeline;

  let buf = await trimmedPipeline
    .resize(targetWidth, null, { fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
    .toBuffer();

  let meta = await sharp(buf).metadata();
  let W = meta.width;

  // Extend canvas to frame width if mobile came out narrower after resize
  if (device === 'mobile' && W < targetWidth) {
    const extend = targetWidth - W;
    buf = await sharp(buf)
      .extend({ left: Math.floor(extend / 2), right: Math.ceil(extend / 2), top: 0, bottom: 0,
                background: { r: 22, g: 22, b: 42, alpha: 1 } })
      .toBuffer();
    meta = await sharp(buf).metadata();
    W = meta.width;
  }

  const composites = [];
  if (device === 'mobile' && existsSync(MOBILE_FRAME)) {
    composites.push({ input: readFileSync(MOBILE_FRAME), gravity: 'north', blend: 'over' });
  } else if (device === 'desktop') {
    composites.push({ input: Buffer.from(generateDesktopFrame(exchange, category, W)), gravity: 'north', blend: 'over' });
  }
  if (composites.length) {
    buf = await sharp(buf).composite(composites).toBuffer();
  }

  return sharp(buf).webp({ quality: webpQuality, effort: 4, smartSubsample: true }).toBuffer();
}

// ── Blank/small detection ─────────────────────────────────────────────────────

async function isBlankScreenshot(buffer) {
  try {
    const { default: sharp } = await import('sharp');
    const stats = await sharp(buffer).stats();
    const stdev = stats.channels.slice(0, 3).reduce((s, c) => s + c.stdev, 0) / 3;
    return stdev < 5; // Very low variance = solid colour = blank or error page
  } catch { return false; }
}

function isSmallFile(buffer) {
  return buffer.length < 5 * 1024; // < 5 KB
}

// ── Single capture attempt ────────────────────────────────────────────────────

async function attemptCapture(context, exchange, category, routeConfig, date) {
  const device  = (routeConfig.viewport?.width ?? 1440) < 600 ? 'mobile' : 'desktop';
  const rawDir  = join(ROOT, '_raw-screenshots', exchange, category);
  if (!existsSync(rawDir)) mkdirSync(rawDir, { recursive: true });
  const rawPath = join(rawDir, `raw-${date}-${Date.now()}.png`);

  const page = await context.newPage();
  try {
    const vp = jitterViewport(routeConfig.viewport ?? { width: 1440, height: 900 });
    await page.setViewportSize(vp);

    await page.goto(routeConfig.url, { waitUntil: 'domcontentloaded', timeout: PAGE_TO });

    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); }
    catch { dbg('networkidle timeout — continuing'); }

    // Captcha / auth-expiry checks
    if (await detectCaptcha(page)) {
      return { status: 'failed', extra: { captcha: true }, error: 'CAPTCHA detected' };
    }
    if (routeConfig.requiresAuth && await detectAuthExpiry(page)) {
      return { status: 'failed', extra: { authExpired: true }, error: 'Auth session expired' };
    }

    // Safety check
    const safety = await safetyCheck(page, routeConfig);
    if (!safety.safe) {
      return { status: 'failed', extra: { safety: true }, error: safety.reason };
    }

    await dismissCookieBanner(page);

    if (routeConfig.waitForSelector) {
      await page.waitForSelector(routeConfig.waitForSelector, { timeout: 10000 }).catch(() => {});
    }
    await page.waitForTimeout(humanDelay(routeConfig.waitForTimeout ?? 2000));

    if (!NO_BLUR) {
      const blurCSS = BLUR_CSS_GLOBAL + '\n' +
        (BLUR_CSS_EXCHANGE[exchange] ? `${BLUR_CSS_EXCHANGE[exchange]} { filter: blur(10px) !important; }` : '') + '\n' +
        (routeConfig.blurSelectors?.length
          ? routeConfig.blurSelectors.join(',') + ' { filter: blur(10px) !important; }'
          : '');
      await page.addStyleTag({ content: blurCSS });
      await page.waitForTimeout(300);
    }

    const screenshotBuf = await page.screenshot({ fullPage: routeConfig.fullPage ?? false, type: 'png' });

    // Post-capture quality gates
    if (await isBlankScreenshot(screenshotBuf)) {
      return { status: 'failed', extra: { blank: true }, error: 'Screenshot appears blank (low variance)' };
    }
    if (isSmallFile(screenshotBuf)) {
      return { status: 'failed', extra: { smallFile: true }, error: `Screenshot too small: ${screenshotBuf.length} bytes` };
    }

    writeFileSync(rawPath, screenshotBuf);
    dbg(`Raw saved: ${rawPath}`);
    return { status: 'captured', rawPath, device };

  } catch (e) {
    return { status: 'failed', extra: {}, error: e.message };
  } finally {
    await page.close();
  }
}

// ── Execute with retry ────────────────────────────────────────────────────────

async function executeWithRetry(context, exchange, category, routeConfig, date) {
  let retryCount = 0;
  let lastFailure = null;

  while (true) {
    const startMs = Date.now();
    const attempt = await attemptCapture(context, exchange, category, routeConfig, date);
    const durationMs = Date.now() - startMs;

    if (attempt.status === 'captured') {
      // Process through sharp
      const outDir  = join(ROOT, 'public', 'screenshots', exchange, category);
      const outFile = `global-${attempt.device}-${date}.webp`;
      const outPath = join(outDir, outFile);

      try {
        if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
        const buf = await processRawScreenshot(attempt.rawPath, exchange, category, attempt.device);
        writeFileSync(outPath, buf);

        return {
          exchange, category,
          url:          routeConfig.url,
          startedAt:    new Date(Date.now() - durationMs).toISOString(),
          completedAt:  new Date().toISOString(),
          durationMs,
          status:       'success',
          retryCount,
          rawPath:      attempt.rawPath,
          processedPath: outPath,
          publicPath:   `/screenshots/${exchange}/${category}/${outFile}`,
          fileSizeKB:   Math.round(buf.length / 1024),
          approvalStatus: 'pending_approval',
          recommendedForApproval: null, // filled by quality validator
          errorReason:  null,
          device:       attempt.device,
          blurApplied:  !NO_BLUR,
        };
      } catch (processErr) {
        return {
          exchange, category, url: routeConfig.url,
          startedAt: new Date(Date.now() - durationMs).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs, status: 'failed', retryCount,
          rawPath: attempt.rawPath, processedPath: null, publicPath: null,
          fileSizeKB: null, approvalStatus: 'processing_failed',
          recommendedForApproval: false,
          errorReason: `Processing failed: ${processErr.message}`,
          device: attempt.device, blurApplied: !NO_BLUR,
        };
      }
    }

    // Classify the failure
    const failure = classifyError(attempt.error ?? '', attempt.extra ?? {});
    lastFailure   = failure;

    dbg(`  Attempt ${retryCount + 1} failed: ${failure.type} — ${attempt.error}`);

    // Non-retryable failures go straight to final result
    if (!failure.retryable || retryCount >= Math.min(failure.maxRetries, MAX_RETRY)) {
      return {
        exchange, category,
        url:          routeConfig.url,
        startedAt:    new Date().toISOString(),
        completedAt:  new Date().toISOString(),
        durationMs,
        status:       failure.classify,
        retryCount,
        rawPath:      null,
        processedPath: null,
        publicPath:   null,
        fileSizeKB:   null,
        approvalStatus: failure.classify,
        recommendedForApproval: false,
        errorReason:  `${failure.type}: ${attempt.error}`,
        device:       routeConfig.viewport?.width < 600 ? 'mobile' : 'desktop',
        blurApplied:  !NO_BLUR,
      };
    }

    // Retryable: wait then retry
    retryCount++;
    const delayMs = failure.delay * retryCount + humanDelay(1000);
    dbg(`  Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${failure.maxRetries + 1})...`);
    await sleep(delayMs);
  }
}

// ── Run plan builder ──────────────────────────────────────────────────────────

async function buildRunPlan(exchange, catFilter) {
  const routeMap = await loadRouteMap(exchange);
  if (!routeMap) return [];

  const jobs = [];
  for (const [category, cfg] of Object.entries(routeMap)) {
    if (catFilter && !catFilter.includes(category)) continue;

    jobs.push({
      exchange,
      category,
      routeConfig: cfg,
      skipped:     cfg.safety === 'SKIP',
      manual:      cfg.safety === 'MANUAL',
      skipReason:  cfg.skipReason ?? null,
      requiresAuth: cfg.requiresAuth ?? false,
      priority:    cfg.priority ?? 2,
    });
  }

  // Sort by priority then name
  jobs.sort((a, b) => (a.priority - b.priority) || a.category.localeCompare(b.category));
  return jobs;
}

// ── Sequential executor ───────────────────────────────────────────────────────

async function executeSequential(jobs, context, exchange, date) {
  const results = [];
  for (const job of jobs) {
    results.push(await executeJobWithLogging(job, context, exchange, date));
    // Inter-page anti-bot delay
    await sleep(humanDelay(1500, 0.5));
  }
  return results;
}

// ── Parallel executor (anti-bot safe) ────────────────────────────────────────

async function executeParallel(jobs, browser, exchange, date, concurrency, contextOptions) {
  // Create N independent contexts
  const contexts = await Promise.all(
    Array.from({ length: concurrency }, () => browser.newContext(contextOptions))
  );

  const results = new Array(jobs.length);
  let nextIdx = 0;

  // Worker function: pulls jobs from queue
  async function worker(ctx) {
    while (true) {
      const idx = nextIdx++;
      if (idx >= jobs.length) break;
      // Stagger start of each worker
      await sleep(humanDelay(500 + idx * 200, 0.4));
      results[idx] = await executeJobWithLogging(jobs[idx], ctx, exchange, date);
    }
  }

  await Promise.all(contexts.map(ctx => worker(ctx)));
  await Promise.all(contexts.map(ctx => ctx.close()));
  return results.filter(Boolean);
}

// ── Job logging wrapper ───────────────────────────────────────────────────────

async function executeJobWithLogging(job, context, exchange, date) {
  const pad  = (job.category + '                  ').slice(0, 20);
  const auth = job.requiresAuth;

  if (job.skipped) {
    log(`  ${pad}  — SKIP  ${job.skipReason ?? ''}`);
    return buildSkippedResult(job, 'skipped');
  }
  if (job.manual) {
    log(`  ${pad}  — MANUAL`);
    return buildSkippedResult(job, 'manual_required');
  }

  const hasAuth = context._authLoaded ?? false;
  if (job.requiresAuth && !hasAuth) {
    log(`  ${pad}  ⚠  SKIP (auth required)`);
    return buildSkippedResult(job, 'auth_required');
  }

  process.stdout.write(`  ${pad}  ⏳ capturing...`);
  const t0 = Date.now();
  const result = await executeWithRetry(context, exchange, job.category, job.routeConfig, date);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const icon   = result.status === 'success' ? '✅'
               : result.status === 'manual_required' ? '📋'
               : result.status === 'requires_relogin' ? '🔐'
               : result.status === 'blocked' ? '🛡'
               : '❌';
  const size   = result.fileSizeKB ? ` (${result.fileSizeKB}KB)` : '';
  const retry  = result.retryCount > 0 ? ` [${result.retryCount} retry]` : '';
  process.stdout.write(`\r  ${pad}  ${icon}${size}${retry}  ${elapsed}s\n`);

  return result;
}

function buildSkippedResult(job, status) {
  return {
    exchange: job.exchange,
    category: job.category,
    url: job.routeConfig?.url ?? null,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 0,
    status,
    retryCount: 0,
    rawPath: null, processedPath: null, publicPath: null, fileSizeKB: null,
    approvalStatus: status,
    recommendedForApproval: false,
    errorReason: job.skipReason ?? null,
    device: job.routeConfig?.viewport?.width < 600 ? 'mobile' : 'desktop',
    blurApplied: false,
  };
}

// ── Quality validation (inline) ───────────────────────────────────────────────

async function runInlineQuality(result) {
  if (!result.processedPath || !existsSync(result.processedPath)) {
    return { ...result, recommendedForApproval: false, qualityFlags: ['no_processed_file'] };
  }
  try {
    const { default: sharp } = await import('sharp');
    const buf   = readFileSync(result.processedPath);
    const meta  = await sharp(buf).metadata();
    const stats = await sharp(buf).stats();

    const flags = [];
    const minW  = result.device === 'mobile' ? 380 : 800;
    const minH  = result.device === 'mobile' ? 300 : 400;

    if ((meta.width ?? 0)  < minW) flags.push(`width_too_small:${meta.width}`);
    if ((meta.height ?? 0) < minH) flags.push(`height_too_small:${meta.height}`);
    if (buf.length < 5 * 1024)     flags.push(`file_too_small:${Math.round(buf.length/1024)}KB`);
    if (buf.length > 3 * 1024 * 1024) flags.push(`file_too_large:${Math.round(buf.length/1024)}KB`);

    // Blank detection
    const stdev = stats.channels.slice(0,3).reduce((s,c)=>s+c.stdev,0)/3;
    if (stdev < 8) flags.push('possibly_blank');

    // Heavy uniform margin detection: sample corner pixels
    const W = meta.width, H = meta.height;
    if (W && H) {
      const cornerBuf = await sharp(buf).extract({ left:0, top:0, width: Math.min(50,W), height: Math.min(50,H) }).raw().toBuffer();
      const cornerMean = cornerBuf.reduce((s,v)=>s+v,0)/cornerBuf.length;
      if (cornerMean > 248) flags.push('large_white_margin');
    }

    const recommended = flags.length === 0;
    return { ...result, recommendedForApproval: recommended, qualityFlags: flags, qualityCheckedAt: new Date().toISOString() };
  } catch (e) {
    dbg(`Quality check failed for ${result.category}: ${e.message}`);
    return { ...result, recommendedForApproval: null, qualityFlags: [`quality_check_error:${e.message}`] };
  }
}

// ── Run report ────────────────────────────────────────────────────────────────

function generateRunId() {
  const now = new Date();
  const pad = (n, l=2) => String(n).padStart(l, '0');
  return `run-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function writeRunReport(runId, exchange, results, startedAt) {
  if (!existsSync(RUNS_DIR)) mkdirSync(RUNS_DIR, { recursive: true });

  const completedAt = new Date().toISOString();
  const summary = {
    total:           results.length,
    success:         results.filter(r => r.status === 'success').length,
    retried:         results.filter(r => r.retryCount > 0 && r.status === 'success').length,
    failed:          results.filter(r => ['retry_required','failed','unknown'].includes(r.status) || (r.status !== 'success' && !['skipped','manual_required','auth_required','blocked','requires_relogin'].includes(r.status))).length,
    manual_required: results.filter(r => r.status === 'manual_required').length,
    blocked:         results.filter(r => r.status === 'blocked').length,
    relogin_needed:  results.filter(r => r.status === 'requires_relogin').length,
    skipped:         results.filter(r => ['skipped','auth_required'].includes(r.status)).length,
    recommended:     results.filter(r => r.recommendedForApproval === true).length,
  };

  const runData = {
    runId,
    exchange,
    startedAt,
    completedAt,
    durationMs: Date.now() - new Date(startedAt).getTime(),
    parallel: PARALLEL,
    blurApplied: !NO_BLUR,
    summary,
    results,
  };

  const jsonPath = join(RUNS_DIR, `${runId}.json`);
  writeFileSync(jsonPath, JSON.stringify(runData, null, 2), 'utf-8');

  // Markdown summary
  const statusIcon = s => ({ success:'✅', manual_required:'📋', requires_relogin:'🔐', blocked:'🛡', skipped:'—', auth_required:'🔒', failed:'❌' }[s] ?? '❌');

  const rows = results.map(r => {
    const icon = statusIcon(r.status);
    const rec  = r.recommendedForApproval === true ? ' ⭐' : '';
    const flags = r.qualityFlags?.length ? ` ⚠ ${r.qualityFlags.join(', ')}` : '';
    const size  = r.fileSizeKB ? `${r.fileSizeKB}KB` : '—';
    const retry = r.retryCount > 0 ? ` (${r.retryCount}×)` : '';
    const dur   = r.durationMs > 0 ? `${(r.durationMs/1000).toFixed(1)}s` : '—';
    const err   = r.errorReason ? ` — ${r.errorReason.slice(0, 60)}` : '';
    return `| ${icon}${rec} | \`${r.category}\` | ${r.status}${retry} | ${size} | ${dur} | ${flags}${err} |`;
  }).join('\n');

  const md = `# Capture Run Report — ${exchange.toUpperCase()}

**Run ID:** \`${runId}\`
**Exchange:** ${exchange}
**Started:** ${startedAt}
**Completed:** ${completedAt}
**Duration:** ${Math.round(runData.durationMs / 1000)}s
**Parallel contexts:** ${PARALLEL}

## Summary

| Metric | Count |
|--------|-------|
| Total routes | ${summary.total} |
| ✅ Success | ${summary.success} |
| ⭐ Recommended for approval | ${summary.recommended} |
| 🔁 Succeeded after retry | ${summary.retried} |
| ❌ Failed | ${summary.failed} |
| 📋 Manual required | ${summary.manual_required} |
| 🛡 Safety blocked | ${summary.blocked} |
| 🔐 Relogin needed | ${summary.relogin_needed} |
| — Skipped | ${summary.skipped} |

## Results

| Status | Category | Outcome | Size | Time | Notes |
|--------|----------|---------|------|------|-------|
${rows}

## Next Steps

\`\`\`bash
# Review and approve all recommended:
npm run screenshots:approve -- --exchange ${exchange} --approve-all

# Or approve individually:
npm run screenshots:approve -- --approve ${exchange}/registration

# If relogin needed:
npm run screenshots:auth-login -- --exchange ${exchange}

# If manual captures required — see: reports/manual-screenshot-queue.md
\`\`\`

*⭐ = recommended for approval (passed quality checks)*
*Run data: \`reports/capture-runs/${runId}.json\`*
`;

  const mdPath = join(RUNS_DIR, `${runId}.md`);
  writeFileSync(mdPath, md, 'utf-8');

  return { jsonPath, mdPath };
}

// ── Capture dashboard ─────────────────────────────────────────────────────────

function generateDashboard() {
  if (!existsSync(RUNS_DIR)) {
    log('No capture runs found. Run a harvest first.');
    return;
  }

  const runFiles = readdirSync(RUNS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first

  if (!runFiles.length) {
    log('No run JSON files found in reports/capture-runs/');
    return;
  }

  // Aggregate by exchange/category — use latest run per route
  const latestByRoute = new Map(); // key: "exchange/category" → result
  const runMeta = [];

  for (const f of runFiles) {
    try {
      const run = JSON.parse(readFileSync(join(RUNS_DIR, f), 'utf-8'));
      runMeta.push({
        runId: run.runId,
        exchange: run.exchange,
        startedAt: run.startedAt,
        summary: run.summary,
      });
      for (const r of (run.results ?? [])) {
        const key = `${r.exchange}/${r.category}`;
        if (!latestByRoute.has(key)) latestByRoute.set(key, { ...r, runId: run.runId });
      }
    } catch { /* corrupt run file — skip */ }
  }

  // Group by exchange
  const byExchange = {};
  for (const [key, result] of latestByRoute) {
    const ex = result.exchange;
    if (!byExchange[ex]) byExchange[ex] = [];
    byExchange[ex].push(result);
  }

  const allResults = [...latestByRoute.values()];
  const totalRoutes  = allResults.length;
  const totalSuccess = allResults.filter(r => r.status === 'success').length;
  const totalPending = allResults.filter(r => r.approvalStatus === 'pending_approval').length;
  const totalApproved = allResults.filter(r => r.approvalStatus === 'approved').length;
  const totalFailed  = allResults.filter(r => !['success','skipped','manual_required','auth_required'].includes(r.status)).length;
  const totalManual  = allResults.filter(r => r.status === 'manual_required').length;
  const coveragePct  = totalRoutes ? Math.round(totalSuccess / totalRoutes * 100) : 0;

  // Exchange breakdown table
  const exRows = Object.entries(byExchange).map(([ex, results]) => {
    const total   = results.length;
    const success = results.filter(r => r.status === 'success').length;
    const failed  = results.filter(r => !['success','skipped','manual_required','auth_required'].includes(r.status)).length;
    const manual  = results.filter(r => r.status === 'manual_required').length;
    const pct     = total ? Math.round(success / total * 100) : 0;
    const bar     = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    return `| ${ex.padEnd(12)} | ${bar} ${pct}% | ${success}/${total} | ${failed} | ${manual} |`;
  }).join('\n');

  // Recent runs table
  const recentRows = runMeta.slice(0, 10).map(m => {
    const date = m.startedAt?.slice(0, 16).replace('T', ' ') ?? '?';
    const ok   = m.summary?.success ?? 0;
    const tot  = m.summary?.total ?? 0;
    return `| \`${m.runId}\` | ${m.exchange} | ${date} | ${ok}/${tot} |`;
  }).join('\n');

  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const md = `# Screenshot Capture Dashboard

**Generated:** ${now} UTC
**Tracking:** ${runFiles.length} run(s) across ${Object.keys(byExchange).length} exchange(s)

## Overall Coverage

| Metric | Value |
|--------|-------|
| Total routes tracked | ${totalRoutes} |
| ✅ Captured successfully | ${totalSuccess} (${coveragePct}%) |
| ⏳ Pending approval | ${totalPending} |
| ✅ Approved | ${totalApproved} |
| ❌ Failed captures | ${totalFailed} |
| 📋 Manual required | ${totalManual} |

## Exchange Completion

| Exchange | Progress | Captured | Failed | Manual |
|----------|----------|----------|--------|--------|
${exRows}

## Recent Runs

| Run ID | Exchange | Started | Captured |
|--------|----------|---------|----------|
${recentRows}

## Quick Actions

\`\`\`bash
# Run a full harvest:
npm run screenshots:harvest:binance
npm run screenshots:harvest:okx
npm run screenshots:harvest:mexc

# Run orchestrator (with retry + quality validation):
npm run screenshots:orchestrate -- --exchange binance

# Approve pending:
npm run screenshots:approve -- --approve-all

# Quality report:
npm run screenshots:quality

# Refresh dashboard:
npm run screenshots:orchestrate -- --dashboard
\`\`\`

*Route maps: \`src/data/screenshot-routes/\`*
*Run archives: \`reports/capture-runs/\`*
`;

  const dashPath = join(ROOT, 'reports', 'capture-dashboard.md');
  writeFileSync(dashPath, md, 'utf-8');
  log(`📊  Dashboard: reports/capture-dashboard.md`);
  return dashPath;
}

// ── Approval queue integration ────────────────────────────────────────────────

function updateApprovalQueue(exchange, results, date) {
  const reportsDir = join(ROOT, 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  const qPath = join(reportsDir, 'screenshot-approval-queue.json');

  let existing = { items: [] };
  if (existsSync(qPath)) {
    try { existing = JSON.parse(readFileSync(qPath, 'utf-8')); } catch { /* start fresh */ }
  }

  // Upsert items by exchange/category
  const newItems = results
    .filter(r => r.status === 'success')
    .map(r => ({
      id:           `${r.exchange}-${r.category}-${date}`,
      exchange:     r.exchange,
      category:     r.category,
      rawPath:      r.rawPath?.replace(ROOT, '').replace(/\\/g, '/') ?? null,
      processedPath: r.processedPath?.replace(ROOT, '').replace(/\\/g, '/') ?? null,
      publicPath:   r.publicPath ?? null,
      status:       'pending_approval',
      capturedAt:   date,
      device:       r.device ?? 'desktop',
      geo:          'GLOBAL',
      locale:       'en',
      blurApplied:  r.blurApplied,
      fileSizeKB:   r.fileSizeKB ?? null,
      recommendedForApproval: r.recommendedForApproval ?? null,
      qualityFlags: r.qualityFlags ?? [],
      verified:     false,
      notes:        r.notes ?? '',
    }));

  // Merge: remove old items for same exchange/category, add new
  const updatedItems = [
    ...existing.items.filter(i => !(i.exchange === exchange && newItems.some(n => n.category === i.category))),
    ...newItems,
  ];

  const queue = {
    generatedAt: new Date().toISOString(),
    exchange,
    capturedAt: date,
    summary: {
      total:    updatedItems.length,
      pending:  updatedItems.filter(i => i.status === 'pending_approval').length,
      approved: updatedItems.filter(i => i.status === 'approved').length,
    },
    items: updatedItems,
  };

  writeFileSync(qPath, JSON.stringify(queue, null, 2), 'utf-8');
  dbg(`Approval queue updated: ${qPath}`);
  return qPath;
}

// ── Dry run ───────────────────────────────────────────────────────────────────

async function printDryRun(exchange, jobs, authPath) {
  const hasAuth = existsSync(authPath);
  console.log('');
  log(`📸  Orchestrator Dry Run — ${exchange.toUpperCase()}`);
  log('─'.repeat(72));
  log(`  Auth:     ${hasAuth ? `✅ .auth/${exchange}.json` : '⚠  not found'}`);
  log(`  Parallel: ${PARALLEL} context(s)`);
  log(`  Retries:  max ${MAX_RETRY} per route`);
  console.log('');
  log(`  ${'Cat'.padEnd(22)} ${'Safety'.padEnd(10)} ${'P'.padEnd(3)} ${'URL'}`);
  log('  ' + '─'.repeat(80));

  for (const job of jobs) {
    const pad   = (job.category + '                     ').slice(0, 22);
    const safety = job.skipped ? `SKIP(${job.skipReason ?? '-'})` : job.manual ? 'MANUAL' : job.routeConfig.safety;
    const auth  = job.requiresAuth ? (hasAuth ? '🔐✅' : '🔐⚠') : '';
    const url   = job.routeConfig?.url?.slice(0, 50) ?? '—';
    log(`  ${pad} ${safety.padEnd(10)} ${String(job.priority).padEnd(3)} ${auth} ${url}`);
  }

  console.log('');
  log(`  ${jobs.filter(j => !j.skipped && !j.manual).length} routes to capture`);
  log(`  ${jobs.filter(j => j.skipped).length} skipped (safety)`);
  log(`  ${jobs.filter(j => j.manual).length} manual`);
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Dashboard-only mode
  if (DASH_ONLY) {
    generateDashboard();
    return;
  }

  if (!EXCHANGE && !RUN_ALL) {
    console.log(`
  CryptoBonusWorld — Screenshot Capture Orchestrator

  Usage:
    npm run screenshots:orchestrate -- --exchange binance
    npm run screenshots:orchestrate -- --all
    npm run screenshots:orchestrate -- --exchange binance --parallel 2
    npm run screenshots:orchestrate -- --dashboard

  Options:
    --exchange  <slug>         Single exchange
    --all                      All configured exchanges
    --category  <cat,...>      Specific categories only
    --parallel  <N>            Parallel contexts (default: 1, max: 3)
    --dry-run                  Show plan without capturing
    --headed                   Visible browser
    --no-auth                  Public pages only
    --no-blur                  Skip privacy blur (UNSAFE)
    --timeout   <ms>           Navigation timeout (default: 25000)
    --retries   <N>            Max retries per route (default: 2)
    --dashboard                Regenerate dashboard and exit
    --verbose                  Extra output

  Configured exchanges: ${KNOWN_EXCHANGES.join(', ')}
    `);
    return;
  }

  const exchangesToRun = RUN_ALL ? KNOWN_EXCHANGES : [EXCHANGE];

  for (const exchange of exchangesToRun) {
    const authPath = join(ROOT, '.auth', `${exchange}.json`);
    const hasAuth  = existsSync(authPath) && !NO_AUTH;
    const date     = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; })();
    const runId    = generateRunId();
    const startedAt = new Date().toISOString();

    // Build plan
    const jobs = await buildRunPlan(exchange, CAT_FILTER);
    if (!jobs.length) {
      warn(`No routes found for ${exchange}. Does src/data/screenshot-routes/${exchange}.ts exist?`);
      continue;
    }

    if (DRY_RUN) {
      await printDryRun(exchange, jobs, authPath);
      continue;
    }

    // Load playwright
    const { chromium } = await import('playwright').catch(() =>
      die('Playwright not installed. Run: npm install -D playwright && npx playwright install chromium')
    );

    // Context options
    const contextOptions = {
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'UTC',
      ...(hasAuth ? { storageState: authPath } : {}),
    };

    // Launch browser
    const browser = await chromium.launch({
      headless: !HEADED,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    console.log('');
    log(`📸  Orchestrating ${exchange.toUpperCase()} — ${date}  [run: ${runId}]`);
    log('─'.repeat(72));
    log(`  Auth: ${hasAuth ? '✅ loaded' : '⚠  none (public only)'}  |  Parallel: ${PARALLEL}  |  Retries: ${MAX_RETRY}`);
    if (NO_BLUR) warn('Blur DISABLED — review all screenshots carefully before approving');
    console.log('');

    // Filter executable jobs
    const executableJobs = jobs.filter(j => !j.skipped && !j.manual && !(j.requiresAuth && !hasAuth));
    const nonExecJobs    = jobs.filter(j =>  j.skipped ||  j.manual || (j.requiresAuth && !hasAuth));

    // Log non-exec
    for (const j of nonExecJobs) {
      const pad = (j.category + '                  ').slice(0, 20);
      if (j.skipped)             log(`  ${pad}  — SKIP  ${j.skipReason ?? ''}`);
      else if (j.manual)         log(`  ${pad}  — MANUAL`);
      else                       log(`  ${pad}  🔒 SKIP (auth required)`);
    }

    let results;
    if (PARALLEL > 1 && executableJobs.length > 1) {
      results = await executeParallel(executableJobs, browser, exchange, date, PARALLEL, contextOptions);
    } else {
      const context = await browser.newContext(contextOptions);
      context._authLoaded = hasAuth;
      results = await executeSequential(executableJobs, context, exchange, date);
      await context.close();
    }

    await browser.close();

    // Add skipped/manual to results
    const allResults = [
      ...nonExecJobs.map(j => buildSkippedResult(j, j.skipped ? 'skipped' : j.manual ? 'manual_required' : 'auth_required')),
      ...results,
    ];

    // Quality check all successful captures
    const checkedResults = await Promise.all(
      allResults.map(r => r.status === 'success' ? runInlineQuality(r) : r)
    );

    // Write run report
    const { jsonPath, mdPath } = writeRunReport(runId, exchange, checkedResults, startedAt);

    // Update approval queue
    updateApprovalQueue(exchange, checkedResults, date);

    // Write manual queue for failures + manual routes
    const manualItems = checkedResults.filter(r =>
      r.status === 'manual_required' || r.status === 'requires_relogin' ||
      (!['success','skipped','auth_required'].includes(r.status))
    );
    if (manualItems.length) {
      const manualMd = [
        '# Manual Screenshot Queue',
        `**Generated:** ${new Date().toISOString().slice(0,19)}Z`,
        '',
        '| Exchange | Category | Reason |',
        '|----------|----------|--------|',
        ...manualItems.map(r => `| \`${r.exchange}\` | \`${r.category}\` | ${r.errorReason ?? r.status} |`),
        '',
        '## Steps',
        '1. Capture the screenshot manually',
        `2. Save to: \`_manual-screenshots/${exchange}-{category}-${date}.png\``,
        `3. Process: \`npm run screenshots:process:manual -- _manual-screenshots/{file} --update-registry\``,
      ].join('\n');
      writeFileSync(join(ROOT, 'reports', 'manual-screenshot-queue.md'), manualMd, 'utf-8');
    }

    // Regenerate dashboard
    generateDashboard();

    // Summary
    const s = checkedResults.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    const recommended = checkedResults.filter(r => r.recommendedForApproval === true).length;

    console.log('');
    log('─'.repeat(72));
    log(`  ✅ Success:   ${s.success ?? 0}  (⭐ ${recommended} recommended for approval)`);
    if (s.failed)          log(`  ❌ Failed:    ${s.failed}`);
    if (s.manual_required) log(`  📋 Manual:    ${s.manual_required}`);
    if (s.requires_relogin) log(`  🔐 Relogin:  ${s.requires_relogin}  →  npm run screenshots:auth-login -- --exchange ${exchange}`);
    if (s.blocked)         log(`  🛡 Blocked:   ${s.blocked}`);
    console.log('');
    log(`  Run report:  reports/capture-runs/${runId}.md`);
    log(`  Dashboard:   reports/capture-dashboard.md`);
    log('');
    log(`  Next step:`);
    log(`    npm run screenshots:approve -- --exchange ${exchange} --approve-all`);
    console.log('');
  }
}

main().catch(e => {
  console.error('\n  ✖ Orchestrator error:', e.message);
  if (VERBOSE) console.error(e.stack);
  process.exit(1);
});
