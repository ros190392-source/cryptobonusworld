#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const OUT_DIR = resolve(ROOT, 'artifacts');
const OUT_FILE = resolve(OUT_DIR, 'site-indexability-inventory.json');
const ORIGIN = 'https://cryptobonusworld.com';

if (!existsSync(DIST)) {
  console.error('dist missing; run production build first');
  process.exit(1);
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
  if (rel === '404.html') return '/404.html';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function getTag(html, selectorName, selectorValue) {
  const tags = html.match(/<(?:meta|link)\b[^>]*>/gi) ?? [];
  const pattern = new RegExp(`${selectorName}\\s*=\\s*["']${selectorValue}["']`, 'i');
  return tags.find(tag => pattern.test(tag)) ?? null;
}

function attr(tag, name) {
  if (!tag) return null;
  return tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? null;
}

function textBetween(html, tag) {
  return html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';
}

function canonicalPath(value) {
  if (!value) return null;
  try {
    const url = new URL(value, ORIGIN);
    return url.origin === ORIGIN ? url.pathname : null;
  } catch {
    return null;
  }
}

function classify(route, html, robots) {
  if (route === '/404.html') return 'error';
  if (route.startsWith('/__design/')) return 'design';
  if (route.startsWith('/preview/')) return 'preview';
  if (/\bnoindex\b/i.test(robots ?? '')) return 'noindex';
  return 'public';
}

const rows = findHtml(DIST).map(file => {
  const route = routeForFile(file);
  const html = readFileSync(file, 'utf8');
  const robots = attr(getTag(html, 'name', 'robots'), 'content');
  const canonical = attr(getTag(html, 'rel', 'canonical'), 'href');
  const pageFamily = html.match(/data-page-family=["']([^"']+)["']/i)?.[1] ?? null;
  const firstScreenFamily = html.match(/data-first-screen-family=["']([^"']+)["']/i)?.[1] ?? null;
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  return {
    route,
    state: classify(route, html, robots),
    title: textBetween(html, 'title'),
    robots,
    canonical,
    canonicalPath: canonicalPath(canonical),
    pageFamily,
    firstScreenFamily,
    h1Count,
    htmlBytes: Buffer.byteLength(html),
  };
}).sort((a, b) => a.route.localeCompare(b.route));

const summary = {};
for (const row of rows) summary[row.state] = (summary[row.state] ?? 0) + 1;

const payload = {
  schemaVersion: 1,
  generatedBy: 'scripts/seo/site-indexability-inventory-artifact.mjs',
  routeCount: rows.length,
  summary,
  routes: rows,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`CBW ROUTE INVENTORY ARTIFACT: wrote ${rows.length} routes to ${relative(ROOT, OUT_FILE)}`);
console.log(`CBW ROUTE INVENTORY SUMMARY: ${JSON.stringify(summary)}`);
