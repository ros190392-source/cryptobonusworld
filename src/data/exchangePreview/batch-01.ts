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
 * normalized to 2172×724. EVEDEX and Phemex have no color-matched empty
 * background in the current batch → heroBackgroundPath is null and the
 * page falls back to the brand gradient (pending owner mapping).
 */

export interface ExchangePreviewEntry {
  number: number;                 // owner master-list number
  slug: string;
  displayName: string;
  pageRoute: string;              // /preview/exchanges/{slug}/
  logoSlotPath: string;           // 512×160 optical-fit slot (official-source)
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
  heroBackgroundPath: hero ? `/preview-media/exchanges/${slug}/${slug}-hero-preview-2172x724.webp` : null,
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
    pageRoute: '/preview/exchanges/evedex/', ...media('evedex', false),
    accentColor: '#18C08F', heroGradient: { from: '#052519', to: '#0B0F17' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
    heroAssetNeeded: true,
    heroAssetSpec: '2172×724 · deep navy + teal/green · no text · no logo · no CTA · no code · no charts',
    notes: 'Temporary gradient fallback. Low-res favicon source — better official asset preferred.',
  },
  {
    number: 19, slug: 'vest-markets', displayName: 'Vest Markets',
    pageRoute: '/preview/exchanges/vest-markets/', ...media('vest-markets', true),
    accentColor: '#35B0FF', heroGradient: { from: '#06182b', to: '#0B0F17' },
    logoMode: 'cbw_icon_lockup', sourceConfidence: 'medium', ownerReviewRequired: false, ...SAFE,
  },
  {
    number: 20, slug: 'phemex', displayName: 'Phemex',
    pageRoute: '/preview/exchanges/phemex/', ...media('phemex', false),
    accentColor: '#16A34A', heroGradient: { from: '#06210f', to: '#0B0F17' },
    logoMode: 'cbw_icon_lockup', logoGlow: 'soft-glow', sourceConfidence: 'high', ownerReviewRequired: false, ...SAFE,
    heroAssetNeeded: true,
    heroAssetSpec: '2172×724 · deep navy + restrained green/blue · no text · no logo · no CTA · no code · no charts',
    notes: 'Temporary gradient fallback. Dark disc icon → soft-glow slot (CBW glow standard).',
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
export const verifiedAlternatives = [
  { slug: 'bybit',  name: 'Bybit',  pageUrl: '/bybit/',  logo: '/preview-media/alternatives/bybit-icon-square-256x256-v1.png',  bonus: 'Up to 30,000 USDT', tileBg: '#1A1F2E' },
  { slug: 'mexc',   name: 'MEXC',   pageUrl: '/mexc/',   logo: '/preview-media/alternatives/mexc-icon-square-256x256-v1.png',   bonus: 'Up to 10,000 USDT', tileBg: '#F5F3FF' },
  { slug: 'okx',    name: 'OKX',    pageUrl: '/okx/',    logo: '/preview-media/alternatives/okx-icon-square-256x256-v1.png',    bonus: 'Mystery Boxes up to $10,000', tileBg: '#111111' },
  { slug: 'bitget', name: 'Bitget', pageUrl: '/bitget/', logo: '/preview-media/alternatives/bitget-icon-square-256x256-v1.png', bonus: 'Up to 6,200 USDT',  tileBg: '#ECFDF5' },
  { slug: 'kucoin', name: 'KuCoin', pageUrl: '/kucoin/', logo: '/preview-media/alternatives/kucoin-icon-square-256x256-v1.png', bonus: 'Welcome rewards',   tileBg: '#0A1628' },
  { slug: 'bingx',  name: 'BingX',  pageUrl: '/bingx/',  logo: '/preview-media/alternatives/bingx-icon-square-256x256-v1.png',  bonus: 'Welcome rewards',   tileBg: '#0F1B33' },
] as const;
