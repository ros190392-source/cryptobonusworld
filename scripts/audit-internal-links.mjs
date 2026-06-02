/**
 * audit-internal-links.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds an internal link graph from the built HTML (dist/) and reports:
 *
 *   1. Orphan pages    — pages with no inbound internal links
 *   2. Dead-end pages  — pages with no outbound internal links to content
 *   3. Deep pages      — pages > 3 clicks from homepage (BFS depth)
 *   4. Broken links    — href targets that don't exist in dist/
 *   5. Duplicate canonicals — multiple pages pointing same rel=canonical
 *   6. Query-param links   — internal links with ?query= params (crawl pollution)
 *
 * Exit codes:
 *   0 — always (link issues are warnings, not CI blockers)
 *
 * Usage:
 *   node scripts/audit-internal-links.mjs              # pretty print
 *   node scripts/audit-internal-links.mjs --json       # JSON to stdout
 *   node scripts/audit-internal-links.mjs --write      # write reports/
 *   node scripts/audit-internal-links.mjs --fail-on-broken  # exit 1 if broken links
 *
 * Output files (--write):
 *   reports/internal-link-audit.md
 *   reports/internal-link-audit.json
 */

import {
  readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync,
} from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const DIST      = join(ROOT, 'dist');
const REPORTS   = join(ROOT, 'reports');
const SITE_URL  = 'https://cryptobonusworld.com';

const args           = process.argv.slice(2);
const WRITE_MODE     = args.includes('--write');
const JSON_MODE      = args.includes('--json');
const FAIL_ON_BROKEN = args.includes('--fail-on-broken');
const VERBOSE        = args.includes('--verbose');

// ── Thresholds ────────────────────────────────────────────────────────────────

const MAX_DEPTH = 3;

// Pages that are expected to have few/no inbound links (not real orphans)
const ORPHAN_WHITELIST = new Set([
  '/',
  '/sitemap.xml',
  '/robots.txt',
  '/about/',
  '/contact/',
  '/disclaimer/',
  '/privacy-policy/',
  '/affiliate-disclosure/',
  '/update-policy/',
  '/editorial-policy/',
  '/methodology/',
]);

// Pages whose outbound links are expected to be sparse (not real dead-ends)
const DEAD_END_WHITELIST = new Set([
  '/go/',
]);

// Path prefixes that are navigation/utility (not content links that prevent dead-end)
const NAV_PREFIXES = ['/go/', '/#'];

// ── Collect all HTML files ─────────────────────────────────────────────────────

function collectHtmlFiles(dir) {
  const results = [];
  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) results.push(full);
    }
  }
  walk(dir);
  return results;
}

function toUrlPath(filePath) {
  const rel = relative(DIST, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  return '/' + rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '/');
}

// ── Parse links and canonical from HTML ──────────────────────────────────────

const HREF_RE  = /href=["']([^"'#][^"']*)["']/gi;
const CANONICAL_RE = /<link\s+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i;

function parseLinks(html) {
  const links = [];
  let m;
  HREF_RE.lastIndex = 0;
  while ((m = HREF_RE.exec(html)) !== null) {
    links.push(m[1]);
  }
  return links;
}

function parseCanonical(html) {
  const m = html.match(CANONICAL_RE);
  if (!m) return null;
  let url = m[1];
  // Strip site origin
  if (url.startsWith(SITE_URL)) url = url.slice(SITE_URL.length) || '/';
  return url;
}

// ── Normalise a href to an internal path ──────────────────────────────────────

// Asset extensions — these are not HTML pages and should not be checked as broken links
const ASSET_EXT_RE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|woff|woff2|ttf|eot|otf|mp4|mp3|webm|pdf|xml|txt|json|map)$/i;

function normaliseInternal(href) {
  // Skip external, mailto, javascript, data, tel, fragment-only
  if (!href) return null;
  if (href.startsWith('mailto:') ||
      href.startsWith('javascript:') ||
      href.startsWith('data:') ||
      href.startsWith('tel:') ||
      href.startsWith('#')) return null;

  // Strip absolute site URL
  let path = href;
  if (path.startsWith(SITE_URL)) path = path.slice(SITE_URL.length) || '/';

  // Skip external URLs
  if (path.startsWith('http://') || path.startsWith('https://')) return null;

  // Relative path — make absolute (simple: we can't know the page context, so skip)
  if (!path.startsWith('/')) return null;

  // Skip asset files (images, CSS, JS, fonts, etc.) — not HTML pages
  const cleanPath = path.split('?')[0];
  if (ASSET_EXT_RE.test(cleanPath)) return null;

  return path;
}

// Separate query params from path
function splitQuery(path) {
  const qi = path.indexOf('?');
  if (qi === -1) return { clean: path, hasQuery: false };
  return { clean: path.slice(0, qi) || '/', hasQuery: true };
}

// Normalise trailing slashes: ensure all paths end with /
function normalisePath(path) {
  if (path === '/') return '/';
  // Files with extensions stay as-is
  if (/\.\w{2,5}$/.test(path)) return path;
  return path.endsWith('/') ? path : path + '/';
}

// ── Build link graph from dist/ ───────────────────────────────────────────────

async function buildGraph() {
  const htmlFiles  = collectHtmlFiles(DIST);
  const pageSet    = new Set();
  const pageData   = {};  // path → { links: Set<string>, canonicalUrl, rawLinks }

  // First pass: collect all pages
  for (const f of htmlFiles) {
    const urlPath = normalisePath(toUrlPath(f));
    pageSet.add(urlPath);
  }

  // Second pass: parse links
  for (const f of htmlFiles) {
    const urlPath = normalisePath(toUrlPath(f));
    const html    = readFileSync(f, 'utf8');
    const rawHrefs = parseLinks(html);
    const canonical = parseCanonical(html);

    const outLinks  = new Set();
    const queryLinks = [];
    const rawLinks  = [];

    for (const href of rawHrefs) {
      const internal = normaliseInternal(href);
      if (!internal) continue;

      const { clean, hasQuery } = splitQuery(internal);
      const normPath = normalisePath(clean);

      rawLinks.push(href);

      if (hasQuery) {
        queryLinks.push(href);
        continue;  // don't count query-param links as valid outbound links
      }

      outLinks.add(normPath);
    }

    pageData[urlPath] = {
      filePath: f,
      outLinks,
      queryLinks,
      canonicalUrl: canonical ? normalisePath(canonical) : urlPath,
    };
  }

  return { pageSet, pageData };
}

// ── Analysis functions ────────────────────────────────────────────────────────

function buildInboundMap(pageSet, pageData) {
  const inbound = {};
  for (const p of pageSet) inbound[p] = new Set();

  for (const [from, data] of Object.entries(pageData)) {
    for (const to of data.outLinks) {
      if (pageSet.has(to)) {
        inbound[to].add(from);
      }
    }
  }
  return inbound;
}

function findOrphans(pageSet, inbound) {
  const orphans = [];
  for (const page of pageSet) {
    if (ORPHAN_WHITELIST.has(page)) continue;
    if ((inbound[page]?.size ?? 0) === 0) {
      orphans.push(page);
    }
  }
  return orphans.sort();
}

function findDeadEnds(pageSet, pageData) {
  const deadEnds = [];
  for (const [page, data] of Object.entries(pageData)) {
    if (ORPHAN_WHITELIST.has(page)) continue;

    // Count outbound links that point to real content (not nav/go/)
    const contentLinks = [...data.outLinks].filter(link => {
      if (!pageSet.has(link)) return false;
      if (NAV_PREFIXES.some(p => link.startsWith(p))) return false;
      if (link === page) return false;
      return true;
    });

    if (contentLinks.length === 0) {
      deadEnds.push(page);
    }
  }
  return deadEnds.sort();
}

function bfsDepths(pageSet, pageData) {
  // BFS from homepage to compute click depth
  const depths = { '/': 0 };
  const queue  = ['/'];

  while (queue.length > 0) {
    const current = queue.shift();
    const depth   = depths[current];
    const data    = pageData[current];
    if (!data) continue;

    for (const link of data.outLinks) {
      if (!pageSet.has(link)) continue;
      if (depths[link] === undefined) {
        depths[link] = depth + 1;
        queue.push(link);
      }
    }
  }
  return depths;
}

function findDeepPages(depths, max) {
  return Object.entries(depths)
    .filter(([page, depth]) => depth > max && !ORPHAN_WHITELIST.has(page))
    .sort((a, b) => b[1] - a[1])
    .map(([page, depth]) => ({ page, depth }));
}

function findBrokenLinks(pageSet, pageData) {
  const broken = [];
  for (const [from, data] of Object.entries(pageData)) {
    for (const to of data.outLinks) {
      if (!pageSet.has(to)) {
        broken.push({ from, to });
      }
    }
  }
  return broken;
}

function findDuplicateCanonicals(pageData) {
  const canonicalToPages = {};
  for (const [page, data] of Object.entries(pageData)) {
    const can = data.canonicalUrl;
    if (!canonicalToPages[can]) canonicalToPages[can] = [];
    canonicalToPages[can].push(page);
  }
  return Object.entries(canonicalToPages)
    .filter(([, pages]) => pages.length > 1)
    .map(([canonical, pages]) => ({ canonical, pages }));
}

function findQueryParamLinks(pageData) {
  const found = [];
  for (const [from, data] of Object.entries(pageData)) {
    for (const href of data.queryLinks) {
      found.push({ from, href });
    }
  }
  return found;
}

// ── Report builders ───────────────────────────────────────────────────────────

const NOW = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

function buildMarkdown({ stats, orphans, deadEnds, deepPages, brokenLinks, duplicateCanonicals, queryParamLinks }) {
  const lines = [];

  lines.push('# Internal Link Audit Report');
  lines.push(`*Generated: ${NOW}*`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Pages in build | ${stats.pageCount} |`);
  lines.push(`| Total internal links | ${stats.totalLinks} |`);
  lines.push(`| Orphan pages (no inbound) | ${orphans.length} |`);
  lines.push(`| Dead-end pages (no outbound) | ${deadEnds.length} |`);
  lines.push(`| Pages > ${MAX_DEPTH} clicks deep | ${deepPages.length} |`);
  lines.push(`| Broken internal links | ${brokenLinks.length} |`);
  lines.push(`| Duplicate canonicals | ${duplicateCanonicals.length} |`);
  lines.push(`| Query-param internal links | ${queryParamLinks.length} |`);
  lines.push('');

  if (brokenLinks.length > 0) {
    lines.push(`## 🔴 Broken Internal Links (${brokenLinks.length})`);
    lines.push('');
    lines.push('These links point to pages that do not exist in the build.');
    lines.push('');
    lines.push('| From | To (missing) |');
    lines.push('|------|-------------|');
    for (const { from, to } of brokenLinks.slice(0, 50)) {
      lines.push(`| ${from} | ${to} |`);
    }
    if (brokenLinks.length > 50) lines.push(`\n*… and ${brokenLinks.length - 50} more.*`);
    lines.push('');
  }

  if (orphans.length > 0) {
    lines.push(`## ⚠️ Orphan Pages (${orphans.length})`);
    lines.push('');
    lines.push('Pages with no inbound internal links (excluding whitelisted utility pages).');
    lines.push('');
    for (const p of orphans.slice(0, 40)) lines.push(`- ${p}`);
    if (orphans.length > 40) lines.push(`- *… and ${orphans.length - 40} more*`);
    lines.push('');
  }

  if (deepPages.length > 0) {
    lines.push(`## ⚠️ Deep Pages (> ${MAX_DEPTH} clicks from homepage)`);
    lines.push('');
    lines.push('| Page | Depth |');
    lines.push('|------|-------|');
    for (const { page, depth } of deepPages.slice(0, 30)) {
      lines.push(`| ${page} | ${depth} |`);
    }
    if (deepPages.length > 30) lines.push(`\n*… and ${deepPages.length - 30} more.*`);
    lines.push('');
  }

  if (deadEnds.length > 0) {
    lines.push(`## ⚠️ Dead-End Pages (${deadEnds.length})`);
    lines.push('');
    lines.push('Pages with no outbound internal links to content pages.');
    lines.push('');
    for (const p of deadEnds.slice(0, 30)) lines.push(`- ${p}`);
    if (deadEnds.length > 30) lines.push(`- *… and ${deadEnds.length - 30} more*`);
    lines.push('');
  }

  if (duplicateCanonicals.length > 0) {
    lines.push(`## ⚠️ Duplicate Canonical URLs (${duplicateCanonicals.length})`);
    lines.push('');
    for (const { canonical, pages } of duplicateCanonicals) {
      lines.push(`- Canonical \`${canonical}\` shared by: ${pages.join(', ')}`);
    }
    lines.push('');
  }

  if (queryParamLinks.length > 0) {
    lines.push(`## ℹ️ Query-Param Internal Links (${queryParamLinks.length})`);
    lines.push('');
    lines.push('Internal links with query parameters can cause crawl pollution.');
    lines.push('');
    for (const { from, href } of queryParamLinks.slice(0, 20)) {
      lines.push(`- \`${from}\` → \`${href}\``);
    }
    if (queryParamLinks.length > 20) lines.push(`- *… and ${queryParamLinks.length - 20} more*`);
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Max depth threshold: ${MAX_DEPTH} clicks from homepage*`);
  lines.push('*Run `npm run links:audit` to regenerate.*');

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(DIST)) {
    console.error('ERROR: dist/ directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const { pageSet, pageData } = await buildGraph();

  const inbound           = buildInboundMap(pageSet, pageData);
  const orphans           = findOrphans(pageSet, inbound);
  const deadEnds          = findDeadEnds(pageSet, pageData);
  const depths            = bfsDepths(pageSet, pageData);
  const deepPages         = findDeepPages(depths, MAX_DEPTH);
  const brokenLinks       = findBrokenLinks(pageSet, pageData);
  const duplicateCanonicals = findDuplicateCanonicals(pageData);
  const queryParamLinks   = findQueryParamLinks(pageData);

  const totalLinks = Object.values(pageData).reduce((s, d) => s + d.outLinks.size, 0);

  const stats = {
    pageCount:          pageSet.size,
    totalLinks,
    orphans:            orphans.length,
    deadEnds:           deadEnds.length,
    deepPages:          deepPages.length,
    brokenLinks:        brokenLinks.length,
    duplicateCanonicals: duplicateCanonicals.length,
    queryParamLinks:    queryParamLinks.length,
  };

  const jsonReport = {
    generatedAt: NOW,
    stats,
    orphans,
    deadEnds,
    deepPages,
    brokenLinks,
    duplicateCanonicals,
    queryParamLinks: queryParamLinks.slice(0, 50),
  };

  if (JSON_MODE && !WRITE_MODE) {
    console.log(JSON.stringify(jsonReport, null, 2));
    process.exit(FAIL_ON_BROKEN && brokenLinks.length > 0 ? 1 : 0);
    return;
  }

  if (WRITE_MODE) {
    if (!existsSync(REPORTS)) mkdirSync(REPORTS, { recursive: true });
    const md   = join(REPORTS, 'internal-link-audit.md');
    const json = join(REPORTS, 'internal-link-audit.json');
    writeFileSync(md,   buildMarkdown({ stats, orphans, deadEnds, deepPages, brokenLinks, duplicateCanonicals, queryParamLinks }), 'utf8');
    writeFileSync(json, JSON.stringify(jsonReport, null, 2), 'utf8');
    console.log('Written: reports/internal-link-audit.md');
    console.log('Written: reports/internal-link-audit.json');
  }

  // Console summary
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Internal Link Audit');
  console.log(`  ${NOW}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Pages in build          : ${stats.pageCount}`);
  console.log(`  Total internal links    : ${totalLinks}`);
  console.log(`  Orphan pages            : ${orphans.length}   (no inbound links)`);
  console.log(`  Dead-end pages          : ${deadEnds.length}   (no outbound content links)`);
  console.log(`  Pages > ${MAX_DEPTH} clicks deep   : ${deepPages.length}`);
  console.log(`  Broken internal links   : ${brokenLinks.length}`);
  console.log(`  Duplicate canonicals    : ${duplicateCanonicals.length}`);
  console.log(`  Query-param links       : ${queryParamLinks.length}`);
  console.log('────────────────────────────────────────────────────────────');

  if (brokenLinks.length > 0) {
    console.log('  BROKEN LINKS:');
    for (const { from, to } of brokenLinks.slice(0, 10)) {
      console.log(`    ✗ ${from} → ${to}`);
    }
    if (brokenLinks.length > 10) console.log(`    … and ${brokenLinks.length - 10} more`);
    console.log('');
  }

  if (orphans.length > 0 && VERBOSE) {
    console.log('  ORPHAN PAGES (sample):');
    for (const p of orphans.slice(0, 8)) console.log(`    ${p}`);
    if (orphans.length > 8) console.log(`    … and ${orphans.length - 8} more`);
    console.log('');
  }

  if (deepPages.length > 0 && VERBOSE) {
    console.log('  DEEP PAGES (sample):');
    for (const { page, depth } of deepPages.slice(0, 8)) {
      console.log(`    depth ${depth}: ${page}`);
    }
    if (deepPages.length > 8) console.log(`    … and ${deepPages.length - 8} more`);
    console.log('');
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  if (FAIL_ON_BROKEN && brokenLinks.length > 0) {
    console.error(`FAIL: ${brokenLinks.length} broken internal link(s) found.`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Internal link audit failed:', err);
  process.exit(1);
});
