/**
 * CBW Evidence Capture — v2.2
 *
 * Usage:
 *   node tools/evidence-capture/capture-evidence.mjs <exchange> <locale> [options]
 *
 * Modes:
 *   playwright              Standard Playwright Chromium (headless)
 *   real-chrome-cdp         Connect to real Chrome via CDP on port 9222
 *   android-adb             Real Android phone — single screencap + manual fallback
 *   android-browser-matrix  Try every installed Android browser, staged captures
 *
 * Options:
 *   --mode=<mode>           default: playwright
 *   --browser=<slug>        android-browser-matrix only — restrict to one browser
 *                           slugs: samsung-internet | chrome | firefox | edge | brave |
 *                                  duckduckgo | opera | opera-gx | vivaldi | firefox-beta
 *   --viewport=<name>       mobile-390 | mobile-360 | desktop-1440 (default: all)
 *   --unlock-delay=N        seconds for manual unlock in android-adb (default 25)
 *   --cdp-port=N            CDP port (default 9222)
 *   --dry-run               config check only, no capture
 *
 * Rules (non-negotiable):
 *   - Do NOT inject promo codes into screenshots.
 *   - Do NOT edit screenshots after capture.
 *   - Do NOT bypass or simulate captcha.
 *   - Do NOT create accounts or submit forms.
 *   - Do NOT reuse old screenshots from gallery.
 *   - Do NOT deploy to site without manual approval.
 */

import { chromium } from 'playwright';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');
const CONFIG    = JSON.parse(fs.readFileSync(path.join(__dirname, 'exchanges.config.json'), 'utf8'));

// ── CLI ───────────────────────────────────────────────────────────────────────
const args          = process.argv.slice(2);
const exchange      = args[0];
const locale        = args[1];
const modeArg       = args.find(a => a.startsWith('--mode='));
const mode          = modeArg ? modeArg.split('=')[1] : 'playwright';
const viewportArg   = args.find(a => a.startsWith('--viewport='))?.split('=')[1];
const cdpPort       = args.find(a => a.startsWith('--cdp-port='))?.split('=')[1] ?? '9222';
const unlockDelay   = parseInt(args.find(a => a.startsWith('--unlock-delay='))?.split('=')[1] ?? '25', 10);
const browserFilter = args.find(a => a.startsWith('--browser='))?.split('=')[1] ?? null;
const dryRun        = args.includes('--dry-run');

const VALID_MODES = ['playwright', 'real-chrome-cdp', 'android-adb', 'android-browser-matrix'];

if (!exchange || !locale) {
  console.error('Usage: node capture-evidence.mjs <exchange> <locale> [--mode=' + VALID_MODES.join('|') + '] [--browser=<slug>]');
  process.exit(1);
}
if (!VALID_MODES.includes(mode)) {
  console.error(`Unknown mode: ${mode}. Valid: ${VALID_MODES.join(', ')}`);
  process.exit(1);
}

const exchangeConf = CONFIG[exchange];
if (!exchangeConf) { console.error(`Exchange not found: ${exchange}`); process.exit(1); }
const localeConf   = exchangeConf.locales[locale];
if (!localeConf)   { console.error(`Locale not found: ${locale}`); process.exit(1); }

const EVIDENCE_BASE = path.join(ROOT, 'evidence', exchange, locale);
const RAW_DIR       = path.join(EVIDENCE_BASE, 'raw');
const REPORT_DIR    = path.join(EVIDENCE_BASE, 'report');

// ── Viewport definitions ──────────────────────────────────────────────────────
const VIEWPORTS = {
  'mobile-390':   { width: 390,  height: 844,  isMobile: true },
  'mobile-360':   { width: 360,  height: 800,  isMobile: true },
  'desktop-1440': { width: 1440, height: 900,  isMobile: false },
};
const MOBILE_UA  = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Language detection strings ────────────────────────────────────────────────
// NOTE: Samsung Internet's WebView is opaque to UIAutomator — web content is NOT
// exposed as accessibility nodes. These strings are used when UIAutomator CAN see
// content (e.g. native modals that appear on top of the WebView).
const RUSSIAN_UI_STRINGS = [
  'Добро пожаловать', 'Вас пригласили', 'Реф. код',
  'Электронная почта', 'Войти', 'Пароль', 'Создать аккаунт',
];
const ENGLISH_UI_STRINGS = [
  'Welcome to Bybit', 'Referral Code', 'Email',
  'Create Account', 'Sign Up', 'Mobile Number',
];

// ── Logging ───────────────────────────────────────────────────────────────────
const log  = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);

// ── Detection (web / Playwright) ──────────────────────────────────────────────
function detectPage(html, text, url, conf) {
  const { codes, labels, english_strings, language_modal_strings } = conf.detection;

  const codeFound   = codes.some(c => html.includes(c) || text.includes(c) || url.includes(c));
  const hasCaptcha  = /cloudflare|cf-challenge|turnstile|recaptcha|hcaptcha|ray id/i.test(html);
  const hasGeoBlock = /not available in your (region|country)|service unavailable|country restrict|geo.?restrict/i.test(html);
  const hasSignUp   = /sign.?up|create.?account|register/i.test(html);
  const hasRedirErr = !url || url === 'about:blank' || url.startsWith('chrome-error') || url.startsWith('about:neterror');
  const onExpected  = url.includes(conf.expectedFinalDomain ?? exchange);

  const labelFound  = ['Referral Code', 'Promo Code', 'Invitation Code']
    .find(l => html.includes(l) || text.includes(l)) ?? null;
  const langModal   = (language_modal_strings ?? []).some(s => html.includes(s) || text.includes(s));
  const isEnglish   = (english_strings ?? []).filter(s => html.includes(s) || text.includes(s)).length >= 2;

  const idx     = text.indexOf(codes[0]);
  const context = idx >= 0 ? text.slice(Math.max(0, idx - 80), idx + 80).replace(/\s+/g, ' ').trim() : null;

  let status;
  if (hasRedirErr)  status = 'redirect_error';
  else if (hasCaptcha) status = 'captcha_or_blocked';
  else if (hasGeoBlock) status = 'geo_blocked';
  else if (codeFound)  status = 'match';
  else if (labelFound) status = 'field_visible_code_missing';
  else if (hasSignUp)  status = 'not_detected';
  else if (onExpected) status = 'manual_review';
  else                 status = 'redirect_error';

  return { status, codeFound, labelFound, isEnglish, languageModalDetected: langModal,
           hasCaptcha, hasGeoBlock, hasSignUp, context, url };
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function sleep(seconds) {
  spawnSync('powershell', ['-Command', `Start-Sleep -Seconds ${seconds}`],
            { timeout: (seconds + 5) * 1000 });
}

function countdown(seconds, label) {
  console.log(`\n  ⏸  ${label}`);
  for (let i = seconds; i > 0; i -= 5) {
    const wait = Math.min(5, i);
    process.stdout.write(`  ⏸  ${i}s remaining...\r`);
    spawnSync('powershell', ['-Command', `Start-Sleep -Seconds ${wait}`],
              { timeout: (wait + 3) * 1000 });
  }
  process.stdout.write('  ✅ Continuing...          \n');
}

function printSummary(report) {
  const icons = {
    match: '✅', not_detected: '⚠️', field_visible_code_missing: '⚠️',
    captcha_or_blocked: '🔒', geo_blocked: '🌍', redirect_error: '❌',
    manual_review: '🔍', do_not_use_as_evidence: '🚫', error: '❌', pending: '⏳',
    no_usable_browser_screenshot: '🚫', partial_match: '⚠️',
  };
  console.log('\n══ SUMMARY ═══════════════════════════════════════════════════');
  console.log(`  ${icons[report.overall_status] ?? '?'} Status:   ${report.overall_status}`);
  console.log(`  Mode:      ${report.mode}`);
  console.log(`  Exchange:  ${report.exchange} / ${report.locale}`);
  if (report.url_used) console.log(`  URL used:  ${report.url_used}`);
  if (report.captures?.length) {
    report.captures.forEach(c => {
      const i = icons[c.status] ?? '?';
      const extra = c.detection?.context ? ` — "${c.detection.context}"`
        : (c.note ? ` — ${c.note}` : '');
      console.log(`  ${i} ${(c.viewport ?? c.browser ?? c.mode ?? '').padEnd(22)} ${c.status}${extra}`);
    });
  }
  if (report.note) console.log(`\n  Note: ${report.note}`);
}

// ── ADB helper ────────────────────────────────────────────────────────────────
function findADB() {
  const candidates = [
    'adb',
    'C:\\tools\\platform-tools\\adb.exe',
    `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`,
    'C:\\platform-tools\\adb.exe',
  ];
  for (const bin of candidates) {
    const r = spawnSync(bin, ['version'], { encoding: 'utf8', timeout: 5000 });
    if (!r.error && r.status === 0) return bin;
  }
  return null;
}

// ── MODE 1: Playwright ────────────────────────────────────────────────────────
async function runPlaywright(conf, viewports) {
  const url = conf.observedFinalUrl ?? conf.partnerUrl;
  info(`Mode: playwright | URL: ${url}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox',
           '--disable-blink-features=AutomationControlled',
           '--disable-dev-shm-usage', '--ignore-certificate-errors'],
  });

  const captures = [];
  for (const vpName of viewports) {
    const vp = VIEWPORTS[vpName];
    if (!vp) continue;
    const outDir = path.join(RAW_DIR, vpName);
    ensureDir(outDir);
    info(`Capturing ${vpName} (${vp.width}×${vp.height})...`);

    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.isMobile ? MOBILE_UA : DESKTOP_UA,
      isMobile: vp.isMobile, hasTouch: vp.isMobile,
      locale: conf.locale,
      extraHTTPHeaders: { 'Accept-Language': conf.acceptLanguage },
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = await ctx.newPage();
    let finalUrl = url, html = '', text = '', errMsg = null;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(4000);
      try { await page.waitForSelector('input, form, button', { timeout: 6000 }); } catch {}
      finalUrl = page.url();
      html     = await page.content();
      text     = await page.evaluate(() => document.body?.innerText ?? '');
    } catch (err) {
      errMsg = err.message.split('\n')[0];
      warn(`${vpName} nav error: ${errMsg}`);
      try { finalUrl = page.url(); } catch {}
      try { html = await page.content(); } catch {}
    }

    const detection = detectPage(html, text, finalUrl, conf);
    const shotFile  = path.join(outDir, '01-signup-page.png');
    const htmlFile  = path.join(outDir, '01-signup-page.html');
    await page.screenshot({ path: shotFile, type: 'png', fullPage: false });
    fs.writeFileSync(htmlFile, html.slice(0, 500000), 'utf8');
    log(`${vpName}: ${detection.status} → ${path.relative(ROOT, shotFile)}`);
    captures.push({ viewport: vpName, width: vp.width, height: vp.height,
                    status: errMsg ? 'error' : detection.status,
                    final_url: finalUrl, detection, error: errMsg,
                    raw_file: path.relative(ROOT, shotFile) });
    await ctx.close();
  }
  await browser.close();

  const overall = captures.every(c => c.status === 'match') ? 'match'
    : captures.some(c => c.status === 'captcha_or_blocked') ? 'captcha_or_blocked'
    : captures.some(c => c.status === 'match') ? 'partial_match'
    : captures.some(c => c.status === 'field_visible_code_missing') ? 'field_visible_code_missing'
    : captures.some(c => c.status === 'not_detected') ? 'not_detected'
    : 'error';
  return { mode: 'playwright', exchange, locale, url_used: url, overall_status: overall, captures };
}

// ── MODE 2: Real Chrome CDP ───────────────────────────────────────────────────
async function runChromeCDP(conf, viewports, port) {
  const cdpUrl = `http://127.0.0.1:${port}`;
  const url    = conf.observedFinalUrl ?? conf.partnerUrl;
  info(`Mode: real-chrome-cdp | CDP: ${cdpUrl} | URL: ${url}`);

  const check = spawnSync('powershell', ['-Command',
    `try { (Invoke-WebRequest -Uri "${cdpUrl}/json/version" -TimeoutSec 3 -UseBasicParsing).StatusCode } catch { 'error' }`
  ], { encoding: 'utf8', timeout: 8000 });
  if ((check.stdout ?? '').trim() !== '200') {
    const note = `Chrome not reachable at ${cdpUrl}. Launch: chrome.exe --remote-debugging-port=${port} --user-data-dir=C:\\cbw-chrome-profile`;
    warn(note);
    return { mode: 'real-chrome-cdp', exchange, locale, url_used: url, overall_status: 'error', note };
  }

  let browser;
  try {
    browser = await chromium.connectOverCDP(cdpUrl);
  } catch (err) {
    const note = `CDP connect failed: ${err.message.split('\n')[0]}`;
    warn(note);
    return { mode: 'real-chrome-cdp', exchange, locale, url_used: url, overall_status: 'error', note };
  }

  info('Connected to real Chrome');
  const captures = [];
  for (const vpName of viewports) {
    const vp = VIEWPORTS[vpName];
    if (!vp) continue;
    const outDir = path.join(RAW_DIR, vpName);
    ensureDir(outDir);

    let page, finalUrl = url, html = '', text = '';
    try {
      const ctx = (browser.contexts()[0]) ?? await browser.newContext();
      page = await ctx.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(5000);
      try { await page.waitForSelector('input, form', { timeout: 8000 }); } catch {}
      finalUrl = page.url();
      html     = await page.content();
      text     = await page.evaluate(() => document.body?.innerText ?? '');
    } catch (err) {
      warn(`CDP nav (${vpName}): ${err.message.split('\n')[0]}`);
      try { finalUrl = page?.url() ?? url; } catch {}
      try { html = await page?.content() ?? ''; } catch {}
    }

    const detection = detectPage(html, text, finalUrl, conf);
    const shotFile  = path.join(outDir, '01-signup-page.png');
    const htmlFile  = path.join(outDir, '01-signup-page.html');
    await page.screenshot({ path: shotFile, type: 'png', fullPage: false });
    fs.writeFileSync(htmlFile, html.slice(0, 500000), 'utf8');
    log(`${vpName}: ${detection.status} → ${path.relative(ROOT, shotFile)}`);
    captures.push({ viewport: vpName, width: vp.width, height: vp.height,
                    status: detection.status, final_url: finalUrl, detection,
                    raw_file: path.relative(ROOT, shotFile) });
    try { await page.close(); } catch {}
  }
  try { await browser.close(); } catch {}

  const overall = captures.every(c => c.status === 'match') ? 'match'
    : captures.some(c => c.status === 'captcha_or_blocked') ? 'captcha_or_blocked'
    : captures.some(c => c.status === 'match') ? 'partial_match'
    : captures.some(c => c.status === 'field_visible_code_missing') ? 'field_visible_code_missing'
    : 'error';
  return { mode: 'real-chrome-cdp', exchange, locale, url_used: url, overall_status: overall, captures };
}

// ── MODE 3: Android ADB ───────────────────────────────────────────────────────
function runADB(conf, viewport) {
  const vpName  = viewport ?? 'mobile-390';
  const url     = conf.partnerUrl ?? conf.observedFinalUrl;
  const fallUrl = conf.observedFinalUrl;
  const outDir  = path.join(RAW_DIR, vpName);
  ensureDir(outDir);
  const localFile = path.join(outDir, '01-signup-page.png');

  info(`Mode: android-adb | viewport: ${vpName} | URL: ${url}`);

  const adbBin = findADB();
  if (!adbBin) {
    const note = 'ADB not found → C:\\tools\\platform-tools\\';
    fail(note);
    return { mode: 'android-adb', exchange, locale, url_used: url, overall_status: 'error', note };
  }
  const adb = (a) => spawnSync(adbBin, a, { encoding: 'utf8', timeout: 30000 });

  const devOut   = (adb(['devices']).stdout ?? '');
  const devLines = devOut.split('\n').filter(l => l.includes('\tdevice'));
  if (devLines.length === 0) {
    const note = 'No device found. Unlock phone → allow USB debugging → re-run.';
    fail(note);
    return { mode: 'android-adb', exchange, locale, url_used: url, overall_status: 'error', note };
  }
  const deviceId = devLines[0].split('\t')[0].trim();
  log(`Device: ${deviceId}`);
  const dev = (a) => spawnSync(adbBin, ['-s', deviceId, ...a], { encoding: 'utf8', timeout: 30000 });

  dev(['shell', 'svc', 'power', 'stayon', 'true']);
  dev(['shell', 'input', 'keyevent', '26']);
  sleep(2);
  dev(['shell', 'input', 'keyevent', '26']);
  sleep(1);
  dev(['shell', 'wm', 'dismiss-keyguard']);
  sleep(1);

  countdown(unlockDelay, `UNLOCK your phone now — ${unlockDelay}s`);

  const MARKER = '/sdcard/cbw-ts-marker';
  dev(['shell', `touch ${MARKER}`]);
  sleep(1);

  info(`Opening: ${url}`);
  const openRes = dev(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url]);
  let urlUsed = url;
  if (openRes.status !== 0) {
    warn('am start failed for partnerUrl — trying observedFinalUrl');
    dev(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', fallUrl]);
    urlUsed = fallUrl;
  }

  const pageWait = conf.pageLoadWait ?? 35;
  sleep(pageWait);

  const DEVICE_FILE = '/sdcard/cbw-evidence.png';
  dev(['shell', `rm -f ${DEVICE_FILE}`]);
  dev(['shell', 'screencap', '-p', DEVICE_FILE]);
  const capCheck = dev(['shell', `stat -c%s ${DEVICE_FILE} 2>/dev/null || echo 0`]);
  const capBytes = parseInt((capCheck.stdout ?? '0').trim(), 10);

  if (capBytes >= 50000) {
    const pullRes = dev(['pull', DEVICE_FILE, localFile]);
    if (pullRes.status === 0 && fs.existsSync(localFile)) {
      const kb = (fs.statSync(localFile).size / 1024).toFixed(0);
      log(`screencap OK (${kb} KB) → ${path.relative(ROOT, localFile)}`);
      dev(['shell', `rm -f ${DEVICE_FILE} ${MARKER}`]);
      return {
        mode: 'android-adb', exchange, locale, url_used: urlUsed, viewport: vpName,
        overall_status: 'manual_review', note: 'screencap captured. Inspect manually.',
        raw_file: path.relative(ROOT, localFile),
        captures: [{ viewport: vpName, status: 'manual_review', raw_file: path.relative(ROOT, localFile) }],
      };
    }
  }

  warn(`screencap returned ${capBytes} bytes — FLAG_SECURE (Samsung Knox)`);
  console.log(`
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📱 Press  Power + Volume Down  now — 15 seconds
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  countdown(15, 'Take screenshot on phone (Power + Vol Down)');

  const findRes = dev(['shell',
    `find /sdcard/DCIM /sdcard/Pictures -newer ${MARKER} \\( -name '*.png' -o -name '*.jpg' \\) 2>/dev/null`
  ]);
  const newFiles = (findRes.stdout ?? '').trim().split('\n')
    .map(f => f.trim()).filter(f => f.length > 5);
  dev(['shell', `rm -f ${DEVICE_FILE} ${MARKER}`]);

  if (newFiles.length === 0) {
    fail('No new screenshot found.');
    return { mode: 'android-adb', exchange, locale, url_used: urlUsed, overall_status: 'error',
             note: 'No new screenshot found.' };
  }

  const pullGal = dev(['pull', newFiles[0], localFile]);
  if (pullGal.status !== 0 || !fs.existsSync(localFile)) {
    fail(`Gallery pull failed`);
    return { mode: 'android-adb', exchange, locale, url_used: urlUsed, overall_status: 'error' };
  }

  const kb = (fs.statSync(localFile).size / 1024).toFixed(0);
  log(`Gallery screenshot (${kb} KB) → ${path.relative(ROOT, localFile)}`);
  return {
    mode: 'android-adb', exchange, locale, url_used: urlUsed, viewport: vpName,
    overall_status: 'manual_review', note: 'Gallery screenshot captured. Inspect manually.',
    raw_file: path.relative(ROOT, localFile),
    captures: [{ viewport: vpName, status: 'manual_review', source: 'gallery',
                 raw_file: path.relative(ROOT, localFile) }],
  };
}

// ── MODE 4 helpers ────────────────────────────────────────────────────────────

const BROWSER_CANDIDATES = [
  { pkg: 'org.mozilla.firefox',           name: 'Firefox',          slug: 'firefox',          priority: 1 },
  { pkg: 'org.mozilla.firefox_beta',      name: 'Firefox Beta',     slug: 'firefox-beta',     priority: 2 },
  { pkg: 'com.microsoft.emmx',            name: 'Edge',             slug: 'edge',             priority: 3 },
  { pkg: 'com.brave.browser',             name: 'Brave',            slug: 'brave',            priority: 4 },
  { pkg: 'com.duckduckgo.mobile.android', name: 'DuckDuckGo',       slug: 'duckduckgo',       priority: 5 },
  { pkg: 'com.opera.browser',             name: 'Opera',            slug: 'opera',            priority: 6 },
  { pkg: 'com.opera.gx',                  name: 'Opera GX',         slug: 'opera-gx',         priority: 7 },
  { pkg: 'com.vivaldi.browser',           name: 'Vivaldi',          slug: 'vivaldi',          priority: 8 },
  { pkg: 'com.sec.android.app.sbrowser',  name: 'Samsung Internet', slug: 'samsung-internet', priority: 9 },
  { pkg: 'com.android.chrome',            name: 'Chrome',           slug: 'chrome',           priority: 10 },
];

// Full matrix: 4 stages, total 40s. Targeted (--browser): 2 stages, total 12s.
const STAGE_TIMES_FULL = [8, 15, 25, 40];
const STAGE_TIMES_FAST = [5, 12];

function getDeviceResolution(dev) {
  const r = dev(['shell', 'wm', 'size']);
  const m = (r.stdout ?? '').match(/Physical size: (\d+)x(\d+)/);
  return m ? { width: parseInt(m[1], 10), height: parseInt(m[2], 10) } : { width: 1080, height: 2400 };
}

function detectInstalledBrowsers(dev, slugFilter) {
  info('Scanning installed browser packages...');
  const listRes   = dev(['shell', 'pm', 'list', 'packages']);
  const installed = new Set((listRes.stdout ?? '').split('\n')
    .map(l => l.replace('package:', '').trim()).filter(Boolean));

  const found = [], skipped = [];
  for (const b of BROWSER_CANDIDATES) {
    if (slugFilter && b.slug !== slugFilter) {
      skipped.push({ ...b, skip_reason: `filtered_out (--browser=${slugFilter})` });
      continue;
    }
    if (installed.has(b.pkg)) {
      found.push(b);
      log(`Found: ${b.name} (${b.pkg})`);
    } else {
      skipped.push({ ...b, skip_reason: 'not_installed' });
      info(`Skip:  ${b.name} — not installed`);
    }
  }
  return { found, skipped };
}

/**
 * Attempt to detect page language and switch to English.
 *
 * IMPORTANT LIMITATION:
 * Samsung Internet renders web content in a WebView that is completely opaque
 * to UIAutomator. All DOM elements (including the Bybit globe/language button,
 * form fields, text) appear as a single android.view.View node with no
 * accessible children. UIAutomator CANNOT read or interact with web content
 * inside Samsung Internet.
 *
 * This function:
 * 1. Runs UIAutomator dump — will NOT find Russian/English web content strings
 * 2. Takes a pre-switch screenshot for comparison
 * 3. Uses coordinate-based tap for the globe button (position calibrated from
 *    captured screenshots on this device: 1080×2400, globe at ~1045,240)
 * 4. Waits, then dumps UIAutomator again to check if a NATIVE language picker
 *    appeared (e.g. Samsung Internet's own picker — would be visible)
 * 5. If native picker found: taps English via bounds
 * 6. If no native picker (language modal is inside WebView): saves diagnostic
 *    screenshot so the user can see what happened
 * 7. Returns result for logging
 */
function detectAndSwitchToEnglish(dev, conf, browserName, browserDir) {
  ensureDir(browserDir);

  // ── Step 1: UIAutomator dump (pre-switch) ──
  info(`${browserName}: UIAutomator dump for language check...`);
  dev(['shell', 'uiautomator', 'dump', '/sdcard/cbw-window.xml']);
  const xmlBefore = path.join(browserDir, 'lang-check-before.xml');
  const pullBefore = dev(['pull', '/sdcard/cbw-window.xml', xmlBefore]);

  let isRussianViaXml = false;
  let isEnglishViaXml = false;

  if (pullBefore.status === 0 && fs.existsSync(xmlBefore)) {
    const xml = fs.readFileSync(xmlBefore, 'utf8');
    isRussianViaXml = RUSSIAN_UI_STRINGS.some(s => xml.includes(s));
    isEnglishViaXml = ENGLISH_UI_STRINGS.filter(s => xml.includes(s)).length >= 2;

    if (isEnglishViaXml) {
      log(`${browserName}: English confirmed via UIAutomator XML`);
      return { success: true, method: 'uiautomator_confirmed_english', language: 'english' };
    }
    if (isRussianViaXml) {
      warn(`${browserName}: Russian detected via UIAutomator XML`);
    } else {
      // Expected: Samsung Internet WebView content is opaque — neither confirmed
      warn(`${browserName}: UIAutomator cannot read web content (WebView opaque) — proceeding with coordinate approach`);
    }
  } else {
    warn(`${browserName}: UIAutomator dump failed — proceeding with coordinate approach`);
  }

  // ── Step 2: Pre-switch screenshot for reference ──
  const DEVICE_FILE  = '/sdcard/cbw-evidence.png';
  const preSwitchFile = path.join(browserDir, 'lang-pre-switch.png');
  dev(['shell', `rm -f ${DEVICE_FILE}`]);
  dev(['shell', 'screencap', '-p', DEVICE_FILE]);
  dev(['pull', DEVICE_FILE, preSwitchFile]);
  const preSwitchKb = fs.existsSync(preSwitchFile)
    ? (fs.statSync(preSwitchFile).size / 1024).toFixed(0)
    : 0;
  info(`${browserName}: pre-switch screenshot saved (${preSwitchKb} KB)`);

  // ── Step 3: Coordinate-based globe tap ──
  // Calibrated from prior capture on Samsung Galaxy S21+ (1080×2400):
  //   Samsung Internet toolbar: y=75–201 (from UIAutomator XML)
  //   Content area starts: y=201
  //   Bybit header row height: ~80px
  //   Globe icon (top-right of Bybit header): x≈1045, y≈240
  const GLOBE_X = 1045;
  const GLOBE_Y = 240;
  info(`${browserName}: tapping globe icon at (${GLOBE_X}, ${GLOBE_Y}) [coordinate-based, content y=201+39px]`);
  dev(['shell', 'input', 'tap', String(GLOBE_X), String(GLOBE_Y)]);
  sleep(3);

  // ── Step 4: Check if a NATIVE language picker appeared ──
  dev(['shell', 'uiautomator', 'dump', '/sdcard/cbw-window.xml']);
  const xmlAfterGlobe = path.join(browserDir, 'lang-after-globe-tap.xml');
  const pullAfter = dev(['pull', '/sdcard/cbw-window.xml', xmlAfterGlobe]);

  if (pullAfter.status === 0 && fs.existsSync(xmlAfterGlobe)) {
    const xml2 = fs.readFileSync(xmlAfterGlobe, 'utf8');

    // Check for native English option (would appear if browser/OS rendered the picker natively)
    const enMatch = xml2.match(/text="English"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
      ?? xml2.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*text="English"/);

    if (enMatch) {
      const ex1 = parseInt(enMatch[1]), ey1 = parseInt(enMatch[2]);
      const ex2 = parseInt(enMatch[3]), ey2 = parseInt(enMatch[4]);
      const etapX = Math.round((ex1 + ex2) / 2);
      const etapY = Math.round((ey1 + ey2) / 2);
      info(`${browserName}: native "English" found at (${etapX}, ${etapY}) — tapping`);
      dev(['shell', 'input', 'tap', String(etapX), String(etapY)]);
      sleep(6);
      log(`${browserName}: English tapped via UIAutomator bounds`);
      return {
        success: true, method: 'native_picker_uiautomator',
        language: 'english_tapped', tap_globe: { x: GLOBE_X, y: GLOBE_Y },
        tap_english: { x: etapX, y: etapY },
      };
    }

    // Native picker didn't appear — language picker is a web modal inside the WebView.
    // Take diagnostic screenshot first to confirm the modal opened.
    const diagFile = path.join(browserDir, 'language-diagnostic.png');
    dev(['shell', `rm -f ${DEVICE_FILE}`]);
    dev(['shell', 'screencap', '-p', DEVICE_FILE]);
    dev(['pull', DEVICE_FILE, diagFile]);
    const diagKb = fs.existsSync(diagFile) ? (fs.statSync(diagFile).size / 1024).toFixed(0) : 0;
    warn(`${browserName}: language picker is inside WebView — UIAutomator cannot interact with it`);
    info(`${browserName}: diagnostic screenshot saved (${diagKb} KB) → ${path.relative(ROOT, diagFile)}`);

    // Coordinate-based "English" tap inside the WebView language modal.
    // Calibrated from diagnostic screenshot on Samsung Galaxy S21+ (1080×2400):
    //   Modal overlays from y≈201 (after toolbar). "Choose Your Language" title at y≈235-290.
    //   "English" is the first list item; its text center is at approximately (540, 330).
    //   (Previous attempt at y=300 was in the gap between title and first item.)
    // Only tap if diagnostic screenshot exists and is large enough to suggest modal opened.
    const diagSizeKb = fs.existsSync(diagFile) ? fs.statSync(diagFile).size / 1024 : 0;
    if (diagSizeKb >= 100) {
      const EN_MODAL_X = 540;
      const EN_MODAL_Y = 330;
      info(`${browserName}: tapping "English" in WebView modal at (${EN_MODAL_X}, ${EN_MODAL_Y}) [coordinate-based]`);
      dev(['shell', 'input', 'tap', String(EN_MODAL_X), String(EN_MODAL_Y)]);
      sleep(10);
      log(`${browserName}: "English" tapped — waiting 10s for page to reload in English`);
      return {
        success: true,
        method: 'webview_modal_coordinate_tap',
        language: 'english_tapped_verify_screenshot',
        tap_globe:   { x: GLOBE_X,    y: GLOBE_Y },
        tap_english: { x: EN_MODAL_X, y: EN_MODAL_Y },
        diagnostic: path.relative(ROOT, diagFile),
        note: 'WebView language modal detected. Tapped "English" at calibrated coordinate (540, 300). Verify via staged screenshots.',
      };
    }

    warn(`${browserName}: diagnostic screenshot too small (${diagSizeKb.toFixed(0)} KB) — modal may not have opened`);
    return {
      success: false,
      method: 'coordinate_tap_webview_modal_no_confirm',
      language: 'unknown',
      tap_globe: { x: GLOBE_X, y: GLOBE_Y },
      diagnostic: diagFile ? path.relative(ROOT, diagFile) : null,
      note: 'Globe tapped but diagnostic screenshot too small to confirm modal opened.',
    };
  }

  return {
    success: false, method: 'coordinate_tap_xml_pull_failed',
    language: 'unknown', tap_globe: { x: GLOBE_X, y: GLOBE_Y },
  };
}

function checkScreenshotQuality(filePath) {
  if (!fs.existsSync(filePath)) return { usable: false, reason: 'file_missing', size_bytes: 0 };
  const sizeBytes = fs.statSync(filePath).size;
  if (sizeBytes < 50 * 1024) return { usable: false, reason: 'black_screen', size_bytes: sizeBytes };

  const buf = Buffer.alloc(8);
  const fd  = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);
  const isPng  = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  if (!isPng && !isJpeg) return { usable: false, reason: 'not_image', size_bytes: sizeBytes };
  if (sizeBytes < 150 * 1024) return { usable: false, reason: 'probable_lock_screen', size_bytes: sizeBytes };

  return { usable: true, reason: 'needs_manual_review', size_bytes: sizeBytes,
           size_kb: Math.round(sizeBytes / 1024), is_png: isPng };
}

function selectBestCandidate(browserResults) {
  const candidates = [];
  for (const br of browserResults) {
    for (const stage of br.stages) {
      if (!stage.quality?.usable) continue;
      let score = Math.min(stage.quality.size_kb ?? 0, 5000) / 1000;
      const stageBonus = { 8: 0, 15: 1, 25: 2, 40: 1.5, 'english-selected': 4 };
      score += stageBonus[stage.seconds] ?? 0;
      score += (10 - (br.browser_priority ?? 10)) * 0.5;
      if (br.lang_result?.success) score += 3;
      if (br.used_en_url) score += 5;  // strong preference for explicitly English URL
      candidates.push({
        browser: br.browser_name, browser_pkg: br.browser_pkg,
        browser_priority: br.browser_priority,
        seconds: stage.seconds, local_file: stage.local_file,
        relative_file: stage.relative_file,
        size_kb: stage.quality.size_kb, score,
        url_used: br.url_used, lang_result: br.lang_result,
        used_en_url: br.used_en_url ?? false,
      });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

// ── MODE 4: Android Browser Matrix ───────────────────────────────────────────
function runBrowserMatrix(conf, slugFilter) {
  const partnerUrl = conf.partnerUrl;
  const enUrl      = conf.observedFinalUrl; // contains explicit /en/ locale
  const matrixDir  = path.join(REPORT_DIR, 'browser-matrix');

  // When a browser filter is active (targeting specific browser for English capture),
  // use the output subdirectory with -en suffix to distinguish from the previous run.
  const browserDirSuffix = slugFilter ? `-en` : '';
  ensureDir(matrixDir);

  info(`Mode: android-browser-matrix${slugFilter ? ` (--browser=${slugFilter})` : ''}`);
  if (slugFilter) {
    info(`English-targeted run: using observedFinalUrl with explicit /en/ locale`);
    info(`URL: ${enUrl}`);
  }
  info('Rules: No form submission. No account creation. No fake screenshots.');

  const adbBin = findADB();
  if (!adbBin) {
    const note = 'ADB not found → C:\\tools\\platform-tools\\';
    fail(note);
    return { mode: 'android-browser-matrix', exchange, locale, overall_status: 'error', note };
  }
  const adb = (a) => spawnSync(adbBin, a, { encoding: 'utf8', timeout: 60000 });

  info('Checking ADB devices...');
  const devOut   = (adb(['devices']).stdout ?? '');
  const devLines = devOut.split('\n').filter(l => l.includes('\tdevice'));
  if (devLines.length === 0) {
    const note = 'No ADB device.';
    fail(note);
    return { mode: 'android-browser-matrix', exchange, locale, overall_status: 'error', note };
  }
  const deviceId = devLines[0].split('\t')[0].trim();
  log(`Device: ${deviceId}`);
  const dev = (a) => spawnSync(adbBin, ['-s', deviceId, ...a], { encoding: 'utf8', timeout: 60000 });

  const resolution = getDeviceResolution(dev);
  info(`Device resolution: ${resolution.width}×${resolution.height}`);

  dev(['shell', 'svc', 'power', 'stayon', 'true']);
  dev(['shell', 'input', 'keyevent', '26']);
  sleep(2);
  dev(['shell', 'input', 'keyevent', '26']);
  sleep(1);
  dev(['shell', 'wm', 'dismiss-keyguard']);
  sleep(1);

  const { found: installedBrowsers, skipped: skippedBrowsers } = detectInstalledBrowsers(dev, slugFilter);
  if (installedBrowsers.length === 0) {
    const note = slugFilter
      ? `Browser "${slugFilter}" not installed or not found.`
      : 'No supported browsers found on device.';
    fail(note);
    return { mode: 'android-browser-matrix', exchange, locale, overall_status: 'error', note };
  }

  const DEVICE_FILE    = '/sdcard/cbw-evidence.png';
  const browserResults = [];

  for (const browser of installedBrowsers) {
    console.log(`\n  ── ${browser.name} (${browser.pkg}) ${'─'.repeat(Math.max(0, 40 - browser.name.length))}`);

    const browserSlugDir = browser.name.replace(/\s+/g, '-').toLowerCase() + browserDirSuffix;
    const browserDir     = path.join(matrixDir, browserSlugDir);
    ensureDir(browserDir);

    const result = {
      browser_name:     browser.name,
      browser_pkg:      browser.pkg,
      browser_priority: browser.priority,
      url_used:         null,
      used_en_url:      false,
      launch_status:    null,
      lang_result:      null,
      stages:           [],
    };

    // Force-stop for clean state
    dev(['shell', 'am', 'force-stop', browser.pkg]);
    sleep(2);

    // ── URL selection ──
    // When browser filter is active (English-targeted run): use observedFinalUrl (/en/)
    // to force English locale, bypassing redirect-based locale detection on partnerUrl.
    // When running full matrix: use partnerUrl as primary, fall back to observedFinalUrl.
    let urlToOpen, urlNote;
    if (slugFilter) {
      urlToOpen = enUrl;
      urlNote   = 'observedFinalUrl (explicit /en/ locale)';
      result.used_en_url = true;
    } else {
      urlToOpen = partnerUrl;
      urlNote   = 'partnerUrl';
    }

    info(`${browser.name}: opening ${urlNote}: ${urlToOpen}`);
    // URLs with & must be single-quoted so Android shell doesn't interpret & as
    // background operator. Pass as one shell command string instead of separate args.
    const shellOpenUrl = (url, pkg) =>
      dev(['shell', `am start -a android.intent.action.VIEW -d '${url}' -p ${pkg}`]);

    const launchRes = shellOpenUrl(urlToOpen, browser.pkg);

    if (launchRes.status !== 0 || (launchRes.stderr ?? '').includes('Error')) {
      const fallback = slugFilter ? partnerUrl : enUrl;
      const fallNote = slugFilter ? 'partnerUrl' : 'observedFinalUrl';
      warn(`${browser.name}: launch failed — falling back to ${fallNote}`);
      const fallRes = shellOpenUrl(fallback, browser.pkg);
      if (fallRes.status !== 0) {
        warn(`${browser.name}: both URLs failed — skipping`);
        result.launch_status = 'failed';
        browserResults.push(result);
        continue;
      }
      result.url_used    = fallback;
      result.used_en_url = !slugFilter;
      result.launch_status = 'ok_fallback';
    } else {
      result.url_used    = urlToOpen;
      result.launch_status = 'ok';
    }
    log(`${browser.name}: launched (${result.launch_status})`);

    // ── Language detection + switch ──
    // When using observedFinalUrl (explicit /en/ locale), skip globe tap entirely —
    // the /en/ path already loads English. Tapping the globe would open a language
    // modal that blocks the page and prevents capturing the registration form.
    const stageTimes   = slugFilter ? STAGE_TIMES_FAST : STAGE_TIMES_FULL;
    const initialWait  = stageTimes[0];
    info(`${browser.name}: waiting ${initialWait}s for initial page load...`);
    sleep(initialWait);

    if (result.used_en_url) {
      info(`${browser.name}: /en/ URL confirmed — skipping globe tap (page is already English)`);
      result.lang_result = { success: true, method: 'en_url_no_tap_needed', language: 'english' };
    } else {
      result.lang_result = detectAndSwitchToEnglish(dev, conf, browser.name, browserDir);
    }

    if (result.lang_result.success) {
      if (result.lang_result.method === 'uiautomator_confirmed_english') {
        log(`${browser.name}: English already confirmed`);
      } else {
        info(`${browser.name}: language switch attempted via ${result.lang_result.method}`);
      }
    } else {
      warn(`${browser.name}: language switch inconclusive — ${result.lang_result.note ?? result.lang_result.method}`);
    }

    // Extra screenshot right after language switch attempt
    const postLangFile = path.join(browserDir, 'english-selected.png');
    dev(['shell', `rm -f ${DEVICE_FILE}`]);
    dev(['shell', 'screencap', '-p', DEVICE_FILE]);
    const postPull = dev(['pull', DEVICE_FILE, postLangFile]);
    if (postPull.status === 0) {
      const q = checkScreenshotQuality(postLangFile);
      result.stages.push({
        seconds:       'english-selected',
        local_file:    postLangFile,
        relative_file: path.relative(ROOT, postLangFile),
        quality:       q,
      });
      if (q.usable) log(`${browser.name} [english-selected]: usable (${q.size_kb} KB)`);
      else warn(`${browser.name} [english-selected]: not usable — ${q.reason}`);
    }

    // ── Staged captures (continuing from initialWait mark) ──
    let lastStageSecs = initialWait;
    for (const stageSecs of stageTimes.filter(s => s > initialWait)) {
      const waitSecs = stageSecs - lastStageSecs;
      info(`${browser.name}: waiting ${waitSecs}s more (total ${stageSecs}s from URL open)...`);
      sleep(waitSecs);
      lastStageSecs = stageSecs;

      const stageFile = path.join(browserDir, `${String(stageSecs).padStart(2, '0')}s.png`);
      dev(['shell', `rm -f ${DEVICE_FILE}`]);
      dev(['shell', 'screencap', '-p', DEVICE_FILE]);
      const sizeRes  = dev(['shell', `stat -c%s ${DEVICE_FILE} 2>/dev/null || echo 0`]);
      const onDevKb  = parseInt((sizeRes.stdout ?? '0').trim(), 10) / 1024;
      const pullRes  = dev(['pull', DEVICE_FILE, stageFile]);
      const quality  = checkScreenshotQuality(stageFile);

      result.stages.push({
        seconds:       stageSecs,
        local_file:    stageFile,
        relative_file: path.relative(ROOT, stageFile),
        on_device_kb:  Math.round(onDevKb),
        quality,
      });

      if (quality.usable) log(`${browser.name} @${stageSecs}s: usable (${quality.size_kb} KB)`);
      else warn(`${browser.name} @${stageSecs}s: not usable — ${quality.reason}`);
    }

    dev(['shell', 'am', 'force-stop', browser.pkg]);
    browserResults.push(result);
  }

  // ── Select best candidate ──
  info('\nSelecting best candidate...');
  const best = selectBestCandidate(browserResults);

  let overallStatus, rawFile = null, recommendation;
  if (!best) {
    overallStatus  = 'no_usable_browser_screenshot';
    recommendation = 'do_not_use_as_evidence';
    fail('No usable screenshot.');
  } else {
    const rawDest = path.join(RAW_DIR, 'mobile-390', '01-signup-page.png');
    ensureDir(path.dirname(rawDest));
    fs.copyFileSync(best.local_file, rawDest);
    rawFile       = path.relative(ROOT, rawDest);
    overallStatus = 'manual_review';
    recommendation = 'manual_review_needed';
    log(`Best: ${best.browser} @${best.seconds}s (${best.size_kb} KB) → ${rawFile}`);
    log(`URL used: ${best.url_used}`);
    log(`/en/ URL: ${best.used_en_url}`);
  }

  // Save matrix report
  const matrixReport = {
    generated: new Date().toISOString(),
    mode: 'android-browser-matrix', exchange, locale,
    browser_filter: slugFilter ?? null,
    device: deviceId, device_resolution: resolution,
    partner_url: partnerUrl, observed_final_url: enUrl,
    installed_browsers: installedBrowsers.map(b => ({ name: b.name, pkg: b.pkg })),
    skipped_browsers:   skippedBrowsers.map(b => ({ name: b.name, pkg: b.pkg, reason: b.skip_reason })),
    browser_results: browserResults.map(br => ({
      browser: br.browser_name, package: br.browser_pkg,
      url_used: br.url_used, used_en_url: br.used_en_url,
      launch_status: br.launch_status, lang_result: br.lang_result,
      stages: br.stages.map(s => ({
        seconds: s.seconds, file: s.relative_file,
        usable: s.quality?.usable, reason: s.quality?.reason,
        size_kb: s.quality?.size_kb ?? Math.round((s.quality?.size_bytes ?? 0) / 1024),
      })),
    })),
    best_candidate: best ? {
      browser: best.browser, package: best.browser_pkg,
      seconds: best.seconds, size_kb: best.size_kb,
      file: best.relative_file, url_used: best.url_used,
      used_en_url: best.used_en_url, score: Math.round(best.score * 100) / 100,
    } : null,
    raw_file: rawFile, overall_status: overallStatus, recommendation,
  };

  const reportSlug = slugFilter ? `browser-matrix-${slugFilter}-en-report.json` : 'browser-matrix-report.json';
  const matrixReportFile = path.join(REPORT_DIR, reportSlug);
  fs.writeFileSync(matrixReportFile, JSON.stringify(matrixReport, null, 2), 'utf8');
  log(`Matrix report: ${path.relative(ROOT, matrixReportFile)}`);

  return {
    mode: 'android-browser-matrix', exchange, locale,
    overall_status: overallStatus,
    url_used: best?.url_used ?? enUrl,
    note: best
      ? `Best: ${best.browser} @${best.seconds}s (${best.size_kb} KB, en_url=${best.used_en_url}).`
      : 'No usable screenshot.',
    captures: best ? [{
      viewport: 'mobile-390', browser: best.browser, browser_pkg: best.browser_pkg,
      seconds: best.seconds, status: 'manual_review',
      raw_file: rawFile, size_kb: best.size_kb,
      actual_device_resolution: resolution, url_used: best.url_used,
      used_en_url: best.used_en_url,
    }] : [],
    matrix_report: path.relative(ROOT, matrixReportFile),
    installed_browsers: installedBrowsers.map(b => b.name),
    skipped_browsers: skippedBrowsers.map(b => b.name),
  };
}

// ── Manifest helpers ──────────────────────────────────────────────────────────
function loadManifest() {
  const f = path.join(EVIDENCE_BASE, 'manifest.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  return {
    exchange, locale,
    language_expected: localeConf.language_expected ?? 'English',
    code_expected: exchangeConf.code,
    partnerUrl: localeConf.partnerUrl,
    observedFinalUrl: localeConf.observedFinalUrl,
    captured_at: null,
    mobile:  { raw: null, processed: null, site: null, status: 'pending' },
    desktop: { raw: null, processed: null, site: null, status: 'pending' },
    article_usage: { primary_image: 'mobile', desktop_image: 'evidence_only' },
    recommendation: 'pending', approved_for_site: false,
    approved_by: null, approval_date: null,
  };
}

function saveManifest(manifest) {
  const f = path.join(EVIDENCE_BASE, 'manifest.json');
  fs.writeFileSync(f, JSON.stringify(manifest, null, 2), 'utf8');
  log(`Manifest: ${path.relative(ROOT, f)}`);
}

function patchManifest(report) {
  const manifest       = loadManifest();
  manifest.captured_at = new Date().toISOString();

  for (const cap of (report.captures ?? [])) {
    const slot = (cap.viewport ?? '').startsWith('desktop') ? 'desktop' : 'mobile';
    if (cap.raw_file) manifest[slot].raw = cap.raw_file;
    manifest[slot].status = cap.status ?? report.overall_status;
    if (cap.browser)                  manifest[slot].browser_used             = cap.browser;
    if (cap.actual_device_resolution) manifest[slot].actual_device_resolution = cap.actual_device_resolution;
    if (cap.url_used)                 manifest[slot].url_used                 = cap.url_used;
    if (cap.used_en_url !== undefined) manifest[slot].used_en_url             = cap.used_en_url;
  }
  if (!manifest.mobile.raw && report.raw_file) {
    manifest.mobile.raw    = report.raw_file;
    manifest.mobile.status = report.overall_status;
  }

  const statuses = [manifest.mobile.status, manifest.desktop.status];
  if (statuses.every(s => s === 'match')) {
    manifest.recommendation = 'safe_to_use_as_evidence';
  } else if (statuses.some(s => s === 'manual_review')) {
    manifest.recommendation = 'manual_review_needed';
  } else if (statuses.every(s => !s || s === 'error' || s === 'pending')) {
    manifest.recommendation = 'do_not_use_as_evidence';
  } else {
    manifest.recommendation = 'manual_review_needed';
  }

  saveManifest(manifest);
  return manifest;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\nCBW Evidence Capture v2.2`);
console.log(`Exchange:  ${exchange} / ${locale}`);
console.log(`Mode:      ${mode}${browserFilter ? ` --browser=${browserFilter}` : ''}`);
console.log(`URLs:`);
console.log(`  partnerUrl:       ${localeConf.partnerUrl}`);
console.log(`  observedFinalUrl: ${localeConf.observedFinalUrl}`);
console.log(`  localRedirect:    ${localeConf.localRedirect}`);
console.log();

if (dryRun) {
  info('--dry-run: config OK');
  console.log(JSON.stringify(localeConf, null, 2));
  process.exit(0);
}

const allViewports      = localeConf.viewports ?? ['mobile-390', 'desktop-1440'];
const desktopViewports  = allViewports.filter(v => v.startsWith('desktop'));
const selectedViewports = viewportArg ? [viewportArg] : allViewports;

let report;
if (mode === 'playwright') {
  report = await runPlaywright(localeConf, selectedViewports);
} else if (mode === 'real-chrome-cdp') {
  const vps = selectedViewports.length ? selectedViewports : desktopViewports;
  report = await runChromeCDP(localeConf, vps, cdpPort);
} else if (mode === 'android-adb') {
  report = runADB(localeConf, viewportArg ?? 'mobile-390');
} else if (mode === 'android-browser-matrix') {
  report = runBrowserMatrix(localeConf, browserFilter);
}

report.generated = new Date().toISOString();
report.exchange  = exchange;
report.locale    = locale;
report.code      = exchangeConf.code;

ensureDir(REPORT_DIR);
const reportFile = path.join(REPORT_DIR,
  `${mode}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
log(`Run report: ${path.relative(ROOT, reportFile)}`);

const manifest = patchManifest(report);

// ── Crop browser chrome from ADB captures ────────────────────────────────────
// Samsung Internet on Galaxy S21+ (1080×2400):
//   Status bar + address bar = top 201px (UIAutomator: toolbar [0,75][1080,201])
//   Bottom nav = bottom 252px (UIAutomator: nav bar [0,2148][1080,2400])
//   Content area = y=201 to y=2148 → cropped image = 1080×1947
//
// Raw is NEVER modified. Crop goes to processed/mobile-390/01-signup-page.png.
// Annotations (arrows) are handled by annotate-evidence.mjs separately.
if ((mode === 'android-browser-matrix' || mode === 'android-adb') && manifest.mobile.raw) {
  const rawAbsolute = path.join(ROOT, manifest.mobile.raw.replace(/\\/g, '/'));
  if (fs.existsSync(rawAbsolute)) {
    const processedDir  = path.join(EVIDENCE_BASE, 'processed', 'mobile-390');
    const processedFile = path.join(processedDir, '01-signup-page.png');
    ensureDir(processedDir);
    try {
      const meta    = await sharp(rawAbsolute).metadata();
      const cropTop = 201;
      const cropBot = meta.height - 252;
      const cropH   = cropBot - cropTop;
      await sharp(rawAbsolute)
        .extract({ left: 0, top: cropTop, width: meta.width, height: cropH })
        .png()
        .toFile(processedFile);
      manifest.mobile.processed = path.relative(ROOT, processedFile).replace(/\//g, '\\');
      saveManifest(manifest);
      log(`Processed (browser chrome removed, ${meta.width}×${cropH}): ${path.relative(ROOT, processedFile)}`);
    } catch (err) {
      warn(`Crop failed: ${err.message}`);
    }
  }
}

printSummary(report);
console.log(`\n  Manifest recommendation: ${manifest.recommendation}`);
console.log(`  Mobile status:           ${manifest.mobile.status}`);
console.log(`  Desktop status:          ${manifest.desktop.status}`);
if (manifest.mobile.browser_used) console.log(`  Browser used:            ${manifest.mobile.browser_used}`);
if (manifest.mobile.url_used)     console.log(`  URL used:                ${manifest.mobile.url_used}`);
if (manifest.mobile.used_en_url !== undefined) console.log(`  /en/ URL:                ${manifest.mobile.used_en_url}`);
if (manifest.mobile.raw)          console.log(`  Raw file:                ${manifest.mobile.raw}`);
