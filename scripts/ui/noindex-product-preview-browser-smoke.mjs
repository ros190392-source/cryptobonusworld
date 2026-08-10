#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const PORT = 4493;
const BASE = `http://127.0.0.1:${PORT}`;
const TYPES = Object.freeze({
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon',
  '.woff':'font/woff','.woff2':'font/woff2','.xml':'application/xml; charset=utf-8',
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
      res.writeHead(200, { 'content-type':'text/plain; charset=utf-8', 'cache-control':'no-store' });
      res.end('ip=203.0.113.10\nloc=BG\ntls=TLSv1.3\n');
      return;
    }
    const file = fileFor(req.url ?? '/');
    if (!file) { res.writeHead(404, { 'content-type':'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control':'no-store' });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).pipe(res);
  });
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(PORT, '127.0.0.1', ok); });
  return server;
}

function captureErrors(page, bucket) {
  page.on('pageerror', error => bucket.push(`pageerror:${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/i.test(message.text())) bucket.push(`console:${message.text()}`);
  });
}

async function commonNoindexChecks(page, label, viewport) {
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  check(`${label}: remains noindex`, /\bnoindex\b/i.test(robots ?? ''), `robots=${robots}`);
  check(`${label}: country family`, await page.locator('[data-page-family="country"]').count() === 1);
  check(`${label}: country first viewport`, await page.locator('[data-first-screen-family="country"]').count() === 1);
  check(`${label}: one H1`, await page.locator('h1').count() === 1);
  check(`${label}: no sponsored action`, await page.locator('a[rel~="sponsored"]').count() === 0);
  check(`${label}: no /go link`, await page.locator('a[href^="/go/"]').count() === 0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${label}: no horizontal overflow`, overflow <= 1, `overflow=${overflow}`);
  const firstUseful = await page.locator('.cbw-section').first().boundingBox();
  check(`${label}: first useful section begins in viewport`, Boolean(firstUseful) && firstUseful.y < viewport.height, `y=${firstUseful?.y} viewport=${viewport.height}`);
}

async function checkKazakhstanHub(browser, viewport, viewportLabel) {
  const context = await browser.newContext({ viewport, locale:'en-US' });
  await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  const page = await context.newPage();
  const errors = [];
  captureErrors(page, errors);
  const response = await page.goto(`${BASE}/countries/kazakhstan/`, { waitUntil:'domcontentloaded', timeout:15000 });
  const label = `kz hub ${viewportLabel}`;

  check(`${label}: HTTP 200`, response?.status() === 200, `status=${response?.status()}`);
  await commonNoindexChecks(page, label, viewport);
  check(`${label}: Kazakhstan flag visible`, (await page.locator('.country-fixed-identity > span').textContent())?.trim() === '🇰🇿');
  const bodyText = await page.locator('body').innerText();
  check(`${label}: local ranking under review`, bodyText.includes('Local ranking under review'));
  check(`${label}: zero approved ranking rows stated`, bodyText.includes('0 approved ranking rows'));

  const cards = page.locator('[data-country-candidate-grid] [data-country-candidate]');
  check(`${label}: exactly three candidate cards`, await cards.count() === 3, `count=${await cards.count()}`);
  check(`${label}: all cards non-ranked`, await cards.locator('.candidate-rank').count() === 3 && (await cards.locator('.candidate-rank').allTextContents()).every(text => text.trim() === 'Non-ranked'));
  check(`${label}: OKX blocked state retained`, await page.locator('[data-country-candidate="okx"][data-candidate-state="blocked"]').count() === 1);
  check(`${label}: no internal governance dashboard copy`, !/authorization flags|candidate claims|package id|ranking readiness/i.test(bodyText));
  check(`${label}: review details collapsed`, await page.locator('[data-country-review-details][open]').count() === 0);
  check(`${label}: no errors`, errors.length === 0, errors.join(' | '));
  await context.close();
}

async function checkPassport(browser, slug, name, viewport, viewportLabel) {
  const context = await browser.newContext({ viewport, locale:'en-US' });
  await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  const page = await context.newPage();
  const errors = [];
  captureErrors(page, errors);
  const path = `/countries/kazakhstan/exchanges/${slug}/`;
  const response = await page.goto(`${BASE}${path}`, { waitUntil:'domcontentloaded', timeout:15000 });
  const label = `kz ${slug} ${viewportLabel}`;

  check(`${label}: HTTP 200`, response?.status() === 200, `status=${response?.status()}`);
  await commonNoindexChecks(page, label, viewport);
  check(`${label}: passport marker`, await page.locator(`[data-country-exchange-passport="${slug}"]`).count() === 1);
  check(`${label}: H1 identity`, (await page.locator('h1').textContent())?.trim() === `${name} in Kazakhstan`);
  check(`${label}: ranking position none`, await page.locator('[data-ranking-position="none"]').count() === 1);
  check(`${label}: nine evidence dimensions`, await page.locator('.passport-dimension').count() === 9, `count=${await page.locator('.passport-dimension').count()}`);
  check(`${label}: review details collapsed`, await page.locator('[data-passport-review-details][open]').count() === 0);
  const bodyText = await page.locator('body').innerText();
  check(`${label}: no internal governance dashboard copy`, !/authorization flags|candidate claims|contentpackage|source packets|ranking readiness/i.test(bodyText));
  check(`${label}: public authority stays no`, /Public authority\s+No/i.test(bodyText.replace(/\s+/g, ' ')));
  if (slug === 'okx') check(`${label}: OKX remains blocked`, await page.locator('[data-candidate-state="blocked"]').count() === 1);
  check(`${label}: no errors`, errors.length === 0, errors.join(' | '));
  await context.close();
}

let server;
let browser;
try {
  server = await startServer();
  try { browser = await chromium.launch({ headless:true, channel:'chrome' }); }
  catch { browser = await chromium.launch({ headless:true }); }

  for (const config of [
    { label:'desktop', viewport:{ width:1440, height:900 } },
    { label:'mobile', viewport:{ width:390, height:844 } },
  ]) {
    await checkKazakhstanHub(browser, config.viewport, config.label);
    await checkPassport(browser, 'binance', 'Binance', config.viewport, config.label);
    await checkPassport(browser, 'bybit', 'Bybit', config.viewport, config.label);
    await checkPassport(browser, 'okx', 'OKX', config.viewport, config.label);
  }

  if (failures.length) {
    console.error(`CBW NOINDEX PRODUCT PREVIEW: FAIL (${failures.length}/${checks})`);
    failures.forEach(failure => console.error(` - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`CBW NOINDEX PRODUCT PREVIEW: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW NOINDEX PRODUCT PREVIEW: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  if (server) {
    server.closeAllConnections?.();
    await new Promise(resolveClose => server.close(resolveClose)).catch(() => {});
  }
}
