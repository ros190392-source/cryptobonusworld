/**
 * ClaimConfirmationArtifact — trusted, claim-bound, value-bound, time-bound,
 * conflict-aware and revocable confirmation intake for partner-only offer facts
 * (Issue #256).
 *
 * This supersedes the weak generic `OwnerConfirmationArtifact`: a confirmation is
 * bound to ONE exchange, ONE claim, ONE assertion type, ONE exact normalized value,
 * ONE recomputable value digest, ONE trusted actor + role, ONE auditable source,
 * ONE validity window and ONE lifecycle state (with optional replacement/revocation
 * links). A confirmation for another exchange, claim or value can never support
 * `bybit.promo_code`.
 *
 * All policy is CODE-OWNED (trusted identities, roles, source kinds, validity
 * limits, quorum, normalization) — never packet-declared. There is exactly ONE
 * authorizing evaluator (`evaluateBybitPromoCodeConfirmations`); it takes an
 * explicit finite clock and never falls back to `Date.now()`. Node crypto is used
 * only for build/server-side integrity; this module is not in the client bundle.
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

/** The one confirmation-set state (single authorizing evaluator output). */
export type ConfirmationSetState =
  | 'confirmed'
  | 'pending_partner_confirmation'
  | 'missing'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'conflict';

export interface ClaimConfirmationArtifact {
  confirmationId: string;
  exchangeId: string;
  claimId: string;
  assertionType: ConfirmationAssertionType;
  /** Normalized asserted value (e.g., canonical uppercase referral code). */
  assertedValue: string;
  /** sha256 over {exchangeId, claimId, assertionType, normalized assertedValue}. */
  assertedValueDigest: string;
  confirmedBy: string;
  confirmationRole: ConfirmationRole;
  confirmedAt: string;
  validUntil: string;
  /** When the referenced source event occurred (confirmedAt must be at/after). */
  sourceEventAt: string;
  sourceKind: ConfirmationSourceKind;
  sourceUrl: string | null;
  /** Immutable source identifier (numeric GitHub id or partner receipt slug). */
  sourceId: string;
  /** Concise NORMALIZED, redacted statement (never a full email/dashboard dump). */
  sourceStatement: string;
  sourceStatementDigest: string;
  status: ConfirmationLifecycle;
  replacesConfirmationId: string | null;
  revokesConfirmationId: string | null;
  limitations: string;
  note?: string | null;
  /** Full artifact digest over every field except this one. */
  artifactDigest: string;
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

const CANONICAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
/** Immutable source id: numeric (GitHub) or a safe receipt slug. */
const SOURCE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/* ─────────────────────────── trusted GitHub source URLs ─────────────────────── */
const GH_ISSUE_COMMENT = /^https:\/\/github\.com\/ros190392-source\/cryptobonusworld\/issues\/\d+#issuecomment-(\d+)$/;
const GH_PR_REVIEW = /^https:\/\/github\.com\/ros190392-source\/cryptobonusworld\/pull\/\d+#pullrequestreview-(\d+)$/;
const GH_REVIEW_COMMENT = /^https:\/\/github\.com\/ros190392-source\/cryptobonusworld\/pull\/\d+#discussion_r(\d+)$/;

/* ────────────────────── code-owned Bybit promo-code policy ──────────────────── */

export const BYBIT_PROMO_CODE_CONFIRMATION_POLICY = Object.freeze({
  exchangeId: 'bybit',
  claimId: 'bybit.promo_code',
  assertionType: 'exact_referral_code_assignment' as ConfirmationAssertionType,
  /** The value CBW currently displays — explicitly UNCONFIRMED. */
  candidateValue: 'CRYPTOBONUSW',
  candidateConfirmed: false,
  /** Owner attestation alone stays pending; admissible partner proof is required. */
  requiresPartnerProof: true,
  trustedOwnerIdentities: Object.freeze(['ros190392-source']) as readonly string[],
  trustedPartnerIdentities: Object.freeze(['bybit-partner-official']) as readonly string[],
  ownerSourceKinds: GITHUB_SOURCE_KINDS,
  partnerSourceKinds: PARTNER_SOURCE_KINDS,
  maxValidityDays: 180,
});

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
/** Email/dashboard dump markers — a confirmation statement must be a concise redaction. */
const DUMP_MARKERS = [
  /^\s*(from|to|subject|date|received|cc|bcc|reply-to)\s*:/im,
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

/**
 * Deterministic referral-code normalization (code-owned): trim outer whitespace,
 * canonical uppercase; reject empty, internal whitespace, control chars and any
 * character outside [A-Z0-9]. Never silently converts a materially different value.
 */
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

/* ───────────────────────────────── digests ─────────────────────────────────── */

/** Value digest subject: exchangeId + claimId + assertionType + normalized value. */
export function computeAssertedValueDigest(a: Pick<ClaimConfirmationArtifact, 'exchangeId' | 'claimId' | 'assertionType' | 'assertedValue'>): string {
  const canonical = JSON.stringify({ exchangeId: a.exchangeId, claimId: a.claimId, assertionType: a.assertionType, assertedValue: a.assertedValue });
  return 'sha256:' + createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeSourceStatementDigest(statement: string): string {
  return 'sha256:' + createHash('sha256').update(statement, 'utf8').digest('hex');
}

const ARTIFACT_FIELDS: (keyof ClaimConfirmationArtifact)[] = [
  'confirmationId', 'exchangeId', 'claimId', 'assertionType', 'assertedValue', 'assertedValueDigest',
  'confirmedBy', 'confirmationRole', 'confirmedAt', 'validUntil', 'sourceEventAt', 'sourceKind', 'sourceUrl',
  'sourceId', 'sourceStatement', 'sourceStatementDigest', 'status', 'replacesConfirmationId', 'revokesConfirmationId',
  'limitations', 'note',
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

/**
 * Structural + self-consistency validation (digests, enums, bounded/safe strings,
 * strict timestamps and their ordering). Policy trust (actor/source/statement
 * binding, value === candidate) and now-relative time are enforced by the
 * authorizing evaluator — NOT here — so a draft template is structurally valid but
 * non-authorizing.
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

  if (!hasText(r.confirmedBy) || (r.confirmedBy as string).length > MAX_ACTOR_LENGTH) issues.push({ field: 'confirmedBy', code: 'INVALID', message: 'confirmedBy required and bounded.' });

  // assertedValue must be already-normalized (idempotent under the code-owned rule).
  const norm = normalizeReferralCode(r.assertedValue);
  if (!norm.ok) issues.push({ field: 'assertedValue', code: 'INVALID_VALUE', message: `assertedValue invalid (${norm.reason}).` });
  else if (norm.value !== r.assertedValue) issues.push({ field: 'assertedValue', code: 'NOT_NORMALIZED', message: 'assertedValue must already be normalized (canonical uppercase, no whitespace).' });

  // assertedValueDigest recomputes over the binding subject.
  if (!hasText(r.assertedValueDigest) || !SHA256.test(r.assertedValueDigest as string)) issues.push({ field: 'assertedValueDigest', code: 'INVALID_DIGEST', message: 'assertedValueDigest must be sha256.' });
  else if (typeof r.exchangeId === 'string' && typeof r.claimId === 'string' && CONFIRMATION_ASSERTION_TYPES.includes(r.assertionType as ConfirmationAssertionType) && typeof r.assertedValue === 'string') {
    const recomputed = computeAssertedValueDigest({ exchangeId: r.exchangeId, claimId: r.claimId, assertionType: r.assertionType as ConfirmationAssertionType, assertedValue: r.assertedValue });
    if (recomputed !== r.assertedValueDigest) issues.push({ field: 'assertedValueDigest', code: 'VALUE_DIGEST_MISMATCH', message: 'assertedValueDigest does not recompute (tampered value/claim/exchange/assertion).' });
  }

  // Timestamps (strict) + ordering (clock-independent).
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

  // Source statement bounded + redacted + digest recomputes.
  if (!hasText(r.sourceStatement) || !boundedSafe(r.sourceStatement, MAX_STATEMENT_LENGTH)) issues.push({ field: 'sourceStatement', code: 'INVALID_STATEMENT', message: `sourceStatement must be a concise redaction ≤ ${MAX_STATEMENT_LENGTH} chars (no dump/markup).` });
  if (!hasText(r.sourceStatementDigest) || !SHA256.test(r.sourceStatementDigest as string)) issues.push({ field: 'sourceStatementDigest', code: 'INVALID_DIGEST', message: 'sourceStatementDigest must be sha256.' });
  else if (typeof r.sourceStatement === 'string') {
    if (computeSourceStatementDigest(r.sourceStatement) !== r.sourceStatementDigest) issues.push({ field: 'sourceStatementDigest', code: 'STATEMENT_DIGEST_MISMATCH', message: 'sourceStatementDigest does not recompute (tampered).' });
  }

  if (typeof r.limitations !== 'string' || !boundedSafe(r.limitations, MAX_LIMITATION_LENGTH)) issues.push({ field: 'limitations', code: 'INVALID', message: 'limitations must be a bounded safe string.' });
  if (!(r.note === undefined || r.note === null || boundedSafe(r.note, MAX_NOTE_LENGTH))) issues.push({ field: 'note', code: 'INVALID', message: 'note must be a bounded safe string or null.' });

  if (!(r.replacesConfirmationId === null || (hasText(r.replacesConfirmationId) && CANONICAL_SLUG.test(r.replacesConfirmationId as string)))) issues.push({ field: 'replacesConfirmationId', code: 'INVALID', message: 'replacesConfirmationId must be a canonical slug or null.' });
  if (!(r.revokesConfirmationId === null || (hasText(r.revokesConfirmationId) && CANONICAL_SLUG.test(r.revokesConfirmationId as string)))) issues.push({ field: 'revokesConfirmationId', code: 'INVALID', message: 'revokesConfirmationId must be a canonical slug or null.' });

  // Full artifact digest recomputes (over every field except itself).
  if (!hasText(r.artifactDigest) || !SHA256.test(r.artifactDigest as string)) issues.push({ field: 'artifactDigest', code: 'INVALID_DIGEST', message: 'artifactDigest must be sha256.' });
  else if (issues.length === 0) {
    if (computeConfirmationArtifactDigest(input as ClaimConfirmationArtifact) !== r.artifactDigest) issues.push({ field: 'artifactDigest', code: 'ARTIFACT_DIGEST_MISMATCH', message: 'artifactDigest does not recompute (tampered).' });
  }

  scanUnsafeDeep(r, '$', issues);

  if (issues.length) return { ok: false, issues };
  return { ok: true, value: input as ClaimConfirmationArtifact, issues };
}

/* ─────────────────────── trusted-source + policy binding ─────────────────────── */

/**
 * Trusted-source policy for a single artifact: repo-owned GitHub URL with an
 * immutable id matching sourceId, or a typed partner receipt; the normalized
 * statement must explicitly bind the exchange, the promo/referral claim and the
 * exact asserted value; generic statements ("approved"/"looks good") are rejected.
 */
export function trustedSourceIssues(a: ClaimConfirmationArtifact): ConfirmationValidationIssue[] {
  const issues: ConfirmationValidationIssue[] = [];
  const kind = a.sourceKind;
  if (GITHUB_SOURCE_KINDS.includes(kind)) {
    const re = kind === 'github_issue_comment' ? GH_ISSUE_COMMENT : kind === 'github_pr_review' ? GH_PR_REVIEW : GH_REVIEW_COMMENT;
    const match = typeof a.sourceUrl === 'string' ? a.sourceUrl.match(re) : null;
    if (!match) issues.push({ field: 'sourceUrl', code: 'SOURCE_URL_OUT_OF_POLICY', message: 'GitHub source URL must be a repo-owned issue-comment / PR-review / review-comment URL.' });
    else if (a.sourceId !== match[1]) issues.push({ field: 'sourceId', code: 'SOURCE_ID_MISMATCH', message: 'sourceId must equal the immutable GitHub identifier in the URL.' });
  } else if (PARTNER_SOURCE_KINDS.includes(kind)) {
    if (a.sourceUrl !== null) issues.push({ field: 'sourceUrl', code: 'PARTNER_URL_FORBIDDEN', message: 'Partner receipts must not carry a source URL (redacted, receipt-id only).' });
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(a.sourceId)) issues.push({ field: 'sourceId', code: 'INVALID_RECEIPT_ID', message: 'Partner receipt id must be a safe immutable slug.' });
  } else {
    issues.push({ field: 'sourceKind', code: 'INVALID_SOURCE_KIND', message: 'Unsupported source kind.' });
  }
  // Statement must bind exchange + claim(promo/referral) + exact value.
  const s = a.sourceStatement.toUpperCase();
  const bindsExchange = s.includes(a.exchangeId.toUpperCase());
  const bindsClaim = /PROMO|REFERRAL|CODE/.test(s);
  const bindsValue = s.includes(a.assertedValue);
  if (!(bindsExchange && bindsClaim && bindsValue)) {
    issues.push({ field: 'sourceStatement', code: 'STATEMENT_NOT_BOUND', message: 'Statement must explicitly bind the exchange, the promo/referral code and the exact value.' });
  }
  return issues;
}

/**
 * Policy admissibility for a single artifact against the code-owned Bybit promo
 * policy — ignoring now-relative time and lifecycle status (those are applied by
 * the evaluator). Covers exchange/claim/assertion match, trusted actor+role, role-
 * appropriate source kind, validity limit, source binding and value normalization.
 */
export function bybitPromoAdmissibilityIssues(a: ClaimConfirmationArtifact): ConfirmationValidationIssue[] {
  const P = BYBIT_PROMO_CODE_CONFIRMATION_POLICY;
  const issues: ConfirmationValidationIssue[] = [];
  if (a.exchangeId !== P.exchangeId) issues.push({ field: 'exchangeId', code: 'WRONG_EXCHANGE', message: 'Confirmation is not for Bybit.' });
  if (a.claimId !== P.claimId) issues.push({ field: 'claimId', code: 'WRONG_CLAIM', message: 'Confirmation is not for bybit.promo_code.' });
  if (a.assertionType !== P.assertionType) issues.push({ field: 'assertionType', code: 'WRONG_ASSERTION', message: 'Assertion type mismatch.' });
  const norm = normalizeReferralCode(a.assertedValue);
  if (!norm.ok) issues.push({ field: 'assertedValue', code: 'INVALID_VALUE', message: 'assertedValue is not a valid referral code.' });
  // Trusted actor for the declared role + role-appropriate source kind.
  if (a.confirmationRole === 'owner') {
    if (!P.trustedOwnerIdentities.includes(a.confirmedBy)) issues.push({ field: 'confirmedBy', code: 'UNTRUSTED_ACTOR', message: 'confirmedBy is not a trusted owner identity.' });
    if (!P.ownerSourceKinds.includes(a.sourceKind)) issues.push({ field: 'sourceKind', code: 'ROLE_SOURCE_MISMATCH', message: 'Owner confirmations must cite a GitHub source.' });
  } else if (a.confirmationRole === 'partner') {
    if (!P.trustedPartnerIdentities.includes(a.confirmedBy)) issues.push({ field: 'confirmedBy', code: 'UNTRUSTED_ACTOR', message: 'confirmedBy is not a trusted partner identity.' });
    if (!P.partnerSourceKinds.includes(a.sourceKind)) issues.push({ field: 'sourceKind', code: 'ROLE_SOURCE_MISMATCH', message: 'Partner confirmations must cite a partner receipt.' });
  }
  // Validity limit.
  const c = parseExactIsoDateTime(a.confirmedAt);
  const v = parseExactIsoDateTime(a.validUntil);
  if (c && v && (v.epochMs - c.epochMs) > P.maxValidityDays * 86400000) issues.push({ field: 'validUntil', code: 'VALIDITY_TOO_LONG', message: `Validity window exceeds ${P.maxValidityDays} days.` });
  // Trusted source + statement binding.
  for (const iss of trustedSourceIssues(a)) issues.push(iss);
  return issues;
}

/* ─────────────────────────── single authorizing evaluator ───────────────────── */

export interface ConfirmationSetEvaluation {
  state: ConfirmationSetState;
  /** The value proven confirmed / in conflict, when applicable. */
  value?: string | null;
  confirmationId?: string | null;
  issues?: ConfirmationValidationIssue[];
}

function parsedTime(s: string): number | null { const p = parseExactIsoDateTime(s); return p ? p.epochMs : null; }

/** True when a validated, policy-admissible artifact is a currently-active `confirmed`. */
function isActiveConfirmed(a: ClaimConfirmationArtifact, nowMs: number): boolean {
  if (a.status !== 'confirmed') return false;
  if (bybitPromoAdmissibilityIssues(a).length > 0) return false;
  const c = parsedTime(a.confirmedAt); const v = parsedTime(a.validUntil); const e = parsedTime(a.sourceEventAt);
  if (c === null || v === null || e === null) return false;
  if (c > nowMs) return false;         // future confirmation
  if (nowMs >= v) return false;         // expired
  return true;
}

/**
 * The ONE authorizing evaluator for the Bybit promo-code confirmation set. Takes an
 * explicit finite clock (no Date.now() fallback). Fails closed to a structured
 * state; there is no second, weaker decision path.
 */
export function evaluateBybitPromoCodeConfirmations(artifacts: unknown, nowMs: number): ConfirmationSetEvaluation {
  if (!Array.isArray(artifacts) || artifacts.length === 0) return { state: 'missing', value: null };
  if (!Number.isFinite(nowMs)) return { state: 'invalid', value: null, issues: [{ field: '$', code: 'CLOCK_INVALID', message: 'A finite evaluation clock is required.' }] };

  // Structural validation — any malformed artifact fails the whole set closed.
  const parsed: ClaimConfirmationArtifact[] = [];
  for (let i = 0; i < artifacts.length; i++) {
    const v = validateClaimConfirmation(artifacts[i]);
    if (!v.ok || !v.value) return { state: 'invalid', value: null, issues: v.issues.map((x) => ({ ...x, field: `[${i}].${x.field}` })) };
    parsed.push(v.value);
  }
  // Duplicate confirmation ids fail closed.
  const ids = new Set<string>();
  for (const a of parsed) { if (ids.has(a.confirmationId)) return { state: 'invalid', value: null, issues: [{ field: 'confirmationId', code: 'DUPLICATE', message: `Duplicate confirmationId: ${a.confirmationId}` }] }; ids.add(a.confirmationId); }
  // Replacement/revocation targets must exist; the replaces/revokes graph must be acyclic.
  for (const a of parsed) {
    for (const [field, target] of [['replacesConfirmationId', a.replacesConfirmationId], ['revokesConfirmationId', a.revokesConfirmationId]] as const) {
      if (target !== null && !ids.has(target)) return { state: 'invalid', value: null, issues: [{ field, code: 'UNKNOWN_TARGET', message: `Unknown ${field}: ${target}` }] };
    }
  }
  const edges = new Map<string, string[]>();
  for (const a of parsed) {
    const outs: string[] = [];
    if (a.replacesConfirmationId) outs.push(a.replacesConfirmationId);
    if (a.revokesConfirmationId) outs.push(a.revokesConfirmationId);
    edges.set(a.confirmationId, outs);
  }
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map<string, number>(parsed.map((a) => [a.confirmationId, WHITE]));
  const hasCycle = (n: string): boolean => {
    color.set(n, GREY);
    for (const m2 of edges.get(n) || []) {
      const cm = color.get(m2);
      if (cm === GREY) return true;
      if (cm === WHITE && hasCycle(m2)) return true;
    }
    color.set(n, BLACK);
    return false;
  };
  for (const a of parsed) { if (color.get(a.confirmationId) === WHITE && hasCycle(a.confirmationId)) return { state: 'invalid', value: null, issues: [{ field: 'replacesConfirmationId', code: 'CYCLE', message: 'Replacement/revocation graph must be acyclic.' }] }; }

  const P = BYBIT_PROMO_CODE_CONFIRMATION_POLICY;
  const candidate = P.candidateValue;
  // Scope to Bybit promo confirmations that pass policy binding (trust/source/statement).
  const scoped = parsed.filter((a) => a.exchangeId === P.exchangeId && a.claimId === P.claimId && a.assertionType === P.assertionType && bybitPromoAdmissibilityIssues(a).length === 0);

  const revokedIds = new Set<string>();
  for (const a of scoped) { if (a.revokesConfirmationId && isActiveConfirmed(a, nowMs)) revokedIds.add(a.revokesConfirmationId); }

  const activeConfirmed = scoped.filter((a) => isActiveConfirmed(a, nowMs) && a.status !== 'revoked' && !revokedIds.has(a.confirmationId));
  const activeValues = new Set(activeConfirmed.map((a) => a.assertedValue));
  if (activeValues.size >= 2) return { state: 'conflict', value: null, confirmationId: null };

  const partnerCand = activeConfirmed.find((a) => a.confirmationRole === 'partner' && a.assertedValue === candidate);
  const ownerCand = activeConfirmed.find((a) => a.confirmationRole === 'owner' && a.assertedValue === candidate);
  const otherValueActive = activeConfirmed.find((a) => a.assertedValue !== candidate);

  if (otherValueActive) return { state: 'conflict', value: otherValueActive.assertedValue, confirmationId: otherValueActive.confirmationId };
  if (partnerCand) return { state: 'confirmed', value: candidate, confirmationId: partnerCand.confirmationId };
  if (ownerCand) return { state: 'pending_partner_confirmation', value: candidate, confirmationId: ownerCand.confirmationId };

  // No active confirmation of the candidate — classify by nearest terminal signal.
  const forCandidate = scoped.filter((a) => a.assertedValue === candidate && bybitPromoAdmissibilityIssues(a).length === 0);
  const revoked = forCandidate.some((a) => a.status === 'revoked' || revokedIds.has(a.confirmationId));
  const expired = forCandidate.some((a) => a.status === 'confirmed' && (() => { const v = parsedTime(a.validUntil); return v !== null && nowMs >= v; })());
  if (expired) return { state: 'expired', value: candidate, confirmationId: null };
  if (revoked) return { state: 'revoked', value: candidate, confirmationId: null };
  return { state: 'missing', value: candidate, confirmationId: null };
}

/**
 * Does a single artifact support the exact target (exchange/claim/assertion/value)
 * as a currently-active trusted `confirmed`? Bound strictly — a confirmation for
 * another exchange, claim, assertion or value can never support the target.
 */
export function confirmationSupportsTarget(
  a: ClaimConfirmationArtifact,
  target: { exchangeId: string; claimId: string; assertionType: ConfirmationAssertionType; value: string },
  nowMs: number,
): boolean {
  if (validateClaimConfirmation(a).ok !== true) return false;
  if (a.exchangeId !== target.exchangeId || a.claimId !== target.claimId || a.assertionType !== target.assertionType || a.assertedValue !== target.value) return false;
  if (computeAssertedValueDigest(a) !== a.assertedValueDigest) return false;
  return isActiveConfirmed(a, nowMs);
}
