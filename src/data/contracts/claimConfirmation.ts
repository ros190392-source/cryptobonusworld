/**
 * ClaimConfirmationArtifact — trusted, claim-bound, value-bound, time-bound,
 * conflict-aware and revocable confirmation intake for partner-only offer facts
 * (Issue #256, hardened R1–R9).
 *
 * Hardening in this revision:
 *   R1  ONE authorizing path only — `evaluatePromoCodeConfirmations` (and its
 *       product wrapper) is the sole authorization decision; there is no per-artifact
 *       `supports` shortcut and `isActiveAdmissibleConfirmed` is a private detail that
 *       never itself represents quorum satisfaction;
 *   R2  the PRODUCTION policy has NO invented trusted partner — `trustedPartner*`
 *       are empty until a factual identity is owner-authorized; the positive path is
 *       proven only with an explicitly TEST-ONLY policy fixture;
 *   R3  partner provenance is a structured `partnerReceipt` (issuer/domain/kind/
 *       receiptId/issuedAt/normalized assertion/digest/redaction), not a free string;
 *   R4  authorization uses a structured `sourceAssertion` (exchange/claim/assertion/
 *       assignmentState/value) that must match the subject exactly — never substring
 *       matching of `sourceStatement`;
 *   R5  a purported ACTIVE (`confirmed`) artifact that fails policy fails the whole
 *       set CLOSED (`invalid`) — it is never silently discarded;
 *   R6  real replacement/revocation intent semantics (suppress chains, no double
 *       action, cross-claim/exchange/time/self/cycle rejected);
 *   R7  `sourceStatement` is deterministically normalized and digested;
 *   R8  the evaluator takes an explicit finite clock (no `Date.now()` fallback).
 *
 * All policy is CODE-OWNED and injected. Node crypto is used only for build/server-
 * side integrity; this module is not part of the client bundle.
 */
import { createHash } from 'node:crypto';
import { parseExactIsoDateTime } from './evidenceMetadata';

/* ─────────────────────────────── code-owned enums ──────────────────────────── */

export type ConfirmationAssertionType = 'exact_referral_code_assignment';
export const CONFIRMATION_ASSERTION_TYPES: readonly ConfirmationAssertionType[] = Object.freeze(['exact_referral_code_assignment']);

export type ConfirmationRole = 'owner' | 'partner';
export const CONFIRMATION_ROLES: readonly ConfirmationRole[] = Object.freeze(['owner', 'partner']);

export type ConfirmationLifecycle = 'draft' | 'validated' | 'confirmed' | 'revoked' | 'expired' | 'rejected';
export const CONFIRMATION_LIFECYCLE_STATES: readonly ConfirmationLifecycle[] = Object.freeze(['draft', 'validated', 'confirmed', 'revoked', 'expired', 'rejected']);

export type ConfirmationSourceKind =
  | 'github_issue_comment'
  | 'github_pr_review'
  | 'github_review_comment'
  | 'partner_dashboard_receipt'
  | 'partner_email_receipt';
export const CONFIRMATION_SOURCE_KINDS: readonly ConfirmationSourceKind[] = Object.freeze([
  'github_issue_comment', 'github_pr_review', 'github_review_comment', 'partner_dashboard_receipt', 'partner_email_receipt',
]);
const GITHUB_SOURCE_KINDS: readonly ConfirmationSourceKind[] = Object.freeze(['github_issue_comment', 'github_pr_review', 'github_review_comment']);
const PARTNER_SOURCE_KINDS: readonly ConfirmationSourceKind[] = Object.freeze(['partner_dashboard_receipt', 'partner_email_receipt']);

export type PartnerReceiptKind = 'partner_dashboard_receipt' | 'partner_email_receipt';

/** Artifact intent (R6): what lifecycle action this artifact performs. */
export type ArtifactIntent = 'attestation' | 'replacement' | 'revocation';
export const ARTIFACT_INTENTS: readonly ArtifactIntent[] = Object.freeze(['attestation', 'replacement', 'revocation']);

/** Assignment states (R4). Only `active` is a POSITIVE assignment. */
export type AssignmentState = 'active' | 'inactive' | 'revoked' | 'historical' | 'not_assigned';
export const ASSIGNMENT_STATES: readonly AssignmentState[] = Object.freeze(['active', 'inactive', 'revoked', 'historical', 'not_assigned']);
const POSITIVE_ASSIGNMENT_STATES: readonly AssignmentState[] = Object.freeze(['active']);

export const REDACTION_VERSIONS: readonly string[] = Object.freeze(['v1']);

/** The one confirmation-set state (single authorizing evaluator output). */
export type ConfirmationSetState =
  | 'confirmed'
  | 'pending_partner_confirmation'
  | 'missing'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'conflict';

export interface SourceAssertion {
  exchangeId: string;
  claimId: string;
  assertionType: ConfirmationAssertionType;
  assignmentState: AssignmentState;
  assertedValue: string;
}

export interface PartnerReceipt {
  issuerId: string;
  issuerDomain: string;
  receiptKind: PartnerReceiptKind;
  receiptId: string;
  issuedAt: string;
  /** Canonical serialization of the artifact's sourceAssertion. */
  normalizedAssertion: string;
  normalizedReceiptDigest: string;
  redactionVersion: string;
}

export interface ClaimConfirmationArtifact {
  confirmationId: string;
  exchangeId: string;
  claimId: string;
  assertionType: ConfirmationAssertionType;
  assertedValue: string;
  assertedValueDigest: string;
  confirmedBy: string;
  confirmationRole: ConfirmationRole;
  confirmedAt: string;
  validUntil: string;
  sourceEventAt: string;
  artifactIntent: ArtifactIntent;
  sourceAssertion: SourceAssertion;
  sourceKind: ConfirmationSourceKind;
  sourceUrl: string | null;
  sourceId: string;
  /** Structured provenance for partner sources; null for GitHub owner sources. */
  partnerReceipt: PartnerReceipt | null;
  /** Bounded, deterministically-normalized explanatory text (NOT authorizing). */
  sourceStatement: string;
  sourceStatementDigest: string;
  status: ConfirmationLifecycle;
  replacesConfirmationId: string | null;
  revokesConfirmationId: string | null;
  limitations: string;
  note?: string | null;
  artifactDigest: string;
}

/** Code-owned policy shape (injected — never packet-declared). */
export interface PromoCodeConfirmationPolicy {
  exchangeId: string;
  claimId: string;
  assertionType: ConfirmationAssertionType;
  candidateValue: string;
  candidateConfirmed: boolean;
  requiresPartnerProof: boolean;
  trustedOwnerIdentities: readonly string[];
  trustedPartnerIdentities: readonly string[];
  trustedPartnerDomains: readonly string[];
  ownerSourceKinds: readonly ConfirmationSourceKind[];
  partnerSourceKinds: readonly ConfirmationSourceKind[];
  maxValidityDays: number;
}

export interface ConfirmationValidationIssue { field: string; code: string; message: string; }
export interface ConfirmationValidationResult { ok: boolean; value?: ClaimConfirmationArtifact; issues: ConfirmationValidationIssue[]; }

/* ─────────────────────────────────── bounds ────────────────────────────────── */
export const MAX_CODE_LENGTH = 32;
export const MIN_CODE_LENGTH = 3;
export const MAX_STATEMENT_LENGTH = 400;
export const MAX_NOTE_LENGTH = 300;
export const MAX_LIMITATION_LENGTH = 300;
export const MAX_SOURCE_ID_LENGTH = 64;
export const MAX_ACTOR_LENGTH = 64;
export const MAX_DOMAIN_LENGTH = 100;

const CANONICAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const SOURCE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/* ─────────────────────────── trusted GitHub source URLs ─────────────────────── */
const GH_ISSUE_COMMENT = /^https:\/\/github\.com\/ros190392-source\/cryptobonusworld\/issues\/\d+#issuecomment-(\d+)$/;
const GH_PR_REVIEW = /^https:\/\/github\.com\/ros190392-source\/cryptobonusworld\/pull\/\d+#pullrequestreview-(\d+)$/;
const GH_REVIEW_COMMENT = /^https:\/\/github\.com\/ros190392-source\/cryptobonusworld\/pull\/\d+#discussion_r(\d+)$/;

/* ────────────────────── code-owned Bybit promo-code policy ──────────────────── */

/**
 * PRODUCTION policy. Trusted partner identities/domains are DELIBERATELY EMPTY —
 * no factual partner identity has been supplied, so a partner artifact can never be
 * authorized in production and the real state stays `missing`.
 */
export const BYBIT_PROMO_CODE_CONFIRMATION_POLICY: PromoCodeConfirmationPolicy = Object.freeze({
  exchangeId: 'bybit',
  claimId: 'bybit.promo_code',
  assertionType: 'exact_referral_code_assignment' as ConfirmationAssertionType,
  candidateValue: 'CRYPTOBONUSW',
  candidateConfirmed: false,
  requiresPartnerProof: true,
  trustedOwnerIdentities: Object.freeze(['ros190392-source']) as readonly string[],
  trustedPartnerIdentities: Object.freeze([]) as readonly string[],
  trustedPartnerDomains: Object.freeze([]) as readonly string[],
  ownerSourceKinds: GITHUB_SOURCE_KINDS,
  partnerSourceKinds: PARTNER_SOURCE_KINDS,
  maxValidityDays: 180,
});

/*
 * NOTE (Issue #262): the former synthetic test-only promo policy fixture — which added a
 * synthetic trusted partner identity/domain — has been REMOVED from this production
 * contract. Synthetic trust must never be reachable from `src/**`. The synthetic policy
 * used to prove the positive algorithmic path now lives only under
 * `scripts/portal/test-support/**` and is built from the production policy above via the
 * generic, non-EvidenceMetadata `evaluatePromoCodeConfirmations(artifacts, nowMs, policy)`
 * evaluator. Production code and product data contain no synthetic partner trust.
 */

/* ─────────────────────────── recursive artifact safety ──────────────────────── */
const FORBIDDEN_CONTENT = [
  /[a-zA-Z]:\\/,
  /(^|[\s"'(])\/(?:Users|home|root|var|etc|tmp|mnt|Library)\//,
  /\bcookie\s*[:=]/i,
  /\b(set-cookie|bearer)\b/i,
  /\bauthorization\s*[:=]/i,
  /\b(password|passwd|secret|api[_-]?key|access[_-]?token|session[_-]?token)\s*[:=]/i,
  /\btoken\s*=/i,
  /[?&](token|access_token|auth|sessionid|sid|cookie)=/i,
  /\.mozilla\/|\/Chrome\/User Data|AppData\\/i,
];
/** Email/dashboard dump markers — a statement must be a concise redaction. */
const DUMP_MARKERS = [
  /\b(from|to|subject|received|reply-to|cc|bcc|date)\s*:\s*\S/i,
  /content-type\s*:/i,
  /<\/?(?:html|body|head|table|div|span|script|style|tr|td)\b/i,
  /-----BEGIN /i,
];
function scanUnsafe(v: string): boolean { return FORBIDDEN_CONTENT.some((re) => re.test(v)); }
function looksLikeDump(v: string): boolean { return DUMP_MARKERS.some((re) => re.test(v)) || (v.match(/[<>]/g) || []).length >= 4 || (/^\s*[[{]/.test(v) && /"\s*:/.test(v)); }
function urlHasCredentials(v: string): boolean { try { const u = new URL(v); return u.username !== '' || u.password !== ''; } catch { return false; } }
function scanUnsafeDeep(value: unknown, path: string, issues: ConfirmationValidationIssue[]): void {
  if (typeof value === 'string') {
    if (scanUnsafe(value)) issues.push({ field: path, code: 'UNSAFE_CONTENT', message: 'Secret / cookie / token / absolute path detected.' });
    if (/^https?:\/\//i.test(value) && urlHasCredentials(value)) issues.push({ field: path, code: 'URL_CREDENTIALS', message: 'URL must not contain credentials.' });
    return;
  }
  if (Array.isArray(value)) { value.forEach((v, i) => scanUnsafeDeep(v, `${path}.${i}`, issues)); return; }
  if (value && typeof value === 'object') { for (const [k, v] of Object.entries(value)) scanUnsafeDeep(v, `${path}.${k}`, issues); }
}

function hasText(v: unknown): v is string { return typeof v === 'string' && v.trim().length > 0; }

/* ─────────────────────────── deterministic normalization ────────────────────── */

export interface NormalizationResult { ok: boolean; value?: string; reason?: string; }

/** Deterministic referral-code normalization (code-owned). */
export function normalizeReferralCode(raw: unknown): NormalizationResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'NOT_STRING' };
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, reason: 'EMPTY' };
  if (/\s/.test(trimmed)) return { ok: false, reason: 'INTERNAL_WHITESPACE' };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return { ok: false, reason: 'CONTROL_CHAR' };
  const upper = trimmed.toUpperCase();
  if (!/^[A-Z0-9]+$/.test(upper)) return { ok: false, reason: 'UNSAFE_CHARS' };
  if (upper.length < MIN_CODE_LENGTH || upper.length > MAX_CODE_LENGTH) return { ok: false, reason: 'LENGTH' };
  return { ok: true, value: upper };
}

/**
 * Deterministic statement normalization (R7): trim outer whitespace, normalize line
 * endings, collapse every internal whitespace run to a single space. The stored
 * `sourceStatement` must already equal this normalization.
 */
export function normalizeStatement(raw: unknown): NormalizationResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'NOT_STRING' };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw)) return { ok: false, reason: 'CONTROL_CHAR' };
  const norm = raw.replace(/\r\n?/g, '\n').replace(/\s+/g, ' ').trim();
  if (norm === '') return { ok: false, reason: 'EMPTY' };
  if (norm.length > MAX_STATEMENT_LENGTH) return { ok: false, reason: 'TOO_LONG' };
  if (looksLikeDump(norm)) return { ok: false, reason: 'DUMP' };
  return { ok: true, value: norm };
}

/* ───────────────────────────────── digests ─────────────────────────────────── */

export function computeAssertedValueDigest(a: Pick<ClaimConfirmationArtifact, 'exchangeId' | 'claimId' | 'assertionType' | 'assertedValue'>): string {
  const canonical = JSON.stringify({ exchangeId: a.exchangeId, claimId: a.claimId, assertionType: a.assertionType, assertedValue: a.assertedValue });
  return 'sha256:' + createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeSourceStatementDigest(statement: string): string {
  return 'sha256:' + createHash('sha256').update(statement, 'utf8').digest('hex');
}

/** Canonical serialization of a structured source assertion (R4). */
export function canonicalSourceAssertion(sa: SourceAssertion): string {
  return JSON.stringify({ exchangeId: sa.exchangeId, claimId: sa.claimId, assertionType: sa.assertionType, assignmentState: sa.assignmentState, assertedValue: sa.assertedValue });
}

/** Partner-receipt provenance digest (R3). */
export function computeReceiptDigest(r: Pick<PartnerReceipt, 'issuerId' | 'issuerDomain' | 'receiptKind' | 'receiptId' | 'issuedAt' | 'normalizedAssertion'>): string {
  const canonical = JSON.stringify({ issuerId: r.issuerId, issuerDomain: r.issuerDomain, receiptKind: r.receiptKind, receiptId: r.receiptId, issuedAt: r.issuedAt, normalizedAssertion: r.normalizedAssertion });
  return 'sha256:' + createHash('sha256').update(canonical, 'utf8').digest('hex');
}

const ARTIFACT_FIELDS: (keyof ClaimConfirmationArtifact)[] = [
  'confirmationId', 'exchangeId', 'claimId', 'assertionType', 'assertedValue', 'assertedValueDigest',
  'confirmedBy', 'confirmationRole', 'confirmedAt', 'validUntil', 'sourceEventAt', 'artifactIntent', 'sourceAssertion',
  'sourceKind', 'sourceUrl', 'sourceId', 'partnerReceipt', 'sourceStatement', 'sourceStatementDigest', 'status',
  'replacesConfirmationId', 'revokesConfirmationId', 'limitations', 'note',
];

/** Canonical serialization of every committed field except artifactDigest. */
export function canonicalConfirmationArtifact(a: ClaimConfirmationArtifact): string {
  const o: Record<string, unknown> = {};
  for (const k of ARTIFACT_FIELDS) o[k] = (a as unknown as Record<string, unknown>)[k] ?? null;
  return JSON.stringify(o);
}

export function computeConfirmationArtifactDigest(a: ClaimConfirmationArtifact): string {
  return 'sha256:' + createHash('sha256').update(canonicalConfirmationArtifact(a), 'utf8').digest('hex');
}

/* ─────────────────────────── structural validation ──────────────────────────── */

function boundedSafe(v: unknown, max: number): boolean { return typeof v === 'string' && v.length <= max && !looksLikeDump(v); }

function validateSourceAssertion(a: Record<string, unknown>, issues: ConfirmationValidationIssue[]): void {
  const sa = a.sourceAssertion;
  if (typeof sa !== 'object' || sa === null || Array.isArray(sa)) { issues.push({ field: 'sourceAssertion', code: 'REQUIRED', message: 'sourceAssertion object required.' }); return; }
  const s = sa as Record<string, unknown>;
  if (!ASSIGNMENT_STATES.includes(s.assignmentState as AssignmentState)) issues.push({ field: 'sourceAssertion.assignmentState', code: 'INVALID_ASSIGNMENT_STATE', message: 'Unknown assignmentState.' });
  // Must mirror the artifact subject EXACTLY (R4).
  if (s.exchangeId !== a.exchangeId || s.claimId !== a.claimId || s.assertionType !== a.assertionType || s.assertedValue !== a.assertedValue) {
    issues.push({ field: 'sourceAssertion', code: 'SOURCE_ASSERTION_MISMATCH', message: 'sourceAssertion must mirror the artifact subject exactly.' });
  }
}

function validatePartnerReceipt(a: Record<string, unknown>, issues: ConfirmationValidationIssue[]): void {
  const isPartner = PARTNER_SOURCE_KINDS.includes(a.sourceKind as ConfirmationSourceKind);
  const pr = a.partnerReceipt;
  if (!isPartner) {
    if (pr !== null && pr !== undefined) issues.push({ field: 'partnerReceipt', code: 'RECEIPT_FORBIDDEN', message: 'GitHub owner sources must not carry a partnerReceipt.' });
    return;
  }
  if (typeof pr !== 'object' || pr === null || Array.isArray(pr)) { issues.push({ field: 'partnerReceipt', code: 'REQUIRED', message: 'Partner sources require a partnerReceipt object.' }); return; }
  const r = pr as Record<string, unknown>;
  if (!hasText(r.issuerId) || (r.issuerId as string).length > MAX_ACTOR_LENGTH) issues.push({ field: 'partnerReceipt.issuerId', code: 'INVALID', message: 'issuerId required and bounded.' });
  if (!hasText(r.issuerDomain) || (r.issuerDomain as string).length > MAX_DOMAIN_LENGTH || !DOMAIN_RE.test(r.issuerDomain as string)) issues.push({ field: 'partnerReceipt.issuerDomain', code: 'INVALID_DOMAIN', message: 'issuerDomain must be a valid domain.' });
  if (r.receiptKind !== a.sourceKind || !PARTNER_SOURCE_KINDS.includes(r.receiptKind as ConfirmationSourceKind)) issues.push({ field: 'partnerReceipt.receiptKind', code: 'RECEIPT_KIND_MISMATCH', message: 'receiptKind must be a partner kind equal to sourceKind.' });
  if (!hasText(r.receiptId) || (r.receiptId as string).length > MAX_SOURCE_ID_LENGTH || !SOURCE_ID_RE.test(r.receiptId as string)) issues.push({ field: 'partnerReceipt.receiptId', code: 'INVALID_RECEIPT_ID', message: 'receiptId must be a bounded immutable slug.' });
  const issuedAt = parseExactIsoDateTime(r.issuedAt);
  if (!issuedAt) issues.push({ field: 'partnerReceipt.issuedAt', code: 'INEXACT_TIMESTAMP', message: 'issuedAt must be an exact ISO datetime.' });
  else if (r.issuedAt !== a.sourceEventAt) issues.push({ field: 'partnerReceipt.issuedAt', code: 'ISSUED_AT_MISMATCH', message: 'issuedAt must bind to sourceEventAt.' });
  if (!REDACTION_VERSIONS.includes(r.redactionVersion as string)) issues.push({ field: 'partnerReceipt.redactionVersion', code: 'INVALID_REDACTION', message: 'Unknown redactionVersion.' });
  // normalizedAssertion must equal the canonical serialization of sourceAssertion.
  const sa = a.sourceAssertion as SourceAssertion | undefined;
  if (sa && typeof sa === 'object') {
    const expected = canonicalSourceAssertion(sa);
    if (r.normalizedAssertion !== expected) issues.push({ field: 'partnerReceipt.normalizedAssertion', code: 'ASSERTION_MISMATCH', message: 'normalizedAssertion must equal the canonical sourceAssertion.' });
  }
  // Receipt digest must recompute.
  if (!hasText(r.normalizedReceiptDigest) || !SHA256.test(r.normalizedReceiptDigest as string)) issues.push({ field: 'partnerReceipt.normalizedReceiptDigest', code: 'INVALID_DIGEST', message: 'normalizedReceiptDigest must be sha256.' });
  else if (typeof r.issuerId === 'string' && typeof r.issuerDomain === 'string' && typeof r.receiptKind === 'string' && typeof r.receiptId === 'string' && typeof r.issuedAt === 'string' && typeof r.normalizedAssertion === 'string') {
    const recomputed = computeReceiptDigest(r as unknown as PartnerReceipt);
    if (recomputed !== r.normalizedReceiptDigest) issues.push({ field: 'partnerReceipt.normalizedReceiptDigest', code: 'RECEIPT_DIGEST_MISMATCH', message: 'normalizedReceiptDigest does not recompute (tampered).' });
  }
}

/**
 * Structural + self-consistency validation. Trust (policy), now-relative time and
 * lifecycle set-effects are NOT enforced here — a draft template is structurally
 * valid but non-authorizing.
 */
export function validateClaimConfirmation(input: unknown): ConfirmationValidationResult {
  const issues: ConfirmationValidationIssue[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: [{ field: '$', code: 'NOT_OBJECT', message: 'Confirmation must be an object.' }] };
  }
  const r = input as Record<string, unknown>;

  if (!hasText(r.confirmationId) || !CANONICAL_SLUG.test(r.confirmationId as string)) issues.push({ field: 'confirmationId', code: 'INVALID_ID', message: 'confirmationId must be a canonical slug.' });
  if (!hasText(r.exchangeId) || !CANONICAL_SLUG.test(r.exchangeId as string)) issues.push({ field: 'exchangeId', code: 'INVALID', message: 'exchangeId must be a canonical slug.' });
  if (!hasText(r.claimId)) issues.push({ field: 'claimId', code: 'REQUIRED', message: 'claimId required.' });
  if (!CONFIRMATION_ASSERTION_TYPES.includes(r.assertionType as ConfirmationAssertionType)) issues.push({ field: 'assertionType', code: 'INVALID_ASSERTION', message: 'Unknown assertionType.' });
  if (!CONFIRMATION_ROLES.includes(r.confirmationRole as ConfirmationRole)) issues.push({ field: 'confirmationRole', code: 'INVALID_ROLE', message: 'Unknown confirmationRole.' });
  if (!CONFIRMATION_LIFECYCLE_STATES.includes(r.status as ConfirmationLifecycle)) issues.push({ field: 'status', code: 'INVALID_STATUS', message: 'Unknown lifecycle status.' });
  if (!CONFIRMATION_SOURCE_KINDS.includes(r.sourceKind as ConfirmationSourceKind)) issues.push({ field: 'sourceKind', code: 'INVALID_SOURCE_KIND', message: 'Unknown sourceKind.' });
  if (!ARTIFACT_INTENTS.includes(r.artifactIntent as ArtifactIntent)) issues.push({ field: 'artifactIntent', code: 'INVALID_INTENT', message: 'Unknown artifactIntent.' });

  if (!hasText(r.confirmedBy) || (r.confirmedBy as string).length > MAX_ACTOR_LENGTH) issues.push({ field: 'confirmedBy', code: 'INVALID', message: 'confirmedBy required and bounded.' });

  const norm = normalizeReferralCode(r.assertedValue);
  if (!norm.ok) issues.push({ field: 'assertedValue', code: 'INVALID_VALUE', message: `assertedValue invalid (${norm.reason}).` });
  else if (norm.value !== r.assertedValue) issues.push({ field: 'assertedValue', code: 'NOT_NORMALIZED', message: 'assertedValue must already be normalized.' });

  if (!hasText(r.assertedValueDigest) || !SHA256.test(r.assertedValueDigest as string)) issues.push({ field: 'assertedValueDigest', code: 'INVALID_DIGEST', message: 'assertedValueDigest must be sha256.' });
  else if (typeof r.exchangeId === 'string' && typeof r.claimId === 'string' && CONFIRMATION_ASSERTION_TYPES.includes(r.assertionType as ConfirmationAssertionType) && typeof r.assertedValue === 'string') {
    if (computeAssertedValueDigest({ exchangeId: r.exchangeId, claimId: r.claimId, assertionType: r.assertionType as ConfirmationAssertionType, assertedValue: r.assertedValue }) !== r.assertedValueDigest) issues.push({ field: 'assertedValueDigest', code: 'VALUE_DIGEST_MISMATCH', message: 'assertedValueDigest does not recompute (tampered).' });
  }

  // Structured source assertion (R4) + partner receipt (R3).
  validateSourceAssertion(r, issues);
  validatePartnerReceipt(r, issues);

  // Timestamps.
  const confirmedAt = parseExactIsoDateTime(r.confirmedAt);
  const validUntil = parseExactIsoDateTime(r.validUntil);
  const sourceEventAt = parseExactIsoDateTime(r.sourceEventAt);
  if (!confirmedAt) issues.push({ field: 'confirmedAt', code: 'INEXACT_TIMESTAMP', message: 'confirmedAt must be an exact ISO datetime.' });
  if (!validUntil) issues.push({ field: 'validUntil', code: 'INEXACT_TIMESTAMP', message: 'validUntil must be an exact ISO datetime.' });
  if (!sourceEventAt) issues.push({ field: 'sourceEventAt', code: 'INEXACT_TIMESTAMP', message: 'sourceEventAt must be an exact ISO datetime.' });
  if (confirmedAt && validUntil && validUntil.epochMs <= confirmedAt.epochMs) issues.push({ field: 'validUntil', code: 'INVALID_WINDOW', message: 'validUntil must be strictly after confirmedAt.' });
  if (confirmedAt && sourceEventAt && confirmedAt.epochMs < sourceEventAt.epochMs) issues.push({ field: 'confirmedAt', code: 'BEFORE_SOURCE_EVENT', message: 'confirmedAt must be at/after the referenced source event.' });

  // Source shape.
  if (!hasText(r.sourceId) || (r.sourceId as string).length > MAX_SOURCE_ID_LENGTH || !SOURCE_ID_RE.test(r.sourceId as string)) issues.push({ field: 'sourceId', code: 'INVALID_SOURCE_ID', message: 'sourceId must be a bounded immutable identifier.' });
  if (!(r.sourceUrl === null || (typeof r.sourceUrl === 'string' && /^https:\/\/[^\s]+$/i.test(r.sourceUrl)))) issues.push({ field: 'sourceUrl', code: 'INVALID_SOURCE_URL', message: 'sourceUrl must be an HTTPS URL or null.' });

  // Statement: must already be deterministically normalized (R7) + digest recomputes.
  const sNorm = normalizeStatement(r.sourceStatement);
  if (!sNorm.ok) issues.push({ field: 'sourceStatement', code: 'INVALID_STATEMENT', message: `sourceStatement invalid (${sNorm.reason}).` });
  else if (sNorm.value !== r.sourceStatement) issues.push({ field: 'sourceStatement', code: 'STATEMENT_NOT_NORMALIZED', message: 'sourceStatement must already be normalized.' });
  if (!hasText(r.sourceStatementDigest) || !SHA256.test(r.sourceStatementDigest as string)) issues.push({ field: 'sourceStatementDigest', code: 'INVALID_DIGEST', message: 'sourceStatementDigest must be sha256.' });
  else if (typeof r.sourceStatement === 'string' && computeSourceStatementDigest(r.sourceStatement) !== r.sourceStatementDigest) issues.push({ field: 'sourceStatementDigest', code: 'STATEMENT_DIGEST_MISMATCH', message: 'sourceStatementDigest does not recompute (tampered).' });

  if (typeof r.limitations !== 'string' || !boundedSafe(r.limitations, MAX_LIMITATION_LENGTH)) issues.push({ field: 'limitations', code: 'INVALID', message: 'limitations must be a bounded safe string.' });
  if (!(r.note === undefined || r.note === null || boundedSafe(r.note, MAX_NOTE_LENGTH))) issues.push({ field: 'note', code: 'INVALID', message: 'note must be a bounded safe string or null.' });

  // Intent ↔ link consistency (R6, single-artifact part).
  const rep = r.replacesConfirmationId;
  const rev = r.revokesConfirmationId;
  if (!(rep === null || (hasText(rep) && CANONICAL_SLUG.test(rep as string)))) issues.push({ field: 'replacesConfirmationId', code: 'INVALID', message: 'replacesConfirmationId must be a canonical slug or null.' });
  if (!(rev === null || (hasText(rev) && CANONICAL_SLUG.test(rev as string)))) issues.push({ field: 'revokesConfirmationId', code: 'INVALID', message: 'revokesConfirmationId must be a canonical slug or null.' });
  if (rep !== null && rev !== null) issues.push({ field: 'artifactIntent', code: 'DOUBLE_LIFECYCLE_LINK', message: 'An artifact cannot both replace and revoke.' });
  if (r.artifactIntent === 'attestation' && (rep !== null || rev !== null)) issues.push({ field: 'artifactIntent', code: 'INTENT_LINK_MISMATCH', message: 'attestation must not carry replacement/revocation links.' });
  if (r.artifactIntent === 'replacement' && !(hasText(rep) && rev === null)) issues.push({ field: 'artifactIntent', code: 'INTENT_LINK_MISMATCH', message: 'replacement must carry exactly one replacesConfirmationId.' });
  if (r.artifactIntent === 'revocation' && !(hasText(rev) && rep === null)) issues.push({ field: 'artifactIntent', code: 'INTENT_LINK_MISMATCH', message: 'revocation must carry exactly one revokesConfirmationId.' });
  if (hasText(rep) && rep === r.confirmationId) issues.push({ field: 'replacesConfirmationId', code: 'SELF_REFERENCE', message: 'An artifact cannot replace itself.' });
  if (hasText(rev) && rev === r.confirmationId) issues.push({ field: 'revokesConfirmationId', code: 'SELF_REFERENCE', message: 'An artifact cannot revoke itself.' });

  // Full artifact digest.
  if (!hasText(r.artifactDigest) || !SHA256.test(r.artifactDigest as string)) issues.push({ field: 'artifactDigest', code: 'INVALID_DIGEST', message: 'artifactDigest must be sha256.' });
  else if (issues.length === 0) {
    if (computeConfirmationArtifactDigest(input as ClaimConfirmationArtifact) !== r.artifactDigest) issues.push({ field: 'artifactDigest', code: 'ARTIFACT_DIGEST_MISMATCH', message: 'artifactDigest does not recompute (tampered).' });
  }

  scanUnsafeDeep(r, '$', issues);

  if (issues.length) return { ok: false, issues };
  return { ok: true, value: input as ClaimConfirmationArtifact, issues };
}

/* ─────────────────────── policy admissibility (trust + subject) ───────────────── */

/**
 * Policy admissibility for a single artifact against an injected policy — subject
 * match, trusted actor+role+source, structured POSITIVE assertion, partner-receipt
 * trust and validity limit. Ignores now-relative time and lifecycle set-effects.
 */
export function promoAdmissibilityIssues(a: ClaimConfirmationArtifact, policy: PromoCodeConfirmationPolicy): ConfirmationValidationIssue[] {
  const issues: ConfirmationValidationIssue[] = [];
  if (a.exchangeId !== policy.exchangeId) issues.push({ field: 'exchangeId', code: 'WRONG_EXCHANGE', message: 'Confirmation is not for the policy exchange.' });
  if (a.claimId !== policy.claimId) issues.push({ field: 'claimId', code: 'WRONG_CLAIM', message: 'Confirmation is not for the policy claim.' });
  if (a.assertionType !== policy.assertionType) issues.push({ field: 'assertionType', code: 'WRONG_ASSERTION', message: 'Assertion type mismatch.' });
  if (!normalizeReferralCode(a.assertedValue).ok) issues.push({ field: 'assertedValue', code: 'INVALID_VALUE', message: 'assertedValue is not a valid referral code.' });

  // Structured POSITIVE assertion (R4) — never substring matching.
  const sa = a.sourceAssertion;
  if (!sa || sa.exchangeId !== a.exchangeId || sa.claimId !== a.claimId || sa.assertionType !== a.assertionType || sa.assertedValue !== a.assertedValue) {
    issues.push({ field: 'sourceAssertion', code: 'ASSERTION_SUBJECT_MISMATCH', message: 'sourceAssertion must mirror the subject exactly.' });
  } else if (!POSITIVE_ASSIGNMENT_STATES.includes(sa.assignmentState)) {
    issues.push({ field: 'sourceAssertion.assignmentState', code: 'NON_POSITIVE_ASSIGNMENT', message: 'assignmentState must be an active positive assignment.' });
  }

  // Trusted actor + role-appropriate source.
  if (a.confirmationRole === 'owner') {
    if (!policy.trustedOwnerIdentities.includes(a.confirmedBy)) issues.push({ field: 'confirmedBy', code: 'UNTRUSTED_ACTOR', message: 'confirmedBy is not a trusted owner identity.' });
    if (!policy.ownerSourceKinds.includes(a.sourceKind)) issues.push({ field: 'sourceKind', code: 'ROLE_SOURCE_MISMATCH', message: 'Owner confirmations must cite a GitHub source.' });
    // Owner GitHub source URL must be repo-owned with an immutable id equal to sourceId.
    const re = a.sourceKind === 'github_issue_comment' ? GH_ISSUE_COMMENT : a.sourceKind === 'github_pr_review' ? GH_PR_REVIEW : GH_REVIEW_COMMENT;
    const match = typeof a.sourceUrl === 'string' ? a.sourceUrl.match(re) : null;
    if (!match) issues.push({ field: 'sourceUrl', code: 'SOURCE_URL_OUT_OF_POLICY', message: 'GitHub source URL must be a repo-owned issue-comment / PR-review / review-comment URL.' });
    else if (a.sourceId !== match[1]) issues.push({ field: 'sourceId', code: 'SOURCE_ID_MISMATCH', message: 'sourceId must equal the immutable GitHub identifier in the URL.' });
  } else if (a.confirmationRole === 'partner') {
    if (!policy.partnerSourceKinds.includes(a.sourceKind)) issues.push({ field: 'sourceKind', code: 'ROLE_SOURCE_MISMATCH', message: 'Partner confirmations must cite a partner receipt.' });
    const pr = a.partnerReceipt;
    if (!pr) issues.push({ field: 'partnerReceipt', code: 'RECEIPT_REQUIRED', message: 'Partner confirmations require a structured receipt.' });
    else {
      if (!policy.trustedPartnerIdentities.includes(pr.issuerId)) issues.push({ field: 'partnerReceipt.issuerId', code: 'UNTRUSTED_PARTNER', message: 'Partner issuer is not trusted under the policy.' });
      if (!policy.trustedPartnerDomains.includes(pr.issuerDomain)) issues.push({ field: 'partnerReceipt.issuerDomain', code: 'UNTRUSTED_DOMAIN', message: 'Partner domain is not trusted under the policy.' });
      if (a.confirmedBy !== pr.issuerId) issues.push({ field: 'confirmedBy', code: 'CONFIRMEDBY_MISMATCH', message: 'confirmedBy must equal the partner issuerId.' });
      if (a.sourceId !== pr.receiptId) issues.push({ field: 'sourceId', code: 'RECEIPT_ID_MISMATCH', message: 'sourceId must equal the partner receiptId.' });
    }
  }

  const c = parseExactIsoDateTime(a.confirmedAt);
  const v = parseExactIsoDateTime(a.validUntil);
  if (c && v && (v.epochMs - c.epochMs) > policy.maxValidityDays * 86400000) issues.push({ field: 'validUntil', code: 'VALIDITY_TOO_LONG', message: `Validity window exceeds ${policy.maxValidityDays} days.` });
  return issues;
}

/* ─────────────────────────── single authorizing evaluator ───────────────────── */

export interface ConfirmationSetEvaluation {
  state: ConfirmationSetState;
  value?: string | null;
  confirmationId?: string | null;
  issues?: ConfirmationValidationIssue[];
}

function parsedTime(s: string): number | null { const p = parseExactIsoDateTime(s); return p ? p.epochMs : null; }

/** PRIVATE — never exported; does NOT itself represent quorum satisfaction. */
function isActiveAdmissibleConfirmed(a: ClaimConfirmationArtifact, policy: PromoCodeConfirmationPolicy, nowMs: number): boolean {
  if (a.status !== 'confirmed') return false;
  if (promoAdmissibilityIssues(a, policy).length > 0) return false;
  const c = parsedTime(a.confirmedAt); const v = parsedTime(a.validUntil);
  if (c === null || v === null) return false;
  if (c > nowMs) return false;
  if (nowMs >= v) return false;
  return true;
}

/**
 * The ONE authorizing evaluator (generic over an injected policy). Explicit finite
 * clock; no `Date.now()` fallback. Fails closed; there is no second decision path.
 */
export function evaluatePromoCodeConfirmations(artifacts: unknown, nowMs: number, policy: PromoCodeConfirmationPolicy): ConfirmationSetEvaluation {
  if (!Array.isArray(artifacts) || artifacts.length === 0) return { state: 'missing', value: null };
  if (!Number.isFinite(nowMs)) return { state: 'invalid', value: null, issues: [{ field: '$', code: 'CLOCK_INVALID', message: 'A finite evaluation clock is required.' }] };

  const parsed: ClaimConfirmationArtifact[] = [];
  for (let i = 0; i < artifacts.length; i++) {
    const v = validateClaimConfirmation(artifacts[i]);
    if (!v.ok || !v.value) return { state: 'invalid', value: null, issues: v.issues.map((x) => ({ ...x, field: `[${i}].${x.field}` })) };
    parsed.push(v.value);
  }
  const ids = new Set<string>();
  for (const a of parsed) { if (ids.has(a.confirmationId)) return { state: 'invalid', value: null, issues: [{ field: 'confirmationId', code: 'DUPLICATE', message: `Duplicate confirmationId: ${a.confirmationId}` }] }; ids.add(a.confirmationId); }
  const byId = new Map(parsed.map((a) => [a.confirmationId, a]));

  // R5: any purported ACTIVE (confirmed) artifact that fails policy fails closed.
  for (const a of parsed) {
    if (a.status === 'confirmed' && promoAdmissibilityIssues(a, policy).length > 0) {
      return { state: 'invalid', value: null, issues: [{ field: a.confirmationId, code: 'ACTIVE_ARTIFACT_INADMISSIBLE', message: 'A confirmed artifact failed policy and cannot be silently discarded.' }] };
    }
  }

  // R6: lifecycle link resolution (targets exist, same subject, later, acyclic).
  for (const a of parsed) {
    const link = a.artifactIntent === 'replacement' ? a.replacesConfirmationId : a.artifactIntent === 'revocation' ? a.revokesConfirmationId : null;
    if (link === null) continue;
    const t = byId.get(link);
    if (!t) return { state: 'invalid', value: null, issues: [{ field: 'lifecycle', code: 'UNKNOWN_TARGET', message: `Unknown lifecycle target: ${link}` }] };
    if (t.exchangeId !== a.exchangeId || t.claimId !== a.claimId) return { state: 'invalid', value: null, issues: [{ field: 'lifecycle', code: 'CROSS_SUBJECT_TARGET', message: 'Lifecycle target must share exchange + claim.' }] };
    const ca = parsedTime(a.confirmedAt); const ct = parsedTime(t.confirmedAt);
    if (ca === null || ct === null || ca <= ct) return { state: 'invalid', value: null, issues: [{ field: 'lifecycle', code: 'LIFECYCLE_NOT_AFTER_TARGET', message: 'A replacement/revocation must occur after its target.' }] };
  }
  // Cycle detection across replace + revoke edges.
  const edges = new Map<string, string[]>();
  for (const a of parsed) { const o: string[] = []; if (a.replacesConfirmationId) o.push(a.replacesConfirmationId); if (a.revokesConfirmationId) o.push(a.revokesConfirmationId); edges.set(a.confirmationId, o); }
  const color = new Map<string, number>(parsed.map((a) => [a.confirmationId, 0]));
  const cyc = (n: string): boolean => { color.set(n, 1); for (const mm of edges.get(n) || []) { const cm = color.get(mm); if (cm === 1) return true; if (cm === 0 && cyc(mm)) return true; } color.set(n, 2); return false; };
  for (const a of parsed) { if (color.get(a.confirmationId) === 0 && cyc(a.confirmationId)) return { state: 'invalid', value: null, issues: [{ field: 'lifecycle', code: 'CYCLE', message: 'Lifecycle graph must be acyclic.' }] }; }

  // Effective suppression from ACTIVE replacement/revocation actions.
  const revokedIds = new Set<string>();
  const replacedIds = new Set<string>();
  for (const a of parsed) {
    if (!isActiveAdmissibleConfirmed(a, policy, nowMs)) continue;
    if (a.artifactIntent === 'revocation' && a.revokesConfirmationId) revokedIds.add(a.revokesConfirmationId);
    if (a.artifactIntent === 'replacement' && a.replacesConfirmationId) {
      let t: string | null = a.replacesConfirmationId;
      const guard = new Set<string>();
      while (t && !guard.has(t)) { guard.add(t); replacedIds.add(t); t = byId.get(t)?.replacesConfirmationId ?? null; }
    }
  }
  const suppressed = (id: string) => revokedIds.has(id) || replacedIds.has(id);

  const candidate = policy.candidateValue;
  // Active value-assigning confirmations (revocations never assign a value).
  const activeConfirmed = parsed.filter((a) => a.artifactIntent !== 'revocation' && isActiveAdmissibleConfirmed(a, policy, nowMs) && !suppressed(a.confirmationId));
  const activeValues = new Set(activeConfirmed.map((a) => a.assertedValue));
  if (activeValues.size >= 2) return { state: 'conflict', value: null, confirmationId: null };

  const otherValueActive = activeConfirmed.find((a) => a.assertedValue !== candidate);
  if (otherValueActive) return { state: 'conflict', value: otherValueActive.assertedValue, confirmationId: otherValueActive.confirmationId };
  const partnerCand = activeConfirmed.find((a) => a.confirmationRole === 'partner' && a.assertedValue === candidate);
  const ownerCand = activeConfirmed.find((a) => a.confirmationRole === 'owner' && a.assertedValue === candidate);

  if (policy.requiresPartnerProof) {
    if (partnerCand) return { state: 'confirmed', value: candidate, confirmationId: partnerCand.confirmationId };
    if (ownerCand) return { state: 'pending_partner_confirmation', value: candidate, confirmationId: ownerCand.confirmationId };
  } else {
    const which = partnerCand || ownerCand;
    if (which) return { state: 'confirmed', value: candidate, confirmationId: which.confirmationId };
  }

  // Terminal signals for the candidate.
  const candArtifacts = parsed.filter((a) => a.assertedValue === candidate && a.status === 'confirmed' && promoAdmissibilityIssues(a, policy).length === 0);
  const revokedForCandidate = candArtifacts.some((a) => revokedIds.has(a.confirmationId));
  const expiredForCandidate = candArtifacts.some((a) => { const v = parsedTime(a.validUntil); return v !== null && nowMs >= v; });
  if (expiredForCandidate) return { state: 'expired', value: candidate, confirmationId: null };
  if (revokedForCandidate) return { state: 'revoked', value: candidate, confirmationId: null };
  return { state: 'missing', value: candidate, confirmationId: null };
}

/** Product wrapper — always uses the production code-owned policy (R2). */
export function evaluateBybitPromoCodeConfirmations(artifacts: unknown, nowMs: number): ConfirmationSetEvaluation {
  return evaluatePromoCodeConfirmations(artifacts, nowMs, BYBIT_PROMO_CODE_CONFIRMATION_POLICY);
}

/**
 * The ONLY authorization convenience helper (R1): delegates to the canonical
 * evaluator over the COMPLETE set and returns true only when the evaluator's state
 * is `confirmed` for exactly the requested normalized value. It never inspects a
 * single artifact's activeness directly.
 */
export function promoCodeSetConfirmsValue(artifacts: unknown, nowMs: number, policy: PromoCodeConfirmationPolicy, value: string): boolean {
  const norm = normalizeReferralCode(value);
  if (!norm.ok) return false;
  const res = evaluatePromoCodeConfirmations(artifacts, nowMs, policy);
  return res.state === 'confirmed' && res.value === norm.value;
}
