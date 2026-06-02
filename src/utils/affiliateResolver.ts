/**
 * affiliateResolver.ts — CryptoBonusWorld Affiliate URL Resolver
 *
 * Centralised affiliate link resolution with:
 *  - GEO-aware URL selection (TR, IN, BR, NG, VN, PH, ID, + default)
 *  - SubID / tracking param construction (geo, device, placement, pageType)
 *  - Safe fallback chain: geo URL → default URL → exchange detail page
 *  - Placeholder detection (treats "#" and "" as no URL)
 *  - URL health validation helpers
 *
 * Pure TypeScript — no DOM, no framework imports.
 * Used by:
 *  - src/pages/go/[exchange].astro  (redirect pages)
 *  - src/components/CTAButton.astro (data-geo-href serialisation)
 *  - scripts/audit-links.mjs        (link health audit)
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Placeholder value — treat as "no URL configured" */
export const PLACEHOLDER = '#';

/** Site base URL */
export const SITE_BASE = 'https://cryptobonusworld.com';

/** Supported GEO codes (IANA timezone → this code, see Analytics.astro) */
export const SUPPORTED_GEOS = ['tr', 'in', 'id', 'ng', 'br', 'vn', 'ph'] as const;
export type GeoCode = typeof SUPPORTED_GEOS[number] | 'unknown';

/** Supported device types */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AffiliateLinks {
  default?: string;
  geo?: Partial<Record<GeoCode, string>>;
}

export interface ResolverExchange {
  slug: string;
  name: string;
  affiliateUrl: string;
  affiliateLinks?: AffiliateLinks;
}

export interface ResolverContext {
  geo?: GeoCode | string;
  device?: DeviceType | string;
  placement?: string;
  pageType?: string;
  exchangeSlug?: string;
  comparePair?: string;
  contextualRank?: number;
}

export interface ResolvedLink {
  /** Final URL after resolution */
  url: string;
  /** Which resolution path was used */
  source: 'geo' | 'default' | 'fallback-page';
  /** True if the URL is a real link (not placeholder / internal fallback) */
  isReal: boolean;
  /** The GEO code that was matched, if any */
  matchedGeo: string | null;
}

export interface SubIdParams {
  geo?: string;
  device?: string;
  placement?: string;
  pageType?: string;
  exchangeSlug?: string;
  comparePair?: string;
}

// ── Placeholder detection ─────────────────────────────────────────────────────

/**
 * Returns true when a URL is a placeholder that should not be used.
 * Handles: '#', '', null, undefined, '/go/...' self-referential links.
 */
export function isPlaceholder(url: string | undefined | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  return (
    trimmed === '' ||
    trimmed === '#' ||
    trimmed === 'null' ||
    trimmed === 'undefined'
  );
}

/**
 * Returns true if a string is a structurally valid HTTP(S) URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

// ── Affiliate URL resolution ──────────────────────────────────────────────────

/**
 * Resolve the best affiliate URL for a given exchange + visitor context.
 *
 * Priority:
 *  1. affiliateLinks.geo[geo]  — geo-specific URL if geo is known and configured
 *  2. affiliateLinks.default   — exchange's default affiliate link
 *  3. affiliateUrl             — top-level shorthand (legacy / fallback field)
 *  4. /exchanges/{slug}/       — exchange detail page (safe internal fallback)
 *
 * Returns a ResolvedLink with full provenance for analytics.
 */
export function resolveAffiliateUrl(
  exchange: ResolverExchange,
  ctx: ResolverContext = {},
): ResolvedLink {
  const geo = ctx.geo as GeoCode | undefined;

  // ── 1. GEO-specific URL ───────────────────────────────────────────────────
  if (geo && geo !== 'unknown' && exchange.affiliateLinks?.geo) {
    const geoUrl = exchange.affiliateLinks.geo[geo as GeoCode];
    if (!isPlaceholder(geoUrl) && isValidUrl(geoUrl!)) {
      return { url: geoUrl!, source: 'geo', isReal: true, matchedGeo: geo };
    }
  }

  // ── 2. affiliateLinks.default ─────────────────────────────────────────────
  if (!isPlaceholder(exchange.affiliateLinks?.default) && isValidUrl(exchange.affiliateLinks!.default!)) {
    return {
      url: exchange.affiliateLinks!.default!,
      source: 'default',
      isReal: true,
      matchedGeo: null,
    };
  }

  // ── 3. Top-level affiliateUrl field (legacy / same as default) ────────────
  if (!isPlaceholder(exchange.affiliateUrl) && isValidUrl(exchange.affiliateUrl)) {
    return {
      url: exchange.affiliateUrl,
      source: 'default',
      isReal: true,
      matchedGeo: null,
    };
  }

  // ── 4. Safe internal fallback: exchange detail page ──────────────────────
  return {
    url: `${SITE_BASE}/exchanges/${exchange.slug}/`,
    source: 'fallback-page',
    isReal: false,
    matchedGeo: null,
  };
}

// ── SubID construction ────────────────────────────────────────────────────────

/**
 * Build a SubID string suitable for appending to affiliate URLs as a
 * tracking parameter. Pattern: cbw_{exchange}_{placement}_{geo}_{device}
 *
 * Empty segments are omitted to keep SubIDs short and clean.
 * Result is URL-safe (alphanumeric + underscore + hyphen only).
 */
export function buildSubId(params: SubIdParams): string {
  const parts = [
    'cbw',
    params.exchangeSlug   ? slugify(params.exchangeSlug)  : null,
    params.placement      ? slugify(params.placement)     : null,
    params.geo && params.geo !== 'unknown' ? params.geo   : null,
    params.device && params.device !== 'unknown' ? params.device : null,
  ].filter(Boolean);

  return parts.join('_');
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Append tracking parameters to a base affiliate URL.
 * Only appends if the URL is real (not a placeholder/fallback).
 *
 * Parameters added:
 *  - subid: constructed SubID string
 *  - utm_source: cbw (if not already present)
 *  - utm_medium: affiliate
 *  - utm_campaign: {exchangeSlug}-bonus
 */
export function buildTrackedUrl(
  baseUrl: string,
  params: SubIdParams & { appendUtm?: boolean },
): string {
  if (isPlaceholder(baseUrl) || !isValidUrl(baseUrl)) return baseUrl;

  try {
    const url = new URL(baseUrl);
    const subId = buildSubId(params);

    // SubID — many affiliate programs accept this param (Bybit, MEXC, OKX all support it)
    if (subId) url.searchParams.set('subid', subId);

    // UTM — only when not already present (don't clobber affiliate-supplied params)
    if (params.appendUtm !== false) {
      if (!url.searchParams.has('utm_source')) url.searchParams.set('utm_source', 'cbw');
      if (!url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', 'affiliate');
      if (params.exchangeSlug && !url.searchParams.has('utm_campaign')) {
        url.searchParams.set('utm_campaign', `${params.exchangeSlug}-bonus`);
      }
    }

    return url.toString();
  } catch {
    return baseUrl;
  }
}

/**
 * Full resolution pipeline: resolve → validate → build tracked URL.
 * This is the single entry point for all affiliate link generation.
 *
 * Returns the tracked URL ready for use as an `href`, plus provenance metadata.
 */
export function getAffiliateUrl(
  exchange: ResolverExchange,
  ctx: ResolverContext = {},
  options: { appendSubId?: boolean; appendUtm?: boolean } = {},
): ResolvedLink & { trackedUrl: string } {
  const resolved = resolveAffiliateUrl(exchange, ctx);

  const trackedUrl =
    resolved.isReal && options.appendSubId !== false
      ? buildTrackedUrl(resolved.url, {
          geo:          ctx.geo,
          device:       ctx.device,
          placement:    ctx.placement,
          pageType:     ctx.pageType,
          exchangeSlug: ctx.exchangeSlug ?? exchange.slug,
          appendUtm:    options.appendUtm !== false,
        })
      : resolved.url;

  return { ...resolved, trackedUrl };
}

// ── Link health helpers ───────────────────────────────────────────────────────

export interface LinkHealthIssue {
  exchange: string;
  field: string;
  issue: 'missing' | 'placeholder' | 'malformed' | 'duplicate';
  value?: string;
}

/**
 * Audit a single exchange's affiliate links for health issues.
 * Returns an array of issues (empty = healthy).
 */
export function auditExchangeLinks(
  exchange: ResolverExchange,
  seenUrls: Map<string, string>,
): LinkHealthIssue[] {
  const issues: LinkHealthIssue[] = [];
  const { slug } = exchange;

  // Check top-level affiliateUrl
  if (isPlaceholder(exchange.affiliateUrl)) {
    issues.push({ exchange: slug, field: 'affiliateUrl', issue: 'placeholder', value: exchange.affiliateUrl });
  } else if (!isValidUrl(exchange.affiliateUrl)) {
    issues.push({ exchange: slug, field: 'affiliateUrl', issue: 'malformed', value: exchange.affiliateUrl });
  } else {
    // Duplicate check
    const prior = seenUrls.get(exchange.affiliateUrl);
    if (prior) {
      issues.push({ exchange: slug, field: 'affiliateUrl', issue: 'duplicate', value: `same as ${prior}` });
    } else {
      seenUrls.set(exchange.affiliateUrl, slug);
    }
  }

  // Check affiliateLinks.default
  const def = exchange.affiliateLinks?.default;
  if (def) {
    if (isPlaceholder(def)) {
      issues.push({ exchange: slug, field: 'affiliateLinks.default', issue: 'placeholder', value: def });
    } else if (!isValidUrl(def)) {
      issues.push({ exchange: slug, field: 'affiliateLinks.default', issue: 'malformed', value: def });
    }
  } else {
    issues.push({ exchange: slug, field: 'affiliateLinks.default', issue: 'missing' });
  }

  // Check geo URLs
  for (const geo of SUPPORTED_GEOS) {
    const geoUrl = exchange.affiliateLinks?.geo?.[geo];
    if (!geoUrl) {
      issues.push({ exchange: slug, field: `affiliateLinks.geo.${geo}`, issue: 'missing' });
    } else if (isPlaceholder(geoUrl)) {
      issues.push({ exchange: slug, field: `affiliateLinks.geo.${geo}`, issue: 'placeholder', value: geoUrl });
    } else if (!isValidUrl(geoUrl)) {
      issues.push({ exchange: slug, field: `affiliateLinks.geo.${geo}`, issue: 'malformed', value: geoUrl });
    }
  }

  return issues;
}

/**
 * Audit all exchanges in a list. Returns a flat array of all issues found.
 */
export function auditAllLinks(exchanges: ResolverExchange[]): LinkHealthIssue[] {
  const seen = new Map<string, string>();
  return exchanges.flatMap(ex => auditExchangeLinks(ex, seen));
}
