/**
 * Homepage Top-10 — gated commercial CTA binding.
 *
 * Binds each Top-10 row to the canonical fail-closed commercial CTA contract
 * (resolveCommercialCta). Canonical gate inputs (availability / offer
 * eligibility / approval) are DERIVED from the real exchange + offer records —
 * never fabricated. A live `/go/{slug}` affiliate target is therefore possible
 * only for a verified, offer-eligible exchange while the public CTA mode is
 * 'production'; every other row falls back to an internal review target, and
 * restricted/unavailable markets render a genuinely non-actionable state.
 */
import type { HomepageTop10Entry } from './homepageTop10';
import { getExchange } from './exchanges';
import { getOffer } from './offers';
import type { CtaMode } from './exchangePreview/cta-contract';
import { resolvePublicCtaMode } from './portalCtaMode';
import {
  resolveCommercialCta,
  type CommercialCtaModel,
  type CtaIntent,
  type CtaLocale,
  type CtaProfileInput,
} from './contracts/portalCta';
import type { AvailabilityState, OfferEligibility, ApprovalState } from './contracts/portalFactory';
import { isInternalPath } from './contracts/internalPath';

export interface HomepageTop10CtaBinding {
  rank: number;
  slug: string;
  /** Gated primary CTA (commercial when authorized, internal review otherwise). */
  primary: CommercialCtaModel;
  /** Secondary internal transition (always a local review/status route). */
  secondaryLabel: string;
  secondaryHref: string;
}

/**
 * Map a real offer status onto canonical gate facts. Only a `verified` offer is
 * treated as approved + offer-eligible + available (the sole path to a live
 * affiliate CTA). A public preview is available but not yet offer-eligible; any
 * other/absent offer is unknown-availability and not eligible.
 */
function deriveGateFacts(offerStatus: string | undefined): {
  availability: AvailabilityState;
  offerEligibility: OfferEligibility;
  approval: ApprovalState;
} {
  switch (offerStatus) {
    case 'verified':
      return { availability: 'available', offerEligibility: 'approved', approval: 'approved' };
    case 'public-preview':
      return { availability: 'available', offerEligibility: 'under_review', approval: 'validated' };
    default:
      // unverified / expired / no offer (research or re-verification rows)
      return { availability: 'unknown', offerEligibility: 'not_eligible', approval: 'validated' };
  }
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
 * Build the CTA profile input for one Top-10 entry from real records.
 * Exported for focused testing.
 */
export function buildCtaProfile(entry: HomepageTop10Entry): CtaProfileInput {
  const offer = getOffer(entry.slug);
  const facts = deriveGateFacts(offer?.status);
  return {
    exchangeId: entry.slug,
    slug: entry.slug,
    availability: facts.availability,
    offerEligibility: facts.offerEligibility,
    approval: facts.approval,
    reviewHref: reviewHrefFor(entry.slug),
  };
}

/**
 * Choose the primary commercial intent for a row. Offer-bearing rows use a
 * commercial intent (the gate decides affiliate vs. internal); rows without an
 * offer use a non-commercial review intent so they never present a bonus label.
 */
function primaryIntentFor(entry: HomepageTop10Entry): CtaIntent {
  const offer = getOffer(entry.slug);
  return offer ? 'get_bonus' : 'view_review';
}

/** Resolve the gated CTA binding for a single entry. */
export function resolveHomepageTop10Cta(
  entry: HomepageTop10Entry,
  mode: CtaMode,
  locale: CtaLocale = 'en',
): HomepageTop10CtaBinding {
  const profile = buildCtaProfile(entry);
  const primary = resolveCommercialCta(primaryIntentFor(entry), locale, mode, profile);

  const secondaryHref = entry.secondaryAction.href;
  if (secondaryHref.startsWith('/go/')) {
    throw new Error(`Homepage Top-10 secondary action for ${entry.slug} must be internal, never affiliate.`);
  }

  return {
    rank: entry.rank,
    slug: entry.slug,
    primary,
    secondaryLabel: entry.secondaryAction.label,
    secondaryHref,
  };
}

/** Resolve gated CTA bindings for the whole Top-10, using the central mode. */
export function resolveHomepageTop10Ctas(
  entries: HomepageTop10Entry[],
  locale: CtaLocale = 'en',
): HomepageTop10CtaBinding[] {
  const mode = resolvePublicCtaMode();
  const bindings = entries.map((entry) => resolveHomepageTop10Cta(entry, mode, locale));

  // Fail-closed build guard: preview mode must never leak an affiliate target.
  if (mode === 'preview' && bindings.some((b) => b.primary.href.startsWith('/go/'))) {
    throw new Error('Homepage Top-10 preview mode must not emit any /go/ affiliate target.');
  }
  return bindings;
}
