#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const PORT = 4492;
const BASE = `http://127.0.0.1:${PORT}`;
const TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8',
});

const STRICT_MIGRATED = new Map([
  ['/', { family: 'homepage' }],
  ['/faq/', { family: 'trust', prose: true }],
  ['/about/', { family: 'trust', prose: true }],
  ['/methodology/', { family: 'trust', prose: true }],
  ['/editorial-policy/', { family: 'trust', prose: true }],
  ['/update-policy/', { family: 'trust', prose: true }],
]);

let checks = 0;
const failures = [];
const legacyFindings = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

function findHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) findHtml(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function routeForFile(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return null;
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function isPublicHtml(html, route) {
  if (!route || route.startsWith('/__design/') || route.startsWith('/preview/')) return false;
  if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) return false;
  if (/<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html)) return false;
  return true;
}

function classify(route) {
  if (route === '/') return 'homepage';
  if (['/faq/','/methodology/','/about/','/editorial-policy/','/update-policy/'].includes(route)) return 'trust';
  if (['/affiliate-disclosure/','/disclaimer/','/privacy-policy/','/terms/','/contact/'].includes(route)) return 'legal';
  if (['/exchanges/','/promo-codes/','/guides/'].includes(route)) return 'directory';
  if (route.startsWith('/guides/')) return 'guide';
  if (route.startsWith('/countries/')) return 'country';
  if (route.startsWith('/exchanges/')) return 'exchange';
  if (/^\/(bybit|mexc|okx|bitget|kucoin|bingx|coinex)\/$/.test(route)) return 'exchange';
  return 'other';
}

function discoverPublicRoutes() {
  return findHtml(DIST)
    .map(file => ({ file, route: routeForFile(file), html: readFileSync(file, 'utf8') }))
    .filter(item => isPublicHtml(item.html, item.route))
    .map(item => ({ route: item.route, family: classify(item.route), file: item.file }))
    .sort((a, b) => a.route.localeCompare(b.route));
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

async function sandbox(context) {
  await context.route('**/*', async route => {
    let url;
    try { url = new URL(route.request().url()); } catch { await route.abort('blockedbyclient'); return; }
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.protocol === 'data:' || url.protocol === 'blob:') await route.continue();
    else await route.abort('blockedbyclient');
  });
}

async function inspectRoute(page, item, viewportName) {
  const errors = [];
  const onPageError = error => errors.push(`pageerror:${error.message}`);
  const onConsole = message => { if (message.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/i.test(message.text())) errors.push(`console:${message.text()}`); };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  let navOk = true;
  try { await page.goto(`${BASE}${item.route}`, { waitUntil: 'domcontentloaded', timeout: 12000 }); }
  catch (error) { navOk = false; errors.push(`navigation:${error.message}`); }

  const metrics = navOk ? await page.evaluate(() => {
    const pageFrame = document.querySelector('[data-page-family]');
    const firstViewport = document.querySelector('[data-first-screen-family]');
    const prose = document.querySelector('.cbw-container--prose');
    return {
      headerCount: document.querySelectorAll('[data-site-header]').length,
      footerCount: document.querySelectorAll('[data-site-footer]').length,
      h1Count: document.querySelectorAll('h1').length,
      pageFamily: pageFrame?.getAttribute('data-page-family') ?? null,
      firstScreenFamily: firstViewport?.getAttribute('data-first-screen-family') ?? null,
      proseWidth: prose?.getBoundingClientRect().width ?? null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }) : null;

  page.off('pageerror', onPageError);
  page.off('console', onConsole);

  if (!metrics) {
    legacyFindings.push(`${item.route} [${viewportName}] NAVIGATION_FAILED ${errors.join(' | ')}`);
    return;
  }

  const strict = STRICT_MIGRATED.get(item.route);
  if (strict) {
    check(`${item.route} ${viewportName}: one header`, metrics.headerCount === 1, `count=${metrics.headerCount}`);
    check(`${item.route} ${viewportName}: one footer`, metrics.footerCount === 1, `count=${metrics.footerCount}`);
    check(`${item.route} ${viewportName}: one H1`, metrics.h1Count === 1, `count=${metrics.h1Count}`);
    check(`${item.route} ${viewportName}: no overflow`, metrics.overflow <= 1, `overflow=${metrics.overflow}`);
    check(`${item.route} ${viewportName}: no errors`, errors.length === 0, errors.join(' | '));
    check(`${item.route} ${viewportName}: family ${strict.family}`, metrics.pageFamily === strict.family, `actual=${metrics.pageFamily}`);
    if (strict.family === 'trust') check(`${item.route} ${viewportName}: trust first viewport`, metrics.firstScreenFamily === 'trust', `actual=${metrics.firstScreenFamily}`);
    if (strict.prose && viewportName === 'desktop') check(`${item.route} desktop: prose 760`, metrics.proseWidth !== null && Math.abs(metrics.proseWidth - 760) <= 1, `width=${metrics.proseWidth}`);
  } else {
    const findings = [];
    if (metrics.headerCount !== 1) findings.push(`header=${metrics.headerCount}`);
    if (metrics.footerCount !== 1) findings.push(`footer=${metrics.footerCount}`);
    if (metrics.h1Count !== 1) findings.push(`h1=${metrics.h1Count}`);
    if (metrics.overflow > 1) findings.push(`overflow=${metrics.overflow}`);
    if (errors.length) findings.push(`errors=${errors.length}`);
    if (!metrics.pageFamily) findings.push('no-product-family');
    if (findings.length) legacyFindings.push(`${item.route} [${viewportName}] ${findings.join(', ')}`);
  }
}

let server;
let browser;
try {
  const routes = discoverPublicRoutes();
  check('matrix: public routes discovered', routes.length > 0, `count=${routes.length}`);
  for (const route of STRICT_MIGRATED.keys()) check(`matrix: strict route ${route} discovered`, routes.some(item => item.route === route));

  server = await startServer();
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch { browser = await chromium.launch({ headless: true }); }

  for (const config of [
    { name: 'desktop', viewport: { width: 1440, height: 900 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
  ]) {
    const context = await browser.newContext({ viewport: config.viewport, locale: 'en-US' });
    await sandbox(context);
    await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
    const page = await context.newPage();
    for (const item of routes) await inspectRoute(page, item, config.name);
    await context.close();
  }

  const familyCounts = {};
  for (const item of routes) familyCounts[item.family] = (familyCounts[item.family] ?? 0) + 1;
  console.log(`CBW ROUTE MATRIX: ${routes.length} public routes discovered`);
  console.log(`CBW ROUTE FAMILIES: ${JSON.stringify(familyCounts)}`);
  console.log(`CBW STRICT MIGRATED: ${JSON.stringify([...STRICT_MIGRATED.keys()])}`);
  console.log(`CBW LEGACY FINDINGS: ${legacyFindings.length}`);
  legacyFindings.slice(0, 120).forEach(item => console.log(` LEGACY ${item}`));

  if (failures.length) {
    console.error(`CBW SITE ROUTE MATRIX: FAIL (${failures.length}/${checks})`);
    failures.forEach(failure => console.error(` - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`CBW SITE ROUTE MATRIX: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('CBW SITE ROUTE MATRIX: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  if (server) {
    server.closeAllConnections?.();
    await new Promise(resolveClose => server.close(resolveClose)).catch(() => {});
  }
}
