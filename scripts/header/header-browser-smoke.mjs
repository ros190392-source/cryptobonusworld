#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const PORT = 4483;
const BASE = `http://127.0.0.1:${PORT}`;

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
});

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
    const directFile = existsSync(candidate) && statSync(candidate).isFile();
    if (!directFile) candidate = resolve(candidate, 'index.html');
  }
  if (candidate !== DIST && !candidate.startsWith(`${DIST}${sep}`)) return null;
  if (!existsSync(candidate) || !statSync(candidate).isFile()) return null;
  return candidate;
}

async function startServer() {
  if (!existsSync(DIST)) throw new Error('dist not found — run npm run build first.');
  const server = createServer((req, res) => {
    const file = staticFileFor(req.url ?? '/');
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file).on('error', () => res.end()).pipe(res);
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(PORT, '127.0.0.1', resolveListen);
  });
  return server;
}

async function stopServer(server) {
  if (!server) return;
  server.closeAllConnections?.();
  await new Promise((resolveClose) => server.close(resolveClose)).catch(() => {});
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, channel: 'chrome' });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function sandbox(context) {
  await context.route('**/*', async (route) => {
    let url;
    try {
      url = new URL(route.request().url());
    } catch {
      await route.abort('blockedbyclient');
      return;
    }
    if (url.pathname === '/cdn-cgi/trace') {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: 'ip=203.0.113.10\nloc=PL\ntls=TLSv1.3\n',
      });
      return;
    }
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.protocol === 'data:' || url.protocol === 'blob:') {
      await route.continue();
      return;
    }
    await route.abort('blockedbyclient');
  });
}

function captureErrors(page, bucket, prefix) {
  page.on('pageerror', (error) => bucket.push(`${prefix} pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/i.test(message.text())) {
      bucket.push(`${prefix} console.error: ${message.text()}`);
    }
  });
}

async function waitHeader(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.locator('[data-site-header]').waitFor({ state: 'attached', timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('[data-site-header]')?.dataset.contextReady === 'true');
}

async function layoutChecks(page, label, expectedHeight) {
  const header = page.locator('[data-site-header]');
  const shell = page.locator('.header-shell');
  const box = await shell.boundingBox();
  check(`${label}: header shell rendered`, Boolean(box));
  if (box) {
    check(`${label}: compact shell height`, Math.abs(box.height - expectedHeight) <= 1, `height=${box.height}, expected=${expectedHeight}`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${label}: no horizontal overflow`, overflow <= 1, `overflow=${overflow}`);
  check(`${label}: country selector visible`, await page.locator('[data-country-summary]').isVisible());
  check(`${label}: language selector visible`, await page.locator('[data-language-summary]').isVisible());
  const countryBox = await page.locator('[data-country-summary]').boundingBox();
  const languageBox = await page.locator('[data-language-summary]').boundingBox();
  if (label === 'mobile') {
    check('mobile: country touch target >=44px', Boolean(countryBox) && countryBox.height >= 44, `height=${countryBox?.height}`);
    check('mobile: language touch target >=44px', Boolean(languageBox) && languageBox.height >= 44, `height=${languageBox?.height}`);
    const menuBox = await page.locator('[data-menu-button]').boundingBox();
    check('mobile: menu touch target >=44px', Boolean(menuBox) && menuBox.height >= 44 && menuBox.width >= 44, `box=${JSON.stringify(menuBox)}`);
  }
  check(`${label}: header carries no affiliate link`, await header.locator('a[href^="/go/"]').count() === 0);
}

async function contextChecks(page) {
  await page.waitForFunction(() => document.querySelector('[data-site-header]')?.dataset.countryContext === 'PL');
  let state = await page.locator('[data-site-header]').evaluate((el) => ({
    country: el.dataset.countryContext,
    countrySource: el.dataset.countrySource,
    language: el.dataset.languageContext,
    languageSource: el.dataset.languageSource,
  }));
  check('context: IP proposal selects PL', state.country === 'PL' && state.countrySource === 'ip', JSON.stringify(state));
  check('context: browser ru-RU proposes RU language', state.language === 'ru' && state.languageSource === 'browser', JSON.stringify(state));
  check('context: Poland flag visible', (await page.locator('[data-country-flag]').textContent())?.trim() === '🇵🇱');

  await page.locator('[data-country-summary]').click();
  const kz = page.locator('[data-country-option][data-country-code="KZ"]');
  await kz.click();
  await page.waitForFunction(() => document.querySelector('[data-site-header]')?.dataset.countryContext === 'KZ');
  state = await page.locator('[data-site-header]').evaluate((el) => ({
    country: el.dataset.countryContext,
    source: el.dataset.countrySource,
  }));
  check('context: manual KZ selection wins', state.country === 'KZ' && state.source === 'manual', JSON.stringify(state));
  check('context: Kazakhstan flag visible', (await page.locator('[data-country-flag]').textContent())?.trim() === '🇰🇿');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('[data-site-header]')?.dataset.contextReady === 'true');
  state = await page.locator('[data-site-header]').evaluate((el) => ({
    country: el.dataset.countryContext,
    source: el.dataset.countrySource,
  }));
  check('context: persisted KZ survives reload despite IP=PL', state.country === 'KZ' && state.source === 'manual', JSON.stringify(state));

  await page.locator('[data-country-summary]').click();
  await page.locator('[data-country-option][data-country-code="global"]').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('[data-site-header]')?.dataset.contextReady === 'true');
  state = await page.locator('[data-site-header]').evaluate((el) => ({
    country: el.dataset.countryContext,
    source: el.dataset.countrySource,
  }));
  check('context: explicit General persists and beats IP=PL', state.country === 'global' && state.source === 'manual', JSON.stringify(state));

  await page.locator('[data-language-summary]').click();
  await page.locator('[data-language-option][data-language-code="pl"]').click();
  state = await page.locator('[data-site-header]').evaluate((el) => ({
    language: el.dataset.languageContext,
    source: el.dataset.languageSource,
    country: el.dataset.countryContext,
  }));
  check('context: manual PL language selection applied', state.language === 'pl' && state.source === 'manual', JSON.stringify(state));
  check('context: language selection does not change country', state.country === 'global', JSON.stringify(state));

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('[data-site-header]')?.dataset.contextReady === 'true');
  state = await page.locator('[data-site-header]').evaluate((el) => ({
    language: el.dataset.languageContext,
    source: el.dataset.languageSource,
  }));
  check('context: persisted PL language survives reload', state.language === 'pl' && state.source === 'manual', JSON.stringify(state));
}

let server;
let browser;
try {
  server = await startServer();
  browser = await launchBrowser();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ru-RU' });
  await sandbox(desktop);
  const desktopPage = await desktop.newPage();
  const desktopErrors = [];
  captureErrors(desktopPage, desktopErrors, 'desktop');
  await waitHeader(desktopPage);
  await layoutChecks(desktopPage, 'desktop', 60);
  await contextChecks(desktopPage);
  check('desktop: no page/console errors', desktopErrors.length === 0, desktopErrors.join(' | '));
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  await sandbox(mobile);
  const mobilePage = await mobile.newPage();
  const mobileErrors = [];
  captureErrors(mobilePage, mobileErrors, 'mobile');
  await mobile.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await waitHeader(mobilePage);
  await layoutChecks(mobilePage, 'mobile', 56);
  await mobilePage.locator('[data-menu-button]').click();
  check('mobile: navigation menu opens', await mobilePage.locator('[data-mobile-panel]').isVisible());
  await mobilePage.locator('[data-menu-button]').click();
  check('mobile: navigation menu closes', !(await mobilePage.locator('[data-mobile-panel]').isVisible()));
  check('mobile: no page/console errors', mobileErrors.length === 0, mobileErrors.join(' | '));
  await mobile.close();

  if (failures.length) {
    console.error(`CBW HEADER BROWSER SMOKE: FAIL (${failures.length}/${checks})`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`CBW HEADER BROWSER SMOKE: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW HEADER BROWSER SMOKE: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stopServer(server);
}
