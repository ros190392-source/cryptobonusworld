#!/usr/bin/env node
/**
 * verify-geo-bonus.mjs — Proxy GEO Bonus Capture v1
 * ─────────────────────────────────────────────────────────────────────────
 * Visits our own internal /go/{exchange} redirect (optionally proxied
 * through a per-country IP, optionally with a ?geo= hint) and captures what
 * a real visitor from that country/device would actually see on the final
 * registration/referral landing page: screenshot, HTML snapshot, detected
 * bonus/promo/restriction text, redirect chain, timestamp, and a
 * conservative confidence rating.
 *
 * This is Level 1 (registration_page_shown) / Level 2 (terms_supported)
 * evidence only — see src/data/geoBonusEvidence.ts. It NEVER creates an
 * account or checks a dashboard, so postSignupVerification is always
 * 'not_available' unless a human manually overrides a snapshot later.
 * A bonus shown here is NOT guaranteed post-signup eligibility.
 *
 * Usage:
 *   npm run verify:geo-bonus -- --country=global --exchange=bybit --device=desktop
 *   npm run verify:geo-bonus -- --country=poland --exchange=bybit --all-devices
 *   npm run verify:geo-bonus -- --country=poland --all-exchanges --all-devices
 *   npm run verify:geo-bonus -- --all-countries --all-exchanges --all-devices
 *   npm run verify:geo-bonus -- --list
 *
 * Output (all untracked — see .gitignore):
 *   reports/evidence/geo-bonus-screenshots/{country}/{exchange}/{device}-{date}.png
 *   reports/evidence/geo-bonus-html/{country}/{exchange}/{device}-{date}.html
 *   reports/evidence/geo-bonus-snapshots/{country}/{exchange}/{device}-{date}.json
 *   reports/evidence/geo-bonus-snapshots/index.json
 *
 * Rules (non-negotiable):
 *   - A country capture never runs un-proxied — missing/invalid proxy env
 *     marks the task 'skipped', no browser is launched, no files written.
 *   - Never log or persist a proxy host/credential — only the env var name.
 *   - postSignupVerification always defaults to 'not_available'.
 *   - EU ('european-union') is never a valid --country value here.
 */

import { chromium, request as pwRequest } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  CAPTURE_COUNTRIES, CAPTURE_DEVICES, CAPTURE_EXCHANGES,
  VIEWPORTS, DESKTOP_UA, MOBILE_UA, DEFAULT_BASE_URL, TIMEOUTS,
  resolveProxy, describeProxy, buildTestedUrl, detectSignals,
  buildSnapshot, hashBuffer, classifyFailure,
} from './lib/geo-bonus-capture.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load PROXY_* keys from .env (gitignored) into process.env so proxy
// credentials can be provisioned without a shell export. ONLY PROXY_* keys
// are read, existing env always wins, values are never logged.
try {
  const envFile = readFileSync(join(ROOT, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const m = line.match(/^\s*(PROXY_[A-Z]+)\s*=\s*(.+)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* no .env — fine */ }

const BASE_URL = process.env.CAPTURE_BASE_URL || DEFAULT_BASE_URL;

const EVIDENCE_ROOT = join(ROOT, 'reports', 'evidence');
const SCREENSHOT_DIR = join(EVIDENCE_ROOT, 'geo-bonus-screenshots');
const HTML_DIR = join(EVIDENCE_ROOT, 'geo-bonus-html');
const SNAPSHOT_DIR = join(EVIDENCE_ROOT, 'geo-bonus-snapshots');
const INDEX_PATH = join(SNAPSHOT_DIR, 'index.json');

// ── CLI ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? null;
const hasFlag = (name) => args.includes(`--${name}`);

if (hasFlag('list')) {
  console.log('Countries:', CAPTURE_COUNTRIES.join(', '), '(european-union is never valid here)');
  console.log('Devices:  ', CAPTURE_DEVICES.join(', '));
  console.log('Exchanges:', CAPTURE_EXCHANGES.join(', '));
  process.exit(0);
}

const countryArg = getArg('country');
const exchangeArg = getArg('exchange');
const deviceArg = getArg('device');
const allCountries = hasFlag('all-countries');
const allExchanges = hasFlag('all-exchanges');
const allDevices = hasFlag('all-devices');

const countries = allCountries ? CAPTURE_COUNTRIES : (countryArg ? [countryArg] : null);
if (!countries) {
  console.error('Missing --country=<slug> or --all-countries. Run with --list to see valid values.');
  process.exit(1);
}
for (const c of countries) {
  if (!CAPTURE_COUNTRIES.includes(c)) {
    console.error(`Unknown or unsupported country "${c}" (european-union is never a capture target). Valid: ${CAPTURE_COUNTRIES.join(', ')}`);
    process.exit(1);
  }
}

const exchanges = allExchanges ? CAPTURE_EXCHANGES : (exchangeArg ? [exchangeArg] : null);
if (!exchanges) {
  console.error('Missing --exchange=<slug> or --all-exchanges.');
  process.exit(1);
}
for (const ex of exchanges) {
  if (!CAPTURE_EXCHANGES.includes(ex)) {
    console.error(`Unknown exchange "${ex}". Valid: ${CAPTURE_EXCHANGES.join(', ')}`);
    process.exit(1);
  }
}

const devices = allDevices ? CAPTURE_DEVICES : (deviceArg ? [deviceArg] : CAPTURE_DEVICES);
for (const d of devices) {
  if (!CAPTURE_DEVICES.includes(d)) {
    console.error(`Unknown device "${d}". Valid: ${CAPTURE_DEVICES.join(', ')}`);
    process.exit(1);
  }
}

// ── Index helpers ────────────────────────────────────────────────────────
function loadIndex() {
  if (!existsSync(INDEX_PATH)) return { entries: [] };
  try { return JSON.parse(readFileSync(INDEX_PATH, 'utf8')); } catch { return { entries: [] }; }
}
function saveIndex(index) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}
function findLatestOtherDevice(index, countrySlug, exchangeSlug, device) {
  const matches = index.entries.filter(e =>
    e.countrySlug === countrySlug && e.exchangeSlug === exchangeSlug && e.deviceViewport !== device,
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))[0];
}

// ── Preflight (proxied runs only) ─────────────────────────────────────────
// Cheap HTTP checks through the same proxy BEFORE launching a browser, so a
// later Playwright failure can be classified precisely: a slow exchange
// target is not the same thing as a dead proxy or a broken /go route.
// A target preflight timeout does NOT abort the run — Playwright still gets
// its (longer) chance; only base/go unreachability hard-fails.
async function runPreflight(proxyInfo, testedUrl) {
  const result = {
    proxyExitCountry: null,
    baseReachable: null,
    goRouteReachable: null,
    targetReachable: null,
    targetHost: null,
    preflightError: null,
  };
  let ctx = null;
  try {
    ctx = await pwRequest.newContext({
      proxy: proxyInfo.playwrightProxy ?? undefined,
      timeout: TIMEOUTS.preflightTimeoutMs,
      userAgent: DESKTOP_UA,
    });

    try {
      const ipRes = await ctx.get('https://ipinfo.io/json');
      if (ipRes.ok()) result.proxyExitCountry = (await ipRes.json()).country ?? null;
    } catch (e) { result.preflightError = `ipinfo: ${e.message}`; }

    try {
      const baseRes = await ctx.get(BASE_URL);
      result.baseReachable = baseRes.status() < 500;
    } catch (e) {
      result.baseReachable = false;
      result.preflightError = `base: ${e.message}`;
    }

    try {
      const goRes = await ctx.get(testedUrl, { maxRedirects: 0 });
      const st = goRes.status();
      result.goRouteReachable = st < 400;
      const loc = goRes.headers()['location'];
      if (loc) { try { result.targetHost = new URL(loc).hostname; } catch { /* relative/odd */ } }
    } catch (e) {
      result.goRouteReachable = false;
      result.preflightError = `go: ${e.message}`;
    }

    if (result.goRouteReachable && result.targetHost) {
      try {
        const tRes = await ctx.get(`https://${result.targetHost}/`, { maxRedirects: 3 });
        result.targetReachable = tRes.status() < 500;
      } catch (e) {
        result.targetReachable = false; // slow/blocked target — Playwright still tries
        result.preflightError = `target: ${e.message}`;
      }
    }
  } catch (e) {
    result.preflightError = `preflight setup: ${e.message}`;
  } finally {
    if (ctx) await ctx.dispose().catch(() => {});
  }
  return result;
}

// ── One capture task ─────────────────────────────────────────────────────
async function runCapture(countrySlug, exchangeSlug, device, index) {
  const capturedAt = new Date().toISOString();
  const dateStr = capturedAt.slice(0, 10);
  const testedUrl = buildTestedUrl(exchangeSlug, countrySlug, BASE_URL);
  const proxyInfo = resolveProxy(countrySlug);

  if (!proxyInfo.configured) {
    const snapshot = buildSnapshot({
      exchangeSlug, countrySlug, deviceViewport: device, testedUrl, capturedAt,
      status: 'skipped', confidence: 'unknown',
      note: `Skipped: ${describeProxy(proxyInfo)}. A country-specific capture must not run un-proxied.`,
    });
    console.log(`  [skipped] ${exchangeSlug} / ${countrySlug} / ${device} — ${snapshot.note}`);
    return snapshot;
  }

  // Preflight for proxied runs: prove exit country / base / go-route before
  // spending a browser launch, and hard-fail only on base or /go failure.
  const proxied = !!proxyInfo.playwrightProxy;
  let preflight = null;
  if (proxied) {
    preflight = await runPreflight(proxyInfo, testedUrl);
    console.log(`  [preflight] ${exchangeSlug} / ${countrySlug} / ${device} — exit=${preflight.proxyExitCountry ?? '?'}, base=${preflight.baseReachable}, go=${preflight.goRouteReachable}, target=${preflight.targetReachable ?? 'n/a'}`);
    if (preflight.baseReachable === false || preflight.goRouteReachable === false) {
      const errorClass = preflight.baseReachable === false ? 'BASE_SITE_UNREACHABLE' : 'GO_ROUTE_UNREACHABLE';
      const snapshot = buildSnapshot({
        exchangeSlug, countrySlug, deviceViewport: device, testedUrl, capturedAt,
        status: 'error', confidence: 'unknown', errorClass, preflight,
        note: `Preflight hard-fail (${errorClass}): ${preflight.preflightError ?? 'unreachable'}. proxy: ${describeProxy(proxyInfo)}. No browser launched.`,
      });
      console.log(`  [error:${errorClass}] ${exchangeSlug} / ${countrySlug} / ${device} — ${snapshot.note}`);
      return snapshot;
    }
  }

  const navTimeoutMs = proxied ? TIMEOUTS.navigationTimeoutMs : TIMEOUTS.softTimeoutMs;
  const launchOpts = { headless: true, args: ['--no-sandbox'] };
  if (proxyInfo.playwrightProxy) launchOpts.proxy = proxyInfo.playwrightProxy;

  let browser = null;
  // Populated by the navigation-timeout fallback so the catch block can save
  // partial evidence instead of losing everything.
  let partial = { url: null, title: null, text: '', html: '', screenshotBuf: null };
  const navChain = [];
  let lastStatus = null;
  try {
    browser = await chromium.launch(launchOpts);
    const viewport = VIEWPORTS[device];
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      userAgent: device === 'mobile' ? MOBILE_UA : DESKTOP_UA,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });
    const page = await context.newPage();

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        if (navChain[navChain.length - 1] !== url) navChain.push(url);
      }
    });
    page.on('response', (res) => {
      if (res.frame() === page.mainFrame()) lastStatus = res.status();
    });

    try {
      await page.goto(testedUrl, { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
      try { await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.settleTimeoutMs }); } catch { /* best-effort settle */ }
    } catch (navErr) {
      // Navigation timed out or failed — inspect whatever state the page is
      // in before giving up, so slow proxied targets leave partial evidence
      // (current URL, title, text, HTML, screenshot) instead of nothing.
      try { partial.url = page.url(); } catch { /* renderer gone */ }
      partial.title = await page.title().catch(() => null);
      partial.text = await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
      partial.html = await page.content().catch(() => '');
      partial.screenshotBuf = await page.screenshot({ timeout: TIMEOUTS.partialCaptureMs }).catch(() => null);
      throw navErr;
    }

    const finalUrl = page.url();
    if (!finalUrl || finalUrl.startsWith('chrome-error:') || finalUrl === 'about:blank') {
      throw new Error(`Navigation did not reach a real page (finalUrl=${finalUrl || '(empty)'}). Likely no network egress or the target is unreachable from this environment.`);
    }
    const text = await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
    const html = await page.content().catch(() => '');

    mkdirSync(join(SCREENSHOT_DIR, countrySlug, exchangeSlug), { recursive: true });
    mkdirSync(join(HTML_DIR, countrySlug, exchangeSlug), { recursive: true });
    mkdirSync(join(SNAPSHOT_DIR, countrySlug, exchangeSlug), { recursive: true });

    const screenshotFile = join(SCREENSHOT_DIR, countrySlug, exchangeSlug, `${device}-${dateStr}.png`);
    const htmlFile = join(HTML_DIR, countrySlug, exchangeSlug, `${device}-${dateStr}.html`);
    const screenshotBuf = await page.screenshot({ path: screenshotFile });
    writeFileSync(htmlFile, html.slice(0, 500000));

    const detected = detectSignals(text, html, exchangeSlug);

    // Desktop/mobile disagreement rule: if a prior capture for the other
    // device on the same exchange/country landed on a different status,
    // this evidence is not settled — cap confidence.
    const priorOther = findLatestOtherDevice(index, countrySlug, exchangeSlug, device);
    let confidence = detected.confidence;
    let note = null;
    if (priorOther && priorOther.status !== detected.status) {
      confidence = confidence === 'verified' ? 'partial' : confidence;
      note = `Desktop/mobile disagreement: ${priorOther.deviceViewport}=${priorOther.status}, ${device}=${detected.status}. Confidence capped.`;
    }

    const relScreenshot = screenshotFile.slice(ROOT.length + 1).replace(/\\/g, '/');
    const relHtml = htmlFile.slice(ROOT.length + 1).replace(/\\/g, '/');

    const snapshot = buildSnapshot({
      exchangeSlug, countrySlug, deviceViewport: device, testedUrl,
      finalUrl, redirectChain: navChain, httpStatus: lastStatus, capturedAt,
      screenshotPath: relScreenshot, htmlSnapshotPath: relHtml,
      screenshotHash: hashBuffer(screenshotBuf),
      detectedBonusText: detected.detectedBonusText,
      detectedPromoCode: detected.detectedPromoCode,
      detectedRestrictionText: detected.detectedRestrictionText,
      detectedTermsText: detected.detectedTermsText,
      status: detected.status,
      confidence,
      preflight,
      note: note ?? `proxy: ${describeProxy(proxyInfo)}`,
    });

    console.log(`  [${snapshot.status}] ${exchangeSlug} / ${countrySlug} / ${device} — confidence=${snapshot.confidence}, finalUrl=${finalUrl}`);
    return snapshot;
  } catch (err) {
    // Classify the failure — a slow proxied target is (PROXY_)TARGET_TIMEOUT,
    // never a country restriction — and keep any partial evidence collected
    // by the navigation fallback.
    const errorClass = classifyFailure({
      message: err.message,
      proxied,
      preflight,
      partialText: partial.text,
      partialHtml: partial.html,
    });

    let screenshotPath = null;
    let htmlSnapshotPath = null;
    let screenshotHash = null;
    try {
      if (partial.screenshotBuf) {
        mkdirSync(join(SCREENSHOT_DIR, countrySlug, exchangeSlug), { recursive: true });
        const f = join(SCREENSHOT_DIR, countrySlug, exchangeSlug, `${device}-${dateStr}-partial.png`);
        writeFileSync(f, partial.screenshotBuf);
        screenshotPath = f.slice(ROOT.length + 1).replace(/\\/g, '/');
        screenshotHash = hashBuffer(partial.screenshotBuf);
      }
      if (partial.html) {
        mkdirSync(join(HTML_DIR, countrySlug, exchangeSlug), { recursive: true });
        const f = join(HTML_DIR, countrySlug, exchangeSlug, `${device}-${dateStr}-partial.html`);
        writeFileSync(f, partial.html.slice(0, 500000));
        htmlSnapshotPath = f.slice(ROOT.length + 1).replace(/\\/g, '/');
      }
    } catch { /* partial evidence is best-effort */ }

    const partialBits = [
      partial.url ? `lastUrl=${partial.url}` : null,
      partial.title ? `title="${partial.title.slice(0, 80)}"` : null,
      partial.text ? `textLen=${partial.text.length}` : null,
      screenshotPath ? 'screenshot=saved' : null,
    ].filter(Boolean).join(', ');

    const snapshot = buildSnapshot({
      exchangeSlug, countrySlug, deviceViewport: device, testedUrl, capturedAt,
      finalUrl: partial.url && !partial.url.startsWith('chrome-error:') && partial.url !== 'about:blank' ? partial.url : null,
      redirectChain: navChain,
      httpStatus: lastStatus,
      screenshotPath, htmlSnapshotPath, screenshotHash,
      status: 'error', confidence: 'unknown', errorClass, preflight,
      note: `Capture error [${errorClass}]: ${err.message}${partialBits ? ` | partial: ${partialBits}` : ''} | proxy: ${describeProxy(proxyInfo)}`,
    });
    console.log(`  [error:${errorClass}] ${exchangeSlug} / ${countrySlug} / ${device} — ${err.message}${partialBits ? ` (partial: ${partialBits})` : ''}`);
    return snapshot;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ── Run ───────────────────────────────────────────────────────────────────
(async () => {
  const total = countries.length * exchanges.length * devices.length;
  console.log(`GEO bonus capture — ${countries.length} countr${countries.length === 1 ? 'y' : 'ies'} × ${exchanges.length} exchange(s) × ${devices.length} device(s) = ${total} task(s)`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const index = loadIndex();
  const results = [];
  for (const country of countries) {
    for (const exchange of exchanges) {
      for (const device of devices) {
        const snapshot = await runCapture(country, exchange, device, index);
        results.push(snapshot);
        index.entries.push(snapshot);

        // Error snapshots are worth keeping too (classification + partial
        // evidence); only 'skipped' (no capture attempted) writes nothing.
        if (snapshot.status !== 'skipped') {
          const jsonFile = join(SNAPSHOT_DIR, country, exchange, `${device}-${snapshot.capturedAt.slice(0, 10)}${snapshot.status === 'error' ? '-error' : ''}.json`);
          mkdirSync(dirname(jsonFile), { recursive: true });
          writeFileSync(jsonFile, JSON.stringify(snapshot, null, 2));
        }
      }
    }
  }
  saveIndex(index);

  const counts = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});
  console.log(`\nDone. ${JSON.stringify(counts)}`);
  console.log(`Index: ${INDEX_PATH.slice(ROOT.length + 1)} (untracked — do not stage).`);
  console.log('NOTE: postSignupVerification is always "not_available" — no accounts or dashboards were checked.');
})();
