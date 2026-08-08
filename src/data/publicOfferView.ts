/**
 * Public offer view (Issue #264, generalized in #266, authority split in #269).
 *
 * This projection is CLAIM/EVIDENCE SAFE. Owner-confirmed registration links and
 * promo/referral codes are governed independently and must be consumed through
 * `resolvePublicCommercialRoute()` (or the underlying owner authority contract),
 * not smuggled into the factual offer model.
 */
import { deriveBybitPublicOfferPresentation } from './evidence/offers/bybitPublicPresentation';
import {
  getPublicOfferAuthority,
  PUBLIC_OFFER_AUTHORITY_REGISTRY,
  NEUTRAL_PUBLIC_HEADLINE,
  NEUTRAL_PUBLIC_STATUS_LABEL,
  NEUTRAL_PUBLIC_SUMMARY,
  type PublicOfferAuthorityStrategyId,
} from './contracts/publicOfferAuthority';
import {
  resolveOwnerConfirmedCommercialAuthority,
  type OwnerConfirmedCommercialAuthority,
} from './contracts/ownerConfirmedCommercialAuthority';

export interface PublicOfferView {
  slug: string;
  /** Public factual offer state. Link/code authority does not upgrade this. */
  publicState: 'verified' | 'under_re_verification' | 'unavailable' | 'expired';
  /** The claim-evidence strategy governing factual offer presentation. */
  strategy: PublicOfferAuthorityStrategyId;
  /** Claim-authorized promo code only. Owner-confirmed commercial code stays outside this view. */
  promoCode: string | null;
  /** Independent link authority state; the actual destination stays outside this view. */
  linkAuthority: 'owner_confirmed' | 'unconfirmed';
  /** Independent owner promo-code authority state; the actual owner code stays outside this view. */
  promoCodeAuthority: 'owner_confirmed' | 'unconfirmed';
  /** Bonus/headline display text — neutral copy when unsupported. */
  bonusHeadline: string;
  /** Short summary for shared public surfaces. */
  summary: string;
  /** Status badge label; never "verified" merely because link/code is confirmed. */
  statusLabel: string;
  statusTone: 'verified' | 'preview' | 'research' | 'review';
  /** Whether a "✓ Verified offer" badge may be shown. */
  showVerifiedBadge: boolean;
  /**
   * Claim/evidence commercial state retained for compatibility with older consumers.
   * IMPORTANT: owner-confirmed LINK authority does NOT set this true. Consumers that need
   * registration-link authority must use `linkAuthority` / `resolvePublicCommercialRoute()`.
   */
  isCommercial: boolean;
}

function commercialAuthority(slug: string): OwnerConfirmedCommercialAuthority | null {
  return resolveOwnerConfirmedCommercialAuthority(slug);
}

/** Overlay authority FLAGS only; never copy owner commercial values into the claim view. */
function applyOwnerCommercialAuthority(
  view: Omit<PublicOfferView, 'linkAuthority' | 'promoCodeAuthority'>,
  authority: OwnerConfirmedCommercialAuthority | null,
): PublicOfferView {
  const linkConfirmed = authority?.linkConfirmed === true;
  const promoConfirmed = authority?.promoCodeConfirmed === true;
  return {
    ...view,
    // Keep claim-view value exactly as produced by claim evidence. Current real state is null.
    promoCode: view.promoCode,
    linkAuthority: linkConfirmed ? 'owner_confirmed' : 'unconfirmed',
    promoCodeAuthority: promoConfirmed ? 'owner_confirmed' : 'unconfirmed',
    // Do NOT overload `isCommercial` with link authority. This protects every legacy
    // consumer that historically treated isCommercial as permission for claim-bearing copy.
    isCommercial: view.isCommercial,
  };
}

/** Fail-closed factual view. Owner-confirmed link/code remain separate from it. */
function neutralView(
  slug: string,
  strategy: PublicOfferAuthorityStrategyId,
  authority: OwnerConfirmedCommercialAuthority | null = commercialAuthority(slug),
): PublicOfferView {
  return applyOwnerCommercialAuthority({
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
  }, authority);
}

/**
 * Claim-evidence authorizer dispatchers. They decide factual offer presentation only.
 * Link/code authority flags are applied independently afterwards by #269.
 */
type ClaimView = Omit<PublicOfferView, 'linkAuthority' | 'promoCodeAuthority'>;
type ClaimDispatcher = (slug: string, nowMs: number) => ClaimView | null;

const AUTHORIZING_DISPATCHERS: Readonly<Record<string, ClaimDispatcher>> = Object.freeze({
  bybit_claim_packet_v1: (slug: string, nowMs: number): ClaimView | null => {
    if (slug !== 'bybit') return null;
    const p = deriveBybitPublicOfferPresentation(nowMs);
    return {
      slug: 'bybit',
      publicState: p.publicState,
      strategy: 'bybit_claim_packet_v1',
      // Current evidence path does not authorize a public claim-layer promo code.
      promoCode: null,
      bonusHeadline: p.headline,
      summary: p.summary,
      statusLabel: p.statusLabel,
      statusTone: p.statusTone,
      showVerifiedBadge: p.publicState === 'verified',
      // Preserve the claim-level commercial result only; #269 link authority is independent.
      isCommercial: p.isCommercialCtaAllowed,
    };
  },
});

/** Strategies with executable claim dispatchers (consumed by the existing wiring proof). */
export const WIRED_AUTHORIZING_STRATEGIES: readonly string[] = Object.freeze(Object.keys(AUTHORIZING_DISPATCHERS));

export function getAuthorizingDispatcher(strategy: string): ClaimDispatcher | null {
  return AUTHORIZING_DISPATCHERS[strategy] ?? null;
}

/**
 * Resolve the public render-safe CLAIM view. Factual claims are evidence-gated;
 * owner-confirmed commercial values stay in the separate commercial-route projection.
 */
export function resolvePublicOfferView(slug: string, nowMs: number): PublicOfferView | null {
  const claimAuthority = getPublicOfferAuthority(slug);
  if (!claimAuthority) return null;

  const ownerAuthority = commercialAuthority(slug);
  const dispatch = getAuthorizingDispatcher(claimAuthority.strategy);
  if (dispatch) {
    const claimView = dispatch(slug, nowMs);
    if (claimView) return applyOwnerCommercialAuthority(claimView, ownerAuthority);
  }

  return neutralView(slug, claimAuthority.strategy, ownerAuthority);
}

export interface OfferAuthorityMatrixRow {
  slug: string;
  strategy: PublicOfferAuthorityStrategyId;
  publicState: PublicOfferView['publicState'];
  /** Claim/evidence commercial state (NOT link authority). */
  commercial: boolean;
  linkAuthority: PublicOfferView['linkAuthority'];
  promoCodeAuthority: PublicOfferView['promoCodeAuthority'];
}

export function resolvePublicOfferAuthorityMatrix(nowMs: number): OfferAuthorityMatrixRow[] {
  return PUBLIC_OFFER_AUTHORITY_REGISTRY.map((entry) => {
    const view = resolvePublicOfferView(entry.slug, nowMs) ?? neutralView(entry.slug, entry.strategy);
    return {
      slug: entry.slug,
      strategy: view.strategy,
      publicState: view.publicState,
      commercial: view.isCommercial,
      linkAuthority: view.linkAuthority,
      promoCodeAuthority: view.promoCodeAuthority,
    };
  });
}
