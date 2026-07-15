import type { APIRoute } from 'astro';
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

  // ── SITEMAP POLICY ─────────────────────────────────────────────────────────
  // The sitemap must contain ONLY indexable, self-canonical pages.
  // Pages serving noindex (or noindex,nofollow) must NOT appear here —
  // conflicting signals confuse crawlers and waste crawl budget.
  //
  // Legacy sections (/bonuses/, /bonus-codes/, /compare/, /coins/,
  // /use-cases/, /categories/, /countries/, /reviewers/,
  // /best-exchanges-for/) were RETIRED on 2026-07-14 (Legacy Sections
  // Retirement v1): routes deleted, hubs replaced by noindex redirect stubs.
  // Portal-era /guides/* articles and the old /exchanges/{slug}/ review
  // template were RETIRED on 2026-07-14 (Homepage/Redesign Alignment v1):
  // both replaced by noindex redirect stubs; only the six live /{slug}/
  // review pages remain indexable.
  // Also excluded by design: /go/ (robots-blocked), /contact/ (noindex),
  // the hub redirect stubs, and the /exchanges/{slug}/ redirect stubs for
  // the six live promo exchanges.
  //
  // New sections enter this sitemap ONLY as part of the approved
  // architecture (e.g. future evidence-backed /promo-codes/{country}/ pages
  // via geoRankings.ts) after owner approval.
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily', lastmod: today, type: 'static' as const },
    { url: '/exchanges/', priority: '0.85', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    // CoinEx recovery: indexable neutral "Current Status" page (no offer/CTA) at
    // the root exchange URL pattern (/coinex/). Legacy /exchanges/coinex/ 301s here.
    { url: '/coinex/', priority: '0.3', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/promo-codes/', priority: '0.9', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/faq/', priority: '0.6', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    // Site info / methodology — indexed for E-E-A-T signals
    { url: '/methodology/', priority: '0.5', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/about/', priority: '0.4', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/editorial-policy/', priority: '0.4', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/update-policy/', priority: '0.35', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    // Trust / legal pages — indexed for transparency signals (affiliate disclosure, disclaimer, privacy policy)
    // NOTE: /contact/ is intentionally excluded — it carries noindex meta and provides no crawl value.
    // Rule: noindexed pages must NOT appear in the sitemap (conflicting signals confuse crawlers).
    { url: '/affiliate-disclosure/', priority: '0.3', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/disclaimer/', priority: '0.3', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/privacy-policy/', priority: '0.3', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/terms/', priority: '0.3', changefreq: 'monthly', lastmod: today, type: 'static' as const },
  ];

  // Rich exchange pages — dedicated /slug/ routes (ExchangePromoPage template)
  // Highest priority: canonical money pages; outranks generic /exchanges/slug/ entries.
  const richExchangePages = [
    { url: '/bybit/',  priority: '0.97', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/mexc/',   priority: '0.97', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/okx/',    priority: '0.97', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/bitget/', priority: '0.97', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/kucoin/', priority: '0.97', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/bingx/',  priority: '0.97', changefreq: 'weekly', lastmod: today, type: 'static' as const },
  ];

  // Noindexed page groups (bonuses, bonus-codes, categories, countries, compare,
  // coins, use-cases, reviewers, guides, legacy /exchanges/{slug}/ reviews) are
  // deliberately NOT generated into the sitemap — see SITEMAP POLICY above.

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
    ...richExchangePages,
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

  // Image sitemap entries were retired together with the legacy
  // /exchanges/{slug}/ review pages (Homepage/Redesign Alignment v1) —
  // no sitemap URL carries image tags anymore.

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xhtmlNs}>
${pageEntries.map(page => {
  return `  <url>
    <loc>${site}${page.url}</loc>
    <lastmod>${'lastmod' in page ? page.lastmod : today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${page.alternates ? '\n' + page.alternates : ''}
  </url>`;
}).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
