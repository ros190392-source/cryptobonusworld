/**
 * Public commercial-route projection for Issue #269.
 *
 * This module is deliberately separate from factual offer-claim authority.
 * It answers whether an exact owner-confirmed registration destination may be used and which
 * exact owner-confirmed promo/referral code may be displayed. It never upgrades offer claims.
 */
import exchanges from './exchanges.json';
import { resolvePublicOfferView, type PublicOfferView } from './publicOfferView';
import {
  resolveOwnerConfirmedCommercialAuthority,
  type OwnerConfirmedCommercialAuthority,
} from './contracts/ownerConfirmedCommercialAuthority';
import { PUBLIC_COMMERCIAL_CANDIDATE_EXCHANGES } from './contracts/publicOfferAuthority';

type RawExchange = {
  slug?: unknown;
  name?: unknown;
};

export type PublicCommercialDestinationKind = 'confirmed_geo' | 'confirmed_default' | 'internal';

export interface PublicCommercialRouteDecision {
  slug: string;
  name: string;
  publicState: PublicOfferView['publicState'] | 'unavailable';
  externalAllowed: boolean;
  destination: string;
  destinationKind: PublicCommercialDestinationKind;
  fallbackUrl: string;
  ctaLabel: string;
  /** Exact owner-confirmed promo/referral code; independent from factual claim view. */
  promoCode: string | null;
  promoCodeAuthority: 'owner_confirmed' | 'unconfirmed';
  offerTermsLabel: string;
}

const ROOT_STATUS_PAGES = Object.freeze(new Set([
  'bybit',
  'mexc',
  'bitget',
  'okx',
  'kucoin',
  'bingx',
  'coinex',
]));

function rawExchange(slug: string): RawExchange | null {
  return (exchanges as RawExchange[]).find((row) => row?.slug === slug) ?? null;
}

export function publicCommercialFallbackUrl(slug: string): string {
  return ROOT_STATUS_PAGES.has(slug) ? `/${slug}/` : '/exchanges/';
}

function normalizedCountry(countryCode?: string | null): string | null {
  if (typeof countryCode !== 'string') return null;
  const value = countryCode.trim().toLowerCase();
  return value || null;
}

function exactConfirmedDestination(
  authority: OwnerConfirmedCommercialAuthority,
  countryCode?: string | null,
): { url: string; kind: Exclude<PublicCommercialDestinationKind, 'internal'> } | null {
  if (!authority.linkConfirmed) return null;

  const country = normalizedCountry(countryCode);
  if (country) {
    const geo = authority.confirmedGeoUrls[country];
    if (geo) return { url: geo, kind: 'confirmed_geo' };
  }

  if (authority.confirmedDefaultUrl) {
    return { url: authority.confirmedDefaultUrl, kind: 'confirmed_default' };
  }

  return null;
}

/**
 * Resolve one render-safe commercial decision.
 *
 * LINK and CODE authority are independent:
 * - a confirmed code may still be displayed even if the link is missing/unconfirmed;
 * - a confirmed link may navigate while factual bonus/KYC/terms stay under re-verification.
 *
 * Factual `view.isCommercial` is intentionally NOT consulted here.
 */
export function resolvePublicCommercialRoute(
  slug: string,
  nowMs: number,
  countryCode?: string | null,
): PublicCommercialRouteDecision {
  const raw = rawExchange(slug);
  const name = typeof raw?.name === 'string' && raw.name.trim() ? raw.name : slug;
  const fallbackUrl = publicCommercialFallbackUrl(slug);
  const view = resolvePublicOfferView(slug, nowMs);
  const ownerAuthority = resolveOwnerConfirmedCommercialAuthority(slug);

  const promoCodeAuthority: PublicCommercialRouteDecision['promoCodeAuthority'] =
    ownerAuthority?.promoCodeConfirmed === true ? 'owner_confirmed' : 'unconfirmed';
  const promoCode = promoCodeAuthority === 'owner_confirmed'
    ? ownerAuthority?.confirmedPromoCode ?? null
    : null;

  const exact = view?.linkAuthority === 'owner_confirmed'
    && ownerAuthority?.linkConfirmed === true
      ? exactConfirmedDestination(ownerAuthority, countryCode)
      : null;

  if (!exact || !view) {
    return Object.freeze({
      slug,
      name,
      publicState: view?.publicState ?? 'unavailable',
      externalAllowed: false,
      destination: fallbackUrl,
      destinationKind: 'internal',
      fallbackUrl,
      ctaLabel: `View ${name} status`,
      promoCode,
      promoCodeAuthority,
      offerTermsLabel: view?.statusLabel ?? 'Under re-verification',
    });
  }

  return Object.freeze({
    slug,
    name,
    publicState: view.publicState,
    externalAllowed: true,
    destination: exact.url,
    destinationKind: exact.kind,
    fallbackUrl,
    ctaLabel: `Register on ${name}`,
    promoCode,
    promoCodeAuthority,
    offerTermsLabel: view.statusLabel,
  });
}

export interface PublicCommercialRouteValidation {
  ok: boolean;
  issues: string[];
}

/**
 * Repository/runtime invariant proof for the current commercial-candidate set.
 * Any external route must resolve to one of the exact confirmed values; a new
 * slug/value cannot become public-commercial through raw data alone.
 */
export function validatePublicCommercialRouteMatrix(nowMs: number): PublicCommercialRouteValidation {
  const issues: string[] = [];

  for (const slug of PUBLIC_COMMERCIAL_CANDIDATE_EXCHANGES) {
    const decision = resolvePublicCommercialRoute(slug, nowMs);
    const authority = resolveOwnerConfirmedCommercialAuthority(slug);

    if (decision.externalAllowed) {
      if (!authority?.linkConfirmed) {
        issues.push(`external-without-link-authority:${slug}`);
        continue;
      }

      const allowed = new Set([
        authority.confirmedDefaultUrl,
        ...Object.values(authority.confirmedGeoUrls),
      ].filter((value): value is string => typeof value === 'string' && value.length > 0));

      if (!allowed.has(decision.destination)) {
        issues.push(`external-target-not-exact-confirmed-value:${slug}`);
      }
    } else if (!decision.destination.startsWith('/')) {
      issues.push(`internal-fallback-not-internal:${slug}`);
    }

    if (decision.promoCodeAuthority === 'owner_confirmed') {
      if (!authority?.promoCodeConfirmed || decision.promoCode !== authority.confirmedPromoCode) {
        issues.push(`promo-code-not-exact-confirmed-value:${slug}`);
      }
    } else if (decision.promoCode !== null) {
      issues.push(`unconfirmed-promo-code-leak:${slug}`);
    }
  }

  return { ok: issues.length === 0, issues };
}
