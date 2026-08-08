#!/usr/bin/env node
/** Browser smoke for Issue #269. Localhost-only; never contacts exchanges. */
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const DIST = resolve(ROOT, 'dist');
const mode = process.argv[2] ?? 'preview';
if (!['preview', 'production'].includes(mode)) {
  console.error('Usage: owner-confirmed-browser-smoke.mjs <preview|production>');
  process.exit(2);
}

const PORT = mode === 'production' ? 4471 : 4470;
const BASE = `http://127.0.0.1:${PORT}`;
const TMP = mkdtempSync(join(tmpdir(), 'cbw-owner-browser-smoke-'));
const BUNDLE = join(TMP, 'owner-manifest.mjs');

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

const CONTENT_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
});

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
  return (await import(`${pathToFileURL(BUNDLE).href}?v=${Date.now()}`)).OWNER_CONFIRMED_COMMERCIAL_MANIFEST;
}

function staticFileFor(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, BASE).pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;

  const rel = pathname.replace(/^\/+/, '');
  let candidate = resolve(DIST, rel);
  if (pathname.endsWith('/')) candidate = resolve(candidate, 'index.html');
  else if (!extname(candidate)) {
    const directIsFile = existsSync(candidate) && statSync(candidate).isFile();
    if (!directIsFile) candidate = resolve(candidate, 'index.html');
  }

  if (candidate !== DIST && !candidate.startsWith(`${DIST}${sep}`)) return null;
  if (!existsSync(candidate) || !statSync(candidate).isFile()) return null;
  return candidate;
}

async function startStaticServer() {
  if (!existsSync(DIST)) throw new Error('dist not found — build before browser smoke.');
  const server = createServer((req, res) => {
    const file = staticFileFor(req.url ?? '/');
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('Not found');
      return;
    }
    const type = CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file).on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }).pipe(res);
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(PORT, '127.0.0.1', resolveListen);
  });
  const probe = await fetch(`${BASE}/`, { redirect: 'manual' });
  if (probe.status !== 200) throw new Error(`Static smoke server probe failed: HTTP ${probe.status}`);
  return server;
}

async function stopStaticServer(server) {
  if (!server) return;
  server.closeAllConnections?.();
  await new Promise((resolveClose) => server.close(() => resolveClose())).catch(() => {});
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, channel: 'chrome' });
  } catch (chromeError) {
    try {
      return await chromium.launch({ headless: true });
    } catch (bundledError) {
      throw new Error(`Chrome launch failed: ${chromeError?.message ?? chromeError}\nBundled Chromium failed: ${bundledError?.message ?? bundledError}`);
    }
  }
}

async function sandbox(context) {
  await context.route('**/*', async (route) => {
    try {
      const u = new URL(route.request().url());
      if (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.protocol === 'data:' || u.protocol === 'blob:') {
        await route.continue();
        return;
      }
    } catch {}
    await route.abort('blockedbyclient');
  });
}

function captureErrors(page, bucket, prefix) {
  page.on('pageerror', (e) => bucket.push(`${prefix} pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/i.test(m.text())) bucket.push(`${prefix} console.error: ${m.text()}`);
  });
}

async function gotoReady(page, path, selector = 'body') {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.locator(selector).first().waitFor({ state: 'attached', timeout: 10000 });
  return response;
}

async function homepageSnapshot(page, label, manifestBySlug) {
  const errors = [];
  captureErrors(page, errors, `${label} homepage`);
  const response = await gotoReady(page, '/', '.top10-row');
  check(`${label}: homepage HTTP 200`, response?.status() === 200, `status=${response?.status()}`);
  const rows = page.locator('.top10-row');
  const count = await rows.count();
  check(`${label}: 10 Top-10 rows`, count === 10, `count=${count}`);
  check(`${label}: no verified factual badge`, await page.locator('.top10-status--verified').count() === 0);

  const goCount = await page.locator('.top10-primary[href^="/go/"]').count();
  if (mode === 'production') {
    check(`${label}: production has 10 /go CTAs`, goCount === 10, `count=${goCount}`);
    const attrs = await page.locator('.top10-primary[href^="/go/"]').evaluateAll((els) => els.map((el) => ({
      target: el.getAttribute('target'), rel: el.getAttribute('rel'), text: el.textContent?.trim() ?? '',
    })));
    check(`${label}: CTA labels neutral`, attrs.every((x) => /^Register\b/i.test(x.text) && !/bonus|claim|reward|verified/i.test(x.text)));
    check(`${label}: sponsored new-tab CTAs`, attrs.every((x) => x.target === '_blank' && /\bsponsored\b/.test(x.rel ?? '')));
  } else {
    check(`${label}: preview has zero /go CTAs`, goCount === 0, `count=${goCount}`);
  }

  const snapshot = await rows.evaluateAll((els) => els.map((el) => ({
    slug: el.getAttribute('data-exchange-slug') ?? '',
    status: el.querySelector('.top10-status')?.textContent?.trim() ?? '',
    code: el.querySelector('.pcc-code')?.textContent?.trim() ?? '',
  })));
  check(`${label}: all statuses under re-verification`, snapshot.every((r) => /re-verification/i.test(r.status)));
  for (const row of snapshot) {
    const expected = manifestBySlug.get(row.slug);
    check(`${label} ${row.slug}: manifest exists`, Boolean(expected));
    if (expected?.promoCode) check(`${label} ${row.slug}: exact owner code`, row.code === expected.promoCode, `actual=${row.code}`);
    else check(`${label} ${row.slug}: no invented owner code`, row.code === '', `actual=${row.code}`);
  }
  check(`${label}: no console/page errors`, errors.length === 0, errors.join(' | '));
  return snapshot;
}

async function checkKeyboard(page) {
  await gotoReady(page, '/', '.top10-row');
  let visibleInteractive = false;
  for (let i = 0; i < 20; i += 1) {
    await page.keyboard.press('Tab');
    visibleInteractive = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return false;
      const r = el.getBoundingClientRect();
      return ['A', 'BUTTON', 'INPUT', 'SELECT'].includes(el.tagName)
        && r.width > 0 && r.height > 0
        && getComputedStyle(el).visibility !== 'hidden';
    });
    if (visibleInteractive) break;
  }
  check('keyboard: visible interactive focus', visibleInteractive);
}

async function checkPromoDirectory(context, manifestBySlug) {
  const page = await context.newPage();
  const errors = [];
  captureErrors(page, errors, 'promo directory');
  try {
    const response = await gotoReady(page, '/promo-codes/', '.promo-row');
    check('promo: HTTP 200', response?.status() === 200, `status=${response?.status()}`);
    const rows = page.locator('.promo-row');
    const count = await rows.count();
    check('promo: 6 rows', count === 6, `count=${count}`);
    const state = await rows.evaluateAll((els) => els.map((el) => ({
      slug: el.getAttribute('data-exchange-slug') ?? '',
      code: el.querySelector('.pcc-code')?.textContent?.trim() ?? '',
      codeState: el.querySelector('.promo-code-confirmed small')?.textContent?.trim() ?? '',
      href: el.querySelector('.promo-action')?.getAttribute('href') ?? '',
      action: el.querySelector('.promo-action')?.textContent?.trim() ?? '',
      offer: el.querySelector('[data-label="Offer status"]')?.textContent?.trim() ?? '',
      country: el.querySelector('[data-label="Country note"]')?.textContent?.trim() ?? '',
    })));
    for (const row of state) {
      const expected = manifestBySlug.get(row.slug);
      check(`promo ${row.slug}: manifest exists`, Boolean(expected));
      check(`promo ${row.slug}: exact code`, row.code === (expected?.promoCode ?? ''), `actual=${row.code}`);
      check(`promo ${row.slug}: owner label`, /owner confirmed/i.test(row.codeState));
      check(`promo ${row.slug}: /go boundary`, row.href === `/go/${row.slug}/`, `href=${row.href}`);
      check(`promo ${row.slug}: neutral CTA`, /^Register/i.test(row.action) && !/bonus|claim|reward|verified/i.test(row.action));
      check(`promo ${row.slug}: neutral offer`, /re-verification/i.test(row.offer));
      check(`promo ${row.slug}: neutral country`, /re-verification/i.test(row.country));
    }
    check('promo: no console/page errors', errors.length === 0, errors.join(' | '));
  } finally {
    await page.close();
  }
}

async function checkDedicated(context, manifestBySlug) {
  for (const slug of ['bybit', 'mexc', 'okx', 'bitget', 'bingx', 'kucoin', 'coinex']) {
    const page = await context.newPage();
    const errors = [];
    captureErrors(page, errors, `dedicated ${slug}`);
    try {
      const response = await gotoReady(page, `/${slug}/`, 'main');
      check(`${slug}: HTTP 200`, response?.status() === 200, `status=${response?.status()}`);

      const neutralCount = await page.locator('.cbw-unverified').count();
      if (neutralCount !== 1) {
        const title = await page.locator('h1').first().textContent().catch(() => '');
        check(`${slug}: neutral surface`, false, `count=${neutralCount}; h1=${String(title ?? '').trim()}`);
        check(`${slug}: no console/page errors`, errors.length === 0, errors.join(' | '));
        continue;
      }
      check(`${slug}: neutral surface`, true);
      const bodyText = await page.locator('body').innerText();
      check(`${slug}: no verified offer text`, !bodyText.includes('✓ Verified offer'));
      check(`${slug}: offer terms remain neutral`, /under re-verification|not verified/i.test(bodyText));

      const expected = manifestBySlug.get(slug);
      check(`${slug}: manifest exists`, Boolean(expected));
      const code = (await page.locator('.pcc-code').count()) ? (await page.locator('.pcc-code').first().innerText()).trim() : '';
      check(`${slug}: exact confirmed code`, code === (expected?.promoCode ?? ''), `actual=${code}`);

      const primary = page.locator('.cbw-unverified__primary');
      check(`${slug}: one primary CTA`, await primary.count() === 1);
      const href = await primary.getAttribute('href');
      check(`${slug}: internal /go action`, href === `/go/${slug}/`, `href=${href}`);
      const text = (await primary.innerText()).trim();
      check(`${slug}: neutral registration CTA`, /^Register on /i.test(text) && !/bonus|claim|reward|verified/i.test(text));
      check(`${slug}: no console/page errors`, errors.length === 0, errors.join(' | '));
    } finally {
      await page.close();
    }
  }
}

async function checkGoMatrix(browser, manifest) {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1024, height: 768 } });
  await sandbox(context);
  try {
    for (const entry of manifest) {
      const page = await context.newPage();
      try {
        const response = await gotoReady(page, `/go/${entry.slug}/`, '#cbw-continue');
        check(`go/${entry.slug}: HTTP 200`, response?.status() === 200, `status=${response?.status()}`);
        check(`go/${entry.slug}: stays local`, new URL(page.url()).hostname === '127.0.0.1', page.url());
        const href = await page.locator('#cbw-continue').getAttribute('href');
        check(`go/${entry.slug}: exact destination`, href === entry.defaultUrl, `actual=${href} expected=${entry.defaultUrl}`);
        check(`go/${entry.slug}: terms neutral`, /under re-verification|not verified/i.test(await page.locator('body').innerText()));
        if (entry.promoCode) {
          const code = (await page.locator('code').first().innerText()).trim();
          check(`go/${entry.slug}: exact code`, code === entry.promoCode, `actual=${code}`);
        } else {
          check(`go/${entry.slug}: no invented code`, await page.locator('code').count() === 0);
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }
}

let server;
let browser;
try {
  const manifest = await loadManifest();
  const manifestBySlug = new Map(manifest.map((e) => [e.slug, e]));
  check('manifest: 13 candidates', manifest.length === 13, `count=${manifest.length}`);

  server = await startStaticServer();
  browser = await launchBrowser();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await sandbox(desktop);
  const desktopPage = await desktop.newPage();
  const desktopSnapshot = await homepageSnapshot(desktopPage, 'desktop', manifestBySlug);
  await checkKeyboard(desktopPage);
  await desktopPage.close();
  await checkPromoDirectory(desktop, manifestBySlug);
  await checkDedicated(desktop, manifestBySlug);
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await sandbox(mobile);
  const mobilePage = await mobile.newPage();
  const mobileSnapshot = await homepageSnapshot(mobilePage, 'mobile', manifestBySlug);
  await mobilePage.close();
  await mobile.close();

  check('desktop/mobile factual posture matches', JSON.stringify(desktopSnapshot) === JSON.stringify(mobileSnapshot));
  await checkGoMatrix(browser, manifest);

  if (failures.length) {
    console.error(`OWNER-CONFIRMED BROWSER SMOKE (${mode}): FAIL (${failures.length}/${checks})`);
    for (const f of failures) console.error(` - ${f}`);
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
  await stopStaticServer(server).catch(() => {});
  rmSync(TMP, { recursive: true, force: true });
}
