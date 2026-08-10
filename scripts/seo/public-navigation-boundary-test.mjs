#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const ORIGIN = 'https://cryptobonusworld.com';
const EXPECTED_PUBLIC_COUNT = 19;
const ALLOWED_NOINDEX_TARGETS = new Set(['/contact/']);

if (!existsSync(DIST)) {
  console.error('CBW PUBLIC NAVIGATION BOUNDARY: ERROR — dist missing; run production build first');
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

function metaContent(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find(row => new RegExp(`name\\s*=\\s*["']${name}["']`, 'i').test(row));
  return tag?.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? null;
}

function stateFor(route, html) {
  if (route === '/404.html') return 'error';
  if (route.startsWith('/__design/')) return 'design';
  if (route.startsWith('/preview/')) return 'preview';
  if (/\bnoindex\b/i.test(metaContent(html, 'robots') ?? '')) return 'noindex';
  return 'public';
}

function hrefs(html) {
  const rows = [];
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)) rows.push(match[1]);
  return rows;
}

function localPath(href) {
  if (!href || href.startsWith('#') || /^(?:mailto:|tel:|javascript:)/i.test(href)) return null;
  try {
    const url = new URL(href, ORIGIN);
    if (url.origin !== ORIGIN) return null;
    return url.pathname.endsWith('/') || url.pathname.includes('.') ? url.pathname : `${url.pathname}/`;
  } catch {
    return null;
  }
}

function allowedNoindex(path) {
  return ALLOWED_NOINDEX_TARGETS.has(path) || path.startsWith('/go/');
}

const routes = new Map();
for (const file of findHtml(DIST)) {
  const route = routeForFile(file);
  const html = readFileSync(file, 'utf8');
  routes.set(route, { route, html, state: stateFor(route, html) });
}

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

const publicRows = [...routes.values()].filter(row => row.state === 'public');
check('public baseline remains 19 routes', publicRows.length === EXPECTED_PUBLIC_COUNT, `count=${publicRows.length}`);

const violations = [];
const missingTargets = [];
for (const source of publicRows) {
  for (const href of hrefs(source.html)) {
    const path = localPath(href);
    if (!path) continue;
    const target = routes.get(path);
    if (!target) {
      // Hash links and server/runtime endpoints can legitimately resolve outside the static route map.
      if (!href.includes('#') && !path.startsWith('/cdn-cgi/')) missingTargets.push(`${source.route} -> ${href}`);
      continue;
    }
    if (target.state === 'public') continue;
    if (target.state === 'noindex' && allowedNoindex(path)) continue;
    violations.push(`${source.route} -> ${href} [${target.state}]`);
  }
}

check('public pages do not link retired/noindex/preview/design routes', violations.length === 0, violations.slice(0, 40).join(' | '));
check('public pages do not link missing static routes', missingTargets.length === 0, missingTargets.slice(0, 40).join(' | '));

const footerSource = readFileSync(resolve(ROOT, 'src/components/layout/SiteFooter.astro'), 'utf8');
check('footer no longer advertises retired guides directory', !/href=["']\/guides\/["']/.test(footerSource));
check('owner-preview Kazakhstan route is absent from public shell', !/href=["']\/countries\/kazakhstan\/?["']/.test(footerSource));

if (failures.length) {
  console.error(`CBW PUBLIC NAVIGATION BOUNDARY: FAIL (${failures.length}/${checks})`);
  failures.forEach(failure => console.error(` - ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`CBW PUBLIC NAVIGATION BOUNDARY: PASS (${checks}/${checks})`);
  console.log(`CBW PUBLIC NAVIGATION: ${publicRows.length} public routes inspected; governed /go/* and /contact/ are the only noindex link exceptions.`);
}
