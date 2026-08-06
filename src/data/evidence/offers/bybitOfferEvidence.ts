/**
 * Bybit offer-evidence pilot (Issue #252) — loader + honest data posture.
 *
 * Loads the committed, auditable capture packet, validates it structurally at module
 * load (build-time fail-closed), and records the real-data DECISION through the SINGLE
 * public product authorizing entry point (Issue #258):
 *
 *   adaptBybitOfferToEvidence(rawPacket, confirmationSet, nowMs)
 *
 * Outcome (this capture): **B — UNDER RE-VERIFICATION.** Required non-promo claims are
 * `inaccessible`; `bybit.promo_code` stays `requires_owner_partner_confirmation` and
 * the real confirmation set is empty (no trusted partner receipt), so the bridge cannot
 * resolve promo `supported`. The packet is `draft` and CANNOT authorize;
 * `offers.bybit.evidence` stays `null`.
 */
import {
  type OfferEvidencePacket,
  validateOfferEvidencePacket,
} from '../../contracts/offerEvidencePacket';
import { adaptBybitOfferToEvidence } from '../../contracts/offerPacketResolution';
import { BYBIT_PROMO_CODE_CONFIRMATIONS } from './bybitPromoCodeConfirmation';
import type { EvidenceMetadata } from '../../contracts/evidenceMetadata';
import rawPacket from './bybit-new-user-2026-08-05.json';

const validation = validateOfferEvidencePacket(rawPacket);
if (!validation.ok || !validation.value) {
  throw new Error(
    `Bybit offer-evidence packet is structurally invalid: ${validation.issues.map((i) => `${i.field}:${i.code}`).join(', ')}`,
  );
}

/** The validated, auditable Bybit capture packet. */
export const BYBIT_OFFER_EVIDENCE_PACKET: OfferEvidencePacket = validation.value;

export type BybitEvidenceDecision = 'authoritative' | 'under_re_verification';

/**
 * The honest real-data decision, routed through the ONE public product authorizing
 * function. An unapproved packet can never be authoritative, so this is deterministic
 * without a wall clock; the only path to `authoritative` is the single adapter
 * succeeding over the real (empty) confirmation set.
 */
export function deriveBybitDecision(nowMs?: number): BybitEvidenceDecision {
  if (BYBIT_OFFER_EVIDENCE_PACKET.approval !== 'approved') return 'under_re_verification';
  const clock = typeof nowMs === 'number' ? nowMs : NaN;
  return adaptBybitOfferToEvidence(BYBIT_OFFER_EVIDENCE_PACKET, BYBIT_PROMO_CODE_CONFIRMATIONS, clock).ok
    ? 'authoritative'
    : 'under_re_verification';
}

export const BYBIT_OFFER_EVIDENCE_DECISION: BybitEvidenceDecision = deriveBybitDecision();

/**
 * Deterministic authorization DECISION for the packet + real confirmation set, given an
 * explicit clock. Fail-closed for the current draft packet. Issue #262: this returns only
 * a boolean outcome + reason — it does NOT expose an EvidenceMetadata-producing surface;
 * `adaptBybitOfferToEvidence` remains the single production EvidenceMetadata producer.
 */
export function deriveBybitOfferEvidence(nowMs: number): { ok: boolean; reason: string | null } {
  const r = adaptBybitOfferToEvidence(BYBIT_OFFER_EVIDENCE_PACKET, BYBIT_PROMO_CODE_CONFIRMATIONS, nowMs);
  return r.ok ? { ok: true, reason: null } : { ok: false, reason: r.reason };
}

/**
 * The EvidenceMetadata that authorizes the Bybit offer, or null while under
 * re-verification. Null for this capture (Outcome B).
 */
export const bybitOfferEvidence: EvidenceMetadata | null = null;
