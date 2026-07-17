/**
 * Exchange Preview Batch 01 — PREVIEW-ONLY registry.
 *
 * Ten production-shaped preview pages under /preview/exchanges/*.
 * Hard safety invariants (do not change without owner approval):
 *   - promoCode / bonusAmount / affiliateUrl are ALWAYS null here
 *   - externalCtaEnabled / productionEligible are ALWAYS false
 *   - no /go/ routes exist for these slugs
 *   - all pages render noindex,nofollow and are excluded from the sitemap
 *
 * Logos come from the owner logo master library
 * (owner-assets/exchange-logo-master-v1) — official-source only.
 * logoMode 'cbw_icon_lockup' = official icon + CBW-generated display name.
 * It is a display convenience, NOT an official wordmark.
 *
 * Hero backgrounds: owner-supplied EMPTY backgrounds (no text/logo/CTA),
 * normalized to 2172×724 WebP. Current source: CBW-Batch-01-Full-A+B-Pack.zip
 * (2026-07-16) — N.A = hero background, N.B = inline article/claim visual.
 * The N.B artwork contains AI-rendered brand marks and is used ONLY as an
 * inline illustration; it is never a source for official logo assets.
 */

export interface ExchangePreviewEntry {
  number: number;                 // owner master-list number
  slug: string;
  displayName: string;
  pageRoute: string;              // /preview/exchanges/{slug}/
  logoSlotPath: string;           // 512×160 optical-fit slot (official-source)
  /** The ONE canonical banner-logo asset — shared verbatim by hero, inline article banner, hub card and packs. */
  canonicalBannerLogo: string;
  heroBackgroundPath: string | null; // 2172×724 empty background, or null = gradient fallback
  accentColor: string;
  heroGradient: { from: string; to: string };
  logoMode: 'official_wordmark' | 'cbw_icon_lockup';
  /** Logo slot glow family (CBW standard): dark marks on dark heroes need soft-glow. */
  logoGlow?: 'clean' | 'soft-glow';
  /**
   * logoOpticalScale — canonical optical-occupancy token (default 1).
   * Consumed identically by the top hero and bottom status logo slots.
   * 1 = the normalized 512x160 asset already has canonical optical occupancy
   * (visible group ~472x132 box; square tiles capped at 139).
   * Any deviation must be backed by the occupancy report
   * (.tmp-exchange-pages-batch-01/batch-01-logo-optical-occupancy.md).
   */
  logoOpticalScale?: number;
  /** True = current hero is a temporary gradient fallback; a real asset must be produced. */
  heroAssetNeeded?: boolean;
  /** Spec for the missing hero asset (shown on hub/page). */
  heroAssetSpec?: string;
  /** Owner-review notice rendered prominently on the page and hub. */
  ownerReviewNotice?: string;
  /** Provenance of the logo asset (official URL or repo path). */
  logoSource?: string;
  /** Hero background provenance/status label (e.g. owner_supplied, cbw_generated_pending_approval). */
  heroStatus?: string;
  /** Preview-only inline article visual (branded claim-bonus graphic). NOT a CTA, NOT the hero. */
  articleInlineImage?: string;
  /** Final validated 1200×630 OG/social asset (canonicalBannerLogo enforced). */
  ogImage?: string;
  sourceConfidence: 'high' | 'medium' | 'low';
  ownerReviewRequired: boolean;
  status: 'under_review';
  promoCode: null;
  bonusAmount: null;
  affiliateUrl: null;
  externalCtaEnabled: false;
  productionEligible: false;
  notes?: string;
}

const SAFE = {
  status: 'under_review',
  promoCode: null,
  bonusAmount: null,
  affiliateUrl: null,
  externalCtaEnabled: false,
  productionEligible: false,
} as const;

const media = (slug: string, hero: boolean) => ({
  logoSlotPath: `/preview-media/exchanges/${slug}/${slug}-logo-slot-512x160.png`,
  /**
   * canonicalBannerLogo — FACTORY RULE: exactly ONE banner-logo asset per
   * exchange. This exact file is the source for the top hero logo block, the
   * inline article banner, the hub card overlay, and every generated pack
   * image (OG/article/card). No AI-redrawn, "similar", or re-rendered
   * variants are ever permitted anywhere.
   */
  canonicalBannerLogo: `/preview-media/exchanges/${slug}/${slug}-logo-slot-512x160.png`,
  // v2 heroes: owner-supplied A+B pack (CBW-Batch-01-Full-A+B-Pack.zip, 2026-07-16), N.A files
  heroBackgroundPath: hero ? `/preview-media/exchanges/${slug}/${slug}-hero-2172x724-v2.webp` : null,
  // inline article banner v3: rebuilt from the approved v2 hero background +
  // canonicalBannerLogo + approved preview text template. The owner N.B claim
  // graphics (claim-bonus-source-v2.png) contained AI-redrawn logo variants and
  // are retained as reference sources only — never rendered on pages.
  articleInlineImage: `/preview-media/exchanges/${slug}/${slug}-article-inline-banner-v3.webp`,
  // final validated OG/social asset (owner C composition + canonicalBannerLogo,
  // rebuilt by scripts/build-exchange-og-final.mjs; raw C source never served)
  ogImage: `/preview-media/exchanges/${slug}/${slug}-og-1200x630-v1.jpg`,
});

export const batch01: ExchangePreviewEntry[] = [
  {
    number: 5, slug: 'bydfi', displayName: 'BYDFi',
    pageRoute: '/preview/exchanges/bydfi/', ...media('bydfi', true),
    accentColor: '#F7C600', heroGradient: { from: '#1a1602', to: '#0B0F17' },
    logoMode: 'official_wordmark', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
    notes: 'Official BYDFi full wordmark (V-mark + BYDFi text) from bydfi.com/static/images/brand/logo5.png — replaces the earlier square app tile. logoOpticalScale = 1.',
  },
  {
    number: 8, slug: 'bitunix', displayName: 'Bitunix',
    pageRoute: '/preview/exchanges/bitunix/', ...media('bitunix', true),
    accentColor: '#B6F04A', heroGradient: { from: '#101a06', to: '#0B0F17' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
  },
  {
    number: 13, slug: 'hyperliquid', displayName: 'Hyperliquid',
    pageRoute: '/preview/exchanges/hyperliquid/', ...media('hyperliquid', true),
    accentColor: '#97FCE4', heroGradient: { from: '#04211c', to: '#0B0F17' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'high', ownerReviewRequired: false, ...SAFE,
  },
  {
    number: 16, slug: 'gate-com', displayName: 'Gate.com',
    pageRoute: '/preview/exchanges/gate-com/', ...media('gate-com', true),
    accentColor: '#2354E6', heroGradient: { from: '#071433', to: '#0B0F17' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'medium', ownerReviewRequired: true, ...SAFE,
    ownerReviewNotice: 'Gate.com naming and Gate.io deduplication require owner approval before production.',
    notes: 'OWNER REVIEW: Gate.io/Gate.com rebrand — naming & dedup decision pending.',
  },
  {
    number: 17, slug: 'blofin', displayName: 'BloFin',
    pageRoute: '/preview/exchanges/blofin/', ...media('blofin', true),
    accentColor: '#12D2B0', heroGradient: { from: '#03201b', to: '#0B0F17' },
    logoMode: 'official_wordmark', sourceConfidence: 'high', ownerReviewRequired: false, ...SAFE,
  },
  {
    number: 18, slug: 'evedex', displayName: 'EVEDEX',
    pageRoute: '/preview/exchanges/evedex/', ...media('evedex', true),
    accentColor: '#18C08F', heroGradient: { from: '#052519', to: '#0B0F17' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
    heroStatus: 'owner_supplied_ab_pack_v2 (2026-07-16)',
    notes: 'Hero: owner-supplied cinematic background. Low-res favicon source — better official asset preferred.',
  },
  {
    number: 19, slug: 'vest-markets', displayName: 'Vest Markets',
    pageRoute: '/preview/exchanges/vest-markets/', ...media('vest-markets', true),
    accentColor: '#35B0FF', heroGradient: { from: '#06182b', to: '#0B0F17' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
  },
  {
    number: 20, slug: 'phemex', displayName: 'Phemex',
    pageRoute: '/preview/exchanges/phemex/', ...media('phemex', true),
    accentColor: '#16A34A', heroGradient: { from: '#06210f', to: '#0B0F17' },
    logoMode: 'cbw_icon_lockup', logoGlow: 'soft-glow', sourceConfidence: 'high', ownerReviewRequired: false, ...SAFE,
    heroStatus: 'owner_supplied_ab_pack_v2 (2026-07-16)',
    notes: 'Hero: owner-supplied cinematic background. no_glow tested 2026-07-16: black disc edge loses contrast against dark space → minimal soft_glow retained (CBW glow standard).',
  },
  {
    number: 21, slug: 'binance', displayName: 'Binance',
    pageRoute: '/preview/exchanges/binance/', ...media('binance', true),
    accentColor: '#F0B90B', heroGradient: { from: '#1d1502', to: '#0B0F17' },
    logoMode: 'official_wordmark', sourceConfidence: 'high', ownerReviewRequired: false, ...SAFE,
  },
  {
    number: 25, slug: 'whitebit', displayName: 'WhiteBIT',
    pageRoute: '/preview/exchanges/whitebit/', ...media('whitebit', true),
    accentColor: '#7C5CFF', heroGradient: { from: '#140f2e', to: '#0B0F17' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'medium', ownerReviewRequired: true, ...SAFE,
    ownerReviewNotice: 'Official transparent wordmark recommended before production.',
    notes: 'OWNER REVIEW: app icon extracted from white tile — transparent official logo preferred.',
  },
];

/**
 * The six live verified exchanges shown as alternatives.
 * Display data mirrors the existing live pages; links are INTERNAL ONLY
 * (no /go/*, no affiliate URLs inside the preview component).
 */
// Icons: preview-only normalized standard (256×256 transparent, plates removed,
// official colors preserved) in /preview-media/alternatives/. Raw /logos/*.png
// remain untouched for the six live pages.
// Alternatives use the rectangular canonicalBannerLogo system (owner decision
// 2026-07-16): transparent 512×160 canonical slots rendered in a fixed
// rectangular row slot — no tiles, no plates.
// Promo cards v2 (owner decision 2026-07-17): promoCode / bonus / descriptor
// surface the already-approved live data from src/data/exchanges.json
// (promoCode, bonusTitle, featureBadges) — nothing invented here.
// BingX uses the v2 asset: canonical lockup optically re-normalized at asset
// level (visible group 263×112 → 342×146) to match the others' visual weight.
// Both links stay INTERNAL (live review pages) — no /go/* inside previews.
export const verifiedAlternatives = [
  { slug: 'bybit',  name: 'Bybit',  pageUrl: '/bybit/',  logo: '/preview-media/alternatives/bybit-logo-slot-512x160-v1.png',  promoCode: 'CRYPTOBONUSW',     bonus: 'Up to 30,000 USDT Welcome Package', descriptor: 'Spot, futures & copy trading' },
  { slug: 'mexc',   name: 'MEXC',   pageUrl: '/mexc/',   logo: '/preview-media/alternatives/mexc-logo-slot-512x160-v1.png',   promoCode: 'mexc-CryptoBonus', bonus: 'Up to 10,000 USDT Welcome Bonus',   descriptor: 'Spot & futures · no-KYC signup' },
  { slug: 'okx',    name: 'OKX',    pageUrl: '/okx/',    logo: '/preview-media/alternatives/okx-logo-slot-512x160-v1.png',    promoCode: 'CRYPTOBONUSW',     bonus: 'Up to 5,000 USDT Welcome Package',  descriptor: 'Spot, futures & Web3 wallet' },
  { slug: 'bitget', name: 'Bitget', pageUrl: '/bitget/', logo: '/preview-media/alternatives/bitget-logo-slot-512x160-v1.png', promoCode: 'CryptoBonW',       bonus: 'Up to 6,200 USDT New User Bonus',   descriptor: 'Copy trading & futures' },
  { slug: 'kucoin', name: 'KuCoin', pageUrl: '/kucoin/', logo: '/preview-media/alternatives/kucoin-logo-slot-512x160-v1.png', promoCode: 'CRYPTOBONW',       bonus: 'Up to 500 USDT Welcome Bonus',      descriptor: 'Spot, futures & staking' },
  { slug: 'bingx',  name: 'BingX',  pageUrl: '/bingx/',  logo: '/preview-media/alternatives/bingx-logo-slot-512x160-v2.png',  promoCode: 'CRYPTOBONUSWORLD', bonus: 'Up to 11,000 USDT Welcome Package', descriptor: 'Social & copy trading' },
] as const;
