import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const SITE_STANDARD_ROUTES = [
  { name: 'homepage', path: '/', family: 'homepage', hero: '.hero', useful: '.top10-section', contract: 'homepage' },
  { name: 'bybit', path: '/bybit/', family: 'exchange-review', hero: '.brand-hero', useful: '.compact-facts, .seo-intro-block, .p2-section', contract: 'exchange' },
  { name: 'mexc', path: '/mexc/', family: 'exchange-review', hero: '.brand-hero', useful: '.compact-facts, .seo-intro-block, .p2-section', contract: 'exchange' },
  { name: 'okx', path: '/okx/', family: 'exchange-review', hero: '.brand-hero', useful: '.compact-facts, .seo-intro-block, .p2-section', contract: 'exchange' },
  { name: 'exchanges', path: '/exchanges/', family: 'exchange-directory', hero: '.page-hero', useful: '.exd-grid-section', contract: 'standard' },
  { name: 'promo-codes', path: '/promo-codes/', family: 'promo-directory', hero: '.page-hero', useful: '.pc-table-section', contract: 'standard' },
  { name: 'guides', path: '/guides/', family: 'guide-directory', hero: '.page-hero, .guide-hero, main section:first-of-type', useful: '.guide-grid, main section:nth-of-type(2), main .section', contract: 'standard' },
  { name: 'guide-detail', path: '/guides/how-crypto-bonuses-work/', family: 'guide-detail', hero: '.page-hero, .guide-hero, article header, main section:first-of-type', useful: 'article, .guide-content, main section:nth-of-type(2)', contract: 'standard' },
  { name: 'methodology', path: '/methodology/', family: 'methodology-trust', hero: '.page-hero', useful: '.mth-section', contract: 'standard' },
  { name: 'faq', path: '/faq/', family: 'faq', hero: '.faq-intro', useful: '.faq-group', contract: 'standard' },
  { name: 'about', path: '/about/', family: 'methodology-trust', hero: '.page-header', useful: '.prose', contract: 'standard' },
  { name: 'affiliate-disclosure', path: '/affiliate-disclosure/', family: 'legal-contact', hero: '.ad-header', useful: '.ad-prose', contract: 'standard' },
  { name: 'contact', path: '/contact/', family: 'legal-contact', hero: '.page-header', useful: '.contact-grid', contract: 'standard' },
  { name: 'countries', path: '/countries/', family: 'country-foundation', hero: 'main section:first-of-type, .page-hero', useful: 'main section:nth-of-type(2), main .section, main .container', contract: 'standard' },
  { name: 'categories', path: '/categories/', family: 'utility-directory', hero: 'main section:first-of-type, .page-hero', useful: 'main section:nth-of-type(2), main .section, main .container', contract: 'standard' },
  { name: 'coins', path: '/coins/', family: 'utility-directory', hero: 'main section:first-of-type, .page-hero', useful: 'main section:nth-of-type(2), main .section, main .container', contract: 'standard' },
  { name: 'compare', path: '/compare/', family: 'utility-directory', hero: 'main section:first-of-type, .page-hero', useful: 'main section:nth-of-type(2), main .section, main .container', contract: 'standard' },
  { name: 'exchange-directory-detail', path: '/exchanges/binance/', family: 'exchange-directory-detail', hero: 'main section:first-of-type, .page-hero', useful: 'main section:nth-of-type(2), article, main .container', contract: 'standard' },
];

export const SITE_STANDARD_VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const CONTAINER_SELECTORS = [
  '.shell', '.top10-wrap', '.bw-wrap', '.p2-inner', '.exd-grid-wrap', '.exd-text-wrap',
  '.pc-table-wrap', '.pc-text-wrap', '.mth-wide', '.mth-prose', '.faq-text-wrap',
  '.info-page .container', '.container', '.page-hero__inner', '.audit-container',
];

function round(value) {
  return Math.round(value * 100) / 100;
}

function boxToRect(box) {
  if (!box) return null;
  return {
    x: round(box.x),
    y: round(box.y),
    width: round(box.width),
    height: round(box.height),
    top: round(box.y),
    right: round(box.x + box.width),
    bottom: round(box.y + box.height),
    left: round(box.x),
  };
}

async function firstVisibleRect(page, selector) {
  if (!selector) return null;
  const candidates = page.locator(selector);
  const count = await candidates.count();
  for (let index = 0; index < count; index += 1) {
    const locator = candidates.nth(index);
    if (await locator.isVisible().catch(() => false)) {
      return boxToRect(await locator.boundingBox());
    }
  }
  return null;
}

async function visibleContainerWidths(page) {
  const values = [];
  for (const selector of CONTAINER_SELECTORS) {
    const candidates = page.locator(selector);
    const count = Math.min(await candidates.count(), 8);
    for (let index = 0; index < count; index += 1) {
      const locator = candidates.nth(index);
      if (!(await locator.isVisible().catch(() => false))) continue;
      const box = await locator.boundingBox();
      if (!box || box.width < 100) continue;
      values.push({ selector, width: round(box.width), top: round(box.y) });
    }
  }
  return values;
}

function renderMarkdown(report) {
  const rows = report.results.map(item =>
    `| ${item.route.path} | ${item.route.family} | ${item.viewport.name} | ${item.firstScreenPass ? 'PASS' : 'FAIL'} | ${item.rects.firstUseful?.top ?? 'missing'} | ${item.widestContainer?.width ?? 'n/a'} | ${item.fullRankingRows} | ${item.horizontalOverflow} |`,
  );

  return [
    '# CBW First-Viewport Measurements — 053A',
    '',
    `Generated: ${report.summary.generatedAt}`,
    '',
    `- Measurements: ${report.summary.measurements}`,
    `- First-screen passes: ${report.summary.firstScreenPasses}`,
    `- First-screen failures: ${report.summary.firstScreenFailures}`,
    `- Overflow failures: ${report.summary.overflowFailures}`,
    `- Measurements with unexpected errors: ${report.summary.unexpectedErrorMeasurements}`,
    '',
    '## Homepage',
    '',
    ...report.summary.homepage.map(item => `- ${item.viewport}: ${item.pass ? 'PASS' : 'FAIL'}; rankingTop=${item.rankingTop}; fullRows=${item.fullRows}; rowsBegun=${item.rowsBegun}; blankBeforeRanking=${item.blankBeforeRanking}`),
    '',
    '## All measurements',
    '',
    '| Route | Family | Viewport | First screen | Useful top | Widest container | Full ranking rows | Overflow |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
  ].join('\n');
}

export async function runFirstViewportMeasurements(options = {}) {
  const baseUrl = options.baseUrl ?? process.env.CBW_AUDIT_BASE_URL ?? 'http://127.0.0.1:4321';
  const outputDir = path.resolve(options.outputDir ?? path.join(process.cwd(), 'reports', 'site-standard'));
  const screenshotDir = path.join(outputDir, 'screenshots');
  await fs.mkdir(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const route of SITE_STANDARD_ROUTES) {
      for (const viewport of SITE_STANDARD_VIEWPORTS) {
        const page = await browser.newPage({ viewport });
        const consoleErrors = [];
        const pageErrors = [];
        const httpFailures = [];

        await page.route('**/api/exchange-votes**', async handler => {
          await handler.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ votes: 0, userVote: null }) });
        });
        page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('response', response => {
          if (response.status() >= 400) httpFailures.push({ status: response.status(), url: response.url() });
        });

        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
        const dimensions = await page.evaluate(() => ({
          documentScrollWidth: document.documentElement.scrollWidth,
          documentClientWidth: document.documentElement.clientWidth,
          documentScrollHeight: document.documentElement.scrollHeight,
          bodyScrollWidth: document.body.scrollWidth,
        }));

        const headerRect = await firstVisibleRect(page, '.site-header');
        const h1Rect = await firstVisibleRect(page, 'main h1, h1');
        const heroRect = await firstVisibleRect(page, route.hero);
        const usefulRect = await firstVisibleRect(page, route.useful);
        const footerRect = await firstVisibleRect(page, '.site-footer');
        const containers = await visibleContainerWidths(page);
        const widestContainer = containers.length
          ? containers.reduce((best, current) => current.width > best.width ? current : best)
          : null;

        const top10Rows = route.contract === 'homepage'
          ? await page.locator('.top10-row').evaluateAll((nodes, viewportHeight) => nodes.map(node => {
              const rect = node.getBoundingClientRect();
              return {
                top: rect.top,
                bottom: rect.bottom,
                height: rect.height,
                fullyVisible: rect.top >= 0 && rect.bottom <= viewportHeight,
                beginsVisible: rect.top < viewportHeight && rect.bottom > 0,
              };
            }), viewport.height)
          : [];
        const fullRankingRows = top10Rows.filter(row => row.fullyVisible).length;
        const rankingRowsBegun = top10Rows.filter(row => row.beginsVisible).length;

        const ctaVisible = route.contract === 'exchange'
          ? await page.locator('.bh-cta-btn, .p2-cta-btn, .p2-cta-bar, a[href^="/go/"]').evaluateAll((nodes, viewportHeight) => nodes.some(node => {
              const style = getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && rect.top < viewportHeight && rect.bottom > 0;
            }), viewport.height)
          : null;

        let firstScreenPass;
        if (route.contract === 'homepage') {
          firstScreenPass = viewport.width >= 1000
            ? Boolean(usefulRect && usefulRect.top < viewport.height && fullRankingRows >= 3)
            : viewport.width <= 480
              ? Boolean(usefulRect && usefulRect.top < viewport.height && rankingRowsBegun >= 1)
              : Boolean(usefulRect && usefulRect.top < viewport.height);
        } else if (route.contract === 'exchange') {
          firstScreenPass = Boolean(heroRect && usefulRect && heroRect.top < viewport.height && usefulRect.top < viewport.height && ctaVisible);
        } else {
          firstScreenPass = Boolean(h1Rect && h1Rect.bottom < viewport.height && usefulRect && usefulRect.top < viewport.height);
        }

        const horizontalOverflow = Math.max(dimensions.documentScrollWidth, dimensions.bodyScrollWidth) - dimensions.documentClientWidth;
        const blankBeforeUseful = usefulRect ? Math.max(0, usefulRect.top - (headerRect?.bottom ?? 0)) : null;
        const result = {
          route,
          viewport,
          status: response?.status() ?? null,
          firstScreenPass,
          horizontalOverflow,
          fullRankingRows,
          rankingRowsBegun,
          ctaVisible,
          blankBeforeUseful,
          dimensions,
          rects: { header: headerRect, h1: h1Rect, hero: heroRect, firstUseful: usefulRect, footer: footerRect },
          containers,
          widestContainer,
          consoleErrors,
          pageErrors,
          httpFailures,
        };
        results.push(result);
        console.log(JSON.stringify({
          route: route.path,
          viewport: viewport.name,
          firstScreenPass,
          usefulTop: usefulRect?.top ?? null,
          fullRankingRows,
          blankBeforeUseful,
          widestContainer,
          horizontalOverflow,
        }, null, 2));

        await page.screenshot({
          path: path.join(screenshotDir, `${route.name}-${viewport.name}-first.png`),
          fullPage: false,
        });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    routes: SITE_STANDARD_ROUTES.length,
    viewports: SITE_STANDARD_VIEWPORTS.length,
    measurements: results.length,
    firstScreenPasses: results.filter(item => item.firstScreenPass).length,
    firstScreenFailures: results.filter(item => !item.firstScreenPass).length,
    overflowFailures: results.filter(item => item.horizontalOverflow > 1).length,
    unexpectedErrorMeasurements: results.filter(item => item.consoleErrors.length || item.pageErrors.length || item.httpFailures.length).length,
    homepage: results.filter(item => item.route.contract === 'homepage').map(item => ({
      viewport: item.viewport.name,
      pass: item.firstScreenPass,
      rankingTop: item.rects.firstUseful?.top ?? null,
      fullRows: item.fullRankingRows,
      rowsBegun: item.rankingRowsBegun,
      blankBeforeRanking: item.blankBeforeUseful,
    })),
  };

  const report = { summary, results };
  await fs.writeFile(path.join(outputDir, 'CBW_FIRST_VIEWPORT_MEASUREMENTS_053A.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(outputDir, 'CBW_FIRST_VIEWPORT_MEASUREMENTS_053A.md'), `${renderMarkdown(report)}\n`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFirstViewportMeasurements()
    .then(report => {
      console.log(`First-viewport measurements: ${report.summary.firstScreenPasses} pass / ${report.summary.firstScreenFailures} fail`);
    })
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
}
