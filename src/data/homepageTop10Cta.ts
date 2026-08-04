/**
 * Homepage Top-10 — country-aware commercial CTA binding (Split 3).
 *
 * Each row is bound through resolveCountryAwareCommercialCta. Availability and
 * profile approval are decided ONLY by an approved Exchange × Country
 * MarketProfile — never by offer status. Offer status (via getOffer) is passed
 * through solely so the resolver can authorize the OFFER itself and enforce
 * offer.restrictedCountries; it can never create country availability.
 *
 * The static homepage has no country routing yet, so it uses an explicit,
 * non-country review context (PUBLIC_HOMEPAGE_COUNTRY = 'global') and the empty
 * PUBLIC_MARKET_PROFILES registry. Consequently the public homepage emits ZERO
 * `/go/*` links in BOTH preview and production simulation — fully fail-closed —
 * until real approved profiles + country routing land in a later task. There is
 * no hidden default country that could authorize a production action.
 */
import type { HomepageTop10Entry } from './homepageTop10';
import { getExchange } from './exchanges';
import { getOffer } from './offers';
import type { CtaMode } from './exchangePreview/cta-contract';
import { resolvePublicCtaMode } from './portalCtaMode';
import {
  type CommercialCtaModel,
  type CtaIntent,
  type CtaLocale,
} from './contracts/portalCta';
import { isInternalPath } from './contracts/internalPath';
import {
  resolveCountryAwareCommercialCta,
  PUBLIC_HOMEPAGE_COUNTRY,
} from './contracts/countryAwareCta';
import { PUBLIC_MARKET_PROFILES } from './contracts/marketProfileRegistry';
import type { MarketProfile } from './contracts/portalFactory';

export interface HomepageTop10CtaBinding {
  rank: number;
  slug: string;
  /** Gated primary CTA (commercial only when a country-aware proof exists). */
  primary: CommercialCtaModel;
  /** Secondary internal transition (always a local review/status route). */
  secondaryLabel: string;
  secondaryHref: string;
}

/** Options for resolving a homepage binding (country context + registry injectable). */
export interface HomepageCtaOptions {
  /** Explicit country context; defaults to the non-country homepage context. */
  countryCode?: string;
  /** MarketProfile registry; defaults to the empty public registry. */
  marketProfiles?: readonly MarketProfile[];
  /** Explicit clock for evidence freshness. */
  now?: number;
}

function reviewHrefFor(slug: string): string {
  const exchange = getExchange(slug);
  const href = exchange?.pageUrl ?? `/exchanges/${slug}/`;
  if (!isInternalPath(href)) {
    throw new Error(`Homepage Top-10 review href for ${slug} must be a normalized internal path: ${href}`);
  }
  return href;
}

/**
 * Choose the primary commercial intent for a row. Offer-bearing rows use a
 * commercial intent (the country-aware gate decides affiliate vs. internal);
 * rows without an offer use a non-commercial review intent.
 */
function primaryIntentFor(entry: HomepageTop10Entry): CtaIntent {
  const offer = getOffer(entry.slug);
  return offer ? 'get_bonus' : 'view_review';
}

/** Resolve the country-aware CTA binding for a single entry. */
export function resolveHomepageTop10Cta(
  entry: HomepageTop10Entry,
  mode: CtaMode,
  locale: CtaLocale = 'en',
  options: HomepageCtaOptions = {},
): HomepageTop10CtaBinding {
  const offer = getOffer(entry.slug);
  const primary = resolveCountryAwareCommercialCta({
    intent: primaryIntentFor(entry),
    locale,
    mode,
    countryCode: options.countryCode ?? PUBLIC_HOMEPAGE_COUNTRY,
    exchangeId: entry.slug,
    slug: entry.slug,
    reviewHref: reviewHrefFor(entry.slug),
    offer: offer ? { status: offer.status, restrictedCountries: offer.restrictedCountries } : null,
    marketProfiles: options.marketProfiles ?? PUBLIC_MARKET_PROFILES,
    now: options.now ?? Date.now(),
  });

  // Fail-closed secondary-action contract: the destination must be a normalized
  // internal path (never affiliate /go/*, external absolute, protocol-relative
  // or otherwise malformed) and the label must be non-empty. The component
  // renders THIS validated binding, never the raw entry fields.
  const secondaryHref = entry.secondaryAction.href;
  if (!isInternalPath(secondaryHref)) {
    throw new Error(`Homepage Top-10 secondary action for ${entry.slug} must be a normalized internal path (never affiliate/external/protocol-relative): ${secondaryHref}`);
  }
  const secondaryLabel = entry.secondaryAction.label;
  if (typeof secondaryLabel !== 'string' || !secondaryLabel.trim()) {
    throw new Error(`Homepage Top-10 secondary action label for ${entry.slug} must be a non-empty string.`);
  }

  return {
    rank: entry.rank,
    slug: entry.slug,
    primary,
    secondaryLabel,
    secondaryHref,
  };
}

/** Resolve country-aware CTA bindings for the whole Top-10, using the central mode. */
export function resolveHomepageTop10Ctas(
  entries: HomepageTop10Entry[],
  locale: CtaLocale = 'en',
  options: HomepageCtaOptions = {},
): HomepageTop10CtaBinding[] {
  const mode = resolvePublicCtaMode();
  const bindings = entries.map((entry) => resolveHomepageTop10Cta(entry, mode, locale, options));

  // Fail-closed build guard: with the public (empty) registry and the
  // non-country homepage context, NO /go/ target may appear in EITHER preview
  // or production simulation. A leak means a country-aware invariant regressed.
  const usingPublicRegistry = (options.marketProfiles ?? PUBLIC_MARKET_PROFILES) === PUBLIC_MARKET_PROFILES;
  if (usingPublicRegistry && bindings.some((b) => b.primary.href.startsWith('/go/'))) {
    throw new Error('Homepage Top-10 public build must not emit any /go/ affiliate target (no approved MarketProfile registry).');
  }
  return bindings;
}
