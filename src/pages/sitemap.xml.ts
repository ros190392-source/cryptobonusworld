import type { APIRoute } from 'astro';
import exchanges from '../data/exchanges.json';
import guides from '../data/guides.json';
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
  // Verified against built HTML on 2026-07-02: the following legacy sections
  // currently serve noindex,nofollow and are therefore EXCLUDED from the sitemap
  // (hubs and all child pages):
  //   /bonuses/  /bonus-codes/  /compare/  /coins/  /use-cases/
  //   /categories/  /countries/  /reviewers/  /contact/
  // Also excluded by design: /go/ (robots-blocked), /preview/, /prototype/,
  // legacy /exchanges/{slug}/ redirect stubs for the live promo exchanges.
  //
  // A legacy section may be re-added here ONLY when it is deliberately made
  // indexable (noindex removed) after content/visual approval — flip both
  // together in one change, never one without the other.
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily', lastmod: today, type: 'static' as const },
    { url: '/exchanges/', priority: '0.85', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/promo-codes/', priority: '0.9', changefreq: 'weekly', lastmod: today, type: 'static' as const },
    { url: '/guides/', priority: '0.75', changefreq: 'weekly', lastmod: today, type: 'static' as const },
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

  // Slugs whose /exchanges/{slug}/ URL is a noindex redirect stub to the rich /slug/ page.
  // Noindexed pages must not appear in the sitemap (same rule as /contact/ above).
  const LIVE_PROMO_SLUGS = new Set(['bybit', 'mexc', 'okx', 'bitget', 'kucoin', 'bingx']);

  // Top-tier money pages get boosted priority for crawl budget signalling
  const TOP_EXCHANGE_SLUGS = new Set(['bybit', 'okx', 'mexc', 'phemex', 'kucoin', 'binance', 'bitget']);

  const exchangePages = exchanges.filter(ex => !LIVE_PROMO_SLUGS.has(ex.slug)).map(ex => ({
    url: `/exchanges/${ex.slug}/`,
    priority: TOP_EXCHANGE_SLUGS.has(ex.slug) ? '0.90' : '0.85',
    changefreq: 'weekly',
    lastmod: (ex as any).lastVerified ?? ex.updatedAt,
    type: 'exchange' as const,
    slug: ex.slug,
  }));

  // Noindexed page groups (bonuses, bonus-codes, categories, countries, compare,
  // coins, use-cases, reviewers) are deliberately NOT generated into the sitemap —
  // see SITEMAP POLICY above.

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
    ...exchangePages,
    ...guidePages,
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
  };

  // Walkthrough screenshots — actual captured files at /screenshots/{slug}/steps/
  // Each entry: { loc, title, caption }
  const walkthroughImages: Record<string, Array<{ loc: string; title: string; caption: string }>> = {
    binance: [
      { loc: `${site}/screenshots/binance/steps/bn-01c-landing-19800-arrow.webp`, title: 'Binance registration page — 19,800 USDT + 20% fee rebate with code CRYPTOBONW', caption: 'Binance sign-up page confirming 19,800 USDT welcome bonus and 20% trading fee rebate via referral code CRYPTOBONW (June 2026)' },
      { loc: `${site}/screenshots/binance/steps/bn-07-welcome-desktop.webp`, title: 'Binance welcome screen — account linked to referral code CRYPTOBONW', caption: 'Binance welcome screen confirming account creation and referral code attachment (June 2026)' },
      { loc: `${site}/screenshots/binance/steps/bn-11-rewards-tasks.webp`, title: 'Binance Rewards Hub — Stage 1 bonus tasks (June 2026)', caption: 'Binance Rewards Hub showing four Stage 1 tasks: KYC, deposit $10, trade $10, trade $2,000 (June 2026)' },
      { loc: `${site}/screenshots/binance/steps/bn-owner-task-reward-overview-2026-06-v5.webp`, title: 'Binance Task & Reward Overview — seven Stage 2 tiers up to 19,800 USDT', caption: 'Binance Task and Reward Overview showing complete bonus structure including Stage 2 tiers (June 2026)' },
      { loc: `${site}/screenshots/binance/steps/bn-038-fees-spot-margin.webp`, title: 'Binance spot and margin trading fees — VIP 0 rate 0.1%', caption: 'Binance fee schedule for spot and margin trading, VIP 0 level (June 2026)' },
      { loc: `${site}/screenshots/binance/steps/bn-039-fees-usdm-futures.webp`, title: 'Binance USDT-M futures trading fees — 0.02% maker, 0.05% taker', caption: 'Binance USDT-M perpetual futures fee schedule showing maker and taker rates (June 2026)' },
      { loc: `${site}/screenshots/binance/steps/bn-035-p2p-marketplace-listings.webp`, title: 'Binance P2P marketplace — USDT buy listings', caption: 'Binance P2P marketplace showing available USDT purchase listings with seller ratings (June 2026)' },
      { loc: `${site}/screenshots/binance/steps/bn-030-futures-demo-mode.webp`, title: 'Binance futures trading interface — demo mode', caption: 'Binance perpetual futures trading interface in demo mode showing order entry and position management (June 2026)' },
      { loc: `${site}/screenshots/binance/steps/bn-08-kyc-country-select.webp`, title: 'Binance KYC verification — country selection step', caption: 'Binance identity verification process showing country selection screen (June 2026)' },
      { loc: `${site}/screenshots/binance/steps/mob-061-rewards-hub-voucher-10usdt.webp`, title: 'Binance mobile app — Rewards Hub voucher 10 USDT', caption: 'Binance mobile app showing 10 USDT voucher awarded in Rewards Hub after completing Stage 1 task (June 2026)' },
    ],
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

    // Walkthrough screenshots for this exchange
    const walkthroughs = walkthroughImages[slug] ?? [];
    for (const img of walkthroughs) {
      tags.push(`
    <image:image>
      <image:loc>${img.loc}</image:loc>
      <image:title>${img.title}</image:title>
      <image:caption>${img.caption}</image:caption>
    </image:image>`);
    }

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
