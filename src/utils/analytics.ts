/**
 * CryptoBonusWorld — Analytics Architecture
 *
 * Single source of truth for:
 *  - Event naming constants  (cbw_* prefix, snake_case)
 *  - TypeScript event interfaces
 *  - Page context types (passed from Astro pages → Layout → Analytics component)
 *  - Dimension type guards
 *
 * Runtime implementation lives in src/components/Analytics.astro.
 * These types are server-side only — they drive the define:vars serialization.
 *
 * Naming conventions:
 *  - All event names: cbw_{noun}_{verb/noun}   e.g. cbw_affiliate_click
 *  - Dimensions:      snake_case               e.g. device_type, geo_code
 *  - Placements:      kebab-case               e.g. table-featured, compare-hero
 *  - Page types:      kebab-case               e.g. compare-hub, compare
 */

// ── Event name constants ─────────────────────────────────────────────────────

export const CBW_EVENTS = {
  // Lifecycle
  PAGE_VIEW:        'cbw_page_view',

  // Affiliate / conversion
  AFFILIATE_CLICK:  'cbw_affiliate_click',
  CTA_IMPRESSION:   'cbw_cta_impression',

  // Engagement
  SCROLL_DEPTH:     'cbw_scroll_depth',

  // Page-type specific
  EXCHANGE_VIEW:    'cbw_exchange_view',
  COMPARE_VIEW:     'cbw_compare_view',
  CATEGORY_VIEW:    'cbw_category_view',
  COUNTRY_VIEW:     'cbw_country_view',
} as const;

export type CbwEventName = typeof CBW_EVENTS[keyof typeof CBW_EVENTS];

// ── Dimension types ──────────────────────────────────────────────────────────

export type PageType =
  | 'homepage'
  | 'bonuses'
  | 'exchange'
  | 'compare'
  | 'compare-hub'
  | 'category'
  | 'country'
  | 'other';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export type ScrollMilestone = 25 | 50 | 75 | 90;

/** Two-letter geo codes matching affiliateLinks.geo keys in exchanges.json */
export type GeoCode = 'tr' | 'in' | 'id' | 'ng' | 'br' | 'vn' | 'ph' | 'unknown';

// ── Placement identifiers ────────────────────────────────────────────────────
// These match the data-placement values written by CTAButton + inline CTAs.
// Listed here for discoverability — not enforced at runtime.

export type CtaPlacement =
  | 'hero'
  | 'sidebar'
  | 'sticky'
  | 'table-featured'
  | 'table'
  | 'mobile-card-featured'
  | 'mobile-card'
  | 'card'
  | 'alternatives'
  | 'compare-hero'
  | 'compare-verdict'
  | 'unknown';

// ── Page context (server → client serialization) ─────────────────────────────

/**
 * Optional rich context passed from each page through Layout to Analytics.
 * All fields are optional — the Analytics runtime infers what it can from the URL.
 * Richer context enables better funnel segmentation.
 */
export interface PageContext {
  /** Explicit page type — if omitted, inferred from URL path */
  pageType?: PageType;

  // Exchange pages
  exchangeSlug?:   string;
  exchangeRating?: number;
  exchangeBonus?:  number;
  exchangeKyc?:    boolean;
  exchangeDeposit?: boolean;

  // Compare pages
  comparePair?:       string;
  compareExchangeA?:  string;
  compareExchangeB?:  string;
  compareWinner?:     string | null;

  // Category pages
  categorySlug?:  string;
  categoryCount?: number;

  // Country pages
  countrySlug?: string;
  countryGeo?:  string;    // two-letter geo code

  // Experiment / A/B — override client-side variant assignment
  abExperiment?: string;   // e.g. "cta_label_test"
  abVariant?:    string;   // e.g. "control" | "variant_a"
}

// ── Base event interface ─────────────────────────────────────────────────────

/** All events emitted by the CBW analytics runtime share this shape. */
export interface CbwEvent {
  event:       CbwEventName | string;
  page_type:   PageType;
  device_type: DeviceType;
  geo_code:    string;
  ab_variant:  string;
  session_id:  string;
  ts:          number;
  path:        string;
  [key: string]: unknown;
}

// ── Specific event interfaces ────────────────────────────────────────────────

export interface PageViewEvent extends CbwEvent {
  event: 'cbw_page_view';
  title:    string;
  referrer: string;
  exchange_slug?:  string;
  compare_pair?:   string;
  category_slug?:  string;
  country_slug?:   string;
}

export interface AffiliateClickEvent extends CbwEvent {
  event:     'cbw_affiliate_click';
  exchange:  string;
  placement: CtaPlacement | string;
  bonus:     number | null;
  href:      string;
}

export interface CtaImpressionEvent extends CbwEvent {
  event:     'cbw_cta_impression';
  exchange:  string;
  placement: CtaPlacement | string;
  bonus:     number | null;
}

export interface ScrollDepthEvent extends CbwEvent {
  event:     'cbw_scroll_depth';
  milestone: ScrollMilestone;
}

export interface ExchangeViewEvent extends CbwEvent {
  event:            'cbw_exchange_view';
  exchange_slug:    string;
  exchange_rating?: number;
  exchange_bonus?:  number;
  exchange_kyc?:    boolean;
}

export interface CompareViewEvent extends CbwEvent {
  event:             'cbw_compare_view';
  compare_pair:      string;
  compare_exchange_a: string;
  compare_exchange_b: string;
  compare_winner?:   string | null;
}

export interface CategoryViewEvent extends CbwEvent {
  event:          'cbw_category_view';
  category_slug:  string;
  category_count?: number;
}

export interface CountryViewEvent extends CbwEvent {
  event:        'cbw_country_view';
  country_slug: string;
  country_geo?: string;
}
