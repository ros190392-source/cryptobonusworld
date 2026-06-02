/**
 * geoConfig.ts — GEO-Aware Exchange Configuration Resolver
 * =========================================================
 * Utility functions for resolving exchange data by visitor country/region.
 *
 * Fallback chain (all functions):
 *   1. Exact country override   (geo-overrides.ts, countryCode match)
 *   2. Regional override        (geo-overrides.ts, regionGroup match)
 *   3. Global exchange default  (exchanges.json fields)
 *   4. Safe generic fallback    (hardcoded safe values)
 *
 * All functions are pure — no side effects, no DOM access.
 * For client-side use, serialize the resolved config at build time and
 * inject via define:vars.
 *
 * Usage:
 *   import { getExchangeGeoConfig, getAffiliateUrlForGeo } from '../utils/geoConfig';
 */

import {
  GEO_OVERRIDES,
  REGION_MAP,
  getOverridesForExchange,
  getRegionForCountry,
  type GeoOverride,
  type GeoAvailabilityStatus,
  type GeoPaymentMethod,
  type RegionGroup,
} from '../data/geo-overrides';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Minimal exchange shape required by geoConfig utilities */
export interface GeoExchange {
  slug: string;
  name: string;
  affiliateUrl: string;
  affiliateLinks?: {
    default?: string;
    geo?: Partial<Record<string, string>>;
  };
  bonusAmount?: number;
  bonusCurrency?: string;
  bonusTitle?: string;
  paymentMethods?: string[];
}

/** Fully resolved geo config for a given exchange + country */
export interface ResolvedGeoConfig {
  /** The exchange slug */
  exchangeSlug: string;
  /** The country code that was requested */
  countryCode: string;
  /** The region group the country belongs to */
  regionGroup: RegionGroup;
  /** Which source provided the resolved config */
  source: 'country' | 'region' | 'global';
  /** The raw override record if one was found */
  override: GeoOverride | null;

  // Resolved fields (merged from override + global defaults)
  exchangeDomain: string | null;
  affiliateUrl: string;
  availabilityStatus: GeoAvailabilityStatus;
  ctaLabel: string;
  ctaNote: string | null;
  bonusTitle: string;
  bonusNote: string | null;
  kycRule: string | null;
  restrictedFeatures: string[];
  paymentMethods: GeoPaymentMethod[];
  fiatCurrencies: string[];
  recommendedFlow: string | null;
  screenshotSet: string;
  regulatoryNote: string | null;
  riskNote: string | null;
  p2pNote: string | null;
  lastVerified: string | null;
  confidenceScore: number;
}

/** Result of getBonusForGeo */
export interface GeoBonusResult {
  amount: number;
  currency: string;
  title: string;
  note: string | null;
  verified: boolean;
  lastVerified: string | null;
  confidenceScore: number;
}

/** Result of getCTAForGeo */
export interface GeoCTAResult {
  label: string;
  note: string | null;
  availabilityStatus: GeoAvailabilityStatus;
  isAvailable: boolean;
  affiliateUrl: string;
  exchangeDomain: string | null;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function findOverride(exchangeSlug: string, countryCode: string): {
  override: GeoOverride | null;
  source: 'country' | 'region' | 'global';
} {
  const overrides = getOverridesForExchange(exchangeSlug);
  const cc = countryCode.toLowerCase();

  // 1. Exact country match
  const countryOverride = overrides.find(o => o.countryCode === cc);
  if (countryOverride) return { override: countryOverride, source: 'country' };

  // 2. Region match
  const region = getRegionForCountry(cc);
  if (region !== 'global') {
    const regionOverride = overrides.find(o => o.regionGroup === region && !o.countryCode);
    if (regionOverride) return { override: regionOverride, source: 'region' };
  }

  return { override: null, source: 'global' };
}

function resolveAffiliateFromExchange(
  exchange: GeoExchange,
  countryCode: string,
): string {
  const cc = countryCode.toLowerCase();

  // Check geo-specific URL in exchange data
  const geoUrl = exchange.affiliateLinks?.geo?.[cc];
  if (geoUrl && geoUrl !== '#' && geoUrl.startsWith('http')) return geoUrl;

  // affiliateLinks.default
  if (exchange.affiliateLinks?.default &&
      exchange.affiliateLinks.default !== '#' &&
      exchange.affiliateLinks.default.startsWith('http')) {
    return exchange.affiliateLinks.default;
  }

  // Top-level affiliateUrl
  if (exchange.affiliateUrl && exchange.affiliateUrl !== '#' &&
      exchange.affiliateUrl.startsWith('http')) {
    return exchange.affiliateUrl;
  }

  return `https://cryptobonusworld.com/exchanges/${exchange.slug}/`;
}

function statusIsAvailable(status: GeoAvailabilityStatus): boolean {
  return ['available', 'redirects-to-regional-version', 'requires-kyc',
          'p2p-only-recommended', 'limited'].includes(status);
}

// ── Primary resolver ──────────────────────────────────────────────────────────

/**
 * Get the fully resolved GEO configuration for an exchange + country.
 * This is the main entry point — all other functions call this internally.
 */
export function getExchangeGeoConfig(
  exchange: GeoExchange,
  countryCode: string,
): ResolvedGeoConfig {
  const cc = countryCode.toLowerCase();
  const region = getRegionForCountry(cc);
  const { override, source } = findOverride(exchange.slug, cc);

  const defaultCta = `View ${exchange.name} Offer`;

  // Affiliate URL: override → exchange geo map → exchange default
  const affiliateUrl = override?.affiliateUrl ??
    resolveAffiliateFromExchange(exchange, cc);

  return {
    exchangeSlug: exchange.slug,
    countryCode: cc,
    regionGroup: region,
    source,
    override,

    exchangeDomain: override?.exchangeDomain ?? null,
    affiliateUrl,

    availabilityStatus: override?.availabilityStatus ?? 'available',
    ctaLabel: override?.ctaLabel ?? defaultCta,
    ctaNote: override?.ctaNote ?? null,

    bonusTitle: override?.bonusOverride?.title ?? exchange.bonusTitle ?? '',
    bonusNote: override?.bonusNote ?? null,

    kycRule: override?.kycRule ?? null,
    restrictedFeatures: override?.restrictedFeatures ?? [],

    paymentMethods: override?.paymentMethods ??
      (exchange.paymentMethods?.map(m => ({ method: m, note: '' })) ?? []),

    fiatCurrencies: override?.fiatCurrencies ?? ['USD'],
    recommendedFlow: override?.recommendedFlow ?? null,
    screenshotSet: override?.screenshotSet ?? 'global',

    regulatoryNote: override?.regulatoryNote ?? null,
    riskNote: override?.riskNote ?? null,
    p2pNote: override?.p2pNote ?? null,

    lastVerified: override?.lastVerified ?? null,
    confidenceScore: override?.confidenceScore ?? 70,
  };
}

// ── Focused utility functions ─────────────────────────────────────────────────

/**
 * Get the affiliate URL for a specific geo.
 * Respects override → geo field → default chain.
 */
export function getAffiliateUrlForGeo(
  exchange: GeoExchange,
  countryCode: string,
): string {
  const { override } = findOverride(exchange.slug, countryCode.toLowerCase());
  if (override?.affiliateUrl) return override.affiliateUrl;
  return resolveAffiliateFromExchange(exchange, countryCode);
}

/**
 * Get bonus information for a specific geo.
 * Returns override values where set, falls back to global exchange data.
 */
export function getBonusForGeo(
  exchange: GeoExchange,
  countryCode: string,
): GeoBonusResult {
  const { override } = findOverride(exchange.slug, countryCode.toLowerCase());
  const bo = override?.bonusOverride;

  return {
    amount: bo?.amount ?? exchange.bonusAmount ?? 0,
    currency: bo?.currency ?? exchange.bonusCurrency ?? 'USDT',
    title: bo?.title ?? exchange.bonusTitle ?? '',
    note: override?.bonusNote ?? null,
    verified: bo?.verified ?? false,
    lastVerified: bo?.lastVerified ?? override?.lastVerified ?? null,
    confidenceScore: bo?.confidenceScore ?? override?.confidenceScore ?? 70,
  };
}

/**
 * Get payment methods for an exchange in a specific geo.
 */
export function getPaymentMethodsForGeo(
  exchange: GeoExchange,
  countryCode: string,
): GeoPaymentMethod[] {
  const { override } = findOverride(exchange.slug, countryCode.toLowerCase());

  if (override?.paymentMethods?.length) return override.paymentMethods;

  // Fall back to exchange-level payment methods (convert string[] → object[])
  return (exchange.paymentMethods ?? []).map(m => ({
    method: m.charAt(0).toUpperCase() + m.slice(1),
    note: '',
  }));
}

/**
 * Get the screenshot set path for an exchange + geo.
 * Returns: /media/exchanges/{slug}/{screenshotSet}/
 * Falls back: country → region → global
 */
export function getScreenshotSetForGeo(
  exchangeSlug: string,
  countryCode: string,
): string {
  const { override } = findOverride(exchangeSlug, countryCode.toLowerCase());
  const set = override?.screenshotSet ?? 'global';
  return `/media/exchanges/${exchangeSlug}/${set}/`;
}

/**
 * Get the regulatory note for an exchange in a specific geo.
 * Returns null when no note exists (component should handle null gracefully).
 */
export function getRegulatoryNoteForGeo(
  exchangeSlug: string,
  countryCode: string,
): string | null {
  const { override } = findOverride(exchangeSlug, countryCode.toLowerCase());
  return override?.regulatoryNote ?? null;
}

/**
 * Get the CTA configuration for an exchange in a specific geo.
 * Handles unavailable/restricted states.
 */
export function getCTAForGeo(
  exchange: GeoExchange,
  countryCode: string,
): GeoCTAResult {
  const config = getExchangeGeoConfig(exchange, countryCode);

  return {
    label: config.ctaLabel,
    note: config.ctaNote,
    availabilityStatus: config.availabilityStatus,
    isAvailable: statusIsAvailable(config.availabilityStatus),
    affiliateUrl: config.affiliateUrl,
    exchangeDomain: config.exchangeDomain,
  };
}

/**
 * Get availability status for an exchange in a specific geo.
 */
export function getAvailabilityForGeo(
  exchangeSlug: string,
  countryCode: string,
): GeoAvailabilityStatus {
  const { override } = findOverride(exchangeSlug, countryCode.toLowerCase());
  return override?.availabilityStatus ?? 'available';
}

// ── Build-time helpers ────────────────────────────────────────────────────────

/**
 * Serialize all geo configs for a given exchange to JSON.
 * Used in Astro components via define:vars to pass config to client-side JS.
 *
 * Returns a Record<countryCode, ResolvedGeoConfig> for all overrides
 * that exist for this exchange, plus region keys prefixed with 'region:'.
 */
export function serializeGeoConfigsForExchange(
  exchange: GeoExchange,
): Record<string, ResolvedGeoConfig> {
  const overrides = getOverridesForExchange(exchange.slug);
  const result: Record<string, ResolvedGeoConfig> = {};

  for (const override of overrides) {
    if (override.countryCode) {
      result[override.countryCode] = getExchangeGeoConfig(exchange, override.countryCode);
    } else if (override.regionGroup) {
      // Region key: used by client when no exact country match exists
      result[`region:${override.regionGroup}`] = getExchangeGeoConfig(
        exchange,
        // Use a representative country code for the region
        _regionRepresentative(override.regionGroup),
      );
    }
  }

  return result;
}

/**
 * Get a representative country code for region-based config serialization.
 */
function _regionRepresentative(region: RegionGroup): string {
  const map: Record<RegionGroup, string> = {
    eea: 'de',
    mena: 'ae',
    latam: 'br',
    'south-asia': 'in',
    sea: 'id',
    africa: 'ng',
    cis: 'ru',
    global: 'us',
  };
  return map[region] ?? 'us';
}

/**
 * Client-side region lookup helper.
 * Given a country code and a serialized geo config map (from serializeGeoConfigsForExchange),
 * returns the best matching config.
 *
 * This is serialized and injected into client scripts via define:vars.
 * Keep this function pure and self-contained.
 */
export const GEO_CLIENT_RESOLVER_SRC = `
(function(geoConfigs, regionMap) {
  return function resolveConfig(countryCode) {
    if (!countryCode) return null;
    var cc = countryCode.toLowerCase();
    // 1. Exact country
    if (geoConfigs[cc]) return geoConfigs[cc];
    // 2. Region
    var region = regionMap[cc];
    if (region && geoConfigs['region:' + region]) return geoConfigs['region:' + region];
    return null;
  };
})
`;

// Export REGION_MAP for client injection
export { REGION_MAP };
