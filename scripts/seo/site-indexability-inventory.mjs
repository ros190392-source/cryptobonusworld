#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const ORIGIN = 'https://cryptobonusworld.com';

const EXPECTED_PUBLIC_ROUTES = Object.freeze([
  '/',
  '/about/',
  '/affiliate-disclosure/',
  '/bingx/',
  '/bitget/',
  '/bybit/',
  '/coinex/',
  '/disclaimer/',
  '/editorial-policy/',
  '/exchanges/',
  '/faq/',
  '/kucoin/',
  '/methodology/',
  '/mexc/',
  '/okx/',
  '/privacy-policy/',
  '/promo-codes/',
  '/terms/',
  '/update-policy/',
]);

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

function findFiles(dir, suffix, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) findFiles(full, suffix, out);
    else if (entry.isFile() && entry.name.endsWith(suffix)) out.push(full);
  }
  return out;
}

function routeForHtml(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404.html';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function attrTag(html, name, valuePattern) {
  const tags = html.match(/<(?:meta|link)\b[^>]*>/gi) ?? [];
  return tags.find(tag => new RegExp(`${name}\\s*=\\s*["']${valuePattern}["']`, 'i').test(tag)) ?? null;
}

function getAttribute(tag, name) {
  if (!tag) return null;
  return tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? null;
}

function textBetween(html, tag) {
  return html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';
}

function countTag(html, tag) {
  return (html.match(new RegExp(`<${tag}\\b`, 'gi')) ?? []).length;
}

function canonicalRoute(canonical) {
  if (!canonical) return null;
  try {
    const u = new URL(canonical);
    if (u.origin !== ORIGIN) return null;
    return u.pathname;
  } catch {
    return null;
  }
}

function classify(route, html) {
  if (route === '/404.html') return 'error';
  if (route.startsWith('/__design/')) return 'design';
  if (route.startsWith('/preview/')) return 'preview';
  const robots = getAttribute(attrTag(html, 'name', 'robots'), 'content') ?? '';
  if (/\bnoindex\b/i.test(robots)) return 'noindex';
  return 'public';
}

function readSitemapUrls() {
  const files = existsSync(DIST) ? findFiles(DIST, '.xml') : [];
  const urls = new Set();
  for (const file of files) {
    const name = relative(DIST, file).split(sep).join('/');
    if (!/sitemap/i.test(name)) continue;
    const xml = readFileSync(file, 'utf8');
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const value = match[1]?.trim();
      if (!value) continue;
      try {
        const u = new URL(value);
        if (u.origin === ORIGIN) urls.add(u.pathname);
      } catch {}
    }
  }
  return urls;
}

if (!existsSync(DIST)) {
  console.error('CBW INDEXABILITY INVENTORY: ERROR — dist missing; run production build first.');
  process.exit(1);
}

const htmlFiles = findFiles(DIST, '.html');
const rows = htmlFiles.map(file => {
  const route = routeForHtml(file);
  const html = readFileSync(file, 'utf8');
  const robotsTag = attrTag(html, 'name', 'robots');
  const robots = getAttribute(robotsTag, 'content');
  const canonicalTag = attrTag(html, 'rel', 'canonical');
  const canonical = getAttribute(canonicalTag, 'href');
  const title = textBetween(html, 'title');
  const h1Count = countTag(html, 'h1');
  const pageFamily = html.match(/data-page-family=["']([^"']+)["']/i)?.[1] ?? null;
  return {
    route,
    state: classify(route, html),
    robots,
    canonical,
    canonicalRoute: canonicalRoute(canonical),
    title,
    h1Count,
    pageFamily,
  };
}).sort((a, b) => a.route.localeCompare(b.route));

const publicRows = rows.filter(row => row.state === 'public');
const noindexRows = rows.filter(row => row.state === 'noindex');
const designRows = rows.filter(row => row.state === 'design');
const previewRows = rows.filter(row => row.state === 'preview');
const sitemapUrls = readSitemapUrls();

check('inventory: build contains HTML routes', rows.length > 0, `count=${rows.length}`);
check('public: exactly 19 governed routes', publicRows.length === EXPECTED_PUBLIC_ROUTES.length, `actual=${publicRows.length}`);
check(
  'public: exact baseline route set',
  JSON.stringify(publicRows.map(row => row.route)) === JSON.stringify([...EXPECTED_PUBLIC_ROUTES].sort()),
  `actual=${JSON.stringify(publicRows.map(row => row.route))}`,
);

for (const row of publicRows) {
  check(`${row.route}: public title present`, row.title.length > 0);
  check(`${row.route}: public one H1`, row.h1Count === 1, `h1=${row.h1Count}`);
  check(`${row.route}: public Product System family present`, Boolean(row.pageFamily), `family=${row.pageFamily}`);
  check(`${row.route}: public canonical present`, Boolean(row.canonical), `canonical=${row.canonical}`);
  check(`${row.route}: public canonical is self`, row.canonicalRoute === row.route, `canonicalRoute=${row.canonicalRoute}`);
  check(`${row.route}: public robots does not noindex`, !/\bnoindex\b/i.test(row.robots ?? ''));
}

for (const row of noindexRows) {
  check(`${row.route}: noindex explicitly declared`, /\bnoindex\b/i.test(row.robots ?? ''), `robots=${row.robots}`);
  check(`${row.route}: noindex route excluded from sitemap`, !sitemapUrls.has(row.route));
}
for (const row of designRows) check(`${row.route}: design route excluded from sitemap`, !sitemapUrls.has(row.route));
for (const row of previewRows) check(`${row.route}: preview route excluded from sitemap`, !sitemapUrls.has(row.route));

const duplicateCanonicals = new Map();
for (const row of publicRows) {
  if (!row.canonical) continue;
  const list = duplicateCanonicals.get(row.canonical) ?? [];
  list.push(row.route);
  duplicateCanonicals.set(row.canonical, list);
}
check(
  'public: no duplicate canonical ownership',
  [...duplicateCanonicals.values()].every(routes => routes.length === 1),
  JSON.stringify([...duplicateCanonicals.entries()].filter(([, routes]) => routes.length > 1)),
);

const byState = Object.fromEntries(['public','noindex','design','preview','error'].map(state => [state, rows.filter(row => row.state === state).length]));
console.log(`CBW INDEXABILITY INVENTORY: ${rows.length} HTML routes`);
console.log(`CBW INDEXABILITY STATES: ${JSON.stringify(byState)}`);
console.log(`CBW PUBLIC ROUTES (${publicRows.length}): ${JSON.stringify(publicRows.map(row => row.route))}`);
console.log(`CBW NOINDEX ROUTES (${noindexRows.length}):`);
for (const row of noindexRows) console.log(` NOINDEX ${row.route} family=${row.pageFamily ?? '-'} h1=${row.h1Count}`);
console.log(`CBW DESIGN ROUTES (${designRows.length})`);
console.log(`CBW PREVIEW ROUTES (${previewRows.length})`);
console.log(`CBW SITEMAP LOCAL URLS (${sitemapUrls.size}): ${JSON.stringify([...sitemapUrls].sort())}`);

if (failures.length) {
  console.error(`CBW INDEXABILITY INVENTORY: FAIL (${failures.length}/${checks})`);
  failures.forEach(failure => console.error(` - ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`CBW INDEXABILITY INVENTORY: PASS (${checks}/${checks})`);
}
