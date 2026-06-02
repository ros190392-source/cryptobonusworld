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
    { url: '/', priority: '1.0', changefreq: 'daily', lastmod: today, type: 'static' as const },
    { url: '/bonuses/', priority: '0.9', changefreq: 'daily', lastmod: today, type: 'static' as const },
    { url: '/exchanges/', priority: '0.85', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/countries/', priority: '0.75', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/compare/', priority: '0.8', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/guides/', priority: '0.75', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/categories/', priority: '0.7', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    // Programmatic SEO hubs
    { url: '/coins/', priority: '0.85', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/use-cases/', priority: '0.85', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/bonus-codes/', priority: '0.9', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    // E-E-A-T / trust pages
    { url: '/reviewers/', priority: '0.55', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/reviewers/alexandr-shadurskyi/', priority: '0.55', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/reviewers/editorial-team/', priority: '0.5', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/reviewers/alex-morgan/', priority: '0.5', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/reviewers/sarah-chen/', priority: '0.5', changefreq: 'monthly', lastmod: today, type: 'static' as const },
    { url: '/reviewers/james-okonkwo/', priority: '0.5', changefreq: 'monthly', lastmod: today, type: 'static' as const },
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

  const exLastVerifiedMap = Object.fromEntries(
    exchanges.map(e => [e.slug, (e as any).lastVerified ?? e.updatedAt ?? today])
  );
  const comparePages = comparePairs.map(p => {
    // Top-tier pairs (both exchanges in top set) get priority boost
    const [slugA, slugB] = (p.pair ?? '').split('-vs-');
    const isTopPair = TOP_COMPARE_SLUGS.has(slugA) || TOP_COMPARE_SLUGS.has(slugB);
    const bothTop = TOP_COMPARE_SLUGS.has(slugA) && TOP_COMPARE_SLUGS.has(slugB);
    // lastmod = most recently verified exchange in the pair
    const lastmodA = exLastVerifiedMap[slugA] ?? today;
    const lastmodB = exLastVerifiedMap[slugB] ?? today;
    const pairLastmod = lastmodA > lastmodB ? lastmodA : lastmodB;
    return {
      url: `/compare/${p.pair}/`,
      priority: bothTop ? '0.85' : isTopPair ? '0.78' : '0.70',
      changefreq: 'weekly',
      lastmod: pairLastmod,
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

  // Image sitemap entries
  // Exchange pages: OG card + real screenshots (ui, bonus, app) if files exist
  // Real screenshots live at /media/exchanges/{slug}/{type}-{YYYY-MM}.webp
  // Registry maps slug → screenshot dates (null = not yet captured)
  const imageNs = ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';

  // Screenshot registry — populate capturedAt as real screenshots land
  // null = placeholder only, skip from sitemap
  const screenshotRegistry: Record<string, {
    ui?: string;      // YYYY-MM
    bonus?: string;   // YYYY-MM
    app?: string;     // YYYY-MM
    p2p?: string;     // YYYY-MM
    futures?: string; // YYYY-MM
  }> = {
    // Add entries here as screenshots are captured, e.g.:
    // bybit: { ui: '2026-05', bonus: '2026-05', p2p: '2026-05', futures: '2026-05' },
    // binance: { ui: '2026-05', bonus: '2026-05', p2p: '2026-05' },
  };

  function buildImageTags(pageUrl: string): string {
    const slug = pageUrl.replace('/exchanges/', '').replace(/\/$/, '');
    const ex = exchanges.find((e: any) => e.slug === slug) as any;
    if (!ex) return '';

    const tags: string[] = [];
    const reg = screenshotRegistry[slug] ?? {};
    const exName = ex.name as string;

    // Always include OG card
    tags.push(`
    <image:image>
      <image:loc>${site}/og/exchange-${slug}.png</image:loc>
      <image:title>${exName} Bonus &amp; Review — CryptoBonusWorld</image:title>
      <image:caption>${exName} crypto exchange — bonus offer and review card</image:caption>
    </image:image>`);

    // Real screenshots — only included when captured
    if (reg.ui) tags.push(`
    <image:image>
      <image:loc>${site}/media/exchanges/${slug}/ui-${reg.ui}.webp</image:loc>
      <image:title>${exName} trading interface — ${reg.ui}</image:title>
      <image:caption>${exName} spot trading interface screenshot, captured ${reg.ui}</image:caption>
    </image:image>`);

    if (reg.bonus) tags.push(`
    <image:image>
      <image:loc>${site}/media/exchanges/${slug}/bonus-${reg.bonus}.webp</image:loc>
      <image:title>${exName} welcome bonus page — ${reg.bonus}</image:title>
      <image:caption>${exName} new user bonus offer page screenshot, captured ${reg.bonus}</image:caption>
    </image:image>`);

    if (reg.app) tags.push(`
    <image:image>
      <image:loc>${site}/media/exchanges/${slug}/app-${reg.app}.webp</image:loc>
      <image:title>${exName} mobile app — ${reg.app}</image:title>
      <image:caption>${exName} mobile app screenshot on iOS, captured ${reg.app}</image:caption>
    </image:image>`);

    if (reg.p2p) tags.push(`
    <image:image>
      <image:loc>${site}/media/exchanges/${slug}/p2p-${reg.p2p}.webp</image:loc>
      <image:title>${exName} P2P trading marketplace — ${reg.p2p}</image:title>
      <image:caption>${exName} P2P marketplace screenshot, captured ${reg.p2p}</image:caption>
    </image:image>`);

    if (reg.futures) tags.push(`
    <image:image>
      <image:loc>${site}/media/exchanges/${slug}/futures-${reg.futures}.webp</image:loc>
      <image:title>${exName} futures trading interface — ${reg.futures}</image:title>
      <image:caption>${exName} perpetual futures interface screenshot, captured ${reg.futures}</image:caption>
    </image:image>`);

    return tags.join('');
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xhtmlNs}${imageNs}>
${pageEntries.map(page => {
  const imgTags = (page.type === 'exchange') ? buildImageTags(page.url) : '';
  return `  <url>
    <loc>${site}${page.url}</loc>
    <lastmod>${'lastmod' in page ? page.lastmod : today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${page.alternates ? '\n' + page.alternates : ''}${imgTags}
  </url>`;
}).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
