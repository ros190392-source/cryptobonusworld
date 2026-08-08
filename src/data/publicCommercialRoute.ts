/**
 * Public commercial-route projection for Issue #269.
 *
 * This module is deliberately separate from factual offer-claim authority.
 * It answers only whether a public CTA or /go route may leave CBW, and if so,
 * which EXACT owner-confirmed destination may be used. It never appends query
 * parameters, rewrites paths, or upgrades offer claims.
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
  promoCode: string | null;
  promoCodeAuthority: PublicOfferView['promoCodeAuthority'] | 'unconfirmed';
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
 * Resolve one render-safe commercial route decision.
 *
 * External navigation requires BOTH:
 *  - the shared public view to expose owner-confirmed LINK authority; and
 *  - an exact destination from the frozen owner-confirmation manifest.
 *
 * Factual `view.isCommercial` is intentionally NOT consulted here. Issue #269
 * separates registration-link authority from offer-claim authority: a safe exact
 * registration link may stay active while bonus/KYC/terms remain under re-verification.
 *
 * The returned external destination is byte-for-byte the confirmed value.
 * Analytics may observe the click separately, but callers must not mutate this
 * URL by adding subids/UTMs/query params unless that new value is separately
 * owner-confirmed in the manifest.
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

  const exact = view?.linkAuthority === 'owner_confirmed'
    && ownerAuthority?.linkConfirmed === true
      ? exactConfirmedDestination(ownerAuthority, countryCode)
      : null;

  // Explicitly fail closed on either missing projection. Besides being safer to read,
  // this gives strict TypeScript a real control-flow proof that `view` is non-null in
  // the external branch below.
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
      promoCode: view?.promoCode ?? null,
      promoCodeAuthority: view?.promoCodeAuthority ?? 'unconfirmed',
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
    promoCode: view.promoCode,
    promoCodeAuthority: view.promoCodeAuthority,
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
  }

  return { ok: issues.length === 0, issues };
}
