/**
 * Bybit PUBLIC offer presentation projection (Issue #264).
 *
 * The raw `Offer` record (src/data/offers.ts) still carries the candidate commercial
 * claims that the confirmation + source-plan systems need internally (promo-code
 * matching, source-plan assertions, historical audit, future evidence activation).
 * Those candidate values must NEVER be presented publicly as current verified facts.
 *
 * This module derives the PUBLIC presentation from AUTHORITATIVE derived state only —
 * never from `Offer.status`:
 *   - the production EvidenceMetadata adapter result (packet → evidence);
 *   - the code-owned source-plan claim assessments (one per public claim);
 *   - the trusted promo-code confirmation evaluator;
 *   - the packet lifecycle (`approval`).
 *
 * Restoration is MONOTONIC and per-claim (R10): a public field becomes claim-bearing
 * ONLY when its OWN governing authority is `supported` (or, for the promo code,
 * `confirmed`). One claim turning supported never unlocks the others. Fail-closed: with
 * no finite clock, or the real draft packet + empty confirmation set, every field is
 * suppressed and the state is `under_re_verification`.
 */
import { getOffer } from '../../offers';
import { BYBIT_OFFER_EVIDENCE_PACKET } from './bybitOfferEvidence';
import { BYBIT_PROMO_CODE_CONFIRMATIONS } from './bybitPromoCodeConfirmation';
import { evaluateBybitPromoCodeConfirmations } from '../../contracts/claimConfirmation';
import { adaptBybitOfferToEvidence } from '../../contracts/offerPacketResolution';
import { assessOfferClaimEvidence } from '../../contracts/bybitOfferClaimSourcePlan';

export type BybitPublicState = 'verified' | 'under_re_verification' | 'unavailable' | 'expired';

/** Concise, non-claiming neutral copy (R3/R11). */
export const BYBIT_NEUTRAL_HEADLINE = 'Offer details are being re-verified';
export const BYBIT_NEUTRAL_DETAIL = 'Current promotion terms are not verified yet.';
export const BYBIT_NEUTRAL_STATUS_LABEL = 'Under re-verification';
export const BYBIT_NEUTRAL_SUMMARY =
  'Offer details are being re-verified. Current promotion terms are not verified yet — check the exchange directly for current terms.';

/** Governing source-plan claim IDs per public field (R5). */
const CLAIM = {
  bonusHeadline: 'bybit.bonus_headline',
  feeDiscount: 'bybit.fee_discount',
  kycRequired: 'bybit.kyc_required',
  depositRequired: 'bybit.deposit_required',
  minDeposit: 'bybit.min_deposit',
  availability: 'bybit.availability',
  restrictedCountries: 'bybit.restricted_countries',
  rewardType: 'bybit.reward_type',
  expiry: 'bybit.expiry',
  termsSummary: 'bybit.terms_summary',
} as const;

export interface BybitPublicOfferPresentation {
  slug: 'bybit';
  name: 'Bybit';
  /** Deterministic public factual state; fail-closed. */
  publicState: BybitPublicState;
  /** Neutral or (when verified) claim-bearing status label. Never "verified" unless truly verified. */
  statusLabel: string;
  /** Homepage badge tone. */
  statusTone: 'verified' | 'review';
  /** Display headline: the claim-bearing bonus headline only when supported, else neutral. */
  headline: string;
  /** Short public detail/summary text. */
  detailText: string;
  summary: string;
  /** Whether a commercial (affiliate) CTA may be shown. Non-commercial while unverified. */
  isCommercialCtaAllowed: boolean;

  /* Per-field authorized values — null unless the exact governing authority is supported/confirmed. */
  promoCode: string | null;
  bonusHeadline: string | null;
  realisticValue: string | null;
  feeDiscount: string | null;
  kycRequired: boolean | null;
  depositRequired: boolean | null;
  minDeposit: string | null;
  availability: string | null;
  restrictedCountries: readonly string[] | null;
  rewardType: string | null;
  expiry: string | null;
  termsSummary: string | null;
}

/**
 * Derive the public Bybit presentation for an explicit clock. Fail-closed: a non-finite
 * clock (the default at static-build time) cannot make any freshness-dependent claim
 * current, so everything neutralizes deterministically.
 */
export function deriveBybitPublicOfferPresentation(nowMs?: number): BybitPublicOfferPresentation {
  const clock = typeof nowMs === 'number' ? nowMs : NaN;
  const offer = getOffer('bybit');
  const packet = BYBIT_OFFER_EVIDENCE_PACKET;

  // Overall verified state: the SOLE product adapter must authorize AND the packet must
  // be approved. Never `Offer.status`.
  const adapt = adaptBybitOfferToEvidence(packet, BYBIT_PROMO_CODE_CONFIRMATIONS, clock);
  const verified = adapt.ok && packet.approval === 'approved';

  // Promo code: trusted confirmation evaluator only.
  const promoState = evaluateBybitPromoCodeConfirmations(
    BYBIT_PROMO_CODE_CONFIRMATIONS as never[],
    clock,
  ).state;
  const promoConfirmed = promoState === 'confirmed';

  const captures = packet.officialSourceCaptures ?? [];
  const supported = (claimId: string): boolean =>
    assessOfferClaimEvidence(claimId, captures as unknown[], clock).result === 'supported';

  // Public state (fail-closed): `verified` ONLY when the sole adapter authorizes AND the
  // packet is approved; otherwise `under_re_verification`. (`unavailable`/`expired` remain
  // in the state union for future lifecycle signals; the current packet never reaches
  // them, so we never present them without an authoritative source.)
  const publicState: BybitPublicState = verified ? 'verified' : 'under_re_verification';

  const claimValue = <T>(claimId: string, raw: T | undefined): T | null =>
    supported(claimId) && raw !== undefined ? raw : null;

  const bonusHeadline = claimValue(CLAIM.bonusHeadline, offer?.bonusHeadline);

  return {
    slug: 'bybit',
    name: 'Bybit',
    publicState,
    statusLabel: verified ? 'Verified offer' : BYBIT_NEUTRAL_STATUS_LABEL,
    statusTone: verified ? 'verified' : 'review',
    headline: bonusHeadline ?? BYBIT_NEUTRAL_HEADLINE,
    detailText: BYBIT_NEUTRAL_DETAIL,
    summary: verified ? (bonusHeadline ?? BYBIT_NEUTRAL_SUMMARY) : BYBIT_NEUTRAL_SUMMARY,
    isCommercialCtaAllowed: verified,

    promoCode: promoConfirmed ? (offer?.promoCode ?? null) : null,
    bonusHeadline,
    // realisticValue is editorial/non-authorizing: never presented while the underlying
    // offer facts are unverified.
    realisticValue: verified ? (offer?.realisticValue ?? null) : null,
    feeDiscount: claimValue(CLAIM.feeDiscount, offer?.feeDiscount),
    kycRequired: claimValue(CLAIM.kycRequired, offer?.kycRequired),
    depositRequired: claimValue(CLAIM.depositRequired, offer?.depositRequired),
    minDeposit: claimValue(CLAIM.minDeposit, offer?.minDeposit),
    availability: claimValue(CLAIM.availability, offer?.availability),
    restrictedCountries: claimValue(CLAIM.restrictedCountries, offer?.restrictedCountries),
    // reward mechanics + expiry are folded into the raw termsSummary internally; they
    // stay null publicly until their own claim is supported.
    rewardType: supported(CLAIM.rewardType) ? 'Trading vouchers and bonuses' : null,
    expiry: supported(CLAIM.expiry) ? 'Vouchers expire 7–30 days after issuance' : null,
    termsSummary: claimValue(CLAIM.termsSummary, offer?.termsSummary),
  };
}

/**
 * Deterministic public presentation for the real data. Clock-independent: the real draft
 * packet + empty confirmation set neutralize every field before any clock is consulted.
 */
export const BYBIT_PUBLIC_PRESENTATION: BybitPublicOfferPresentation =
  deriveBybitPublicOfferPresentation();
