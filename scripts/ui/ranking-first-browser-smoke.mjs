#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const PORT = 4491;
const BASE = `http://127.0.0.1:${PORT}`;
const TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8',
});

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

function fileFor(requestUrl) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(requestUrl, BASE).pathname); } catch { return null; }
  const rel = pathname.replace(/^\/+/, '');
  let candidate = resolve(DIST, rel);
  if (pathname.endsWith('/')) candidate = resolve(candidate, 'index.html');
  else if (!extname(candidate) && !(existsSync(candidate) && statSync(candidate).isFile())) candidate = resolve(candidate, 'index.html');
  if (candidate !== DIST && !candidate.startsWith(`${DIST}${sep}`)) return null;
  return existsSync(candidate) && statSync(candidate).isFile() ? candidate : null;
}

async function startServer() {
  const server = createServer((req, res) => {
    if ((req.url ?? '').startsWith('/cdn-cgi/trace')) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('ip=203.0.113.10\nloc=BG\ntls=TLSv1.3\n');
      return;
    }
    const file = fileFor(req.url ?? '/');
    if (!file) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).pipe(res);
  });
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(PORT, '127.0.0.1', ok); });
  return server;
}

function captureErrors(page, bucket) {
  page.on('pageerror', error => bucket.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') bucket.push(`console.error: ${message.text()}`); });
}

async function openPage(browser, route, viewport) {
  const context = await browser.newContext({ viewport, locale: 'en-US' });
  await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  const page = await context.newPage();
  const errors = [];
  captureErrors(page, errors);
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  return { context, page, errors };
}

async function homepageChecks(browser, viewport, label, maxTop10Y) {
  const { context, page, errors } = await openPage(browser, '/', viewport);
  await page.waitForFunction(() => document.querySelector('[data-site-header]')?.dataset.countryContext === 'BG');
  await page.waitForFunction(() => document.querySelector('[data-home-country-name]')?.textContent?.trim() === 'Bulgaria');
  await page.waitForFunction(() => document.querySelector('[data-footer-country]')?.textContent?.includes('Bulgaria'));

  check(`${label}: Bulgaria market context`, (await page.locator('[data-home-country-name]').textContent())?.trim() === 'Bulgaria');
  check(`${label}: Bulgaria flag`, (await page.locator('[data-home-country-flag]').textContent())?.trim() === '🇧🇬');
  check(`${label}: local ranking remains under review`, (await page.locator('[data-home-ranking-state]').textContent())?.includes('Local ranking under review'));
  check(`${label}: footer mirrors country`, (await page.locator('[data-footer-country]').textContent())?.trim() === '🇧🇬 Bulgaria');

  const headerShell = await page.locator('.header-shell').boundingBox();
  const footerShell = await page.locator('.footer-shell').boundingBox();
  check(`${label}: header/footer shells rendered`, Boolean(headerShell && footerShell));
  if (headerShell && footerShell) {
    check(`${label}: shell left edge aligned`, Math.abs(headerShell.x - footerShell.x) <= 1);
    check(`${label}: shell width aligned`, Math.abs(headerShell.width - footerShell.width) <= 1);
  }

  const top10 = await page.locator('#exchanges').boundingBox();
  check(`${label}: Top 10 rendered`, Boolean(top10));
  if (top10) check(`${label}: Top 10 near first viewport`, top10.y <= maxTop10Y, `y=${top10.y}`);
  const cards = page.locator('.exchange-card');
  check(`${label}: exactly ten exchange cards`, await cards.count() === 10);
  check(`${label}: every card has title`, await cards.locator('.exchange-name h3').count() === 10);
  check(`${label}: every card has best-for`, await cards.locator('.card-fit').count() === 10);
  check(`${label}: evidence collapsed by default`, await cards.locator('.evidence-details[open]').count() === 0);
  check(`${label}: every card has actions`, await cards.locator('.card-actions').count() === 10);

  const first = await cards.first().boundingBox();
  const second = await cards.nth(1).boundingBox();
  if (first && second) {
    if (label === 'desktop') check('desktop: card grid two-column', Math.abs(first.y - second.y) <= 2 && second.x > first.x);
    else check('mobile: card grid one-column', second.y > first.y + 10 && Math.abs(first.x - second.x) <= 2);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${label}: no horizontal overflow`, overflow <= 1, `overflow=${overflow}`);
  check(`${label}: no page/console errors`, errors.length === 0, errors.join(' | '));
  await context.close();
}

async function faqChecks(browser, viewport, label) {
  const { context, page, errors } = await openPage(browser, '/faq/', viewport);
  check(`faq ${label}: one H1`, await page.locator('h1').count() === 1);
  check(`faq ${label}: trust family`, await page.locator('[data-page-family="trust"]').count() === 1);
  check(`faq ${label}: canonical FAQ`, await page.locator('[data-faq-groups]').count() === 1);
  check(`faq ${label}: twenty items`, await page.locator('.cbw-faq-item').count() === 20);
  check(`faq ${label}: collapsed initially`, await page.locator('.cbw-faq-item[open]').count() === 0);
  const prose = await page.locator('#faq .cbw-container--prose').boundingBox();
  if (prose && label === 'desktop') check('faq desktop: prose width 760', Math.abs(prose.width - 760) <= 1, `width=${prose.width}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`faq ${label}: no overflow`, overflow <= 1, `overflow=${overflow}`);
  check(`faq ${label}: no errors`, errors.length === 0, errors.join(' | '));
  await context.close();
}

async function trustPageChecks(browser, route, viewport, label) {
  const { context, page, errors } = await openPage(browser, route, viewport);
  check(`${route} ${label}: one H1`, await page.locator('h1').count() === 1);
  check(`${route} ${label}: trust PageFrame`, await page.locator('[data-page-family="trust"]').count() === 1);
  check(`${route} ${label}: trust FirstViewport`, await page.locator('[data-first-screen-family="trust"]').count() === 1);
  check(`${route} ${label}: legacy image hero absent`, await page.locator('.page-hero').count() === 0);

  const header = await page.locator('[data-site-header]').boundingBox();
  const hero = await page.locator('[data-first-screen-family="trust"]').boundingBox();
  check(`${route} ${label}: header/hero rendered`, Boolean(header && hero));
  if (header && hero) check(`${route} ${label}: hero below sticky header`, hero.y >= header.y + header.height - 1, `headerBottom=${header.y + header.height}, heroTop=${hero.y}`);

  const prose = await page.locator('.cbw-container--prose').first().boundingBox();
  check(`${route} ${label}: prose container exists`, Boolean(prose));
  if (prose && label === 'desktop') check(`${route} desktop: prose width 760`, Math.abs(prose.width - 760) <= 1, `width=${prose.width}`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${route} ${label}: no overflow`, overflow <= 1, `overflow=${overflow}`);
  check(`${route} ${label}: no errors`, errors.length === 0, errors.join(' | '));
  await context.close();
}

let server;
let browser;
try {
  server = await startServer();
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch { browser = await chromium.launch({ headless: true }); }

  const desktop = { width: 1440, height: 900 };
  const mobile = { width: 390, height: 844 };
  await homepageChecks(browser, desktop, 'desktop', 430);
  await homepageChecks(browser, mobile, 'mobile', 520);
  await faqChecks(browser, desktop, 'desktop');
  await faqChecks(browser, mobile, 'mobile');

  for (const route of ['/about/','/methodology/','/editorial-policy/','/update-policy/']) {
    await trustPageChecks(browser, route, desktop, 'desktop');
    await trustPageChecks(browser, route, mobile, 'mobile');
  }

  if (failures.length) {
    console.error(`CBW PRODUCT UI: FAIL (${failures.length}/${checks})`);
    failures.forEach(failure => console.error(` - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`CBW PRODUCT UI: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW PRODUCT UI: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  if (server) {
    server.closeAllConnections?.();
    await new Promise(resolveClose => server.close(resolveClose)).catch(() => {});
  }
}
