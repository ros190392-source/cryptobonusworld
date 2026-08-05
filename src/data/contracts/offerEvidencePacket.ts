/**
 * OfferEvidencePacket — auditable capture of ONE official offer source (Split 3,
 * Issue #252).
 *
 * A URL plus an access time is NOT proof of the individual offer claims CBW
 * displays. This packet records exactly what was observed, when, where, by which
 * method, and — per claim — whether the observation supports the displayed fact.
 * It is the ONLY sanctioned route by which a real offer may later become
 * authorizing: an approved, complete packet adapts to EvidenceMetadata (which the
 * existing country-aware gate already requires), and nothing else can.
 *
 * Fail-closed everywhere. A packet that is draft/validated, incomplete,
 * inaccessible, contradicted, non-official, stale, future-dated or unapproved can
 * never produce authorizing EvidenceMetadata. Strict calendar-valid timestamps,
 * canonical identity, HTTPS provenance and sha256 digests are reused from the
 * evidence-metadata contract and portal factory — no thresholds are duplicated.
 *
 * Artifact-safety: packets are public records, so validation rejects secrets,
 * cookies, tokens and internal absolute filesystem paths, and no full copyrighted
 * page content is stored — only concise normalized observations and a digest.
 */
import type { EvidenceMetadata } from './evidenceMetadata';
import {
  parseExactIsoDateTime,
  validateEvidenceMetadata,
} from './evidenceMetadata';
import { assessEvidenceFreshness } from './portalFactory';

/** Per-claim verification result. No claim is upgraded merely because a page loaded. */
export type OfferClaimResult =
  | 'supported'
  | 'partially_supported'
  | 'not_found'
  | 'contradicted'
  | 'inaccessible'
  | 'requires_owner_partner_confirmation';

export type PacketApproval = 'draft' | 'validated' | 'approved' | 'rejected' | 'stale';

export interface OfferClaimVerification {
  /** Stable claim identifier (e.g. 'bybit.promo_code'). */
  claimId: string;
  /** Short human label of what the claim asserts. */
  label: string;
  /** Structured verification result. */
  result: OfferClaimResult;
  /** Concise NORMALIZED observed fact (never a full page reproduction). */
  observed: string;
  /** Source reference this result rests on (a sourceUrl or a sourceId). */
  sourceRef: string;
  /** Explicit limitation on this result. */
  limitation: string;
  /** Whether this claim must be `supported` for commercial authorization. */
  requiredForAuthorization: boolean;
}

export interface PacketApprover {
  approvedBy: string;
  /** Exact ISO approval timestamp. */
  approvedAt: string;
  note?: string;
}

export interface OfferEvidencePacket {
  packetId: string;
  /** Canonical exchange identity (this pilot: 'bybit'). */
  exchangeId: string;
  /** Exact, timezone-qualified capture instant. */
  capturedAt: string;
  /** Exact, timezone-qualified review deadline; strictly after capturedAt. */
  nextReviewAt: string;
  /** Canonical official HTTPS source URL. */
  sourceUrl: string;
  /** sha256 digest of the capture/observation content. */
  contentDigest: string;
  /** How the source was captured (e.g. 'http_probe_no_auth_no_cookies'). */
  captureMethod: string;
  /** Capturing tool + version. */
  captureTool: string;
  /** Observed HTTP/fetch status where available; null when not applicable. */
  observedStatus: number | null;
  /** Per-claim structured verification results. */
  claims: OfferClaimVerification[];
  /** Claim IDs explicitly NOT supported (redundant index for auditing). */
  unsupportedClaims: string[];
  warnings: string[];
  limitations: string[];
  approval: PacketApproval;
  /** Present only for an approved packet; owner approval metadata. */
  approver?: PacketApprover;
}

export interface PacketValidationIssue { field: string; code: string; message: string; }
export interface PacketValidationResult {
  ok: boolean;
  value?: OfferEvidencePacket;
  issues: PacketValidationIssue[];
}

const CANONICAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const CLAIM_RESULTS: OfferClaimResult[] = ['supported', 'partially_supported', 'not_found', 'contradicted', 'inaccessible', 'requires_owner_partner_confirmation'];
const APPROVALS: PacketApproval[] = ['draft', 'validated', 'approved', 'rejected', 'stale'];

/**
 * Artifact-safety scan (R: no secrets / no internal absolute paths in a public
 * record). Rejects obvious secret markers and absolute filesystem paths.
 */
const FORBIDDEN_CONTENT = [
  /[a-zA-Z]:\\/,               // Windows absolute path (C:\...)
  /(^|[\s"'])\/(?:Users|home|root|var|etc|tmp|mnt)\//, // Unix absolute path
  /\bcookie\s*[:=]/i,
  /\bauthorization\s*[:=]/i,
  /\b(set-cookie|bearer)\b/i,
  /\b(password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]/i,
  /\btoken=/i,
];

function scanUnsafe(value: string): boolean {
  return FORBIDDEN_CONTENT.some((re) => re.test(value));
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value !== value.trim() || !/^https:\/\/[^\s]+$/i.test(value)) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

/** Official Bybit source host policy (primary evidence only from official domain). */
export function isOfficialBybitSource(url: unknown): boolean {
  if (!isHttpsUrl(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'bybit.com' || host === 'www.bybit.com' || host.endsWith('.bybit.com');
  } catch { return false; }
}

function hasText(v: unknown): v is string { return typeof v === 'string' && v.trim().length > 0; }

function validateClaim(c: unknown, index: number, issues: PacketValidationIssue[]): void {
  const path = `claims.${index}`;
  if (typeof c !== 'object' || c === null) { issues.push({ field: path, code: 'NOT_OBJECT', message: 'Claim must be an object.' }); return; }
  const rec = c as Record<string, unknown>;
  if (!hasText(rec.claimId)) issues.push({ field: `${path}.claimId`, code: 'REQUIRED', message: 'claimId required.' });
  if (!hasText(rec.label)) issues.push({ field: `${path}.label`, code: 'REQUIRED', message: 'label required.' });
  if (!CLAIM_RESULTS.includes(rec.result as OfferClaimResult)) issues.push({ field: `${path}.result`, code: 'INVALID_RESULT', message: 'Unknown claim result.' });
  if (typeof rec.observed !== 'string') issues.push({ field: `${path}.observed`, code: 'REQUIRED', message: 'observed fact required.' });
  if (!hasText(rec.sourceRef)) issues.push({ field: `${path}.sourceRef`, code: 'REQUIRED', message: 'sourceRef required.' });
  if (typeof rec.limitation !== 'string') issues.push({ field: `${path}.limitation`, code: 'REQUIRED', message: 'limitation required.' });
  if (typeof rec.requiredForAuthorization !== 'boolean') issues.push({ field: `${path}.requiredForAuthorization`, code: 'INVALID', message: 'requiredForAuthorization must be boolean.' });
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'string' && scanUnsafe(v)) issues.push({ field: `${path}.${k}`, code: 'UNSAFE_CONTENT', message: 'Secret or absolute path detected in a public record.' });
  }
}

/** Validate an OfferEvidencePacket structurally, fail-closed. */
export function validateOfferEvidencePacket(input: unknown): PacketValidationResult {
  const issues: PacketValidationIssue[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: [{ field: '$', code: 'NOT_OBJECT', message: 'Packet must be an object.' }] };
  }
  const rec = input as Record<string, unknown>;

  if (!hasText(rec.packetId) || !CANONICAL_SLUG.test((rec.packetId as string))) issues.push({ field: 'packetId', code: 'INVALID_ID', message: 'packetId must be a canonical slug.' });
  if (!hasText(rec.exchangeId) || !CANONICAL_SLUG.test((rec.exchangeId as string))) issues.push({ field: 'exchangeId', code: 'INVALID_ID', message: 'exchangeId must be a canonical slug.' });

  if (!parseExactIsoDateTime(rec.capturedAt)) issues.push({ field: 'capturedAt', code: 'INEXACT_TIMESTAMP', message: 'capturedAt must be an exact ISO datetime with timezone.' });
  if (!parseExactIsoDateTime(rec.nextReviewAt)) issues.push({ field: 'nextReviewAt', code: 'INEXACT_TIMESTAMP', message: 'nextReviewAt must be an exact ISO datetime with timezone.' });
  const capAt = parseExactIsoDateTime(rec.capturedAt);
  const revAt = parseExactIsoDateTime(rec.nextReviewAt);
  if (capAt && revAt && revAt.epochMs <= capAt.epochMs) issues.push({ field: 'nextReviewAt', code: 'INVALID_REVIEW_WINDOW', message: 'nextReviewAt must be strictly after capturedAt.' });

  if (!isHttpsUrl(rec.sourceUrl)) issues.push({ field: 'sourceUrl', code: 'INVALID_SOURCE_URL', message: 'sourceUrl must be a valid HTTPS URL with no surrounding whitespace.' });
  if (!hasText(rec.contentDigest) || !SHA256.test((rec.contentDigest as string))) issues.push({ field: 'contentDigest', code: 'INVALID_DIGEST', message: 'contentDigest must be a sha256:<64-hex> digest.' });
  if (!hasText(rec.captureMethod)) issues.push({ field: 'captureMethod', code: 'REQUIRED', message: 'captureMethod required.' });
  if (!hasText(rec.captureTool)) issues.push({ field: 'captureTool', code: 'REQUIRED', message: 'captureTool required.' });
  if (!(rec.observedStatus === null || (typeof rec.observedStatus === 'number' && Number.isFinite(rec.observedStatus)))) issues.push({ field: 'observedStatus', code: 'INVALID', message: 'observedStatus must be a finite number or null.' });

  if (!Array.isArray(rec.claims) || rec.claims.length === 0) {
    issues.push({ field: 'claims', code: 'NO_CLAIMS', message: 'At least one claim verification is required.' });
  } else {
    rec.claims.forEach((c, i) => validateClaim(c, i, issues));
    const ids = rec.claims.map((c) => (typeof c === 'object' && c ? (c as Record<string, unknown>).claimId : undefined));
    if (new Set(ids).size !== ids.length) issues.push({ field: 'claims', code: 'DUPLICATE_CLAIM', message: 'Claim IDs must be unique.' });
  }

  if (!Array.isArray(rec.unsupportedClaims) || !rec.unsupportedClaims.every(hasText)) issues.push({ field: 'unsupportedClaims', code: 'INVALID_ARRAY', message: 'unsupportedClaims must be a string array.' });
  if (!Array.isArray(rec.warnings) || !rec.warnings.every((w) => typeof w === 'string')) issues.push({ field: 'warnings', code: 'INVALID_ARRAY', message: 'warnings must be a string array.' });
  if (!Array.isArray(rec.limitations) || !rec.limitations.every((l) => typeof l === 'string')) issues.push({ field: 'limitations', code: 'INVALID_ARRAY', message: 'limitations must be a string array.' });
  if (!APPROVALS.includes(rec.approval as PacketApproval)) issues.push({ field: 'approval', code: 'INVALID_APPROVAL', message: 'Unknown approval state.' });

  // Approver metadata: required + valid ONLY when approved; forbidden otherwise
  // (an approved packet must carry real approval; a non-approved packet must not
  // masquerade as approved).
  if (rec.approval === 'approved') {
    const ap = rec.approver as Record<string, unknown> | undefined;
    if (!ap || typeof ap !== 'object') {
      issues.push({ field: 'approver', code: 'APPROVAL_REQUIRED', message: 'Approved packet requires approver metadata.' });
    } else {
      if (!hasText(ap.approvedBy)) issues.push({ field: 'approver.approvedBy', code: 'REQUIRED', message: 'approvedBy required.' });
      if (!parseExactIsoDateTime(ap.approvedAt)) issues.push({ field: 'approver.approvedAt', code: 'INEXACT_TIMESTAMP', message: 'approvedAt must be an exact ISO datetime.' });
    }
  } else if (rec.approver !== undefined) {
    issues.push({ field: 'approver', code: 'UNEXPECTED_APPROVER', message: 'approver metadata is only allowed on an approved packet.' });
  }

  // Global artifact-safety scan of scalar string fields.
  for (const k of ['packetId', 'exchangeId', 'sourceUrl', 'captureMethod', 'captureTool', 'contentDigest'] as const) {
    if (typeof rec[k] === 'string' && scanUnsafe(rec[k] as string)) issues.push({ field: k, code: 'UNSAFE_CONTENT', message: 'Secret or absolute path detected in a public record.' });
  }
  for (const arr of ['warnings', 'limitations'] as const) {
    if (Array.isArray(rec[arr])) (rec[arr] as unknown[]).forEach((v, i) => { if (typeof v === 'string' && scanUnsafe(v)) issues.push({ field: `${arr}.${i}`, code: 'UNSAFE_CONTENT', message: 'Secret or absolute path detected.' }); });
  }

  if (issues.length) return { ok: false, issues };
  return { ok: true, value: input as OfferEvidencePacket, issues };
}

export type PacketAdaptFailReason =
  | 'PACKET_INVALID'
  | 'EXCHANGE_NOT_BYBIT'
  | 'SOURCE_NOT_OFFICIAL'
  | 'CAPTURE_NOT_FRESH'
  | 'REVIEW_OVERDUE'
  | 'REQUIRED_CLAIM_UNSUPPORTED'
  | 'UNRESOLVED_CONTRADICTION'
  | 'NOT_APPROVED'
  | 'CLOCK_INVALID';

export type PacketAdaptResult =
  | { ok: true; evidence: EvidenceMetadata }
  | { ok: false; reason: PacketAdaptFailReason };

/**
 * Deterministic adapter: an APPROVED, complete OfferEvidencePacket → authorizing
 * EvidenceMetadata. Fail-closed unless every condition holds. Draft/validated
 * packets, or packets with any unsupported required claim / contradiction / stale
 * or future capture / non-official source, can never authorize.
 *
 * `expectedExchangeId` (default 'bybit') binds the packet to the exchange it is
 * meant to authorize, mirroring the evidence-metadata identity rule.
 */
export function adaptApprovedPacketToEvidence(
  input: unknown,
  nowMs: number,
  expectedExchangeId = 'bybit',
): PacketAdaptResult {
  if (!Number.isFinite(nowMs)) return { ok: false, reason: 'CLOCK_INVALID' };

  const validation = validateOfferEvidencePacket(input);
  if (!validation.ok || !validation.value) return { ok: false, reason: 'PACKET_INVALID' };
  const packet = validation.value;

  if (typeof expectedExchangeId !== 'string' || !CANONICAL_SLUG.test(expectedExchangeId)
    || packet.exchangeId !== expectedExchangeId) {
    return { ok: false, reason: 'EXCHANGE_NOT_BYBIT' };
  }
  if (!isOfficialBybitSource(packet.sourceUrl)) return { ok: false, reason: 'SOURCE_NOT_OFFICIAL' };

  // Freshness reuses the ONE central policy (via assessEvidenceFreshness).
  const freshness = assessEvidenceFreshness(packet.capturedAt, nowMs);
  if (freshness.state !== 'fresh') return { ok: false, reason: 'CAPTURE_NOT_FRESH' };

  const reviewAt = parseExactIsoDateTime(packet.nextReviewAt);
  if (!reviewAt || nowMs >= reviewAt.epochMs) return { ok: false, reason: 'REVIEW_OVERDUE' };

  // No unresolved contradictions anywhere in the packet.
  if (packet.claims.some((c) => c.result === 'contradicted')) return { ok: false, reason: 'UNRESOLVED_CONTRADICTION' };

  // EVERY required claim must be explicitly supported. Anything else fails closed.
  const requiredOk = packet.claims
    .filter((c) => c.requiredForAuthorization)
    .every((c) => c.result === 'supported');
  if (!requiredOk) return { ok: false, reason: 'REQUIRED_CLAIM_UNSUPPORTED' };

  // Approval must be explicit + valid (validateOfferEvidencePacket already
  // enforces approver metadata for the 'approved' state).
  if (packet.approval !== 'approved') return { ok: false, reason: 'NOT_APPROVED' };

  // Build EvidenceMetadata and re-validate through the canonical contract so the
  // adapter can never emit anything the gate would not itself accept.
  const evidence: EvidenceMetadata = {
    evidenceCheckedAt: packet.capturedAt,
    nextReviewAt: packet.nextReviewAt,
    sourceUrl: packet.sourceUrl,
    sourceId: packet.packetId,
    exchangeId: packet.exchangeId,
  };
  const evValidation = validateEvidenceMetadata(evidence);
  if (!evValidation.ok || !evValidation.value) return { ok: false, reason: 'PACKET_INVALID' };
  return { ok: true, evidence: evValidation.value };
}
