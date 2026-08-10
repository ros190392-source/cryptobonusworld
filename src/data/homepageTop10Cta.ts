/**
 * Homepage Top-10 — commercial CTA binding (Split 3 / Issue #269).
 *
 * Country-specific availability remains governed ONLY by an approved Exchange × Country
 * MarketProfile. Issue #269 adds one deliberately narrower global-homepage path: in explicit
 * production mode, an exact owner-confirmed registration destination may power a neutral
 * `/go/<slug>` CTA even while factual offer terms and country availability are under
 * re-verification. That CTA says only "Register"; it does NOT claim that the exchange or
 * promotion is available in the visitor's country.
 */
import type { HomepageTop10Entry } from './homepageTop10';
import { getExchange } from './exchanges';
import { getOffer } from './offers';
import type { CtaMode } from './exchangePreview/cta-contract';
import { resolvePublicCtaMode } from './portalCtaMode';
import {
  assertCommercialCtaModel,
  ctaLabels,
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
import { resolvePublicCommercialRoute } from './publicCommercialRoute';

export interface HomepageTop10CtaBinding {
  rank: number;
  slug: string;
  /** Gated primary CTA. */
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
  /** Explicit clock for evidence/link authority. */
  now?: number;
  /** TEST-ONLY override of authoritative offer evidence, keyed by slug. */
  offerEvidence?: Readonly<Record<string, unknown>>;
}

const PUBLIC_STANDALONE_REVIEW_SLUGS = new Set([
  'bybit', 'mexc', 'okx', 'bitget', 'kucoin', 'bingx', 'coinex',
]);

function reviewHrefFor(slug: string): string {
  const exchange = getExchange(slug);
  const candidate = PUBLIC_STANDALONE_REVIEW_SLUGS.has(slug)
    ? (exchange?.pageUrl ?? `/${slug}/`)
    : '/exchanges/';
  if (!isInternalPath(candidate)) {
    throw new Error(`Homepage Top-10 review href for ${slug} must be a normalized internal path: ${candidate}`);
  }
  return candidate;
}

/**
 * Choose the primary intent for the country-aware path. Offer-bearing rows request a
 * commercial bonus intent; rows without a clean offer request review.
 */
function primaryIntentFor(entry: HomepageTop10Entry): CtaIntent {
  const offer = getOffer(entry.slug);
  return offer ? 'get_bonus' : 'view_review';
}

function registerLabel(locale: CtaLocale): string {
  return ctaLabels.register[locale] ?? ctaLabels.register.en;
}

/**
 * Global homepage exception introduced by #269.
 *
 * It is intentionally NOT a country-availability decision. It only turns a verified owner
 * destination into a neutral registration CTA in explicit production mode. The /go route
 * independently re-checks the exact destination before leaving CBW.
 */
function resolveOwnerConfirmedGlobalHomepageCta(
  entry: HomepageTop10Entry,
  mode: CtaMode,
  locale: CtaLocale,
  now: number | undefined,
): CommercialCtaModel | null {
  if (mode !== 'production' || !Number.isFinite(now)) return null;

  const route = resolvePublicCommercialRoute(entry.slug, now as number);
  if (!route.externalAllowed) return null;

  return assertCommercialCtaModel({
    requestedIntent: 'register',
    resolvedIntent: 'register',
    locale,
    label: registerLabel(locale),
    mode,
    visualState: 'commercial',
    interactionState: 'default',
    href: `/go/${entry.slug}`,
    isAffiliate: true,
    disabled: false,
    rel: 'sponsored nofollow noopener',
    gateReason: null,
  });
}

/** Resolve the CTA binding for a single entry. */
export function resolveHomepageTop10Cta(
  entry: HomepageTop10Entry,
  mode: CtaMode,
  locale: CtaLocale = 'en',
  options: HomepageCtaOptions = {},
): HomepageTop10CtaBinding {
  const offer = getOffer(entry.slug);
  const countryCode = options.countryCode ?? PUBLIC_HOMEPAGE_COUNTRY;
  const marketProfiles = options.marketProfiles ?? PUBLIC_MARKET_PROFILES;

  // Only the non-country GLOBAL homepage with the canonical public registry may use the
  // owner-confirmed neutral registration path. Any explicit country context remains fully
  // MarketProfile-gated and falls through to resolveCountryAwareCommercialCta below.
  const ownerConfirmedGlobal =
    countryCode === PUBLIC_HOMEPAGE_COUNTRY && marketProfiles === PUBLIC_MARKET_PROFILES
      ? resolveOwnerConfirmedGlobalHomepageCta(entry, mode, locale, options.now)
      : null;

  const primary = ownerConfirmedGlobal ?? resolveCountryAwareCommercialCta({
    intent: primaryIntentFor(entry),
    locale,
    mode,
    countryCode,
    exchangeId: entry.slug,
    slug: entry.slug,
    reviewHref: reviewHrefFor(entry.slug),
    offer: offer
      ? {
          exchangeSlug: offer.exchangeSlug,
          status: offer.status,
          restrictedCountries: offer.restrictedCountries,
          // Country-aware offer eligibility still requires authoritative machine evidence.
          evidence: options.offerEvidence && entry.slug in options.offerEvidence
            ? options.offerEvidence[entry.slug]
            : (offer.evidence ?? null),
        }
      : null,
    marketProfiles,
    now: options.now,
  });

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

/** Resolve CTA bindings for the whole Top-10, using the central mode. */
export function resolveHomepageTop10Ctas(
  entries: HomepageTop10Entry[],
  locale: CtaLocale = 'en',
  options: HomepageCtaOptions = {},
): HomepageTop10CtaBinding[] {
  const mode = resolvePublicCtaMode();
  const bindings = entries.map((entry) => resolveHomepageTop10Cta(entry, mode, locale, options));

  const usingPublicRegistry = (options.marketProfiles ?? PUBLIC_MARKET_PROFILES) === PUBLIC_MARKET_PROFILES;
  const countryCode = options.countryCode ?? PUBLIC_HOMEPAGE_COUNTRY;

  if (usingPublicRegistry) {
    for (const binding of bindings) {
      if (!binding.primary.href.startsWith('/go/')) continue;

      // Preview must never emit live affiliate routes.
      if (mode !== 'production') {
        throw new Error('Homepage Top-10 preview build must not emit any /go/ affiliate target.');
      }

      // A /go route without an explicit neutral global context would imply country
      // availability without a MarketProfile, which #269 does not authorize.
      if (countryCode !== PUBLIC_HOMEPAGE_COUNTRY || !Number.isFinite(options.now)) {
        throw new Error('Homepage Top-10 owner-confirmed /go target requires the explicit global context and finite clock.');
      }

      const route = resolvePublicCommercialRoute(binding.slug, options.now as number);
      if (!route.externalAllowed || binding.primary.href !== `/go/${binding.slug}`) {
        throw new Error(`Homepage Top-10 /go target for ${binding.slug} lacks exact owner-confirmed link authority.`);
      }
    }
  }

  return bindings;
}
