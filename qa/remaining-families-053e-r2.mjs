import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = 'http://127.0.0.1:4321';
const outDir = 'qa-artifacts';

const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900, index: 0 },
  { name: 'tablet-768x1024', width: 768, height: 1024, index: 1 },
  { name: 'mobile-390x844', width: 390, height: 844, index: 2 },
];

const routes = [
  { name: 'exchanges', path: '/exchanges/', family: 'directory', useful: '.directory-list-section', budget: [520,560,520] },
  { name: 'promo-codes', path: '/promo-codes/', family: 'promo', useful: '.promo-ranking-section', budget: [520,560,520] },
  { name: 'methodology', path: '/methodology/', family: 'methodology', useful: '.mth-section', budget: [540,580,540] },
  { name: 'faq', path: '/faq/', family: 'faq', useful: '.faq-group', budget: [540,580,540] },
  { name: 'about', path: '/about/', family: 'info', useful: '.prose', budget: [540,580,540] },
  { name: 'editorial-policy', path: '/editorial-policy/', family: 'info', useful: '.prose', budget: [540,580,540] },
  { name: 'update-policy', path: '/update-policy/', family: 'info', useful: '.prose', budget: [540,580,540] },
  { name: 'affiliate-disclosure', path: '/affiliate-disclosure/', family: 'legal', useful: '.ad-prose', budget: [500,540,500] },
  { name: 'disclaimer', path: '/disclaimer/', family: 'info', useful: '.prose', budget: [540,580,540] },
  { name: 'privacy-policy', path: '/privacy-policy/', family: 'info', useful: '.prose', budget: [540,580,540] },
  { name: 'terms', path: '/terms/', family: 'info', useful: '.prose', budget: [540,580,540] },
  { name: 'contact', path: '/contact/', family: 'contact', useful: '.contact-grid', budget: [500,540,500] },
];

const redirects = [
  { name: 'categories', path: '/categories/', target: '/promo-codes/', canonical: 'https://cryptobonusworld.com/promo-codes/' },
  { name: 'countries', path: '/countries/', target: '/', canonical: 'https://cryptobonusworld.com/' },
  { name: 'guide-detail', path: '/guides/how-crypto-bonuses-work/', target: '/', canonical: 'https://cryptobonusworld.com/' },
  { name: 'reviewers', path: '/reviewers/', target: '/about/', canonical: 'https://cryptobonusworld.com/about/' },
];

const directoryActions = ['/go/bybit','/go/mexc','/go/okx','/go/bitget','/go/kucoin','/go/bingx'];
const promoActions = ['/go/bybit','/go/bitget','/go/okx','/go/mexc','/go/kucoin','/go/bingx'];
const promoNames = ['Bybit','Bitget','OKX','MEXC','KuCoin','BingX'];
const normalize = value => (value || '').replace(/\/$/, '');
const roundedWidth = locator => locator.evaluate(node => Math.round(node.getBoundingClientRect().width * 100) / 100);

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
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) httpFailures.push({ status: response.status(), url: response.url() }); });

      const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
      const dimensions = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bsw: document.body.scrollWidth }));
      const useful = page.locator(route.useful).first();
      const h1 = page.locator('h1');
      const usefulCount = await useful.count();
      const usefulBox = usefulCount ? await useful.boundingBox() : null;
      const h1Box = await h1.first().boundingBox();
      const checks = {
        http200: response?.status() === 200,
        oneHeader: await page.locator('.site-header').count() === 1,
        oneFooter: await page.locator('.site-footer').count() === 1,
        oneH1: await h1.count() === 1,
        h1Visible: Boolean(h1Box && h1Box.y < viewport.height && h1Box.y + h1Box.height <= viewport.height),
        usefulPresent: usefulCount === 1,
        usefulWithinBudget: Boolean(usefulBox && usefulBox.y <= route.budget[viewport.index] + 1),
        noFinderLinks: await page.locator('a[href="/#finder"]').count() === 0,
        noOverflow: dimensions.sw <= dimensions.cw + 1 && dimensions.bsw <= dimensions.cw + 1,
        noConsoleErrors: consoleErrors.length === 0,
        noPageErrors: pageErrors.length === 0,
        noHttpFailures: httpFailures.length === 0,
      };

      if (route.family === 'directory') {
        const hrefs = (await page.locator('.exchange-directory-card__action').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).map(normalize);
        const colors = await page.locator('.exchange-directory-card__action').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
        const schema = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => { try { return JSON.parse(node.textContent || '{}'); } catch { return null; } }).filter(Boolean));
        const faq = schema.find(item => item['@type'] === 'FAQPage');
        Object.assign(checks, {
          sixCards: await page.locator('.exchange-directory-card').count() === 6,
          exactActions: JSON.stringify(hrefs) === JSON.stringify(directoryActions),
          amberActions: colors.length === 6 && colors.every(color => color === 'rgb(247, 147, 26)'),
          sixFaqItems: await page.locator('.directory-faq details').count() === 6,
          faqSchemaParity: Array.isArray(faq?.mainEntity) && faq.mainEntity.length === 6,
          noLegacyDirectoryClasses: await page.locator('.exd-grid-wrap, .exd-text-wrap, .page-hero').count() === 0,
        });
      }

      if (route.family === 'promo') {
        const names = (await page.locator('.promo-exchange').allTextContents()).map(value => value.trim());
        const hrefs = (await page.locator('.promo-action').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).map(normalize);
        const colors = await page.locator('.promo-action').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
        const ranks = await page.locator('.promo-row').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('data-rank'))));
        const schema = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => { try { return JSON.parse(node.textContent || '{}'); } catch { return null; } }).filter(Boolean));
        const faq = schema.find(item => item['@type'] === 'FAQPage');
        Object.assign(checks, {
          preservedOrder: JSON.stringify(names) === JSON.stringify(promoNames),
          sixRows: names.length === 6,
          sixRanks: JSON.stringify(ranks) === JSON.stringify([1,2,3,4,5,6]),
          sixCodeRows: await page.locator('.promo-code-cell .pcc-row').count() === 6,
          exactActions: JSON.stringify(hrefs) === JSON.stringify(promoActions),
          amberActions: colors.length === 6 && colors.every(color => color === 'rgb(247, 147, 26)'),
          eightFaqItems: await page.locator('.promo-faq details').count() === 8,
          faqSchemaParity: Array.isArray(faq?.mainEntity) && faq.mainEntity.length === 8,
          directTop10Link: await page.locator('a[href="/#exchanges"]').count() >= 1,
          noLegacyPromoClasses: await page.locator('.pc-table-wrap, .pc-text-wrap, .page-hero').count() === 0,
        });
      }

      if (route.family === 'methodology') {
        const wideWidths = await page.locator('.mth-wide').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().width * 100) / 100));
        const proseWidths = await page.locator('.mth-prose').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().width * 100) / 100));
        Object.assign(checks, {
          sixSteps: await page.locator('.mth-step').count() === 6,
          sixCriteria: await page.locator('.mth-criterion').count() === 6,
          standardWidths: wideWidths.length > 2 && wideWidths.every(value => value <= Math.min(viewport.width,960) + .5),
          proseWidths: proseWidths.length > 2 && proseWidths.every(value => value <= Math.min(viewport.width,760) + .5),
          onePageHero: await page.locator('.page-hero').count() === 1,
        });
      }

      if (route.family === 'faq') {
        const schema = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => { try { return JSON.parse(node.textContent || '{}'); } catch { return null; } }).filter(Boolean));
        const faq = schema.find(item => item['@type'] === 'FAQPage');
        Object.assign(checks, {
          fiveGroups: await page.locator('.faq-group').count() === 5,
          twentyItems: await page.locator('.faq-item').count() === 20,
          faqSchemaParity: Array.isArray(faq?.mainEntity) && faq.mainEntity.length === 20,
          proseWidth: await roundedWidth(page.locator('.faq-text-wrap').first()) <= Math.min(viewport.width,760) + .5,
          firstGroupWidth: await roundedWidth(page.locator('.faq-group').first()) <= Math.min(viewport.width,760) + .5,
        });
      }

      if (route.family === 'info' || route.family === 'legal') {
        Object.assign(checks, {
          proseWidth: usefulCount === 1 && await roundedWidth(useful) <= Math.min(viewport.width,760) + .5,
          oneInfoFrame: await page.locator('.info-page-frame').count() === 1,
        });
      }

      if (route.family === 'contact') {
        const container = page.locator('.info-page .container').first();
        const submitColor = await page.locator('.form-submit').evaluate(node => getComputedStyle(node).backgroundColor);
        Object.assign(checks, {
          contactTwoColumnsDesktop: viewport.width < 769 || await page.locator('.contact-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length === 2),
          formFields: await page.locator('.contact-form input, .contact-form select, .contact-form textarea').count() >= 4,
          amberSubmit: submitColor === 'rgb(247, 147, 26)',
          standardWidth: await roundedWidth(container) <= Math.min(viewport.width,960) + .5,
          oneInfoFrame: await page.locator('.info-page-frame').count() === 1,
        });
      }

      const ok = Object.values(checks).every(Boolean);
      failed ||= !ok;
      const result = { route, viewport, ok, checks, geometry: { h1: h1Box, useful: usefulBox }, dimensions, consoleErrors, pageErrors, httpFailures };
      results.push(result);
      console.log(JSON.stringify(result, null, 2));
      await page.screenshot({ path: `${outDir}/${route.name}-${viewport.name}-first.png`, fullPage: false });
      await page.screenshot({ path: `${outDir}/${route.name}-${viewport.name}-full.png`, fullPage: true });
      await context.close();
    }
  }

  for (const redirect of redirects) {
    const response = await fetch(`${baseUrl}${redirect.path}`, { redirect: 'manual' });
    const html = await response.text();
    const checks = {
      http200: response.status === 200,
      robots: /<meta name="robots" content="noindex, follow"\s*\/>/.test(html),
      canonical: html.includes(`<link rel="canonical" href="${redirect.canonical}"`),
      refresh: html.includes(`content="0;url=${redirect.target}"`),
      visibleTarget: html.includes(`href="${redirect.target}"`),
      oneGovernedCard: (html.match(/class="redirect-card"/g) || []).length === 1,
      noLegacyStyles: !html.includes('Redirect stub') && !html.includes('--bg:#070b12') && !html.includes('class="msg"'),
    };
    const ok = Object.values(checks).every(Boolean);
    failed ||= !ok;
    const result = { redirect, ok, checks };
    redirectResults.push(result);
    console.log(JSON.stringify(result, null, 2));
  }
} finally {
  await browser.close();
}

const report = {
  failed,
  summary: {
    pageMeasurements: results.length,
    pagePasses: results.filter(item => item.ok).length,
    pageFailures: results.filter(item => !item.ok).length,
    redirectPasses: redirectResults.filter(item => item.ok).length,
    redirectFailures: redirectResults.filter(item => !item.ok).length,
  },
  results,
  redirectResults,
};
await writeFile(`${outDir}/CBW_REMAINING_FAMILIES_STANDARD_053E_R2.json`, JSON.stringify(report, null, 2));
if (failed) process.exit(1);
