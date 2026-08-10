#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const PORT = 4497;
const BASE = `http://127.0.0.1:${PORT}`;
const EXPECTED_PRODUCT_ROUTES = 46;
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

function findHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes:true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) findHtml(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}
function routeForFile(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404.html';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0,-'index.html'.length)}`;
  return `/${rel}`;
}
function discoverProductRoutes() {
  return findHtml(DIST)
    .map(file => ({ file, route:routeForFile(file), html:readFileSync(file,'utf8') }))
    .filter(row => !row.route.startsWith('/__design/'))
    .filter(row => /data-page-family=["'][^"']+["']/i.test(row.html))
    .map(row => row.route)
    .sort();
}
function fileFor(requestUrl) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(requestUrl, BASE).pathname); } catch { return null; }
  const rel = pathname.replace(/^\/+/, '');
  let candidate = resolve(DIST, rel);
  if (pathname.endsWith('/')) candidate = resolve(candidate, 'index.html');
  else if (!extname(candidate) && !(existsSync(candidate) && statSync(candidate).isFile())) candidate = resolve(candidate,'index.html');
  if (candidate !== DIST && !candidate.startsWith(`${DIST}${sep}`)) return null;
  return existsSync(candidate) && statSync(candidate).isFile() ? candidate : null;
}
async function startServer() {
  const server = createServer((req,res) => {
    if ((req.url ?? '').startsWith('/cdn-cgi/trace')) {
      res.writeHead(200, {'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});
      res.end('ip=203.0.113.10\nloc=BG\ntls=TLSv1.3\n');
      return;
    }
    const file = fileFor(req.url ?? '/');
    if (!file) { res.writeHead(404, {'content-type':'text/plain'}); res.end('Not found'); return; }
    res.writeHead(200, {'content-type':TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream','cache-control':'no-store'});
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).pipe(res);
  });
  await new Promise((ok,fail) => { server.once('error',fail); server.listen(PORT,'127.0.0.1',ok); });
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

async function inspect(page, route, viewport, viewportLabel) {
  const errors = [];
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('pageerror', error => errors.push(`pageerror:${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/i.test(message.text())) errors.push(`console:${message.text()}`);
  });
  const response = await page.goto(`${BASE}${route}`, { waitUntil:'domcontentloaded', timeout:15000 });
  const label = `${route} ${viewportLabel}`;
  check(`${label}: HTTP 200`, response?.status() === 200, `status=${response?.status()}`);

  const result = await page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const accessibleText = (el) => {
      const aria = el.getAttribute('aria-label')?.trim();
      if (aria) return aria;
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const value = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim() ?? '').join(' ').trim();
        if (value) return value;
      }
      const title = el.getAttribute('title')?.trim();
      if (title) return title;
      const text = el.textContent?.replace(/\s+/g,' ').trim();
      if (text) return text;
      if (el instanceof HTMLAnchorElement) {
        const imageAlt = el.querySelector('img[alt]')?.getAttribute('alt')?.trim();
        if (imageAlt) return imageAlt;
      }
      return '';
    };
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id).filter(Boolean);
    const duplicateIds = [...new Set(ids.filter((id,index) => ids.indexOf(id) !== index))];
    const imagesMissingAlt = [...document.querySelectorAll('img')].filter(img => !img.hasAttribute('alt')).map(img => img.getAttribute('src') ?? '<unknown>');
    const unnamedLinks = [...document.querySelectorAll('a[href]')].filter(el => visible(el) && accessibleText(el) === '').map(el => el.getAttribute('href'));
    const unnamedButtons = [...document.querySelectorAll('button')].filter(el => visible(el) && accessibleText(el) === '').map(el => el.outerHTML.slice(0,120));
    const unlabeledControls = [...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(el => {
      if (!visible(el)) return false;
      if (el.getAttribute('aria-label')?.trim() || el.getAttribute('aria-labelledby')?.trim()) return false;
      if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
      if (el.closest('label')) return false;
      return true;
    }).map(el => `${el.tagName.toLowerCase()}[name=${el.getAttribute('name') ?? ''}]`);
    const detailsWithoutSummary = [...document.querySelectorAll('details')].filter(el => !el.querySelector(':scope > summary')).length;
    const mainCount = document.querySelectorAll('main').length;
    const headerCount = document.querySelectorAll('[data-site-header]').length;
    const footerCount = document.querySelectorAll('[data-site-footer]').length;
    const pageFamilyCount = document.querySelectorAll('[data-page-family]').length;
    const h1Count = document.querySelectorAll('h1').length;
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return { duplicateIds, imagesMissingAlt, unnamedLinks, unnamedButtons, unlabeledControls, detailsWithoutSummary, mainCount, headerCount, footerCount, pageFamilyCount, h1Count, overflow };
  });

  check(`${label}: one main landmark`, result.mainCount === 1, `count=${result.mainCount}`);
  check(`${label}: one site header`, result.headerCount === 1, `count=${result.headerCount}`);
  check(`${label}: one site footer`, result.footerCount === 1, `count=${result.footerCount}`);
  check(`${label}: one Product System family marker`, result.pageFamilyCount === 1, `count=${result.pageFamilyCount}`);
  check(`${label}: one H1`, result.h1Count === 1, `count=${result.h1Count}`);
  check(`${label}: unique IDs`, result.duplicateIds.length === 0, result.duplicateIds.join(','));
  check(`${label}: every image has alt attribute`, result.imagesMissingAlt.length === 0, result.imagesMissingAlt.join(','));
  check(`${label}: visible links have accessible names`, result.unnamedLinks.length === 0, result.unnamedLinks.join(','));
  check(`${label}: visible buttons have accessible names`, result.unnamedButtons.length === 0, result.unnamedButtons.join(' | '));
  check(`${label}: visible form controls are labelled`, result.unlabeledControls.length === 0, result.unlabeledControls.join(','));
  check(`${label}: every details has summary`, result.detailsWithoutSummary === 0, `count=${result.detailsWithoutSummary}`);
  check(`${label}: no horizontal overflow`, result.overflow <= 1, `overflow=${result.overflow}`);

  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement) || el === document.body) return { ok:false, tag:el?.tagName ?? 'none' };
    const rect = el.getBoundingClientRect();
    return { ok:rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden', tag:el.tagName };
  });
  check(`${label}: keyboard reaches visible interactive element`, focus.ok, `active=${focus.tag}`);
  check(`${label}: no page/console errors`, errors.length === 0, errors.join(' | '));
}

let server; let browser;
try {
  const routes = discoverProductRoutes();
  check('accessibility: exactly 46 Product System routes discovered', routes.length === EXPECTED_PRODUCT_ROUTES, `count=${routes.length}`);
  server = await startServer();
  try { browser = await chromium.launch({ headless:true, channel:'chrome' }); }
  catch { browser = await chromium.launch({ headless:true }); }

  for (const config of [
    { label:'desktop', viewport:{ width:1440, height:900 } },
    { label:'mobile', viewport:{ width:390, height:844 } },
  ]) {
    const context = await browser.newContext({ viewport:config.viewport, locale:'en-US' });
    await sandbox(context);
    await context.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
    const page = await context.newPage();
    for (const route of routes) await inspect(page, route, config.viewport, config.label);
    await context.close();
  }

  if (failures.length) {
    console.error(`CBW STRUCTURAL ACCESSIBILITY: FAIL (${failures.length}/${checks})`);
    failures.forEach(failure => console.error(` - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`CBW STRUCTURAL ACCESSIBILITY: PASS (${checks}/${checks})`);
    console.log(`CBW ACCESSIBILITY ROUTES: ${routes.length} Product System surfaces × desktop/mobile`);
  }
} catch (error) {
  console.error('CBW STRUCTURAL ACCESSIBILITY: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  if (server) {
    server.closeAllConnections?.();
    await new Promise(resolveClose => server.close(resolveClose)).catch(() => {});
  }
}
