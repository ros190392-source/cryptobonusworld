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

import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  CAPTURE_COUNTRIES, CAPTURE_DEVICES, CAPTURE_EXCHANGES,
  VIEWPORTS, DESKTOP_UA, MOBILE_UA, DEFAULT_BASE_URL,
  resolveProxy, describeProxy, buildTestedUrl, detectSignals,
  buildSnapshot, hashBuffer,
} from './lib/geo-bonus-capture.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
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

  const launchOpts = { headless: true, args: ['--no-sandbox'] };
  if (proxyInfo.playwrightProxy) launchOpts.proxy = proxyInfo.playwrightProxy;

  let browser = null;
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

    const navChain = [];
    let lastStatus = null;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        if (navChain[navChain.length - 1] !== url) navChain.push(url);
      }
    });
    page.on('response', (res) => {
      if (res.frame() === page.mainFrame()) lastStatus = res.status();
    });

    await page.goto(testedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch { /* best-effort settle */ }

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
      note: note ?? `proxy: ${describeProxy(proxyInfo)}`,
    });

    console.log(`  [${snapshot.status}] ${exchangeSlug} / ${countrySlug} / ${device} — confidence=${snapshot.confidence}, finalUrl=${finalUrl}`);
    return snapshot;
  } catch (err) {
    const snapshot = buildSnapshot({
      exchangeSlug, countrySlug, deviceViewport: device, testedUrl, capturedAt,
      status: 'error', confidence: 'unknown',
      note: `Capture error: ${err.message}`,
    });
    console.log(`  [error] ${exchangeSlug} / ${countrySlug} / ${device} — ${err.message}`);
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

        if (snapshot.status !== 'skipped' && snapshot.status !== 'error') {
          const jsonFile = join(SNAPSHOT_DIR, country, exchange, `${device}-${snapshot.capturedAt.slice(0, 10)}.json`);
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
