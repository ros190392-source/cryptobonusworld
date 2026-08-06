/**
 * Confirmation-to-packet resolution bridge (Issue #258).
 *
 * The committed Bybit `OfferEvidencePacket` is an immutable historical evidence
 * record: its `bybit.promo_code` result stays `requires_owner_partner_confirmation`
 * forever. This module produces a SEPARATE, NON-MUTATING resolved view that layers
 * the trusted ClaimConfirmation evaluator on top of the raw packet — and it is the
 * ONLY path by which `bybit.promo_code` can become `supported`.
 *
 *   raw packet + confirmation set + explicit clock + offer promo code + policy
 *     → resolveOfferPacketClaims(...)                (non-mutating resolved view)
 *       → adaptResolvedApprovedPacketToEvidence(...) (the authorizing adapter)
 *
 * Only `bybit.promo_code` may be influenced by confirmation data; every other claim
 * remains bound to raw capture evidence. The candidate value comes from ONE
 * canonical product-data source — the Bybit `Offer.promoCode` — normalized through
 * the code-owned referral-code rule, and must EXACTLY equal the evaluator-confirmed
 * value (no substring/prefix). A deterministic resolution digest binds the packet,
 * offer code, confirmation set, clock, evaluator result and every resolved claim.
 *
 * Node crypto is build/server-only; this module is not in the client bundle.
 */
import { createHash } from 'node:crypto';
import type { EvidenceMetadata } from './evidenceMetadata';
import {
  type OfferEvidencePacket,
  type OfferClaimResult,
  type PacketAdaptFailReason,
  BYBIT_OFFER_CLAIM_INVENTORY,
  BYBIT_OFFER_REQUIRED_CLAIMS,
  validateOfferEvidencePacket,
  evaluatePacketReadiness,
  packetToEvidenceMetadata,
} from './offerEvidencePacket';
import {
  type ClaimConfirmationArtifact,
  type ConfirmationSetState,
  type PromoCodeConfirmationPolicy,
  evaluatePromoCodeConfirmations,
  normalizeReferralCode,
  BYBIT_PROMO_CODE_CONFIRMATION_POLICY,
} from './claimConfirmation';

const PROMO_CLAIM_ID = 'bybit.promo_code';

export type ClaimProvenanceKind = 'raw_capture' | 'confirmation_evaluator';

export interface ResolvedClaimProvenance {
  kind: ClaimProvenanceKind;
  detail: string;
  evaluatorState?: ConfirmationSetState;
  evaluatorValue?: string | null;
  confirmationId?: string | null;
}

export interface ResolvedClaim {
  claimId: string;
  rawResult: OfferClaimResult;
  resolvedResult: OfferClaimResult;
  provenance: ResolvedClaimProvenance;
}

export interface RawClaimRecord {
  claimId: string;
  result: OfferClaimResult;
  sourceRefs: string[];
}

export interface ConfirmationEvaluationRecord {
  state: ConfirmationSetState;
  value: string | null;
  confirmationId: string | null;
}

export type ResolutionFailReason =
  | 'CLOCK_INVALID'
  | 'RAW_PACKET_INVALID'
  | 'EXCHANGE_NOT_BYBIT'
  | 'OFFER_CODE_INVALID'
  | 'CONFIRMATION_INVALID'
  | 'CONFIRMATION_CONFLICT'
  | 'CONFIRMED_VALUE_MISMATCH';

export interface ResolvedOfferPacket {
  ok: true;
  packet: OfferEvidencePacket;
  packetId: string;
  exchangeId: string;
  captureManifestDigest: string;
  renderedArtifactDigests: string[];
  rawClaims: RawClaimRecord[];
  normalizedOfferPromoCode: string;
  evaluationClockMs: number;
  confirmationEvaluation: ConfirmationEvaluationRecord;
  resolvedClaims: ResolvedClaim[];
  blockingRequiredClaims: string[];
  resolutionDigest: string;
}

export type ResolveResult = ResolvedOfferPacket | { ok: false; reason: ResolutionFailReason };

/* ─────────────────────────── resolution digest ─────────────────────────── */

function canonicalProvenance(p: ResolvedClaimProvenance): Record<string, unknown> {
  return { kind: p.kind, detail: p.detail, evaluatorState: p.evaluatorState ?? null, evaluatorValue: p.evaluatorValue ?? null, confirmationId: p.confirmationId ?? null };
}

/** Deterministic serialization of everything the resolution digest covers. */
export function canonicalResolution(r: Omit<ResolvedOfferPacket, 'resolutionDigest' | 'packet' | 'ok'>): string {
  return JSON.stringify({
    packetId: r.packetId,
    exchangeId: r.exchangeId,
    captureManifestDigest: r.captureManifestDigest,
    renderedArtifactDigests: [...r.renderedArtifactDigests].sort(),
    rawClaims: r.rawClaims.map((c) => ({ claimId: c.claimId, result: c.result, sourceRefs: [...c.sourceRefs].sort() })),
    normalizedOfferPromoCode: r.normalizedOfferPromoCode,
    evaluationClockMs: r.evaluationClockMs,
    confirmationEvaluation: { state: r.confirmationEvaluation.state, value: r.confirmationEvaluation.value, confirmationId: r.confirmationEvaluation.confirmationId },
    resolvedClaims: r.resolvedClaims.map((c) => ({ claimId: c.claimId, rawResult: c.rawResult, resolvedResult: c.resolvedResult, provenance: canonicalProvenance(c.provenance) })),
    blockingRequiredClaims: [...r.blockingRequiredClaims].sort(),
  });
}

export function computeResolutionDigest(r: Omit<ResolvedOfferPacket, 'resolutionDigest' | 'packet' | 'ok'>): string {
  return 'sha256:' + createHash('sha256').update(canonicalResolution(r), 'utf8').digest('hex');
}

/* ─────────────────────────── resolver ─────────────────────────── */

/**
 * Produce the non-mutating resolved claim view. Does NOT mutate packet, confirmation
 * set, offer record or policy. `bybit.promo_code` is the only claim influenced by
 * confirmation data; all others copy their raw result.
 */
export function resolveOfferPacketClaims(
  rawPacket: unknown,
  confirmationSet: readonly ClaimConfirmationArtifact[],
  nowMs: number,
  offerPromoCode: string,
  policy: PromoCodeConfirmationPolicy,
): ResolveResult {
  if (!Number.isFinite(nowMs)) return { ok: false, reason: 'CLOCK_INVALID' };

  const validation = validateOfferEvidencePacket(rawPacket);
  if (!validation.ok || !validation.value) return { ok: false, reason: 'RAW_PACKET_INVALID' };
  const packet = validation.value;
  if (packet.exchangeId !== 'bybit') return { ok: false, reason: 'EXCHANGE_NOT_BYBIT' };

  // Canonical value source: the offer record's promoCode, normalized deterministically.
  const norm = normalizeReferralCode(offerPromoCode);
  if (!norm.ok || !norm.value) return { ok: false, reason: 'OFFER_CODE_INVALID' };
  const normalizedOfferPromoCode = norm.value;

  // The ONE authorizing confirmation evaluation (explicit clock, injected policy).
  const evalRes = evaluatePromoCodeConfirmations(confirmationSet as ClaimConfirmationArtifact[], nowMs, policy);
  if (evalRes.state === 'invalid') return { ok: false, reason: 'CONFIRMATION_INVALID' };
  if (evalRes.state === 'conflict') return { ok: false, reason: 'CONFIRMATION_CONFLICT' };

  const byId = new Map(packet.claims.map((c) => [c.claimId, c] as const));

  // Promo resolution.
  const promoRaw = byId.get(PROMO_CLAIM_ID)?.result ?? 'requires_owner_partner_confirmation';
  let promoResolved: OfferClaimResult = promoRaw;
  let promoProvenance: ResolvedClaimProvenance;
  if (evalRes.state === 'confirmed') {
    if (evalRes.value !== normalizedOfferPromoCode) {
      // A trusted confirmation of a value different from the displayed offer code is
      // a conflict — fail closed (also covers a changed offer code / stale reuse).
      return { ok: false, reason: 'CONFIRMED_VALUE_MISMATCH' };
    }
    promoResolved = 'supported';
    promoProvenance = { kind: 'confirmation_evaluator', detail: 'promo supported by trusted confirmation exactly matching the offer promo code', evaluatorState: 'confirmed', evaluatorValue: evalRes.value ?? null, confirmationId: evalRes.confirmationId ?? null };
  } else {
    promoProvenance = { kind: 'confirmation_evaluator', detail: `promo unresolved (evaluator ${evalRes.state}); no supported authority`, evaluatorState: evalRes.state, evaluatorValue: evalRes.value ?? null, confirmationId: evalRes.confirmationId ?? null };
  }

  const resolvedClaims: ResolvedClaim[] = BYBIT_OFFER_CLAIM_INVENTORY.map((claimId) => {
    const raw = byId.get(claimId);
    const rawResult = raw?.result ?? 'inaccessible';
    if (claimId === PROMO_CLAIM_ID) {
      return { claimId, rawResult, resolvedResult: promoResolved, provenance: promoProvenance };
    }
    return { claimId, rawResult, resolvedResult: rawResult, provenance: { kind: 'raw_capture', detail: 'bound to raw capture evidence; confirmation data cannot influence this claim' } };
  });

  const rawClaims: RawClaimRecord[] = BYBIT_OFFER_CLAIM_INVENTORY.map((claimId) => {
    const raw = byId.get(claimId);
    return { claimId, result: raw?.result ?? 'inaccessible', sourceRefs: raw ? [...raw.sourceRefs] : [] };
  });

  const renderedArtifactDigests = (packet.renderedCaptures ?? []).map((c) => c.normalizedArtifactDigest);
  const blockingRequiredClaims = (BYBIT_OFFER_REQUIRED_CLAIMS as readonly string[])
    .filter((id) => resolvedClaims.find((c) => c.claimId === id)?.resolvedResult !== 'supported')
    .sort();

  const core = {
    packetId: packet.packetId,
    exchangeId: packet.exchangeId,
    captureManifestDigest: packet.captureManifestDigest,
    renderedArtifactDigests,
    rawClaims,
    normalizedOfferPromoCode,
    evaluationClockMs: nowMs,
    confirmationEvaluation: { state: evalRes.state, value: evalRes.value ?? null, confirmationId: evalRes.confirmationId ?? null },
    resolvedClaims,
    blockingRequiredClaims,
  };
  return { ok: true, packet, ...core, resolutionDigest: computeResolutionDigest(core) };
}

/** Product wrapper — always uses the production code-owned confirmation policy. */
export function resolveBybitOfferPacketClaims(
  rawPacket: unknown,
  confirmationSet: readonly ClaimConfirmationArtifact[],
  nowMs: number,
  offerPromoCode: string,
): ResolveResult {
  return resolveOfferPacketClaims(rawPacket, confirmationSet, nowMs, offerPromoCode, BYBIT_PROMO_CODE_CONFIRMATION_POLICY);
}

/* ─────────────────────────── resolved-view integrity ─────────────────────────── */

export interface ResolvedValidationIssue { field: string; code: string; message: string; }

/**
 * Fail-closed structural + integrity validation of a resolved view: the resolved
 * claim inventory must exactly match the code-owned inventory (no missing/duplicate),
 * and the resolution digest must recompute (tamper of packet/offer-code/confirmation/
 * clock/resolved-result/provenance all break it).
 */
export function validateResolvedOfferPacket(resolved: unknown): { ok: boolean; issues: ResolvedValidationIssue[] } {
  const issues: ResolvedValidationIssue[] = [];
  if (typeof resolved !== 'object' || resolved === null) return { ok: false, issues: [{ field: '$', code: 'NOT_OBJECT', message: 'resolved must be an object.' }] };
  const r = resolved as ResolvedOfferPacket;
  if (r.ok !== true) issues.push({ field: 'ok', code: 'NOT_OK', message: 'resolved.ok must be true.' });
  if (!Array.isArray(r.resolvedClaims)) { issues.push({ field: 'resolvedClaims', code: 'INVALID', message: 'resolvedClaims must be an array.' }); return { ok: false, issues }; }
  const seen = new Set<string>();
  for (const c of r.resolvedClaims) {
    if (seen.has(c.claimId)) issues.push({ field: 'resolvedClaims', code: 'DUPLICATE_CLAIM', message: `Duplicate resolved claim: ${c.claimId}` });
    seen.add(c.claimId);
  }
  for (const id of BYBIT_OFFER_CLAIM_INVENTORY) if (!seen.has(id)) issues.push({ field: 'resolvedClaims', code: 'MISSING_CLAIM', message: `Missing resolved claim: ${id}` });
  for (const c of r.resolvedClaims) if (!(BYBIT_OFFER_CLAIM_INVENTORY as readonly string[]).includes(c.claimId)) issues.push({ field: 'resolvedClaims', code: 'UNKNOWN_CLAIM', message: `Unknown resolved claim: ${c.claimId}` });
  // Only promo may diverge from its raw result.
  for (const c of r.resolvedClaims) {
    if (c.claimId !== PROMO_CLAIM_ID && c.resolvedResult !== c.rawResult) issues.push({ field: `resolvedClaims.${c.claimId}`, code: 'NONPROMO_DIVERGED', message: 'Only bybit.promo_code may differ from its raw result.' });
  }
  if (typeof r.resolutionDigest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(r.resolutionDigest)) issues.push({ field: 'resolutionDigest', code: 'INVALID_DIGEST', message: 'resolutionDigest must be sha256.' });
  else if (issues.length === 0) {
    const { resolutionDigest, packet, ok, ...core } = r;
    void resolutionDigest; void packet; void ok;
    if (computeResolutionDigest(core) !== r.resolutionDigest) issues.push({ field: 'resolutionDigest', code: 'RESOLUTION_DIGEST_MISMATCH', message: 'resolutionDigest does not recompute (tampered).' });
  }
  return { ok: issues.length === 0, issues };
}

/* ─────────────────────────── resolved adapter ─────────────────────────── */

export type ResolvedAdaptFailReason =
  | PacketAdaptFailReason
  | 'RESOLUTION_INVALID'
  | 'CLOCK_MISMATCH';

export type ResolvedAdaptResult =
  | { ok: true; evidence: EvidenceMetadata }
  | { ok: false; reason: ResolvedAdaptFailReason };

/**
 * The AUTHORIZING adapter — consumes the resolved claim view. Every code-owned
 * required claim must resolve `supported` (promo support can only have come from the
 * confirmation evaluator); packet approval/freshness/source/identity are re-checked
 * independently; the resolution digest must be intact and computed at the same clock.
 */
export function adaptResolvedApprovedPacketToEvidence(resolved: unknown, nowMs: number): ResolvedAdaptResult {
  if (!Number.isFinite(nowMs)) return { ok: false, reason: 'CLOCK_INVALID' };
  const integrity = validateResolvedOfferPacket(resolved);
  if (!integrity.ok) return { ok: false, reason: 'RESOLUTION_INVALID' };
  const r = resolved as ResolvedOfferPacket;
  if (r.evaluationClockMs !== nowMs) return { ok: false, reason: 'CLOCK_MISMATCH' };

  const readiness = evaluatePacketReadiness(r.packet, nowMs, 'bybit');
  if (!readiness.ok) return { ok: false, reason: readiness.reason };

  if (r.blockingRequiredClaims.length > 0) return { ok: false, reason: 'REQUIRED_CLAIM_UNSUPPORTED' };
  const allRequiredSupported = (BYBIT_OFFER_REQUIRED_CLAIMS as readonly string[]).every((id) => r.resolvedClaims.find((c) => c.claimId === id)?.resolvedResult === 'supported');
  if (!allRequiredSupported) return { ok: false, reason: 'REQUIRED_CLAIM_UNSUPPORTED' };

  const evidence = packetToEvidenceMetadata(readiness.packet);
  if (!evidence) return { ok: false, reason: 'PACKET_INVALID' };
  return { ok: true, evidence };
}

/** Product authorizing path: resolve with the production policy, then adapt. */
export function adaptBybitOfferToEvidence(
  rawPacket: unknown,
  confirmationSet: readonly ClaimConfirmationArtifact[],
  nowMs: number,
  offerPromoCode: string,
): ResolvedAdaptResult {
  const resolved = resolveBybitOfferPacketClaims(rawPacket, confirmationSet, nowMs, offerPromoCode);
  if (!resolved.ok) return { ok: false, reason: 'RESOLUTION_INVALID' };
  return adaptResolvedApprovedPacketToEvidence(resolved, nowMs);
}
