/**
 * Confirmation-to-packet resolution bridge (Issue #258, hardened R1–R9).
 *
 * The committed Bybit `OfferEvidencePacket` is an immutable historical evidence
 * record: `bybit.promo_code` stays `requires_owner_partner_confirmation` forever.
 * This module produces a SEPARATE, deep-frozen, AUDIT-ONLY resolved view and exposes
 * exactly ONE public product function that can produce `EvidenceMetadata`:
 *
 *   adaptBybitOfferToEvidence(rawPacket, confirmationSet, nowMs)
 *
 * It reads the canonical Bybit commercial identity (the real `Offer.promoCode`) and
 * the production confirmation policy INTERNALLY — no caller may inject an offer code
 * or a policy, and no caller may hand it a pre-built resolved view. Packet readiness,
 * EvidenceMetadata construction and the resolved→evidence step are PRIVATE. A
 * resolution produced with a non-production policy can never authorize the product
 * path.
 *
 * The resolution is bound to complete inputs: a full `rawPacketDigest` over every
 * committed packet field, a full `confirmationSetDigest` over the ordered set, the
 * production `policyId`/`policyDigest`, the offer-identity digest and the explicit
 * evaluation clock. Node crypto is build/server-only; not in the client bundle.
 */
import { createHash } from 'node:crypto';
import type { EvidenceMetadata } from './evidenceMetadata';
import { parseExactIsoDateTime, validateEvidenceMetadata } from './evidenceMetadata';
import { assessEvidenceFreshness } from './portalFactory';
import {
  type OfferEvidencePacket,
  type OfferClaimResult,
  type PacketAdaptFailReason,
  BYBIT_OFFER_CLAIM_INVENTORY,
  BYBIT_OFFER_REQUIRED_CLAIMS,
  validateOfferEvidencePacket,
  isOfficialBybitSource,
  canonicalCaptureManifest,
} from './offerEvidencePacket';
import {
  type ClaimConfirmationArtifact,
  type ConfirmationSetState,
  type PromoCodeConfirmationPolicy,
  evaluatePromoCodeConfirmations,
  normalizeReferralCode,
  BYBIT_PROMO_CODE_CONFIRMATION_POLICY,
} from './claimConfirmation';
import { getOffer } from '../offers';
import {
  type ClaimAssessmentResult,
  buildOfficialSourceEvidenceRun,
  assessOfferClaimEvidence,
  SOURCE_PLAN_TARGET_CLAIMS,
  BYBIT_SOURCE_PLAN_ID,
  BYBIT_SOURCE_PLAN_DIGEST,
} from './bybitOfferClaimSourcePlan';

const PROMO_CLAIM_ID = 'bybit.promo_code';
export const RESOLUTION_SCHEMA_ID = 'cbw:offer-packet-resolution:v1';
export const PRODUCTION_CONFIRMATION_POLICY_ID = 'cbw:bybit:promo-code-confirmation:v1';
const TEST_CONFIRMATION_POLICY_ID = 'cbw:bybit:promo-code-confirmation:test';

function sha256(s: string): string { return 'sha256:' + createHash('sha256').update(s, 'utf8').digest('hex'); }

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') { for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v); Object.freeze(o); }
  return o;
}

/* ─────────────────────────── canonical commercial identity (R3) ─────────────── */

export interface OfferCommercialIdentity {
  exchangeSlug: string;
  promoCode: string;
}

/** The ONE canonical product-data source for the Bybit commercial identity. */
export function getBybitOfferCommercialIdentity(): OfferCommercialIdentity {
  const offer = getOffer('bybit');
  return Object.freeze({ exchangeSlug: 'bybit', promoCode: offer ? offer.promoCode : '' });
}

/* ─────────────────────────── policy fingerprint (R4) ─────────────────────────── */

export function computeConfirmationPolicyDigest(policy: PromoCodeConfirmationPolicy): string {
  return sha256(JSON.stringify({
    exchangeId: policy.exchangeId,
    claimId: policy.claimId,
    assertionType: policy.assertionType,
    candidateValue: policy.candidateValue,
    candidateConfirmed: policy.candidateConfirmed,
    requiresPartnerProof: policy.requiresPartnerProof,
    trustedOwnerIdentities: [...policy.trustedOwnerIdentities].sort(),
    trustedPartnerIdentities: [...policy.trustedPartnerIdentities].sort(),
    trustedPartnerDomains: [...policy.trustedPartnerDomains].sort(),
    ownerSourceKinds: [...policy.ownerSourceKinds],
    partnerSourceKinds: [...policy.partnerSourceKinds],
    maxValidityDays: policy.maxValidityDays,
  }));
}

export const PRODUCTION_CONFIRMATION_POLICY_DIGEST = computeConfirmationPolicyDigest(BYBIT_PROMO_CODE_CONFIRMATION_POLICY);

/* ─────────────────────────── full raw-packet digest (R5) ─────────────────────── */

/** Deterministic digest over EVERY committed packet field. */
export function computeRawPacketDigest(packet: OfferEvidencePacket): string {
  return sha256(JSON.stringify({
    packetId: packet.packetId,
    exchangeId: packet.exchangeId,
    capturedAt: packet.capturedAt,
    nextReviewAt: packet.nextReviewAt,
    sourceUrl: packet.sourceUrl,
    primaryCaptureId: packet.primaryCaptureId,
    captureManifestDigest: packet.captureManifestDigest,
    captureMethod: packet.captureMethod,
    captureTool: packet.captureTool,
    captures: JSON.parse(canonicalCaptureManifest(packet.captures)),
    renderedCaptures: (packet.renderedCaptures ?? []).map((c) => c.normalizedArtifactDigest),
    officialSourceCaptures: (packet.officialSourceCaptures ?? []).map((c) => c.sourceDigest),
    claims: [...packet.claims].sort((a, b) => (a.claimId < b.claimId ? -1 : a.claimId > b.claimId ? 1 : 0)).map((c) => ({ claimId: c.claimId, label: c.label, result: c.result, observed: c.observed, sourceRefs: [...c.sourceRefs].sort(), limitation: c.limitation })),
    warnings: packet.warnings,
    limitations: packet.limitations,
    approval: packet.approval,
    approver: packet.approver ? { approvedBy: packet.approver.approvedBy, approvedAt: packet.approver.approvedAt, approvalRef: packet.approver.approvalRef, note: packet.approver.note ?? null } : null,
  }));
}

/* ─────────────────────────── full confirmation-set digest (R6) ───────────────── */

/** Deterministic digest over the COMPLETE ordered confirmation set. */
export function computeConfirmationSetDigest(set: readonly ClaimConfirmationArtifact[]): string {
  const rows = [...set]
    .map((a) => ({ confirmationId: a.confirmationId, artifactDigest: a.artifactDigest, status: a.status, artifactIntent: a.artifactIntent, replacesConfirmationId: a.replacesConfirmationId ?? null, revokesConfirmationId: a.revokesConfirmationId ?? null }))
    .sort((x, y) => (x.confirmationId < y.confirmationId ? -1 : x.confirmationId > y.confirmationId ? 1 : 0));
  return sha256(JSON.stringify(rows));
}

/* ─────────────────────────── resolved model (audit-only) ─────────────────────── */

export type ClaimProvenanceKind = 'raw_capture' | 'confirmation_evaluator' | 'source_plan_assessment';

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

export interface RawClaimRecord { claimId: string; result: OfferClaimResult; sourceRefs: string[]; }
export interface ConfirmationEvaluationRecord { state: ConfirmationSetState; value: string | null; confirmationId: string | null; }
export type PolicyMode = 'production' | 'test';

export type ResolutionFailReason =
  | 'CLOCK_INVALID'
  | 'RAW_PACKET_INVALID'
  | 'EXCHANGE_NOT_BYBIT'
  | 'OFFER_CODE_INVALID'
  | 'CONFIRMATION_INVALID'
  | 'CONFIRMATION_CONFLICT'
  | 'CONFIRMED_VALUE_MISMATCH'
  | 'EVIDENCE_RUN_INVALID'
  | 'RAW_MORE_POSITIVE_THAN_ASSESSMENT';

/** Support level for the "raw must never be more positive than assessment" invariant (R9). */
function supportLevel(r: OfferClaimResult): number {
  return r === 'supported' ? 3 : r === 'partially_supported' ? 2 : 0;
}
function assessmentToClaimResult(a: ClaimAssessmentResult): OfferClaimResult {
  return a === 'incomplete' || a === 'invalid' ? 'inaccessible' : a;
}

export interface ResolvedOfferPacket {
  ok: true;
  schemaId: string;
  policyId: string;
  policyDigest: string;
  policyMode: PolicyMode;
  exchangeSlug: string;
  normalizedOfferPromoCode: string;
  offerIdentityDigest: string;
  rawPacketDigest: string;
  confirmationSetDigest: string;
  confirmationOrder: string[];
  evaluationClockMs: number;
  confirmationEvaluation: ConfirmationEvaluationRecord;
  rawClaims: RawClaimRecord[];
  renderedArtifactDigests: string[];
  officialSourceDigests: string[];
  sourcePlanId: string;
  sourcePlanDigest: string;
  evidenceRunDigest: string;
  resolvedClaims: ResolvedClaim[];
  blockingRequiredClaims: string[];
  resolutionDigest: string;
}

export type ResolveResult = ResolvedOfferPacket | { ok: false; reason: ResolutionFailReason };

type ResolutionCore = Omit<ResolvedOfferPacket, 'resolutionDigest' | 'ok'>;

function canonicalProvenance(p: ResolvedClaimProvenance): Record<string, unknown> {
  return { kind: p.kind, detail: p.detail, evaluatorState: p.evaluatorState ?? null, evaluatorValue: p.evaluatorValue ?? null, confirmationId: p.confirmationId ?? null };
}

export function canonicalResolution(r: ResolutionCore): string {
  return JSON.stringify({
    schemaId: r.schemaId,
    policyId: r.policyId,
    policyDigest: r.policyDigest,
    policyMode: r.policyMode,
    exchangeSlug: r.exchangeSlug,
    normalizedOfferPromoCode: r.normalizedOfferPromoCode,
    offerIdentityDigest: r.offerIdentityDigest,
    rawPacketDigest: r.rawPacketDigest,
    confirmationSetDigest: r.confirmationSetDigest,
    confirmationOrder: [...r.confirmationOrder],
    evaluationClockMs: r.evaluationClockMs,
    confirmationEvaluation: { state: r.confirmationEvaluation.state, value: r.confirmationEvaluation.value, confirmationId: r.confirmationEvaluation.confirmationId },
    rawClaims: r.rawClaims.map((c) => ({ claimId: c.claimId, result: c.result, sourceRefs: [...c.sourceRefs].sort() })),
    renderedArtifactDigests: [...r.renderedArtifactDigests].sort(),
    officialSourceDigests: [...r.officialSourceDigests].sort(),
    sourcePlanId: r.sourcePlanId,
    sourcePlanDigest: r.sourcePlanDigest,
    evidenceRunDigest: r.evidenceRunDigest,
    resolvedClaims: r.resolvedClaims.map((c) => ({ claimId: c.claimId, rawResult: c.rawResult, resolvedResult: c.resolvedResult, provenance: canonicalProvenance(c.provenance) })),
    blockingRequiredClaims: [...r.blockingRequiredClaims].sort(),
  });
}

export function computeResolutionDigest(r: ResolutionCore): string {
  return sha256(canonicalResolution(r));
}

/* ─────────────────────────── private resolver ─────────────────────────── */

type ResolveInternal = { ok: true; snapshot: ResolvedOfferPacket; packet: OfferEvidencePacket } | { ok: false; reason: ResolutionFailReason };

function resolveInternal(
  rawPacket: unknown,
  confirmationSet: readonly ClaimConfirmationArtifact[],
  nowMs: number,
  identity: OfferCommercialIdentity,
  policy: PromoCodeConfirmationPolicy,
): ResolveInternal {
  if (!Number.isFinite(nowMs)) return { ok: false, reason: 'CLOCK_INVALID' };
  if (!identity || identity.exchangeSlug !== 'bybit') return { ok: false, reason: 'EXCHANGE_NOT_BYBIT' };

  const validation = validateOfferEvidencePacket(rawPacket);
  if (!validation.ok || !validation.value) return { ok: false, reason: 'RAW_PACKET_INVALID' };
  const packet = validation.value;
  if (packet.exchangeId !== 'bybit') return { ok: false, reason: 'EXCHANGE_NOT_BYBIT' };

  const norm = normalizeReferralCode(identity.promoCode);
  if (!norm.ok || !norm.value) return { ok: false, reason: 'OFFER_CODE_INVALID' };
  const normalizedOfferPromoCode = norm.value;

  const evalRes = evaluatePromoCodeConfirmations(confirmationSet as ClaimConfirmationArtifact[], nowMs, policy);
  if (evalRes.state === 'invalid') return { ok: false, reason: 'CONFIRMATION_INVALID' };
  if (evalRes.state === 'conflict') return { ok: false, reason: 'CONFIRMATION_CONFLICT' };

  const byId = new Map(packet.claims.map((c) => [c.claimId, c] as const));
  const promoRaw = byId.get(PROMO_CLAIM_ID)?.result ?? 'requires_owner_partner_confirmation';
  let promoResolved: OfferClaimResult = promoRaw;
  let promoProvenance: ResolvedClaimProvenance;
  if (evalRes.state === 'confirmed') {
    if (evalRes.value !== normalizedOfferPromoCode) return { ok: false, reason: 'CONFIRMED_VALUE_MISMATCH' };
    promoResolved = 'supported';
    promoProvenance = { kind: 'confirmation_evaluator', detail: 'promo supported by trusted confirmation exactly matching the canonical offer promo code', evaluatorState: 'confirmed', evaluatorValue: evalRes.value ?? null, confirmationId: evalRes.confirmationId ?? null };
  } else {
    promoProvenance = { kind: 'confirmation_evaluator', detail: `promo unresolved (evaluator ${evalRes.state}); no supported authority`, evaluatorState: evalRes.state, evaluatorValue: evalRes.value ?? null, confirmationId: evalRes.confirmationId ?? null };
  }

  // R9 — the SOURCE PLAN controls authorization for its target claims. Build + validate
  // the complete evidence run over the committed official-source captures; an INVALID run
  // fails the whole resolution (never a cherry-picked subset). Each target claim's
  // resolvedResult is the canonical source-plan assessment, never the raw packet value.
  const evidenceRun = buildOfficialSourceEvidenceRun(packet.officialSourceCaptures ?? [], nowMs, packet.packetId);
  if (!evidenceRun.ok) return { ok: false, reason: 'EVIDENCE_RUN_INVALID' };
  const targetSet = new Set<string>(SOURCE_PLAN_TARGET_CLAIMS);

  const resolvedClaims: ResolvedClaim[] = BYBIT_OFFER_CLAIM_INVENTORY.map((claimId) => {
    const raw = byId.get(claimId);
    const rawResult = raw?.result ?? 'inaccessible';
    if (claimId === PROMO_CLAIM_ID) return { claimId, rawResult, resolvedResult: promoResolved, provenance: promoProvenance };
    if (targetSet.has(claimId)) {
      const a = assessOfferClaimEvidence(claimId, evidenceRun, nowMs);
      const resolvedResult = assessmentToClaimResult(a.result);
      return { claimId, rawResult, resolvedResult, provenance: { kind: 'source_plan_assessment', detail: `source-plan assessment=${a.result} (${a.reason})` } };
    }
    return { claimId, rawResult, resolvedResult: rawResult, provenance: { kind: 'raw_capture', detail: 'bound to raw capture evidence; confirmation data cannot influence this claim' } };
  });

  // R9 invariant — a raw target claim must never be MORE positive than its assessment.
  for (const c of resolvedClaims) {
    if (targetSet.has(c.claimId) && supportLevel(c.rawResult) > supportLevel(c.resolvedResult)) {
      return { ok: false, reason: 'RAW_MORE_POSITIVE_THAN_ASSESSMENT' };
    }
  }
  const rawClaims: RawClaimRecord[] = BYBIT_OFFER_CLAIM_INVENTORY.map((claimId) => {
    const raw = byId.get(claimId);
    return { claimId, result: raw?.result ?? 'inaccessible', sourceRefs: raw ? [...raw.sourceRefs] : [] };
  });

  const blockingRequiredClaims = (BYBIT_OFFER_REQUIRED_CLAIMS as readonly string[])
    .filter((id) => resolvedClaims.find((c) => c.claimId === id)?.resolvedResult !== 'supported')
    .sort();

  const policyDigest = computeConfirmationPolicyDigest(policy);
  const policyMode: PolicyMode = policyDigest === PRODUCTION_CONFIRMATION_POLICY_DIGEST ? 'production' : 'test';
  const policyId = policyMode === 'production' ? PRODUCTION_CONFIRMATION_POLICY_ID : TEST_CONFIRMATION_POLICY_ID;
  const offerIdentityDigest = sha256(JSON.stringify({ exchangeSlug: identity.exchangeSlug, normalizedOfferPromoCode }));
  const confirmationOrder = [...confirmationSet].map((a) => a.confirmationId).sort();

  const core: ResolutionCore = {
    schemaId: RESOLUTION_SCHEMA_ID,
    policyId, policyDigest, policyMode,
    exchangeSlug: identity.exchangeSlug,
    normalizedOfferPromoCode,
    offerIdentityDigest,
    rawPacketDigest: computeRawPacketDigest(packet),
    confirmationSetDigest: computeConfirmationSetDigest(confirmationSet),
    confirmationOrder,
    evaluationClockMs: nowMs,
    confirmationEvaluation: { state: evalRes.state, value: evalRes.value ?? null, confirmationId: evalRes.confirmationId ?? null },
    rawClaims,
    renderedArtifactDigests: (packet.renderedCaptures ?? []).map((c) => c.normalizedArtifactDigest),
    officialSourceDigests: (packet.officialSourceCaptures ?? []).map((c) => c.sourceDigest),
    sourcePlanId: BYBIT_SOURCE_PLAN_ID,
    sourcePlanDigest: BYBIT_SOURCE_PLAN_DIGEST,
    evidenceRunDigest: evidenceRun.runDigest,
    resolvedClaims,
    blockingRequiredClaims,
  };
  const snapshot = deepFreeze({ ok: true as const, ...core, resolutionDigest: computeResolutionDigest(core) });
  return { ok: true, snapshot, packet };
}

/* ─────────────────────────── public audit resolvers ─────────────────────────── */

/** Product audit resolver — canonical identity + production policy. Audit-only. */
export function resolveBybitOfferPacketClaims(rawPacket: unknown, confirmationSet: readonly ClaimConfirmationArtifact[], nowMs: number): ResolveResult {
  const r = resolveInternal(rawPacket, confirmationSet, nowMs, getBybitOfferCommercialIdentity(), BYBIT_PROMO_CODE_CONFIRMATION_POLICY);
  return r.ok ? r.snapshot : { ok: false, reason: r.reason };
}

/*
 * NOTE (Issue #262): the former generic test resolver — which accepted a caller-supplied
 * identity + policy — has been REMOVED. No exported product function may take an arbitrary
 * policy/identity/confirmation set and drive the internal resolution. `resolveInternal`
 * stays PRIVATE. The isolated harness proves the positive path at COMPONENT level
 * (evaluator + source-plan assessment + readiness + EvidenceMetadata validation) under
 * `scripts/portal/test-support/**`, never via a production test resolver.
 */

/* ─────────────────────────── resolved-view integrity (R7) ─────────────────────── */

export interface ResolvedValidationIssue { field: string; code: string; message: string; }

/** Fail-closed integrity + invariant validation of an audit resolved snapshot. */
export function validateResolvedOfferPacket(resolved: unknown): { ok: boolean; issues: ResolvedValidationIssue[] } {
  const issues: ResolvedValidationIssue[] = [];
  if (typeof resolved !== 'object' || resolved === null) return { ok: false, issues: [{ field: '$', code: 'NOT_OBJECT', message: 'resolved must be an object.' }] };
  const r = resolved as ResolvedOfferPacket;
  if (r.ok !== true) issues.push({ field: 'ok', code: 'NOT_OK', message: 'resolved.ok must be true.' });
  if (r.schemaId !== RESOLUTION_SCHEMA_ID) issues.push({ field: 'schemaId', code: 'BAD_SCHEMA', message: 'Unknown resolution schema id.' });
  if (r.policyMode !== 'production' && r.policyMode !== 'test') issues.push({ field: 'policyMode', code: 'BAD_POLICY_MODE', message: 'policyMode must be production or test.' });
  if (!Array.isArray(r.resolvedClaims)) { issues.push({ field: 'resolvedClaims', code: 'INVALID', message: 'resolvedClaims must be an array.' }); return { ok: false, issues }; }
  const seen = new Set<string>();
  for (const c of r.resolvedClaims) { if (seen.has(c.claimId)) issues.push({ field: 'resolvedClaims', code: 'DUPLICATE_CLAIM', message: `Duplicate resolved claim: ${c.claimId}` }); seen.add(c.claimId); }
  for (const id of BYBIT_OFFER_CLAIM_INVENTORY) if (!seen.has(id)) issues.push({ field: 'resolvedClaims', code: 'MISSING_CLAIM', message: `Missing resolved claim: ${id}` });
  for (const c of r.resolvedClaims) if (!(BYBIT_OFFER_CLAIM_INVENTORY as readonly string[]).includes(c.claimId)) issues.push({ field: 'resolvedClaims', code: 'UNKNOWN_CLAIM', message: `Unknown resolved claim: ${c.claimId}` });
  // Only promo may diverge from its raw result.
  // Only bybit.promo_code (confirmation evaluator) and source-plan target claims
  // (source-plan assessment) may diverge from raw. A target claim's raw result must
  // never be MORE positive than its resolved (assessment) result (R9).
  const targetSet = new Set<string>(SOURCE_PLAN_TARGET_CLAIMS);
  for (const c of r.resolvedClaims) {
    if (c.claimId === PROMO_CLAIM_ID) continue;
    if (targetSet.has(c.claimId)) {
      if (c.provenance.kind !== 'source_plan_assessment') issues.push({ field: `resolvedClaims.${c.claimId}`, code: 'TARGET_PROVENANCE_INVALID', message: 'A source-plan target claim must carry source_plan_assessment provenance.' });
      if (supportLevel(c.rawResult) > supportLevel(c.resolvedResult)) issues.push({ field: `resolvedClaims.${c.claimId}`, code: 'RAW_MORE_POSITIVE_THAN_ASSESSMENT', message: 'Raw target claim must never be more positive than its assessment.' });
      continue;
    }
    if (c.resolvedResult !== c.rawResult) issues.push({ field: `resolvedClaims.${c.claimId}`, code: 'NONPROMO_DIVERGED', message: 'Only promo + source-plan target claims may differ from raw.' });
  }
  // Promo support invariants.
  const promo = r.resolvedClaims.find((c) => c.claimId === PROMO_CLAIM_ID);
  if (promo) {
    if (promo.resolvedResult === 'supported') {
      if (r.confirmationEvaluation.state !== 'confirmed') issues.push({ field: 'promo', code: 'SUPPORT_WITHOUT_CONFIRMED', message: 'supported promo requires evaluator state confirmed.' });
      if (r.confirmationEvaluation.value !== r.normalizedOfferPromoCode) issues.push({ field: 'promo', code: 'VALUE_MISMATCH', message: 'confirmed value must equal the normalized offer code.' });
      if (!(promo.provenance.kind === 'confirmation_evaluator' && typeof promo.provenance.confirmationId === 'string' && promo.provenance.confirmationId.length > 0)) issues.push({ field: 'promo', code: 'MISSING_CONFIRMATION_ID', message: 'confirmed promo requires a real confirmationId.' });
    } else if (promo.provenance.evaluatorState === 'confirmed') {
      issues.push({ field: 'promo', code: 'UNRESOLVED_WITH_CONFIRMED', message: 'unresolved promo cannot carry a confirmed provenance.' });
    }
  }
  // Blocking list must equal the exact recomputed list.
  const recomputedBlocking = (BYBIT_OFFER_REQUIRED_CLAIMS as readonly string[]).filter((id) => r.resolvedClaims.find((c) => c.claimId === id)?.resolvedResult !== 'supported').sort();
  if (JSON.stringify([...(r.blockingRequiredClaims ?? [])].sort()) !== JSON.stringify(recomputedBlocking)) issues.push({ field: 'blockingRequiredClaims', code: 'BLOCKING_MISMATCH', message: 'blockingRequiredClaims must equal the recomputed list.' });
  if (typeof r.resolutionDigest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(r.resolutionDigest)) issues.push({ field: 'resolutionDigest', code: 'INVALID_DIGEST', message: 'resolutionDigest must be sha256.' });
  else if (issues.length === 0) {
    const { resolutionDigest, ok, ...core } = r;
    void resolutionDigest; void ok;
    if (computeResolutionDigest(core as ResolutionCore) !== r.resolutionDigest) issues.push({ field: 'resolutionDigest', code: 'RESOLUTION_DIGEST_MISMATCH', message: 'resolutionDigest does not recompute (tampered).' });
  }
  return { ok: issues.length === 0, issues };
}

/* ─────────────────────────── private adapter core + readiness ─────────────────── */

function readinessInternal(packet: OfferEvidencePacket, nowMs: number): { ok: true } | { ok: false; reason: PacketAdaptFailReason } {
  if (packet.exchangeId !== 'bybit') return { ok: false, reason: 'EXCHANGE_NOT_BYBIT' };
  if (!isOfficialBybitSource(packet.sourceUrl)) return { ok: false, reason: 'SOURCE_NOT_OFFICIAL' };
  if (assessEvidenceFreshness(packet.capturedAt, nowMs).state !== 'fresh') return { ok: false, reason: 'CAPTURE_NOT_FRESH' };
  const reviewAt = parseExactIsoDateTime(packet.nextReviewAt);
  if (!reviewAt || nowMs >= reviewAt.epochMs) return { ok: false, reason: 'REVIEW_OVERDUE' };
  if (packet.claims.some((c) => c.result === 'contradicted')) return { ok: false, reason: 'UNRESOLVED_CONTRADICTION' };
  if (packet.approval !== 'approved') return { ok: false, reason: 'NOT_APPROVED' };
  const apAt = packet.approver ? parseExactIsoDateTime(packet.approver.approvedAt) : null;
  if (!packet.approver || !apAt || apAt.epochMs > nowMs) return { ok: false, reason: 'APPROVAL_UNTRUSTED' };
  return { ok: true };
}

function metadataInternal(packet: OfferEvidencePacket): EvidenceMetadata | null {
  const evidence: EvidenceMetadata = { evidenceCheckedAt: packet.capturedAt, nextReviewAt: packet.nextReviewAt, sourceUrl: packet.sourceUrl, sourceId: packet.packetId, exchangeId: packet.exchangeId };
  const v = validateEvidenceMetadata(evidence);
  return v.ok && v.value ? v.value : null;
}

export type EvidenceAdaptFailReason = PacketAdaptFailReason | 'RESOLUTION_INVALID' | 'USE_PRODUCT_ADAPTER' | 'RESOLUTION_NOT_PRODUCTION';
export type EvidenceAdaptResult = { ok: true; evidence: EvidenceMetadata; resolution: ResolvedOfferPacket } | { ok: false; reason: EvidenceAdaptFailReason };

function adaptInternal(rawPacket: unknown, confirmationSet: readonly ClaimConfirmationArtifact[], nowMs: number, identity: OfferCommercialIdentity, policy: PromoCodeConfirmationPolicy, requireProduction: boolean): EvidenceAdaptResult {
  const resolved = resolveInternal(rawPacket, confirmationSet, nowMs, identity, policy);
  if (!resolved.ok) return { ok: false, reason: 'RESOLUTION_INVALID' };
  const snapshot = resolved.snapshot;
  if (!validateResolvedOfferPacket(snapshot).ok) return { ok: false, reason: 'RESOLUTION_INVALID' };
  if (requireProduction && snapshot.policyMode !== 'production') return { ok: false, reason: 'RESOLUTION_NOT_PRODUCTION' };

  const readiness = readinessInternal(resolved.packet, nowMs);
  if (!readiness.ok) return { ok: false, reason: readiness.reason };
  if (snapshot.blockingRequiredClaims.length > 0) return { ok: false, reason: 'REQUIRED_CLAIM_UNSUPPORTED' };
  const allRequired = (BYBIT_OFFER_REQUIRED_CLAIMS as readonly string[]).every((id) => snapshot.resolvedClaims.find((c) => c.claimId === id)?.resolvedResult === 'supported');
  if (!allRequired) return { ok: false, reason: 'REQUIRED_CLAIM_UNSUPPORTED' };
  const evidence = metadataInternal(resolved.packet);
  if (!evidence) return { ok: false, reason: 'PACKET_INVALID' };
  return { ok: true, evidence, resolution: snapshot };
}

/* ─────────────────────────── THE single public product entry point (R1) ───────── */

/**
 * The ONLY public product function that can produce `EvidenceMetadata`. It reads the
 * canonical Bybit commercial identity and the production confirmation policy
 * internally; a caller cannot inject an offer code, a policy, or a pre-built resolved
 * view. Promo support can only come from the confirmation evaluator; packet
 * approval/freshness/source/identity are re-checked; the real production set is empty,
 * so this is non-authorizing in production until a factual receipt exists.
 */
export function adaptBybitOfferToEvidence(rawPacket: unknown, confirmationSet: readonly ClaimConfirmationArtifact[], nowMs: number): EvidenceAdaptResult {
  return adaptInternal(rawPacket, confirmationSet, nowMs, getBybitOfferCommercialIdentity(), BYBIT_PROMO_CODE_CONFIRMATION_POLICY, true);
}

/*
 * NOTE (Issue #262): the former test adapter — which could return `EvidenceMetadata` under
 * a caller-supplied non-production policy — has been REMOVED. `adaptBybitOfferToEvidence`
 * above is now the ONLY exported `src/**` function capable of producing `EvidenceMetadata`.
 * `adaptInternal` stays PRIVATE. The synthetic-positive proof lives entirely under
 * `scripts/portal/test-support/**` and never calls a production test adapter.
 */
