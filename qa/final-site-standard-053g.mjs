import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const distRoot = path.join(repoRoot, 'dist');
const outDir = path.join(repoRoot, 'qa-artifacts');
const screenshotDir = path.join(outDir, 'screenshots');
const baseUrl = 'http://127.0.0.1:4321';
const SITE_URL = 'https://cryptobonusworld.com';
const CANONICAL_WIDTHS = new Set([560, 760, 960, 1180]);
const ROLE_WIDTHS = { shell: 1180, wide: 1180, standard: 960, prose: 760, narrow: 560 };
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const normalize = value => value.split(path.sep).join('/');
const normalizePath = value => value.replace(/\/+/g, '/');
const normalizeHref = value => (value || '').replace(/\/$/, '');

async function walk(root) {
  const result = [];
  async function visit(current) {
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) result.push(absolute);
    }
  }
  await visit(root);
  return result.sort();
}

function htmlRoute(file) {
  const relative = normalize(path.relative(distRoot, file));
  if (relative === 'index.html') return '/';
  if (relative === '404.html') return '/404.html';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match?.[1] ?? null;
}

function metaByName(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return tags.find(tag => attribute(tag, 'name')?.toLowerCase() === name.toLowerCase()) ?? null;
}

function canonicalHref(html) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = tags.find(item => (attribute(item, 'rel') || '').toLowerCase().split(/\s+/).includes('canonical'));
  return tag ? attribute(tag, 'href') : null;
}

function refreshTarget(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find(item => (attribute(item, 'http-equiv') || '').toLowerCase() === 'refresh');
  const content = tag ? attribute(tag, 'content') : null;
  const match = content?.match(/url\s*=\s*(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function countTag(html, tagName) {
  return (html.match(new RegExp(`<${tagName}\\b`, 'gi')) ?? []).length;
}

function parseJsonLd(html) {
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.map((match, index) => {
    try { return { index, ok: true, value: JSON.parse(match[1]) }; }
    catch (error) { return { index, ok: false, error: error.message }; }
  });
}

function classifyRoute(route, html) {
  const robotsTag = metaByName(html, 'robots');
  const robots = (robotsTag ? attribute(robotsTag, 'content') : '')?.toLowerCase() ?? '';
  const noindex = robots.includes('noindex');
  const refresh = refreshTarget(html);
  if (route === '/404.html') return { kind: 'error', noindex, robots, refresh };
  if (route.startsWith('/__design/') || route.startsWith('/preview/')) return { kind: 'review', noindex, robots, refresh };
  if (route.startsWith('/go/')) return { kind: 'affiliate-redirect', noindex, robots, refresh };
  if (refresh) return { kind: 'governed-redirect', noindex, robots, refresh };
  if (noindex) return { kind: 'noindex-live', noindex, robots, refresh };
  return { kind: 'indexable-live', noindex, robots, refresh };
}

function familyForRoute(route) {
  if (route === '/') return 'homepage';
  if (/^\/(bybit|mexc|okx|bitget|kucoin|bingx)\/$/.test(route)) return 'exchange-live';
  if (route === '/coinex/') return 'exchange-status';
  if (route === '/exchanges/') return 'exchange-directory';
  if (route === '/promo-codes/') return 'promo-directory';
  if (route === '/faq/') return 'faq';
  if (route === '/methodology/') return 'methodology';
  if (route === '/contact/') return 'contact';
  if (/^\/(about|editorial-policy|update-policy|affiliate-disclosure|disclaimer|privacy-policy|terms)\/$/.test(route)) return 'trust-legal';
  if (route.startsWith('/countries/')) return 'country-review';
  return 'other-live';
}

function sourceFamilyBlockers(sourceFiles) {
  const blockers = [];
  const localStylePages = [];
  const arbitraryContainers = [];
  const deletedNames = ['exchange-page-v2.css', 'directory-pages-v2.css', 'ExchangeCard.astro', 'ExchangePromoPage.astro'];
  const containerSelector = /(wrap|container|shell|prose|page-main|main-wrap|content-wrap|inner-wrap)/i;

  for (const file of sourceFiles) {
    const relative = normalize(path.relative(repoRoot, file));
    const content = file.content;
    if (content.includes('/#finder')) blockers.push(`LEGACY_FINDER:${relative}`);
    if (relative.startsWith('src/pages/') && /class=["']msg["']/.test(content)) blockers.push(`LEGACY_REDIRECT_MSG:${relative}`);
    for (const name of deletedNames) {
      if (content.includes(name) && !relative.includes('sitewideLayoutAudit.ts')) blockers.push(`DELETED_LAYER_REFERENCE:${name}:${relative}`);
    }
    if (relative.startsWith('src/pages/') && !relative.includes('[designRoot]') && !relative.includes('/preview/')) {
      const styleBlocks = content.match(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi) ?? [];
      if (styleBlocks.length) localStylePages.push({ path: relative, blocks: styleBlocks.length });
      for (const block of styleBlocks) {
        for (const rule of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
          const selector = rule[1].trim();
          const body = rule[2];
          if (!containerSelector.test(selector)) continue;
          for (const width of body.matchAll(/max-width\s*:\s*(\d+(?:\.\d+)?)px/gi)) {
            const value = Number(width[1]);
            if (value >= 500 && !CANONICAL_WIDTHS.has(value)) {
              arbitraryContainers.push({ path: relative, selector, property: 'max-width', value });
            }
          }
          for (const width of body.matchAll(/width\s*:\s*min\([^,]+,\s*(\d+(?:\.\d+)?)px\s*\)/gi)) {
            const value = Number(width[1]);
            if (value >= 500 && !CANONICAL_WIDTHS.has(value)) {
              arbitraryContainers.push({ path: relative, selector, property: 'width:min', value });
            }
          }
        }
      }
    }
  }
  blockers.push(...arbitraryContainers.map(item => `ARBITRARY_CONTAINER:${item.path}:${item.selector}:${item.value}`));
  return { blockers, localStylePages, arbitraryContainers };
}

await mkdirRecursive();
async function mkdirRecursive() {
  await fs.mkdir(screenshotDir, { recursive: true });
}

const htmlFiles = (await walk(distRoot)).filter(file => file.endsWith('.html'));
const routeRecords = [];
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  const route = htmlRoute(file);
  const classification = classifyRoute(route, html);
  const jsonLd = parseJsonLd(html);
  routeRecords.push({
    file: normalize(path.relative(repoRoot, file)),
    route,
    html,
    family: familyForRoute(route),
    ...classification,
    titleCount: countTag(html, 'title'),
    h1Count: countTag(html, 'h1'),
    canonical: canonicalHref(html),
    jsonLd,
    finderReferences: (html.match(/\/#finder/g) ?? []).length,
    legacyMsg: /class=["']msg["']/.test(html),
  });
}

const staticBlockers = [];
const seenRoutes = new Set();
for (const record of routeRecords) {
  if (seenRoutes.has(record.route)) staticBlockers.push(`DUPLICATE_ROUTE:${record.route}`);
  seenRoutes.add(record.route);
  if (record.titleCount !== 1) staticBlockers.push(`TITLE_COUNT:${record.route}:${record.titleCount}`);
  if (record.finderReferences) staticBlockers.push(`FINDER_OUTPUT:${record.route}`);
  if (record.legacyMsg) staticBlockers.push(`LEGACY_MSG_OUTPUT:${record.route}`);
  if (record.jsonLd.some(item => !item.ok)) staticBlockers.push(`INVALID_JSON_LD:${record.route}`);

  if (record.kind === 'review' && !record.noindex) staticBlockers.push(`REVIEW_INDEXABLE:${record.route}`);
  if (record.route.startsWith('/countries/kazakhstan/') && !record.noindex) staticBlockers.push(`UNAUTHORIZED_COUNTRY_INDEXABLE:${record.route}`);
  if (record.kind === 'governed-redirect') {
    if (!record.noindex || !record.robots.includes('follow')) staticBlockers.push(`REDIRECT_ROBOTS:${record.route}:${record.robots}`);
    if (!record.canonical) staticBlockers.push(`REDIRECT_CANONICAL_MISSING:${record.route}`);
    if (!record.refresh) staticBlockers.push(`REDIRECT_TARGET_MISSING:${record.route}`);
  }
  if (record.kind === 'affiliate-redirect' && !record.noindex) staticBlockers.push(`AFFILIATE_REDIRECT_INDEXABLE:${record.route}`);
  if (record.kind === 'indexable-live' && !record.canonical) staticBlockers.push(`CANONICAL_MISSING:${record.route}`);
  if ((record.kind === 'indexable-live' || record.kind === 'noindex-live') && record.h1Count !== 1) staticBlockers.push(`H1_COUNT:${record.route}:${record.h1Count}`);
}

const sitemapXml = await fs.readFile(path.join(distRoot, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
const sitemapPaths = sitemapUrls.map(url => new URL(url).pathname);
for (const sitemapPath of sitemapPaths) {
  const record = routeRecords.find(item => item.route === sitemapPath || item.route === `${sitemapPath}/`);
  if (!record) staticBlockers.push(`SITEMAP_ROUTE_MISSING:${sitemapPath}`);
  else if (record.kind !== 'indexable-live') staticBlockers.push(`SITEMAP_NONINDEXABLE:${record.route}:${record.kind}`);
}
for (const record of routeRecords.filter(item => item.kind === 'indexable-live')) {
  if (!sitemapPaths.includes(record.route) && !sitemapPaths.includes(record.route.replace(/\/$/, ''))) {
    staticBlockers.push(`INDEXABLE_NOT_IN_SITEMAP:${record.route}`);
  }
}

const sourcePaths = (await walk(path.join(repoRoot, 'src')))
  .filter(file => ['.astro','.css','.ts','.tsx','.js','.mjs','.cjs'].includes(path.extname(file)));
const sourceFiles = [];
for (const file of sourcePaths) sourceFiles.push({ file, content: await fs.readFile(file, 'utf8') });
const sourceAudit = sourceFamilyBlockers(sourceFiles);

const browserRoutes = routeRecords.filter(record => ['indexable-live','noindex-live'].includes(record.kind));
const browser = await chromium.launch({ headless: true });
const browserResults = [];
let browserFailed = false;

function usefulSelectors(family) {
  const map = {
    homepage: '.top10-section',
    'exchange-live': '.cbw-exchange-facts',
    'exchange-status': '.cx-card',
    'exchange-directory': '.exchange-directory-card',
    'promo-directory': '.promo-row',
    faq: '.faq-group',
    methodology: '.mth-section',
    contact: '.contact-grid',
    'trust-legal': '.prose, .ad-prose',
    'country-review': 'main section:nth-of-type(2), main article, [data-container-role]',
    'other-live': 'main section:nth-of-type(2), main article, .container, [data-container-role]',
  };
  return map[family] ?? map['other-live'];
}

try {
  for (const record of browserRoutes) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const httpFailures = [];
      await page.route('**/api/exchange-votes**', handler => handler.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ votes: 0, userVote: null }) }));
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400 && response.url().startsWith(baseUrl)) httpFailures.push({ status: response.status(), url: response.url() });
      });

      const response = await page.goto(`${baseUrl}${record.route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(120);
      const h1 = page.locator('h1').first();
      const h1Box = await h1.boundingBox();
      const useful = page.locator(usefulSelectors(record.family)).first();
      const usefulBox = await useful.boundingBox();
      const dimensions = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        bsw: document.body.scrollWidth,
      }));
      const containerChecks = await page.locator('[data-container-role]').evaluateAll((nodes, roleWidths) => nodes.map(node => {
        const role = node.getAttribute('data-container-role');
        const width = node.getBoundingClientRect().width;
        return { role, width, limit: roleWidths[role] ?? null, pass: roleWidths[role] ? width <= roleWidths[role] + 1 : false };
      }), ROLE_WIDTHS);
      const genericWidths = await page.locator('.container, .shell, .top10-wrap, .faq-text-wrap, .cx-wrap').evaluateAll(nodes => nodes.filter(node => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && rect.width > 100;
      }).map(node => ({ className: node.className, width: node.getBoundingClientRect().width })));

      const checks = {
        http200: response?.status() === 200,
        oneHeader: await page.locator('.site-header').count() === 1,
        oneFooter: await page.locator('.site-footer').count() === 1,
        oneH1: await page.locator('h1').count() === 1,
        h1InFirstViewport: Boolean(h1Box && h1Box.y >= 0 && h1Box.y + h1Box.height <= viewport.height),
        usefulContentInFirstViewport: Boolean(usefulBox && usefulBox.y < viewport.height),
        roleWidthsPass: containerChecks.every(item => item.pass),
        genericWidthsPass: genericWidths.every(item => item.width <= 1181),
        noFinderLinks: await page.locator('a[href="/#finder"]').count() === 0,
        noLegacyMsg: await page.locator('.msg').count() === 0,
        noOverflow: dimensions.sw <= dimensions.cw + 1 && dimensions.bsw <= dimensions.cw + 1,
        noConsoleErrors: consoleErrors.length === 0,
        noPageErrors: pageErrors.length === 0,
        noHttpFailures: httpFailures.length === 0,
      };

      if (record.family === 'homepage') {
        const rows = await page.locator('.top10-row').evaluateAll((nodes, height) => nodes.map(node => {
          const rect = node.getBoundingClientRect();
          return { full: rect.top >= 0 && rect.bottom <= height, begun: rect.top < height && rect.bottom > 0 };
        }), viewport.height);
        checks.tenRows = rows.length === 10;
        checks.sixPrimaryActions = await page.locator('.top10-primary[href^="/go/"]').count() === 6;
        checks.fourNoPrimaryActions = await page.locator('.top10-row:not(:has(.top10-primary))').count() === 4;
        checks.rankingFirstScreen = viewport.width >= 1000 ? rows.filter(item => item.full).length >= 3 : rows.some(item => item.begun);
      }
      if (record.family === 'exchange-live') {
        const slug = record.route.split('/').filter(Boolean)[0];
        checks.oneGovernedExchange = await page.locator('.cbw-exchange-page').count() === 1;
        checks.exactPrimaryAction = await page.locator(`.cbw-exchange-primary[href="/go/${slug}/"]`).count() === 1;
        checks.noLegacyExchangeClasses = await page.locator('.p2-section, .ep-section, .mexc-section, .brand-hero, .compact-facts').count() === 0;
      }
      if (record.family === 'exchange-status') checks.noAffiliateAction = await page.locator('a[href^="/go/"]').count() === 0;
      if (record.family === 'promo-directory') {
        checks.sixRows = await page.locator('.promo-row').count() === 6;
        checks.sixActions = await page.locator('.promo-action[href^="/go/"]').count() === 6;
      }
      if (record.family === 'exchange-directory') {
        checks.sixCards = await page.locator('.exchange-directory-card').count() === 6;
        checks.sixActions = await page.locator('.exchange-directory-card__action[href^="/go/"]').count() === 6;
      }
      if (record.family === 'faq') {
        checks.twentyFaqs = await page.locator('.faq-item').count() === 20;
        checks.proseWidth = await page.locator('.faq-text-wrap').first().evaluate(node => node.getBoundingClientRect().width <= Math.min(window.innerWidth, 760) + 1);
      }
      if (record.family === 'country-review') checks.noAffiliateAction = await page.locator('a[href^="/go/"]').count() === 0;

      const ok = Object.values(checks).every(Boolean);
      browserFailed ||= !ok;
      const result = { route: record.route, family: record.family, kind: record.kind, viewport, ok, checks, h1Box, usefulBox, containerChecks, genericWidths, dimensions, consoleErrors, pageErrors, httpFailures };
      browserResults.push(result);
      console.log(JSON.stringify({ route: result.route, viewport: viewport.name, ok, failed: Object.entries(checks).filter(([,value]) => !value).map(([key]) => key) }));
      const safe = record.route === '/' ? 'homepage' : record.route.replace(/^\//, '').replace(/\/$/, '').replace(/[^a-z0-9]+/gi, '-');
      await page.screenshot({ path: path.join(screenshotDir, `${safe}-${viewport.name}.png`), fullPage: false });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  generatedHtmlRoutes: routeRecords.length,
  routeKinds: Object.fromEntries([...new Set(routeRecords.map(item => item.kind))].sort().map(kind => [kind, routeRecords.filter(item => item.kind === kind).length])),
  indexableRoutes: routeRecords.filter(item => item.kind === 'indexable-live').length,
  noindexLiveRoutes: routeRecords.filter(item => item.kind === 'noindex-live').length,
  governedRedirects: routeRecords.filter(item => item.kind === 'governed-redirect').length,
  affiliateRedirects: routeRecords.filter(item => item.kind === 'affiliate-redirect').length,
  reviewRoutes: routeRecords.filter(item => item.kind === 'review').length,
  staticBlockers: staticBlockers.length,
  sourceBlockers: sourceAudit.blockers.length,
  publicLocalStylePages: sourceAudit.localStylePages.length,
  arbitraryContainerDeclarations: sourceAudit.arbitraryContainers.length,
  browserRoutes: browserRoutes.length,
  browserMeasurements: browserResults.length,
  browserPasses: browserResults.filter(item => item.ok).length,
  browserFailures: browserResults.filter(item => !item.ok).length,
  sitemapUrls: sitemapUrls.length,
};

const failed = staticBlockers.length > 0 || sourceAudit.blockers.length > 0 || browserFailed;
const report = {
  failed,
  summary,
  staticBlockers,
  sourceAudit,
  routeRecords: routeRecords.map(({ html, ...record }) => record),
  sitemapUrls,
  browserResults,
};
await fs.writeFile(path.join(outDir, 'CBW_SITE_STANDARD_FINAL_053G.json'), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# CBW Site Standard Final Gate — 053G',
  '',
  `Generated: ${summary.generatedAt}`,
  `Status: **${failed ? 'BLOCKED' : 'PASS'}**`,
  '',
  '## Summary',
  '',
  ...Object.entries(summary).map(([key, value]) => `- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`),
  '',
  '## Static blockers',
  '',
  ...(staticBlockers.length ? staticBlockers.map(item => `- ${item}`) : ['- none']),
  '',
  '## Source blockers',
  '',
  ...(sourceAudit.blockers.length ? sourceAudit.blockers.map(item => `- ${item}`) : ['- none']),
  '',
  '## Browser failures',
  '',
  ...browserResults.filter(item => !item.ok).map(item => `- ${item.route} · ${item.viewport.name}: ${Object.entries(item.checks).filter(([,value]) => !value).map(([key]) => key).join(', ')}`),
  '',
].join('\n');
await fs.writeFile(path.join(outDir, 'CBW_SITE_STANDARD_FINAL_053G.md'), `${markdown}\n`);

console.log(JSON.stringify(summary, null, 2));
if (failed) process.exit(1);
