/**
 * Public offer view (Issue #264, generalized in #266).
 *
 * The ONE helper every shared public surface (homepage Top-10 row, /exchanges/ directory
 * card, /promo-codes/ table, related/alternative tiles, /go route, dedicated pages) uses
 * to render an offer. It is evidence-driven for EVERY offer-bearing exchange and NEVER
 * reads raw volatile `Offer` fields to grant public authority.
 *
 * Dispatch is governed by PUBLIC_OFFER_AUTHORITY_REGISTRY (#266): only a strategy backed
 * by an EXECUTABLE authorizer here may be commercial. Today only Bybit has one
 * (`bybit_claim_packet_v1`), and it currently still resolves to under_re_verification;
 * every other offer-bearing exchange has `no_authorizing_evidence` and is neutral /
 * non-commercial. Raw `Offer.status` (verified / public-preview / …) is legacy editorial
 * state and NEVER grants public authority. A bare valid `Offer.evidence` does NOT restore
 * any raw offer field — EvidenceMetadata proves identity/source/time only, not the
 * individual commercial claims.
 */
import { getOffer } from './offers';
import { deriveBybitPublicOfferPresentation } from './evidence/offers/bybitPublicPresentation';
import {
  getPublicOfferAuthority,
  isAuthorizingStrategy,
  PUBLIC_OFFER_AUTHORITY_REGISTRY,
  NEUTRAL_PUBLIC_HEADLINE,
  NEUTRAL_PUBLIC_STATUS_LABEL,
  NEUTRAL_PUBLIC_SUMMARY,
  type PublicOfferAuthorityStrategyId,
} from './contracts/publicOfferAuthority';

export interface PublicOfferView {
  slug: string;
  /** Public factual state. */
  publicState: 'verified' | 'under_re_verification' | 'unavailable' | 'expired';
  /** The strategy that governed this view (for the authority matrix / diagnostics). */
  strategy: PublicOfferAuthorityStrategyId;
  /** Promo code to display, or null when it must be hidden. */
  promoCode: string | null;
  /** Bonus/headline display text — neutral copy when unsupported. */
  bonusHeadline: string;
  /** Short summary for the homepage row. */
  summary: string;
  /** Status badge label; never "verified" unless truly verified. */
  statusLabel: string;
  statusTone: 'verified' | 'preview' | 'research' | 'review';
  /** Whether a "✓ Verified offer" badge may be shown. */
  showVerifiedBadge: boolean;
  /** Whether a commercial (affiliate) CTA may be shown; false → non-commercial only. */
  isCommercial: boolean;
}

/** The fail-closed neutral view every non-authoritative offer-bearing exchange gets. */
function neutralView(slug: string, strategy: PublicOfferAuthorityStrategyId): PublicOfferView {
  return {
    slug,
    publicState: 'under_re_verification',
    strategy,
    promoCode: null,
    bonusHeadline: NEUTRAL_PUBLIC_HEADLINE,
    summary: NEUTRAL_PUBLIC_SUMMARY,
    statusLabel: NEUTRAL_PUBLIC_STATUS_LABEL,
    statusTone: 'review',
    showVerifiedBadge: false,
    isCommercial: false,
  };
}

/**
 * Resolve the public, render-safe view for an exchange's offer against an EXPLICIT finite
 * clock (R5). Returns null only when the slug is not a registered offer-bearing exchange
 * (e.g. a research-only / retired directory entry). A registered exchange whose strategy
 * is unknown/non-authorizing fails closed to the neutral view.
 */
export function resolvePublicOfferView(slug: string, nowMs: number): PublicOfferView | null {
  const authority = getPublicOfferAuthority(slug);
  if (!authority) return null; // not an offer-bearing exchange → no public offer view

  // bybit_claim_packet_v1 — the ONE executable authorizing strategy today.
  if (authority.strategy === 'bybit_claim_packet_v1' && slug === 'bybit') {
    const p = deriveBybitPublicOfferPresentation(nowMs);
    return {
      slug: 'bybit',
      publicState: p.publicState,
      strategy: authority.strategy,
      promoCode: p.promoCode,
      bonusHeadline: p.headline,
      summary: p.summary,
      statusLabel: p.statusLabel,
      statusTone: p.statusTone,
      showVerifiedBadge: p.publicState === 'verified',
      isCommercial: p.isCommercialCtaAllowed,
    };
  }

  // Any other strategy — including an authorizing strategy id that lacks a wired executable
  // authorizer here (defensive), and every `no_authorizing_evidence` exchange — fails
  // closed to neutral. A data-only strategy flip can never make an exchange commercial.
  void isAuthorizingStrategy; // documents the contract: commercial requires an authorizer above
  return neutralView(slug, authority.strategy);
}

export interface OfferAuthorityMatrixRow {
  slug: string;
  strategy: PublicOfferAuthorityStrategyId;
  publicState: PublicOfferView['publicState'];
  commercial: boolean;
}

/**
 * Deterministic current-state authority matrix (R13): the governing strategy, public state
 * and commercial flag for every registered offer-bearing exchange, at an explicit clock.
 */
export function resolvePublicOfferAuthorityMatrix(nowMs: number): OfferAuthorityMatrixRow[] {
  return PUBLIC_OFFER_AUTHORITY_REGISTRY.map((e) => {
    const view = resolvePublicOfferView(e.slug, nowMs);
    // A registered offer with no view would be a contract break; fail closed to neutral.
    const v = view ?? neutralView(e.slug, e.strategy);
    return { slug: e.slug, strategy: v.strategy, publicState: v.publicState, commercial: v.isCommercial };
  });
}
