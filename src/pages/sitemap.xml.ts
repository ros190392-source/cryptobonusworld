import type { APIRoute } from 'astro';
import exchanges from '../data/exchanges.json';
import categories from '../data/categories.json';
import countries from '../data/countries.json';
import comparePairs from '../data/compare-pairs.json';
import guides from '../data/guides.json';
import { COINS } from '../data/coins';
import { USE_CASES } from '../data/use-cases';
import { BONUS_CODES } from '../data/bonus-codes';
import {
  getAvailableLocalesForPage,
  buildSitemapAlternates,
  SITEMAP_XHTML_NS,
} from '../utils/i18n';

/**
 * Sitemap generator.
 *
 * Multilingual readiness:
 *   - getAvailableLocalesForPage() controls which locales exist for each page.
 *   - Currently returns ['en'] only → no xhtml:link alternates emitted.
 *   - When translations are added, update getAvailableLocalesForPage() in
 *     src/utils/i18n.ts and the xhtml:link entries appear automatically.
 *
 * To activate multilingual sitemap:
 *   1. Add SITEMAP_XHTML_NS to the <urlset> opening tag (see comment below).
 *   2. Call buildSitemapAlternates() for pages with multiple locales.
 *   3. getAvailableLocalesForPage() returns the locales — update it as pages
 *      are translated.
 *
 * Activation example (when /tr/ pages exist):
 *   Change:  <urlset xmlns="...">
 *   To:      <urlset xmlns="..." ${SITEMAP_XHTML_NS}>
 *   Then:    add ${alternates} inside each <url> block.
 */

export const GET: APIRoute = () => {
  const site = 'https://cryptobonusworld.com';
  const today = new Date().toISOString().split('T')[0];

  // ── Determine if any non-English locale pages exist ─────────────────────
  // Used to decide whether to include the xhtml namespace.
  // When all pages are English-only, this remains false.
  let hasMultipleLocales = false;

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily', type: 'static' as const },
    { url: '/bonuses/', priority: '0.9', changefreq: 'daily', type: 'static' as const },
    { url: '/exchanges/', priority: '0.85', changefreq: 'weekly', type: 'static' as const },
    { url: '/countries/', priority: '0.75', changefreq: 'monthly', type: 'static' as const },
    { url: '/compare/', priority: '0.8', changefreq: 'weekly', type: 'static' as const },
    { url: '/guides/', priority: '0.75', changefreq: 'weekly', type: 'static' as const },
    // New programmatic SEO hubs
    { url: '/coins/', priority: '0.85', changefreq: 'weekly', type: 'static' as const },
    { url: '/use-cases/', priority: '0.85', changefreq: 'weekly', type: 'static' as const },
    { url: '/bonus-codes/', priority: '0.9', changefreq: 'weekly', type: 'static' as const },
    { url: '/methodology/', priority: '0.5', changefreq: 'monthly', type: 'static' as const },
    { url: '/about/', priority: '0.4', changefreq: 'monthly', type: 'static' as const },
    { url: '/affiliate-disclosure/', priority: '0.3', changefreq: 'monthly', type: 'static' as const },
    { url: '/disclaimer/', priority: '0.3', changefreq: 'monthly', type: 'static' as const },
    { url: '/privacy-policy/', priority: '0.3', changefreq: 'monthly', type: 'static' as const },
  ];

  // Top-tier money pages get boosted priority for crawl budget signalling
  const TOP_EXCHANGE_SLUGS = new Set(['bybit', 'okx', 'mexc', 'phemex', 'kucoin', 'binance', 'bitget']);
  const TOP_COMPARE_SLUGS = new Set(['bybit', 'okx', 'mexc', 'phemex', 'kucoin', 'binance', 'bitget']);

  const exchangePages = exchanges.map(ex => ({
    url: `/exchanges/${ex.slug}/`,
    priority: TOP_EXCHANGE_SLUGS.has(ex.slug) ? '0.90' : '0.85',
    changefreq: 'weekly',
    lastmod: (ex as any).lastVerified ?? ex.updatedAt,
    type: 'exchange' as const,
    slug: ex.slug,
  }));

  // Bonus landing pages — high-intent transactional SEO pages
  const bonusPages = exchanges.map(ex => ({
    url: `/bonuses/${ex.slug}-bonus/`,
    priority: '0.80',
    changefreq: 'weekly',
    lastmod: (ex as any).lastVerified ?? ex.updatedAt,
    type: 'static' as const,
  }));

  const categoryPages = categories.map(cat => ({
    url: `/categories/${cat.slug}/`,
    priority: '0.8',
    changefreq: 'weekly',
    lastmod: today,
    type: 'category' as const,
    slug: cat.slug,
  }));

  const countryPages = countries.map(c => ({
    url: `/countries/${c.slug}/`,
    priority: '0.75',
    changefreq: 'weekly',
    lastmod: today,
    type: 'country' as const,
    slug: c.slug,
  }));

  const guidePages = guides.map(g => {
    // How-To Guides and Bonus Guides are highest-intent for SERP
    const cat: string = (g as any).category ?? '';
    let gPriority = '0.75';
    if (cat === 'How-To Guides') gPriority = '0.82';
    else if (cat === 'Bonus Guides') gPriority = '0.80';
    else if (cat === 'Exchange Guides') gPriority = '0.78';
    return {
      url: `/guides/${g.slug}/`,
      priority: gPriority,
      changefreq: 'weekly',
      lastmod: g.lastUpdated,
      type: 'static' as const,
    };
  });

  const comparePages = comparePairs.map(p => {
    // Top-tier pairs (both exchanges in top set) get priority boost
    const [slugA, slugB] = (p.pair ?? '').split('-vs-');
    const isTopPair = TOP_COMPARE_SLUGS.has(slugA) || TOP_COMPARE_SLUGS.has(slugB);
    const bothTop = TOP_COMPARE_SLUGS.has(slugA) && TOP_COMPARE_SLUGS.has(slugB);
    return {
      url: `/compare/${p.pair}/`,
      priority: bothTop ? '0.85' : isTopPair ? '0.78' : '0.70',
      changefreq: 'weekly',
      lastmod: today,
      type: 'compare' as const,
      slug: p.pair,
    };
  });

  // ── New programmatic SEO page types ────────────────────────────────────────
  const coinPages = COINS.map(c => ({
    url: `/coins/${c.slug}/`,
    priority: c.priority === 'very-high' ? '0.85' : '0.8',
    changefreq: 'weekly',
    lastmod: today,
    type: 'static' as const,
  }));

  const useCasePages = USE_CASES.map(uc => ({
    url: `/use-cases/${uc.slug}/`,
    priority: uc.priority === 'very-high' ? '0.85' : '0.8',
    changefreq: 'weekly',
    lastmod: today,
    type: 'static' as const,
  }));

  const bonusCodePages = BONUS_CODES.map(b => ({
    url: `/bonus-codes/${b.exchangeSlug}/`,
    priority: b.priority === 'very-high' ? '0.88' : '0.82',
    changefreq: 'weekly',
    lastmod: today,
    type: 'static' as const,
  }));

  type PageEntry = {
    url: string;
    priority: string;
    changefreq: string;
    lastmod?: string;
    type: 'static' | 'exchange' | 'category' | 'country' | 'compare';
    slug?: string;
  };

  const allPages: PageEntry[] = [
    ...staticPages,
    ...exchangePages,
    ...bonusPages,
    ...categoryPages,
    ...countryPages,
    ...comparePages,
    ...guidePages,
    ...coinPages,
    ...useCasePages,
    ...bonusCodePages,
  ];

  // ── Build page entries with locale awareness ──────────────────────────────
  const pageEntries = allPages.map(page => {
    const availableLocales = getAvailableLocalesForPage(page.type, page.slug);
    const isMultilingual = availableLocales.length > 1;
    if (isMultilingual) hasMultipleLocales = true;

    const alternates = isMultilingual
      ? buildSitemapAlternates(page.url, availableLocales, site)
      : '';

    return { ...page, availableLocales, alternates };
  });

  // ── Namespace: only include xhtml ns when multilingual pages exist ────────
  // When hasMultipleLocales is true, add SITEMAP_XHTML_NS to urlset.
  const xhtmlNs = hasMultipleLocales ? ` ${SITEMAP_XHTML_NS}` : '';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xhtmlNs}>
${pageEntries.map(page => `  <url>
    <loc>${site}${page.url}</loc>
    <lastmod>${'lastmod' in page ? page.lastmod : today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${page.alternates ? '\n' + page.alternates : ''}
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
