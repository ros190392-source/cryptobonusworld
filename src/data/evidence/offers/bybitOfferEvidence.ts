/**
 * Bybit offer-evidence pilot (Issue #252) — loader + honest data posture.
 *
 * Loads the committed, auditable capture packet, validates it structurally at
 * module load (build-time fail-closed), and records the real-data DECISION.
 *
 * Outcome (this capture): **B — UNDER RE-VERIFICATION.** The official Bybit promo
 * pages returned HTTP 302 redirects with no server-rendered offer content, so
 * every required offer claim is `inaccessible` and the referral code is
 * partner-only (`requires_owner_partner_confirmation`). The packet is therefore
 * `draft` and CANNOT authorize; `offers.bybit.evidence` stays `null`. There is no
 * optimistic fallback. When (later) an approved, complete packet exists, the same
 * adapter deterministically derives authorizing EvidenceMetadata.
 */
import type { EvidenceMetadata } from '../../contracts/evidenceMetadata';
import {
  type OfferEvidencePacket,
  type PacketAdaptResult,
  validateOfferEvidencePacket,
  adaptApprovedPacketToEvidence,
} from '../../contracts/offerEvidencePacket';
import rawPacket from './bybit-new-user-2026-08-05.json';

const validation = validateOfferEvidencePacket(rawPacket);
if (!validation.ok || !validation.value) {
  // A malformed committed packet is a build-time contract error.
  throw new Error(
    `Bybit offer-evidence packet is structurally invalid: ${validation.issues.map((i) => `${i.field}:${i.code}`).join(', ')}`,
  );
}

/** The validated, auditable Bybit capture packet. */
export const BYBIT_OFFER_EVIDENCE_PACKET: OfferEvidencePacket = validation.value;

export type BybitEvidenceDecision = 'authoritative' | 'under_re_verification';

/**
 * The honest real-data decision for this capture. Derived STRUCTURALLY (no wall
 * clock): a packet that is not approved, or that has any unsupported required
 * claim, can never authorize — so the row stays under re-verification.
 */
export const BYBIT_OFFER_EVIDENCE_DECISION: BybitEvidenceDecision = (() => {
  const p = BYBIT_OFFER_EVIDENCE_PACKET;
  const requiredAllSupported = p.claims
    .filter((c) => c.requiredForAuthorization)
    .every((c) => c.result === 'supported');
  return p.approval === 'approved' && requiredAllSupported ? 'authoritative' : 'under_re_verification';
})();

/**
 * Deterministic derivation of authorizing EvidenceMetadata from the packet, given
 * an explicit clock. Returns a fail-closed reason for the current draft packet.
 * Exposed for tests and for the future Outcome-A wiring.
 */
export function deriveBybitOfferEvidence(nowMs: number): PacketAdaptResult {
  return adaptApprovedPacketToEvidence(BYBIT_OFFER_EVIDENCE_PACKET, nowMs, 'bybit');
}

/**
 * The EvidenceMetadata that authorizes the Bybit offer, or null while under
 * re-verification. Null for this capture (Outcome B) — a future approved,
 * complete packet is the ONLY thing that can make it non-null (via the adapter).
 */
export const bybitOfferEvidence: EvidenceMetadata | null = null;
