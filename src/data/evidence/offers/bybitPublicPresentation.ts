/**
 * Bybit PUBLIC offer presentation projection (Issue #264, hardened per PR #265 review).
 *
 * The raw `Offer` record still carries candidate commercial claims the confirmation +
 * source-plan systems need internally. Those values must NEVER be presented publicly as
 * current verified facts. This module derives the PUBLIC presentation from AUTHORITATIVE
 * derived state only (never `Offer.status`) against an EXPLICIT finite clock (R5):
 *   - the production EvidenceMetadata adapter result (packet → evidence);
 *   - the code-owned source-plan claim assessments;
 *   - the FULL trusted promo-code confirmation evaluator result;
 *   - the packet lifecycle.
 *
 * Exact value binding (R2/R3/R4): a public field surfaces ONLY when BOTH (A) its canonical
 * assessment is `supported`/`confirmed` for the explicit clock AND (B) the CURRENT raw
 * candidate exactly matches the code-owned asserted value that was assessed. A supported
 * OLD assertion can never authorize a CHANGED raw candidate. Restored values are the
 * code-owned assessed values themselves — never an invented or arbitrarily-mutated string.
 * `realisticValue` has no source-plan authority and stays null (no editorial authority is
 * introduced in #264).
 */
import type { Offer } from '../../offers';
import { getOffer } from '../../offers';
import { BYBIT_OFFER_EVIDENCE_PACKET } from './bybitOfferEvidence';
import { BYBIT_PROMO_CODE_CONFIRMATIONS } from './bybitPromoCodeConfirmation';
import {
  type ClaimConfirmationArtifact,
  type ConfirmationSetEvaluation,
  evaluateBybitPromoCodeConfirmations,
  normalizeReferralCode,
} from '../../contracts/claimConfirmation';
import { adaptBybitOfferToEvidence } from '../../contracts/offerPacketResolution';
import { assessOfferClaimEvidence, getSourcePlanEntry } from '../../contracts/bybitOfferClaimSourcePlan';

export type BybitPublicState = 'verified' | 'under_re_verification' | 'unavailable' | 'expired';

/** Concise, non-claiming neutral copy (R3/R11). */
export const BYBIT_NEUTRAL_HEADLINE = 'Offer details are being re-verified';
export const BYBIT_NEUTRAL_DETAIL = 'Current promotion terms are not verified yet.';
export const BYBIT_NEUTRAL_STATUS_LABEL = 'Under re-verification';
export const BYBIT_NEUTRAL_SUMMARY =
  'Offer details are being re-verified. Current promotion terms are not verified yet — check the exchange directly for current terms.';

/* ─────────────────────── R2/R4 — exact public claim/value bindings ─────────────────── */

export type ClaimMatchKind =
  | 'exact-string'      // raw string must equal the assessed assertion
  | 'exact-boolean'     // raw boolean must equal the assessed boolean
  | 'exact-country-set' // raw list must equal the assessed set (order-independent)
  | 'assessed-prefix'   // raw string must begin with the assessed assertion (extra editorial tail allowed)
  | 'assertion-only';   // no raw Offer field; the code-owned assertion IS the value

export interface PublicClaimBinding {
  fieldId: string;
  claimId: string;
  matchKind: ClaimMatchKind;
  /** The exact code-owned asserted value the source plan assessed. */
  assertedValue: string | boolean | readonly string[];
  /** The value surfaced publicly when authorized (code-owned; never a raw mutation). */
  publicValue: string | boolean | readonly string[];
}

const sp = (claimId: string): string => getSourcePlanEntry(claimId)?.currentAssertion ?? '';
const RESTRICTED_SET = Object.freeze(['US', 'UK', 'CA', 'SG', 'NL']);

/**
 * One code-owned binding per public field. String fields reuse the source-plan
 * `currentAssertion` (the exact assessed value); structured fields declare a code-owned
 * asserted value. `reward_type` / `expiry` have no raw Offer field, so the assessed
 * assertion is the sole value (assertion-only).
 */
export const BYBIT_PUBLIC_CLAIM_BINDINGS: readonly PublicClaimBinding[] = Object.freeze([
  { fieldId: 'bonusHeadline', claimId: 'bybit.bonus_headline', matchKind: 'exact-string', assertedValue: sp('bybit.bonus_headline'), publicValue: sp('bybit.bonus_headline') },
  { fieldId: 'feeDiscount', claimId: 'bybit.fee_discount', matchKind: 'exact-string', assertedValue: sp('bybit.fee_discount'), publicValue: sp('bybit.fee_discount') },
  { fieldId: 'kycRequired', claimId: 'bybit.kyc_required', matchKind: 'exact-boolean', assertedValue: true, publicValue: true },
  { fieldId: 'depositRequired', claimId: 'bybit.deposit_required', matchKind: 'exact-boolean', assertedValue: true, publicValue: true },
  { fieldId: 'minDeposit', claimId: 'bybit.min_deposit', matchKind: 'exact-string', assertedValue: sp('bybit.min_deposit'), publicValue: sp('bybit.min_deposit') },
  { fieldId: 'availability', claimId: 'bybit.availability', matchKind: 'exact-string', assertedValue: sp('bybit.availability'), publicValue: sp('bybit.availability') },
  { fieldId: 'restrictedCountries', claimId: 'bybit.restricted_countries', matchKind: 'exact-country-set', assertedValue: RESTRICTED_SET, publicValue: RESTRICTED_SET },
  { fieldId: 'rewardType', claimId: 'bybit.reward_type', matchKind: 'assertion-only', assertedValue: sp('bybit.reward_type'), publicValue: sp('bybit.reward_type') },
  { fieldId: 'expiry', claimId: 'bybit.expiry', matchKind: 'assertion-only', assertedValue: sp('bybit.expiry'), publicValue: sp('bybit.expiry') },
  { fieldId: 'termsSummary', claimId: 'bybit.terms_summary', matchKind: 'assessed-prefix', assertedValue: sp('bybit.terms_summary'), publicValue: sp('bybit.terms_summary') },
]);

const normStr = (s: unknown): string | null => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : null);
const normSet = (v: unknown): string | null =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')
    ? [...(v as string[])].map((x) => x.trim().toUpperCase()).sort().join('|')
    : null;

/** Extract the raw candidate for a binding from the Offer (undefined when no raw field). */
function rawCandidateFor(fieldId: string, offer: Offer | undefined): unknown {
  switch (fieldId) {
    case 'bonusHeadline': return offer?.bonusHeadline;
    case 'feeDiscount': return offer?.feeDiscount;
    case 'kycRequired': return offer?.kycRequired;
    case 'depositRequired': return offer?.depositRequired;
    case 'minDeposit': return offer?.minDeposit;
    case 'availability': return offer?.availability;
    case 'restrictedCountries': return offer?.restrictedCountries;
    case 'termsSummary': return offer?.termsSummary;
    default: return undefined; // rewardType / expiry — no raw Offer field
  }
}

/**
 * PURE resolver (R2/R4). Given a binding, the raw Offer and whether the claim's canonical
 * assessment is `supported`, return the public value or null. A supported assessment alone
 * never surfaces a value: the current raw candidate must still exactly match the assessed
 * assertion (identity-preserving), otherwise the field stays hidden.
 */
export function resolvePublicClaimValue(
  binding: PublicClaimBinding,
  offer: Offer | undefined,
  supported: boolean,
): string | boolean | readonly string[] | null {
  if (!supported) return null;
  if (binding.matchKind === 'assertion-only') return binding.publicValue;

  const raw = rawCandidateFor(binding.fieldId, offer);
  if (binding.matchKind === 'exact-boolean') return raw === binding.assertedValue ? binding.publicValue : null;
  if (binding.matchKind === 'exact-country-set') {
    const a = normSet(raw);
    return a !== null && a === normSet(binding.assertedValue) ? binding.publicValue : null;
  }
  const rawStr = normStr(raw);
  const assertedStr = normStr(binding.assertedValue);
  if (rawStr === null || assertedStr === null) return null;
  if (binding.matchKind === 'exact-string') return rawStr === assertedStr ? binding.publicValue : null;
  if (binding.matchKind === 'assessed-prefix') return rawStr.startsWith(assertedStr) ? binding.publicValue : null;
  return null;
}

/**
 * PURE promo-code resolver (R3). The unconfirmed candidate code surfaces only when the
 * COMPLETE production evaluator result authorizes THIS exact current raw code: state
 * confirmed, a confirmed value + confirmationId present, and the normalized real
 * `Offer.promoCode` equals the evaluator's confirmed value. A changed raw code after an
 * old confirmation never re-authorizes.
 */
export function resolvePublicPromoCode(
  rawCode: string | undefined,
  evaluation: ConfirmationSetEvaluation,
): string | null {
  if (evaluation.state !== 'confirmed') return null;
  if (typeof evaluation.value !== 'string' || evaluation.value.length === 0) return null;
  if (typeof evaluation.confirmationId !== 'string' || evaluation.confirmationId.length === 0) return null;
  const norm = normalizeReferralCode(rawCode);
  if (!norm.ok || norm.value !== evaluation.value) return null;
  return rawCode ?? null;
}

export interface BybitPublicOfferPresentation {
  slug: 'bybit';
  name: 'Bybit';
  publicState: BybitPublicState;
  statusLabel: string;
  statusTone: 'verified' | 'review';
  headline: string;
  detailText: string;
  summary: string;
  isCommercialCtaAllowed: boolean;
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
 * Derive the public Bybit presentation for an EXPLICIT finite clock (R5). A non-finite
 * clock is a fail-closed audit case, never a render source: it neutralizes everything.
 */
export function deriveBybitPublicOfferPresentation(nowMs: number): BybitPublicOfferPresentation {
  const offer = getOffer('bybit');
  const packet = BYBIT_OFFER_EVIDENCE_PACKET;
  const captures = (packet.officialSourceCaptures ?? []) as unknown[];

  const adapt = adaptBybitOfferToEvidence(packet, BYBIT_PROMO_CODE_CONFIRMATIONS, nowMs);
  const verified = adapt.ok && packet.approval === 'approved';

  const promoEval = evaluateBybitPromoCodeConfirmations(
    BYBIT_PROMO_CODE_CONFIRMATIONS as ClaimConfirmationArtifact[],
    nowMs,
  );
  const promoCode = resolvePublicPromoCode(offer?.promoCode, promoEval);

  const supported = (claimId: string): boolean =>
    assessOfferClaimEvidence(claimId, captures, nowMs).result === 'supported';
  const field = (fieldId: string) => {
    const b = BYBIT_PUBLIC_CLAIM_BINDINGS.find((x) => x.fieldId === fieldId)!;
    return resolvePublicClaimValue(b, offer, supported(b.claimId));
  };

  const bonusHeadline = field('bonusHeadline') as string | null;
  const publicState: BybitPublicState = verified ? 'verified' : 'under_re_verification';

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

    promoCode,
    bonusHeadline,
    // realisticValue has no source-plan authority (R4): always null in #264.
    realisticValue: null,
    feeDiscount: field('feeDiscount') as string | null,
    kycRequired: field('kycRequired') as boolean | null,
    depositRequired: field('depositRequired') as boolean | null,
    minDeposit: field('minDeposit') as string | null,
    availability: field('availability') as string | null,
    restrictedCountries: field('restrictedCountries') as readonly string[] | null,
    rewardType: field('rewardType') as string | null,
    expiry: field('expiry') as string | null,
    termsSummary: field('termsSummary') as string | null,
  };
}
