/**
 * Exchange Preview Batch 02 — PREVIEW-ONLY registry.
 *
 * Same hard safety invariants as Batch 01 (see batch-01.ts):
 * nulls for promoCode/bonusAmount/affiliateUrl, no /go/, noindex, no sitemap.
 *
 * Logos: normalized from owner-assets/exchange-logo-master-v1 with the
 * Batch 01 optical rules (472×132 group box, logoOpticalScale = 1).
 * Hero backgrounds: CBW-generated EMPTY brand-tinted backgrounds (2172×724,
 * no text/logo/CTA/code/UI/charts) — owner approval pending.
 */
import type { ExchangePreviewEntry } from './batch-01';

const SAFE = {
  status: 'under_review',
  promoCode: null,
  bonusAmount: null,
  affiliateUrl: null,
  externalCtaEnabled: false,
  productionEligible: false,
} as const;

const media2 = (slug: string) => ({
  logoSlotPath: `/preview-media/exchanges/${slug}/${slug}-logo-lockup-512x160-v1.png`,
  // FACTORY RULE: one canonical banner-logo asset per exchange (see batch-01.ts)
  canonicalBannerLogo: `/preview-media/exchanges/${slug}/${slug}-logo-lockup-512x160-v1.png`,
  // Batch 02 Full Visual Pack (owner archive CBW-Batch-02-Full-Visual-Pack.zip,
  // 2026-07-17): A hero → v2 WebP; article/OG/card rebuilt from the A background
  // with the exact canonicalBannerLogo + fixed factory template
  // (scripts/build-batch02-visual-pack.mjs). Raw B/C sources are never served.
  heroBackgroundPath: `/preview-media/exchanges/${slug}/${slug}-hero-2172x724-v2.webp`,
  articleInlineImage: `/preview-media/exchanges/${slug}/${slug}-article-inline-banner-v1.webp`,
  ogImage: `/preview-media/exchanges/${slug}/${slug}-og-1200x630-v1.jpg`,
  cardImage: `/preview-media/exchanges/${slug}/${slug}-card-1200x800-v1.jpg`,
});

const HERO_GEN = 'cbw_generated_pending_owner_approval';

export const batch02: ExchangePreviewEntry[] = [
  {
    number: 33, slug: 'htx', displayName: 'HTX',
    pageRoute: '/preview/exchanges/htx/', ...media2('htx'),
    // Hero v3: Batch 02 Full Visual Pack A file — OWNER APPROVED (2026-07-18)
    // as part of the fully regenerated Batch 02 set. The earlier candidate №4
    // (hero v2) belongs to the previous visual generation and is historical
    // only — do not re-wire it.
    heroBackgroundPath: '/preview-media/exchanges/htx/htx-hero-2172x724-v3.webp',
    logoPresentation: { heroVisualScale: 1.00, bottomVisualScale: 1.00 },
    // Hero Brand Zone v1: normalized wordmark-first lockup (official icon crop +
    // re-rendered CBW display text; icon ~104 canvas, word ~56 canvas)
    logoSlotPath: '/preview-media/exchanges/htx/htx-logo-lockup-512x160-v2.png',
    canonicalBannerLogo: '/preview-media/exchanges/htx/htx-logo-lockup-512x160-v2.png',
    accentColor: '#2E7CEE', heroGradient: { from: '#071433', to: '#060B14' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'high', ownerReviewRequired: true, ...SAFE,
    logoSource: 'repo public/logos/htx.png (official transparent icon)',
    heroStatus: 'owner_approved_chatgpt_candidate_04 (2026-07-17)',
    ownerReviewNotice: 'Compliance check required: HTX-related entity (Huobi Global S.A.) appears in sanctions research — owner decision needed before production.',
    notes: 'CBW display lockup. Major CEX; compliance review flagged.',
  },
  {
    number: 35, slug: 'crypto-com', displayName: 'Crypto.com',
    pageRoute: '/preview/exchanges/crypto-com/', ...media2('crypto-com'),
    logoPresentation: { heroVisualScale: 1.00, bottomVisualScale: 1.00 },
    accentColor: '#1199FA', heroGradient: { from: '#051228', to: '#05090F' },
    logoMode: 'official_wordmark', sourceConfidence: 'high', ownerReviewRequired: false, ...SAFE,
    logoSource: 'https://mkt-site-asset.crypto.com/assets/logo/crypto-com.svg', heroStatus: HERO_GEN,
    notes: 'Official vector wordmark. Affiliate program is restrictive — page may stay in preview long-term.',
  },
  {
    number: 44, slug: 'coinbase', displayName: 'Coinbase',
    pageRoute: '/preview/exchanges/coinbase/', ...media2('coinbase'),
    logoPresentation: { heroVisualScale: 1.00, bottomVisualScale: 1.00 },
    // Hero Brand Zone v1: normalized wordmark-first lockup (official icon crop +
    // re-rendered CBW display text; icon ~104 canvas, word ~56 canvas)
    logoSlotPath: '/preview-media/exchanges/coinbase/coinbase-logo-lockup-512x160-v2.png',
    canonicalBannerLogo: '/preview-media/exchanges/coinbase/coinbase-logo-lockup-512x160-v2.png',
    accentColor: '#0052FF', heroGradient: { from: '#041030', to: '#05080F' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'high', ownerReviewRequired: false, ...SAFE,
    logoSource: 'repo public/logos/coinbase.png (official transparent icon)', heroStatus: HERO_GEN,
    notes: 'CBW display lockup. Affiliate program is restrictive (geo/no classic codes).',
  },
  {
    number: 29, slug: 'weex', displayName: 'WEEX',
    pageRoute: '/preview/exchanges/weex/', ...media2('weex'),
    logoPresentation: { heroVisualScale: 1.00, bottomVisualScale: 1.00 },
    accentColor: '#F7C846', heroGradient: { from: '#1a1504', to: '#0A0906' },
    logoMode: 'official_wordmark', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
    logoSource: 'https://www.weex.com/trade_static/_next/static/media/logoweex_black.svg (renders gold)', heroStatus: HERO_GEN,
  },
  {
    number: 32, slug: 'zoomex', displayName: 'Zoomex',
    pageRoute: '/preview/exchanges/zoomex/', ...media2('zoomex'),
    logoPresentation: { heroVisualScale: 1.00, bottomVisualScale: 1.00 },
    accentColor: '#00C9A7', heroGradient: { from: '#03201b', to: '#050B0E' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'high', ownerReviewRequired: false, ...SAFE,
    logoSource: 'https://smart1.bycsi.com/zoomex/favicons/android-chrome-512x512.png', heroStatus: HERO_GEN,
  },
  {
    number: 48, slug: 'margex', displayName: 'Margex',
    pageRoute: '/preview/exchanges/margex/', ...media2('margex'),
    logoPresentation: { heroVisualScale: 1.00, bottomVisualScale: 1.00 },
    accentColor: '#35B0FF', heroGradient: { from: '#06182b', to: '#05090F' },
    logoMode: 'official_wordmark', sourceConfidence: 'high', ownerReviewRequired: false, ...SAFE,
    logoSource: 'https://margex.com/images/logo.svg', heroStatus: HERO_GEN,
  },
  {
    number: 64, slug: 'bitmart', displayName: 'BitMart',
    pageRoute: '/preview/exchanges/bitmart/', ...media2('bitmart'),
    logoPresentation: { heroVisualScale: 1.00, bottomVisualScale: 1.00 },
    // Hero Brand Zone v1: normalized wordmark-first lockup (official icon crop +
    // re-rendered CBW display text; icon ~104 canvas, word ~56 canvas)
    logoSlotPath: '/preview-media/exchanges/bitmart/bitmart-logo-lockup-512x160-v2.png',
    canonicalBannerLogo: '/preview-media/exchanges/bitmart/bitmart-logo-lockup-512x160-v2.png',
    accentColor: '#4EEAEA', heroGradient: { from: '#062024', to: '#05090E' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
    logoSource: 'https://www.bitmart.com/fav-icon.ico (144px official mark)', heroStatus: HERO_GEN,
  },
  {
    number: 31, slug: 'bitrue', displayName: 'Bitrue',
    pageRoute: '/preview/exchanges/bitrue/', ...media2('bitrue'),
    logoPresentation: { heroVisualScale: 1.00, bottomVisualScale: 1.00 },
    accentColor: '#F5B50A', heroGradient: { from: '#1a1503', to: '#0A0805' },
    logoMode: 'official_wordmark', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
    logoSource: 'https://static.bitrue.com/img/website/uniframe/logo-20221119.png', heroStatus: HERO_GEN,
  },
  {
    number: 71, slug: 'coinw', displayName: 'CoinW',
    pageRoute: '/preview/exchanges/coinw/', ...media2('coinw'),
    logoPresentation: { heroVisualScale: 1.00, bottomVisualScale: 1.00 },
    accentColor: '#6D4AFF', heroGradient: { from: '#130a2e', to: '#08060F' },
    logoMode: 'official_wordmark', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
    logoSource: 'https://cdn.stataic.com/logo_home1.png (CoinW CDN)', heroStatus: HERO_GEN,
  },
  {
    number: 57, slug: 'xt-com', displayName: 'XT.COM',
    pageRoute: '/preview/exchanges/xt-com/', ...media2('xt-com'),
    logoPresentation: { heroVisualScale: 1.00, bottomVisualScale: 1.00 },
    // Hero Brand Zone v1: normalized wordmark-first lockup (official icon crop +
    // re-rendered CBW display text; icon ~104 canvas, word ~56 canvas)
    logoSlotPath: '/preview-media/exchanges/xt-com/xt-com-logo-lockup-512x160-v2.png',
    canonicalBannerLogo: '/preview-media/exchanges/xt-com/xt-com-logo-lockup-512x160-v2.png',
    accentColor: '#D8E64A', heroGradient: { from: '#161a05', to: '#0A0B05' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
    logoSource: 'https://json.static-global.com/public-json-config/web/imgs/logo-500.png', heroStatus: HERO_GEN,
  },
];
