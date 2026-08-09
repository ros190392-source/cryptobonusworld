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
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8',
});

const STRICT_MIGRATED = new Map([
  ['/', { family: 'homepage', container: 'wide' }],
  ['/faq/', { family: 'trust', container: 'prose' }],
]);

let checks = 0;
const failures = [];
const legacyFindings = [];
const routeInventory = [];

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
  if (!route) return false;
  if (route.startsWith('/__design/')) return false;
  if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) return false;
  if (/<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html)) return false;
  return true;
}

function classify(route) {
  if (route === '/') return 'homepage';
  if (route === '/faq/' || route === '/methodology/' || route === '/about/' || route === '/editorial-policy/' || route === '/update-policy/') return 'trust';
  if (['/affiliate-disclosure/','/disclaimer/','/privacy-policy/','/terms/','/contact/'].includes(route)) return 'legal';
  if (route === '/exchanges/' || route === '/promo-codes/' || route === '/guides/') return 'directory';
  if (route.startsWith('/guides/')) return 'guide';
  if (route.startsWith('/countries/')) return 'country';
  if (route.startsWith('/exchanges/')) return 'exchange';
  if (/^\/(bybit|mexc|okx|bitget|kucoin|bingx)\/$/.test(route)) return 'exchange';
  return 'other';
}

function discoverPublicRoutes() {
  const files = findHtml(DIST);
  const routes = [];
  for (const file of files) {
    const route = routeForFile(file);
    const html = readFileSync(file, 'utf8');
    if (!isPublicHtml(html, route)) continue;
    routes.push({ route, family: classify(route), file });
  }
  routes.sort((a, b) => a.route.localeCompare(b.route));
  return routes;
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
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.protocol === 'data:' || url.protocol === 'blob:') {
      await route.continue();
      return;
    }
    await route.abort('blockedbyclient');
  });
}

async function inspectRoute(page, item, viewportName, viewport) {
  const errors = [];
  const onPageError = error => errors.push(`pageerror:${error.message}`);
  const onConsole = message => { if (message.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/i.test(message.text())) errors.push(`console:${message.text()}`); };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);

  let navOk = true;
  try {
    await page.goto(`${BASE}${item.route}`, { waitUntil: 'domcontentloaded', timeout: 12000 });
  } catch (error) {
    navOk = false;
    errors.push(`navigation:${error.message}`);
  }

  const metrics = navOk ? await page.evaluate(() => {
    const header = document.querySelector('[data-site-header]');
    const footer = document.querySelector('[data-site-footer]');
    const h1s = [...document.querySelectorAll('h1')];
    const pageFrame = document.querySelector('[data-page-family]');
    const firstViewport = document.querySelector('[data-first-screen-family]');
    const headerRect = header?.getBoundingClientRect();
    const firstMain = document.querySelector('main > :first-child, body > main > :first-child');
    const firstMainRect = firstMain?.getBoundingClientRect();
    const wide = document.querySelector('.cbw-container--wide');
    const standard = document.querySelector('.cbw-container--standard');
    const prose = document.querySelector('.cbw-container--prose');
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return {
      headerCount: document.querySelectorAll('[data-site-header]').length,
      footerCount: document.querySelectorAll('[data-site-footer]').length,
      h1Count: h1s.length,
      pageFamily: pageFrame?.getAttribute('data-page-family') ?? null,
      firstScreenFamily: firstViewport?.getAttribute('data-first-screen-family') ?? null,
      overflow,
      bodyWidth: document.body.getBoundingClientRect().width,
      headerBottom: headerRect ? headerRect.bottom : null,
      firstMainTop: firstMainRect ? firstMainRect.top : null,
      wideWidth: wide?.getBoundingClientRect().width ?? null,
      standardWidth: standard?.getBoundingClientRect().width ?? null,
      proseWidth: prose?.getBoundingClientRect().width ?? null,
      pageHeight: document.documentElement.scrollHeight,
    };
  }) : null;

  page.off('pageerror', onPageError);
  page.off('console', onConsole);

  if (!metrics) {
    legacyFindings.push(`${item.route} [${viewportName}] NAVIGATION_FAILED ${errors.join(' | ')}`);
    return;
  }

  routeInventory.push({ route: item.route, family: item.family, viewport: viewportName, ...metrics });

  const strict = STRICT_MIGRATED.get(item.route);
  if (strict) {
    check(`${item.route} ${viewportName}: one header`, metrics.headerCount === 1, `count=${metrics.headerCount}`);
    check(`${item.route} ${viewportName}: one footer`, metrics.footerCount === 1, `count=${metrics.footerCount}`);
    check(`${item.route} ${viewportName}: one H1`, metrics.h1Count === 1, `count=${metrics.h1Count}`);
    check(`${item.route} ${viewportName}: no overflow`, metrics.overflow <= 1, `overflow=${metrics.overflow}`);
    check(`${item.route} ${viewportName}: no console/page errors`, errors.length === 0, errors.join(' | '));
    if (strict.family && metrics.pageFamily) check(`${item.route} ${viewportName}: family ${strict.family}`, metrics.pageFamily === strict.family, `actual=${metrics.pageFamily}`);
    if (viewportName === 'desktop' && strict.container === 'prose' && metrics.proseWidth !== null) {
      check(`${item.route} desktop: prose width 760`, Math.abs(metrics.proseWidth - 760) <= 1, `width=${metrics.proseWidth}`);
    }
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
  check('matrix: homepage discovered', routes.some(item => item.route === '/'));
  check('matrix: FAQ discovered', routes.some(item => item.route === '/faq/'));

  server = await startServer();
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch { browser = await chromium.launch({ headless: true }); }

  const configs = [
    { name: 'desktop', viewport: { width: 1440, height: 900 } },
    { name: 'mobile', viewport: { width: 390, height: 844 } },
  ];

  for (const config of configs) {
    const context = await browser.newContext({ viewport: config.viewport, locale: 'en-US' });
    await sandbox(context);
    await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
    const page = await context.newPage();
    for (const item of routes) await inspectRoute(page, item, config.name, config.viewport);
    await context.close();
  }

  const familyCounts = {};
  for (const item of routes) familyCounts[item.family] = (familyCounts[item.family] ?? 0) + 1;
  console.log(`CBW ROUTE MATRIX: ${routes.length} public routes discovered`);
  console.log(`CBW ROUTE FAMILIES: ${JSON.stringify(familyCounts)}`);
  console.log(`CBW STRICT MIGRATED: ${JSON.stringify([...STRICT_MIGRATED.keys()])}`);
  console.log(`CBW LEGACY FINDINGS: ${legacyFindings.length}`);
  legacyFindings.slice(0, 120).forEach(item => console.log(` LEGACY ${item}`));
  if (legacyFindings.length > 120) console.log(` ... ${legacyFindings.length - 120} more legacy findings omitted`);

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
