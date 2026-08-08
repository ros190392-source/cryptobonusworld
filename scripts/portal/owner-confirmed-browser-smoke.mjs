#!/usr/bin/env node
/**
 * Browser smoke for Issue #269 owner-confirmed link/code authority split.
 *
 * Runs against the already-built static `dist` through `astro preview` and verifies:
 * - homepage desktop/mobile factual parity;
 * - preview vs production global CTA policy;
 * - exact owner-confirmed promo-code rendering;
 * - /promo-codes/ owner-code + internal /go registration surface;
 * - seven dedicated exchange pages stay neutral while keeping confirmed code/CTA;
 * - all 13 /go routes serialize the exact confirmed destination without navigating off-site.
 *
 * Every browser context is network-sandboxed to localhost. Direct /go matrix additionally uses
 * JavaScript disabled, so the server-rendered route is exercised by Chromium but no exchange or
 * third-party host can be contacted.
 *
 * Usage:
 *   node scripts/portal/owner-confirmed-browser-smoke.mjs preview
 *   node scripts/portal/owner-confirmed-browser-smoke.mjs production
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const mode = process.argv[2] ?? 'preview';
if (!['preview', 'production'].includes(mode)) {
  console.error('Usage: owner-confirmed-browser-smoke.mjs <preview|production>');
  process.exit(2);
}

const PORT = mode === 'production' ? 4471 : 4470;
const BASE = `http://127.0.0.1:${PORT}`;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const TMP = mkdtempSync(join(tmpdir(), 'cbw-owner-browser-smoke-'));
const BUNDLE = join(TMP, 'owner-manifest.mjs');

let checks = 0;
const failures = [];
function check(label, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(detail ? `${label}: ${detail}` : label);
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function loadManifest() {
  const contract = join(ROOT, 'src/data/contracts/ownerConfirmedCommercialAuthority.ts');
  await build({
    stdin: {
      contents: `export { OWNER_CONFIRMED_COMMERCIAL_MANIFEST } from ${JSON.stringify(contract)};`,
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'owner-browser-manifest-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: BUNDLE,
    logLevel: 'silent',
  });
  const m = await import(`${pathToFileURL(BUNDLE).href}?v=${Date.now()}`);
  return m.OWNER_CONFIRMED_COMMERCIAL_MANIFEST;
}

function startPreviewServer() {
  const logs = [];
  const child = spawn(
    npmCommand,
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PORT)],
    { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const capture = (chunk) => {
    const text = String(chunk);
    logs.push(text);
    if (logs.join('').length > 12000) logs.shift();
  };
  child.stdout?.on('data', capture);
  child.stderr?.on('data', capture);
  return { child, logs };
}

async function waitForServer(server) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(`astro preview exited early (${server.child.exitCode})\n${server.logs.join('')}`);
    }
    try {
      const response = await fetch(`${BASE}/`, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) return;
    } catch (_) {}
    await sleep(250);
  }
  throw new Error(`Timed out waiting for astro preview at ${BASE}\n${server.logs.join('')}`);
}

async function stopServer(server) {
  if (!server || server.child.exitCode !== null) return;
  server.child.kill('SIGTERM');
  await Promise.race([once(server.child, 'exit'), sleep(1500)]).catch(() => {});
  if (server.child.exitCode === null) server.child.kill('SIGKILL');
}

async function launchChromium() {
  try {
    // GitHub-hosted Ubuntu runners ship Chrome; this avoids downloading browser binaries.
    return await chromium.launch({ headless: true, channel: 'chrome' });
  } catch (chromeError) {
    try {
      // Local/dev fallback when Playwright's bundled Chromium is already installed.
      return await chromium.launch({ headless: true });
    } catch (bundledError) {
      throw new Error(
        `Unable to launch Chromium. Chrome channel: ${chromeError?.message ?? chromeError}\n` +
        `Bundled Chromium: ${bundledError?.message ?? bundledError}`,
      );
    }
  }
}

async function sandboxContext(context) {
  await context.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    try {
      const parsed = new URL(requestUrl);
      if (
        parsed.hostname === '127.0.0.1'
        || parsed.hostname === 'localhost'
        || parsed.protocol === 'data:'
        || parsed.protocol === 'blob:'
      ) {
        await route.continue();
        return;
      }
    } catch (_) {}
    await route.abort('blockedbyclient');
  });
}

function attachErrorCapture(page, bucket, prefix) {
  page.on('pageerror', (err) => bucket.push(`${prefix} pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/i.test(msg.text())) {
      bucket.push(`${prefix} console.error: ${msg.text()}`);
    }
  });
}

async function homepageSnapshot(page, viewportLabel) {
  const errors = [];
  attachErrorCapture(page, errors, `${viewportLabel} homepage`);
  const response = await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  check(`${viewportLabel}: homepage HTTP 200`, response?.status() === 200, `status=${response?.status()}`);

  const rows = page.locator('.top10-row');
  const rowCount = await rows.count();
  check(`${viewportLabel}: homepage has 10 Top-10 rows`, rowCount === 10, `count=${rowCount}`);
  check(`${viewportLabel}: no verified factual status badges`, await page.locator('.top10-status--verified').count() === 0);

  const goCount = await page.locator('.top10-primary[href^="/go/"]').count();
  if (mode === 'production') {
    check(`${viewportLabel}: production homepage has 10 governed /go CTAs`, goCount === 10, `count=${goCount}`);
    const affiliateAttrs = await page.locator('.top10-primary[href^="/go/"]').evaluateAll((els) =>
      els.map((el) => ({ target: el.getAttribute('target'), rel: el.getAttribute('rel'), text: el.textContent?.trim() ?? '' })),
    );
    check(`${viewportLabel}: production CTA labels stay neutral`, affiliateAttrs.every((x) => /^Register\b/i.test(x.text) && !/bonus|claim|reward|verified/i.test(x.text)));
    check(`${viewportLabel}: production CTAs are sponsored new-tab links`, affiliateAttrs.every((x) => x.target === '_blank' && /\bsponsored\b/.test(x.rel ?? '')));
  } else {
    check(`${viewportLabel}: preview homepage has zero /go CTAs`, goCount === 0, `count=${goCount}`);
  }

  const snapshot = await rows.evaluateAll((els) => els.map((el) => ({
    slug: el.getAttribute('data-exchange-slug') ?? '',
    status: el.querySelector('.top10-status')?.textContent?.trim() ?? '',
    code: el.querySelector('.pcc-code')?.textContent?.trim() ?? '',
  })));

  check(`${viewportLabel}: all Top-10 rows remain under re-verification`, snapshot.every((row) => /re-verification/i.test(row.status)));
  check(`${viewportLabel}: no browser console/page errors`, errors.length === 0, errors.join(' | '));
  return snapshot;
}

async function checkKeyboardFocus(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return { tag: '', visible: false };
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, visible: r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' };
  });
  check('keyboard: focus reaches a visible interactive element', ['A', 'BUTTON', 'INPUT', 'SELECT'].includes(focus.tag) && focus.visible, JSON.stringify(focus));
}

async function checkPromoDirectory(page, manifestBySlug) {
  const errors = [];
  attachErrorCapture(page, errors, 'promo directory');
  const response = await page.goto(`${BASE}/promo-codes/`, { waitUntil: 'networkidle' });
  check('promo directory HTTP 200', response?.status() === 200, `status=${response?.status()}`);
  const rows = page.locator('.promo-row');
  const rowCount = await rows.count();
  check('promo directory has 6 tracked rows', rowCount === 6, `count=${rowCount}`);

  const state = await rows.evaluateAll((els) => els.map((el) => ({
    slug: el.getAttribute('data-exchange-slug') ?? '',
    code: el.querySelector('.pcc-code')?.textContent?.trim() ?? '',
    codeState: el.querySelector('.promo-code-confirmed small')?.textContent?.trim() ?? '',
    actionHref: el.querySelector('.promo-action')?.getAttribute('href') ?? '',
    actionText: el.querySelector('.promo-action')?.textContent?.trim() ?? '',
    offerStatus: el.querySelector('[data-label="Offer status"]')?.textContent?.trim() ?? '',
    countryNote: el.querySelector('[data-label="Country note"]')?.textContent?.trim() ?? '',
  })));

  for (const row of state) {
    const expected = manifestBySlug.get(row.slug);
    check(`promo ${row.slug}: manifest entry exists`, Boolean(expected));
    check(`promo ${row.slug}: exact owner-confirmed code rendered`, row.code === (expected?.promoCode ?? ''), `actual=${row.code}`);
    check(`promo ${row.slug}: code visibly labelled owner confirmed`, /owner confirmed/i.test(row.codeState));
    check(`promo ${row.slug}: action stays on governed /go boundary`, row.actionHref === `/go/${row.slug}/`, `href=${row.actionHref}`);
    check(`promo ${row.slug}: CTA is neutral Register`, /^Register/i.test(row.actionText) && !/bonus|claim|reward|verified/i.test(row.actionText));
    check(`promo ${row.slug}: offer status remains neutral`, /re-verification/i.test(row.offerStatus));
    check(`promo ${row.slug}: country note remains neutral`, /re-verification/i.test(row.countryNote));
  }
  check('promo directory: no browser console/page errors', errors.length === 0, errors.join(' | '));
}

async function checkDedicatedPages(page, manifestBySlug) {
  const slugs = ['bybit', 'mexc', 'okx', 'bitget', 'bingx', 'kucoin', 'coinex'];
  for (const slug of slugs) {
    const errors = [];
    attachErrorCapture(page, errors, `dedicated ${slug}`);
    const response = await page.goto(`${BASE}/${slug}/`, { waitUntil: 'networkidle' });
    check(`${slug}: dedicated page HTTP 200`, response?.status() === 200, `status=${response?.status()}`);
    check(`${slug}: dedicated page uses neutral status surface`, await page.locator('.cbw-unverified').count() === 1);
    check(`${slug}: no verified-offer badge`, (await page.locator('body').innerText()).includes('✓ Verified offer') === false);
    const expected = manifestBySlug.get(slug);
    const code = (await page.locator('.pcc-code').count()) ? (await page.locator('.pcc-code').first().innerText()).trim() : '';
    check(`${slug}: exact owner-confirmed code rendered`, code === (expected?.promoCode ?? ''), `actual=${code}`);
    const href = await page.locator('.cbw-unverified__primary').getAttribute('href');
    check(`${slug}: primary registration action stays on /go boundary`, href === `/go/${slug}/`, `href=${href}`);
    const text = (await page.locator('.cbw-unverified__primary').innerText()).trim();
    check(`${slug}: dedicated CTA stays claim-neutral`, /^Register on /i.test(text) && !/bonus|claim|reward|verified/i.test(text));
    check(`${slug}: no browser console/page errors`, errors.length === 0, errors.join(' | '));
  }
}

async function checkGoMatrix(browser, manifest) {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1024, height: 768 } });
  await sandboxContext(context);
  const page = await context.newPage();
  try {
    for (const entry of manifest) {
      const response = await page.goto(`${BASE}/go/${entry.slug}/`, { waitUntil: 'domcontentloaded' });
      check(`go/${entry.slug}: HTTP 200`, response?.status() === 200, `status=${response?.status()}`);
      check(`go/${entry.slug}: JS-disabled browser remains on local CBW route`, new URL(page.url()).hostname === '127.0.0.1', page.url());
      const href = await page.locator('#cbw-continue').getAttribute('href');
      check(`go/${entry.slug}: continue href is exact owner-confirmed destination`, href === entry.defaultUrl, `actual=${href} expected=${entry.defaultUrl}`);
      const body = await page.locator('body').innerText();
      check(`go/${entry.slug}: offer terms remain under re-verification`, /under re-verification/i.test(body));
      if (entry.promoCode) {
        const code = (await page.locator('code').count()) ? (await page.locator('code').first().innerText()).trim() : '';
        check(`go/${entry.slug}: exact owner-confirmed code rendered`, code === entry.promoCode, `actual=${code}`);
      } else {
        check(`go/${entry.slug}: no invented promo code`, await page.locator('code').count() === 0);
      }
    }
  } finally {
    await context.close();
  }
}

let server = null;
let browser = null;
try {
  const manifest = await loadManifest();
  const manifestBySlug = new Map(manifest.map((entry) => [entry.slug, entry]));
  check('manifest has 13 current commercial candidates', manifest.length === 13, `count=${manifest.length}`);

  server = startPreviewServer();
  await waitForServer(server);
  browser = await launchChromium();

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await sandboxContext(desktopContext);
  const desktopPage = await desktopContext.newPage();
  const desktopSnapshot = await homepageSnapshot(desktopPage, 'desktop');
  await checkKeyboardFocus(desktopPage);
  await checkPromoDirectory(desktopPage, manifestBySlug);
  await checkDedicatedPages(desktopPage, manifestBySlug);
  await desktopContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await sandboxContext(mobileContext);
  const mobilePage = await mobileContext.newPage();
  const mobileSnapshot = await homepageSnapshot(mobilePage, 'mobile');
  await mobileContext.close();

  check('desktop/mobile factual Top-10 posture matches exactly', JSON.stringify(desktopSnapshot) === JSON.stringify(mobileSnapshot));

  await checkGoMatrix(browser, manifest);

  if (failures.length > 0) {
    console.error(`OWNER-CONFIRMED BROWSER SMOKE (${mode}): FAIL (${failures.length}/${checks})`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`OWNER-CONFIRMED BROWSER SMOKE (${mode}): PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error(`OWNER-CONFIRMED BROWSER SMOKE (${mode}): ERROR`);
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopServer(server).catch(() => {});
  rmSync(TMP, { recursive: true, force: true });
}
