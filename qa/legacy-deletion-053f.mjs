import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = 'http://127.0.0.1:4321';
const outDir = 'qa-artifacts';
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const routes = [
  { name: 'homepage', path: '/', family: 'homepage' },
  ...['bybit','mexc','okx','bitget','kucoin','bingx'].map(slug => ({ name: slug, path: `/${slug}/`, family: 'exchange', slug })),
  { name: 'exchanges', path: '/exchanges/', family: 'directory' },
  { name: 'promo-codes', path: '/promo-codes/', family: 'promo' },
  { name: 'faq', path: '/faq/', family: 'faq' },
  { name: 'affiliate-disclosure', path: '/affiliate-disclosure/', family: 'info' },
  { name: 'contact', path: '/contact/', family: 'contact' },
];

const redirects = [
  ...['bybit','mexc','okx','bitget','kucoin','bingx'].map(slug => ({
    path: `/exchanges/${slug}/`,
    target: `/${slug}/`,
    canonical: `https://cryptobonusworld.com/${slug}/`,
  })),
  { path: '/exchanges/binance/', target: '/exchanges/', canonical: 'https://cryptobonusworld.com/exchanges/' },
];

const isAmber = color => ['rgb(247, 147, 26)', 'rgb(255, 173, 61)'].includes(color);
const normalize = value => (value || '').replace(/\/$/, '');

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const redirectResults = [];
let failed = false;

try {
  for (const route of routes) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const httpFailures = [];
      await page.route('**/api/exchange-votes**', async handler => {
        await handler.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ votes: 0, userVote: null }) });
      });
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) httpFailures.push({ status: response.status(), url: response.url() }); });

      const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
      const dimensions = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        bsw: document.body.scrollWidth,
      }));
      const checks = {
        http200: response?.status() === 200,
        oneHeader: await page.locator('.site-header').count() === 1,
        oneFooter: await page.locator('.site-footer').count() === 1,
        oneH1: await page.locator('h1').count() === 1,
        noFinderLinks: await page.locator('a[href="/#finder"]').count() === 0,
        noLegacyRedirectMarkup: await page.locator('.msg').count() === 0,
        noOverflow: dimensions.sw <= dimensions.cw + 1 && dimensions.bsw <= dimensions.cw + 1,
        noConsoleErrors: consoleErrors.length === 0,
        noPageErrors: pageErrors.length === 0,
        noHttpFailures: httpFailures.length === 0,
      };

      if (route.family === 'homepage') {
        Object.assign(checks, {
          tenRows: await page.locator('.top10-row').count() === 10,
          sixApprovedPrimaryActions: await page.locator('.top10-primary[href^="/go/"]').count() === 6,
          fourNoPrimaryActions: await page.locator('.top10-row:not(:has(.top10-primary))').count() === 4,
          rankingFirst: await page.locator('.top10-section').evaluate((node, height) => node.getBoundingClientRect().top < height, viewport.height),
        });
      }

      if (route.family === 'exchange') {
        const primary = page.locator(`.cbw-exchange-primary[href="/go/${route.slug}/"]`).first();
        Object.assign(checks, {
          oneGovernedPage: await page.locator('.cbw-exchange-page').count() === 1,
          oneHero: await page.locator('.cbw-exchange-hero').count() === 1,
          oneFactsGrid: await page.locator('.cbw-exchange-facts').count() === 1,
          primaryActionPresent: await primary.count() === 1,
          primaryActionAmber: await primary.evaluate(node => isAmber(getComputedStyle(node).backgroundColor)),
          noLegacyExchangeClasses: await page.locator('.p2-section, .ep-section, .mexc-section, .brand-hero, .compact-facts').count() === 0,
        });
      }

      if (route.family === 'directory') {
        Object.assign(checks, {
          sixCards: await page.locator('.exchange-directory-card').count() === 6,
          sixActions: await page.locator('.exchange-directory-card__action[href^="/go/"]').count() === 6,
          noLegacyDirectoryClasses: await page.locator('.exd-grid-wrap, .exd-text-wrap, .exd-grid-section').count() === 0,
        });
      }

      if (route.family === 'promo') {
        const names = (await page.locator('.promo-exchange').allTextContents()).map(value => value.trim());
        const hrefs = (await page.locator('.promo-action').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).map(normalize);
        Object.assign(checks, {
          sixRows: await page.locator('.promo-row').count() === 6,
          preservedOrder: JSON.stringify(names) === JSON.stringify(['Bybit','OKX','Bitget','MEXC','KuCoin','BingX']),
          exactActions: JSON.stringify(hrefs) === JSON.stringify(['/go/bybit','/go/okx','/go/bitget','/go/mexc','/go/kucoin','/go/bingx']),
          noLegacyPromoClasses: await page.locator('.pc-table-wrap, .pc-text-wrap, .pc-table-section').count() === 0,
        });
      }

      if (route.family === 'faq') {
        Object.assign(checks, {
          fiveGroups: await page.locator('.faq-group').count() === 5,
          twentyItems: await page.locator('.faq-item').count() === 20,
          proseWidth: await page.locator('.faq-text-wrap').first().evaluate(node => node.getBoundingClientRect().width <= Math.min(window.innerWidth, 760) + .5),
        });
      }

      if (route.family === 'info') {
        Object.assign(checks, {
          oneInfoFrame: await page.locator('.info-page-frame').count() === 1,
          proseWidth: await page.locator('.ad-prose').evaluate(node => node.getBoundingClientRect().width <= Math.min(window.innerWidth, 760) + .5),
        });
      }

      if (route.family === 'contact') {
        const submit = page.locator('.form-submit');
        Object.assign(checks, {
          oneInfoFrame: await page.locator('.info-page-frame').count() === 1,
          formFields: await page.locator('.contact-form input, .contact-form select, .contact-form textarea').count() >= 4,
          amberSubmit: await submit.evaluate(node => isAmber(getComputedStyle(node).backgroundColor)),
        });
      }

      const ok = Object.values(checks).every(Boolean);
      failed ||= !ok;
      results.push({ route, viewport, ok, checks, dimensions, consoleErrors, pageErrors, httpFailures });
      console.log(JSON.stringify(results.at(-1), null, 2));
      await page.screenshot({ path: `${outDir}/${route.name}-${viewport.name}-first.png`, fullPage: false });
      await context.close();
    }
  }

  for (const redirect of redirects) {
    const response = await fetch(`${baseUrl}${redirect.path}`, { redirect: 'manual' });
    const html = await response.text();
    const robotsTag = html.match(/<meta[^>]*name=["']robots["'][^>]*>/i)?.[0] ?? '';
    const checks = {
      http200: response.status === 200,
      robotsNoindexFollow: /noindex/i.test(robotsTag) && /follow/i.test(robotsTag),
      canonical: html.includes(`<link rel="canonical" href="${redirect.canonical}"`),
      refresh: html.includes(`content="0;url=${redirect.target}"`),
      visibleTarget: html.includes(`href="${redirect.target}"`),
      governedCard: (html.match(/class="redirect-card"/g) || []).length === 1,
      noLegacyMsg: !/class=["']msg["']/.test(html),
      noStandaloneLegacyStyle: !html.includes('a { color:#16A34A; }'),
    };
    const ok = Object.values(checks).every(Boolean);
    failed ||= !ok;
    redirectResults.push({ redirect, ok, checks });
    console.log(JSON.stringify(redirectResults.at(-1), null, 2));
  }
} finally {
  await browser.close();
}

const report = {
  failed,
  summary: {
    measurements: results.length,
    passes: results.filter(item => item.ok).length,
    failures: results.filter(item => !item.ok).length,
    redirectPasses: redirectResults.filter(item => item.ok).length,
    redirectFailures: redirectResults.filter(item => !item.ok).length,
  },
  results,
  redirectResults,
};
await writeFile(`${outDir}/CBW_LEGACY_DELETION_053F.json`, JSON.stringify(report, null, 2));
if (failed) process.exit(1);
