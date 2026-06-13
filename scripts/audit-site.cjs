/**
 * Full-site static audit over dist/ — SEO, broken links, missing images.
 * Report-only. Run after `npm run build`.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const SITE = 'https://cryptobonusworld.com';

// ── Collect all built HTML pages ──────────────────────────────────────────
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const pages = walk(DIST);

// route for a dist html file
function routeOf(file) {
  let r = path.relative(DIST, file).replace(/\\/g, '/');
  r = '/' + r.replace(/index\.html$/, '').replace(/\.html$/, '/');
  return r === '//' ? '/' : r;
}

// does an internal href resolve to a built file or asset?
function resolves(href) {
  let clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return fs.existsSync(path.join(DIST, 'index.html'));
  clean = decodeURIComponent(clean);
  const rel = clean.replace(/^\//, '').replace(/\/$/, '');
  return (
    fs.existsSync(path.join(DIST, rel, 'index.html')) ||
    fs.existsSync(path.join(DIST, rel + '.html')) ||
    fs.existsSync(path.join(DIST, rel)) // static asset
  );
}

const issues = {
  titleMissing: [], titleLong: [], titleShort: [], titleDup: {},
  descMissing: [], descLong: [], descShort: [], descDup: {},
  canonicalMissing: [], canonicalMismatch: [],
  h1Zero: [], h1Many: [],
  brokenLinks: [], missingImages: [], missingAlt: [],
  jsonLdBroken: [], ogImageMissing: [], ogImageBroken: [],
  noindex: [],
};
const titleMap = {}, descMap = {};
let totalLinks = 0, totalImgs = 0;

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeOf(file);

  // title
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = t ? t[1].replace(/\s+/g, ' ').trim() : null;
  if (!title) issues.titleMissing.push(route);
  else {
    if (title.length > 65) issues.titleLong.push(`${route} (${title.length}) "${title}"`);
    if (title.length < 25) issues.titleShort.push(`${route} (${title.length}) "${title}"`);
    (titleMap[title] = titleMap[title] || []).push(route);
  }

  // meta description
  const d = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)
        || html.match(/<meta\s+content="([^"]*)"\s+name="description"/i);
  const desc = d ? d[1].trim() : null;
  if (!desc) issues.descMissing.push(route);
  else {
    if (desc.length > 165) issues.descLong.push(`${route} (${desc.length})`);
    if (desc.length < 60) issues.descShort.push(`${route} (${desc.length}) "${desc}"`);
    (descMap[desc] = descMap[desc] || []).push(route);
  }

  // canonical
  const c = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
  if (!c) issues.canonicalMissing.push(route);
  else {
    const expected = SITE + route;
    if (c[1] !== expected && c[1] !== expected.replace(/\/$/, '')) {
      issues.canonicalMismatch.push(`${route} → ${c[1]}`);
    }
  }

  // h1 count (visible html only, strip scripts)
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  const h1s = (body.match(/<h1[\s>]/gi) || []).length;
  if (h1s === 0) issues.h1Zero.push(route);
  if (h1s > 1) issues.h1Many.push(`${route} (${h1s})`);

  // noindex check
  if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) issues.noindex.push(route);

  // og:image
  const og = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
  if (!og) issues.ogImageMissing.push(route);
  else if (og[1].startsWith(SITE) || og[1].startsWith('/')) {
    const rel = og[1].replace(SITE, '');
    if (rel.startsWith('/') && !resolves(rel)) issues.ogImageBroken.push(`${route} → ${og[1]}`);
  }

  // internal links
  const linkRe = /<a\s[^>]*href="(\/[^"]*)"/gi;
  let m;
  const seen = new Set();
  while ((m = linkRe.exec(html))) {
    const href = m[1];
    if (seen.has(href)) continue;
    seen.add(href);
    totalLinks++;
    if (!resolves(href)) issues.brokenLinks.push(`${route} → ${href}`);
  }

  // images: src + missing alt (only local /paths)
  const imgRe = /<img\s[^>]*?>/gi;
  let im;
  while ((im = imgRe.exec(body))) {
    const tag = im[0];
    const src = (tag.match(/\ssrc="([^"]*)"/i) || [])[1];
    if (src && src.startsWith('/')) {
      totalImgs++;
      if (!resolves(src)) issues.missingImages.push(`${route} → ${src}`);
      if (!/\salt="/i.test(tag)) issues.missingAlt.push(`${route} → ${src}`);
    }
    // srcset entries
    const srcset = (tag.match(/\ssrcset="([^"]*)"/i) || [])[1];
    if (srcset) {
      for (const part of srcset.split(',')) {
        const u = part.trim().split(/\s+/)[0];
        if (u.startsWith('/') && !resolves(u)) issues.missingImages.push(`${route} → (srcset) ${u}`);
      }
    }
  }

  // JSON-LD validity
  const ldRe = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let ld;
  while ((ld = ldRe.exec(html))) {
    try { JSON.parse(ld[1]); } catch (e) {
      issues.jsonLdBroken.push(`${route}: ${e.message.slice(0, 60)}`);
    }
  }
}

// duplicates
for (const [title, routes] of Object.entries(titleMap)) if (routes.length > 1) issues.titleDup[title] = routes;
for (const [desc, routes] of Object.entries(descMap)) if (routes.length > 1) issues.descDup[desc.slice(0, 80)] = routes;

// dedupe missing images list
issues.missingImages = [...new Set(issues.missingImages)];

// ── Report ────────────────────────────────────────────────────────────────
const lines = [];
lines.push(`# Site Audit — ${new Date().toISOString().slice(0, 10)}`);
lines.push(`\nPages scanned: **${pages.length}** | internal links checked: ${totalLinks} | local images checked: ${totalImgs}\n`);

function section(name, arr, max = 40) {
  lines.push(`\n## ${name} — ${Array.isArray(arr) ? arr.length : Object.keys(arr).length}`);
  if (Array.isArray(arr)) {
    arr.slice(0, max).forEach(x => lines.push(`- ${x}`));
    if (arr.length > max) lines.push(`- …and ${arr.length - max} more`);
  } else {
    Object.entries(arr).slice(0, max).forEach(([k, v]) => lines.push(`- "${k}" → ${v.length} pages: ${v.slice(0, 6).join(', ')}${v.length > 6 ? '…' : ''}`));
  }
}

section('Broken internal links', issues.brokenLinks);
section('Missing images (src/srcset → 404)', issues.missingImages);
section('Images without alt', issues.missingAlt, 25);
section('Title missing', issues.titleMissing);
section('Title too long (>65)', issues.titleLong, 25);
section('Title too short (<25)', issues.titleShort);
section('Duplicate titles', issues.titleDup, 20);
section('Description missing', issues.descMissing);
section('Description too long (>165)', issues.descLong, 25);
section('Description too short (<60)', issues.descShort);
section('Duplicate descriptions', issues.descDup, 20);
section('Canonical missing', issues.canonicalMissing);
section('Canonical mismatch', issues.canonicalMismatch, 25);
section('No H1', issues.h1Zero);
section('Multiple H1', issues.h1Many);
section('Broken JSON-LD', issues.jsonLdBroken);
section('og:image missing', issues.ogImageMissing);
section('og:image broken', issues.ogImageBroken);
section('Noindex pages', issues.noindex);

const out = path.join(__dirname, '..', 'reports', 'site-audit-2026-06-11.md');
fs.writeFileSync(out, lines.join('\n'), 'utf8');

// console summary
const summary = {
  pages: pages.length,
  brokenLinks: issues.brokenLinks.length,
  missingImages: issues.missingImages.length,
  missingAlt: issues.missingAlt.length,
  titleMissing: issues.titleMissing.length,
  titleLong: issues.titleLong.length,
  titleDup: Object.keys(issues.titleDup).length,
  descMissing: issues.descMissing.length,
  descLong: issues.descLong.length,
  descShort: issues.descShort.length,
  descDup: Object.keys(issues.descDup).length,
  canonicalMissing: issues.canonicalMissing.length,
  canonicalMismatch: issues.canonicalMismatch.length,
  h1Zero: issues.h1Zero.length,
  h1Many: issues.h1Many.length,
  jsonLdBroken: issues.jsonLdBroken.length,
  ogImageMissing: issues.ogImageMissing.length,
  ogImageBroken: issues.ogImageBroken.length,
  noindex: issues.noindex.length,
};
console.log(JSON.stringify(summary, null, 2));
console.log('Report: ' + out);
