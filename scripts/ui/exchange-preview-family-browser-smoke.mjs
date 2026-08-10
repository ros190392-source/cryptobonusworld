#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const PREVIEW_ROOT = resolve(DIST, 'preview', 'exchanges');
const PORT = 4494;
const BASE = `http://127.0.0.1:${PORT}`;
const EXPECTED_EXCHANGE_PREVIEWS = 20;
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

function discoverSlugs() {
  if (!existsSync(PREVIEW_ROOT)) return [];
  return readdirSync(PREVIEW_ROOT, { withFileTypes:true })
    .filter(entry => entry.isDirectory() && !['all','batch-01'].includes(entry.name))
    .filter(entry => existsSync(resolve(PREVIEW_ROOT, entry.name, 'index.html')))
    .map(entry => entry.name)
    .sort();
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
    res.writeHead(200, { 'content-type':TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control':'no-store' });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).pipe(res);
  });
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(PORT, '127.0.0.1', ok); });
  return server;
}

function captureErrors(page, errors) {
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('pageerror', error => errors.push(`pageerror:${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/i.test(message.text())) errors.push(`console:${message.text()}`);
  });
}

async function common(page, label, family, firstFamily) {
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  check(`${label}: noindex`, /\bnoindex\b/i.test(robots ?? ''), `robots=${robots}`);
  check(`${label}: Product System family ${family}`, await page.locator(`[data-page-family="${family}"]`).count() === 1);
  check(`${label}: first viewport ${firstFamily}`, await page.locator(`[data-first-screen-family="${firstFamily}"]`).count() === 1);
  check(`${label}: one H1`, await page.locator('h1').count() === 1);
  check(`${label}: no /go links`, await page.locator('a[href^="/go/"]').count() === 0);
  check(`${label}: no sponsored actions`, await page.locator('a[rel~="sponsored"]').count() === 0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${label}: no horizontal overflow`, overflow <= 1, `overflow=${overflow}`);
}

async function inspectPreview(page, slug, viewport, viewportLabel) {
  const errors = [];
  captureErrors(page, errors);
  const response = await page.goto(`${BASE}/preview/exchanges/${slug}/`, { waitUntil:'domcontentloaded', timeout:15000 });
  const label = `${slug} ${viewportLabel}`;
  check(`${label}: HTTP 200`, response?.status() === 200, `status=${response?.status()}`);
  await common(page, label, 'exchange', 'exchange');
  check(`${label}: preview marker`, await page.locator(`[data-preview-exchange="${slug}"][data-preview-commercial="false"]`).count() === 1);
  check(`${label}: four neutral checks`, await page.locator('[data-preview-check-grid] .preview-check').count() === 4);
  check(`${label}: disabled commercial state`, await page.locator('[data-preview-primary][aria-disabled="true"]').count() === 1);
  check(`${label}: details collapsed`, await page.locator('[data-preview-review-details][open]').count() === 0);
  check(`${label}: old preview factory DOM removed`, await page.locator('.brand-hero,.pv-banner,.bh-promo-row,.bh-cta-btn').count() === 0);
  const bodyText = await page.locator('body').innerText();
  check(`${label}: no claim-bearing verified offer`, !/verified offer|claim bonus|get bonus now/i.test(bodyText));
  const firstSection = await page.locator('.cbw-section').first().boundingBox();
  check(`${label}: first useful section in viewport`, Boolean(firstSection) && firstSection.y < viewport.height, `y=${firstSection?.y} viewport=${viewport.height}`);
  check(`${label}: no page/console errors`, errors.length === 0, errors.join(' | '));
}

async function inspectHub(page, hubId, expectedCards, viewport, viewportLabel) {
  const errors = [];
  captureErrors(page, errors);
  const path = hubId === 'all' ? '/preview/exchanges/all/' : '/preview/exchanges/batch-01/';
  const response = await page.goto(`${BASE}${path}`, { waitUntil:'domcontentloaded', timeout:15000 });
  const label = `hub ${hubId} ${viewportLabel}`;
  check(`${label}: HTTP 200`, response?.status() === 200, `status=${response?.status()}`);
  await common(page, label, 'directory', 'directory');
  check(`${label}: hub marker`, await page.locator(`[data-exchange-preview-hub="${hubId}"]`).count() === 1);
  check(`${label}: exact card count`, await page.locator('[data-preview-hub-grid] [data-preview-hub-card]').count() === expectedCards, `count=${await page.locator('[data-preview-hub-grid] [data-preview-hub-card]').count()}`);
  check(`${label}: every card links only to preview exchange`, await page.locator('[data-preview-hub-card] > a[href^="/preview/exchanges/"]').count() === expectedCards);
  const bodyText = await page.locator('body').innerText();
  check(`${label}: neutral commercial copy`, !/verified offer|claim bonus|get bonus now/i.test(bodyText));
  check(`${label}: legacy admin hub DOM removed`, await page.locator('.ah-warn,.ah-filters,.hub-warn,.hub-hero').count() === 0);
  const firstSection = await page.locator('.cbw-section').first().boundingBox();
  check(`${label}: first useful section in viewport`, Boolean(firstSection) && firstSection.y < viewport.height, `y=${firstSection?.y} viewport=${viewport.height}`);
  check(`${label}: no page/console errors`, errors.length === 0, errors.join(' | '));
}

let server;
let browser;
try {
  const slugs = discoverSlugs();
  check('preview family: exactly 20 exchange routes discovered', slugs.length === EXPECTED_EXCHANGE_PREVIEWS, `count=${slugs.length} slugs=${slugs.join(',')}`);
  server = await startServer();
  try { browser = await chromium.launch({ headless:true, channel:'chrome' }); }
  catch { browser = await chromium.launch({ headless:true }); }

  for (const config of [
    { label:'desktop', viewport:{ width:1440, height:900 } },
    { label:'mobile', viewport:{ width:390, height:844 } },
  ]) {
    const context = await browser.newContext({ viewport:config.viewport, locale:'en-US' });
    await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
    const page = await context.newPage();
    await inspectHub(page, 'batch-01', 10, config.viewport, config.label);
    await inspectHub(page, 'all', 20, config.viewport, config.label);
    for (const slug of slugs) await inspectPreview(page, slug, config.viewport, config.label);
    await context.close();
  }

  if (failures.length) {
    console.error(`CBW EXCHANGE PREVIEW FAMILY: FAIL (${failures.length}/${checks})`);
    failures.forEach(failure => console.error(` - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`CBW EXCHANGE PREVIEW FAMILY: PASS (${checks}/${checks})`);
    console.log(`CBW EXCHANGE PREVIEW ROUTES: ${slugs.join(', ')}`);
    console.log('CBW EXCHANGE PREVIEW HUBS: batch-01=10, all=20');
  }
} catch (error) {
  console.error('CBW EXCHANGE PREVIEW FAMILY: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  if (server) {
    server.closeAllConnections?.();
    await new Promise(resolveClose => server.close(resolveClose)).catch(() => {});
  }
}
