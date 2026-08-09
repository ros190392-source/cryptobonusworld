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
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
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
  if (!existsSync(DIST)) throw new Error('dist missing; run build first');
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
  page.on('pageerror', e => bucket.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') bucket.push(`console.error: ${m.text()}`); });
}

async function homepageChecks(browser, viewport, label, maxTop10Y) {
  const context = await browser.newContext({ viewport, locale: 'en-US' });
  await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  const page = await context.newPage();
  const errors = [];
  captureErrors(page, errors);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('[data-site-header]')?.dataset.countryContext === 'BG');
  await page.waitForFunction(() => document.querySelector('[data-home-country-name]')?.textContent?.trim() === 'Bulgaria');

  check(`${label}: Bulgaria flag visible`, (await page.locator('[data-home-country-flag]').textContent())?.trim() === '🇧🇬');
  check(`${label}: Bulgaria market name visible`, (await page.locator('[data-home-country-name]').textContent())?.trim() === 'Bulgaria');
  check(`${label}: local ranking remains under review`, (await page.locator('[data-home-ranking-state]').textContent())?.includes('Local ranking under review'));
  const top10 = await page.locator('#exchanges').boundingBox();
  check(`${label}: Top 10 rendered`, Boolean(top10));
  if (top10) check(`${label}: Top 10 starts near first viewport`, top10.y <= maxTop10Y, `y=${top10.y}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${label}: no horizontal overflow`, overflow <= 1, `overflow=${overflow}`);
  check(`${label}: no page/console errors`, errors.length === 0, errors.join(' | '));
  await context.close();
}

async function methodologyChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  captureErrors(page, errors);
  await page.goto(`${BASE}/methodology/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const header = await page.locator('[data-site-header]').boundingBox();
  const hero = await page.locator('.page-hero').boundingBox();
  const inner = await page.locator('.page-hero__inner').boundingBox();
  check('methodology: header/hero rendered', Boolean(header && hero && inner));
  if (header && hero) check('methodology: hero does not sit under sticky header', hero.y >= header.y + header.height - 1, `headerBottom=${header.y + header.height}, heroTop=${hero.y}`);
  if (hero && inner) {
    check('methodology: hero content top not clipped', inner.y >= hero.y - 1, `innerTop=${inner.y}, heroTop=${hero.y}`);
    check('methodology: hero content bottom not clipped', inner.y + inner.height <= hero.y + hero.height + 1, `innerBottom=${inner.y + inner.height}, heroBottom=${hero.y + hero.height}`);
  }
  check('methodology: no page/console errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

let server;
let browser;
try {
  server = await startServer();
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch { browser = await chromium.launch({ headless: true }); }

  await homepageChecks(browser, { width: 1440, height: 900 }, 'desktop', 430);
  await homepageChecks(browser, { width: 390, height: 844 }, 'mobile', 520);
  await methodologyChecks(browser);

  if (failures.length) {
    console.error(`CBW RANKING-FIRST UI: FAIL (${failures.length}/${checks})`);
    failures.forEach(f => console.error(` - ${f}`));
    process.exitCode = 1;
  } else {
    console.log(`CBW RANKING-FIRST UI: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW RANKING-FIRST UI: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  if (server) {
    server.closeAllConnections?.();
    await new Promise(resolveClose => server.close(resolveClose)).catch(() => {});
  }
}
