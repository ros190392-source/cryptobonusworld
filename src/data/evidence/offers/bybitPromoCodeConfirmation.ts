/**
 * Real Bybit promo-code confirmation set (Issue #256).
 *
 * This is the LIVE, product-facing confirmation set for `bybit.promo_code`. It is
 * intentionally EMPTY: the referral code `CRYPTOBONUSW` that CBW currently displays
 * is an unconfirmed candidate. No trusted owner/partner confirmation artifact has
 * been supplied, so the code-owned evaluator returns `missing` and the offer claim
 * remains `requires_owner_partner_confirmation`.
 *
 * A real confirmation may only be added when a genuine, separately-supplied factual
 * owner/partner receipt exists — never a synthetic test fixture.
 */
import {
  type ClaimConfirmationArtifact,
  type ConfirmationSetState,
  evaluateBybitPromoCodeConfirmations,
  BYBIT_PROMO_CODE_CONFIRMATION_POLICY,
} from '../../contracts/claimConfirmation';

/** The real, product-facing confirmation set — empty until a factual receipt exists. */
export const BYBIT_PROMO_CODE_CONFIRMATIONS: readonly ClaimConfirmationArtifact[] = Object.freeze([]);

/**
 * Derived confirmation-set state for the real (empty) set. The empty set resolves
 * to `missing` before any clock is consulted, so this is deterministic and does not
 * depend on wall-clock time.
 */
export const BYBIT_PROMO_CODE_CONFIRMATION_STATE: ConfirmationSetState =
  evaluateBybitPromoCodeConfirmations(BYBIT_PROMO_CODE_CONFIRMATIONS as ClaimConfirmationArtifact[], 0).state;

/** The candidate value CBW displays — explicitly unconfirmed. */
export const BYBIT_PROMO_CODE_CANDIDATE = BYBIT_PROMO_CODE_CONFIRMATION_POLICY.candidateValue;
export const BYBIT_PROMO_CODE_CANDIDATE_CONFIRMED = BYBIT_PROMO_CODE_CONFIRMATION_POLICY.candidateConfirmed;
