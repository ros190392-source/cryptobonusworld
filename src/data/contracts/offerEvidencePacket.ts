/**
 * OfferEvidencePacket — auditable capture of official offer sources (Issue #252,
 * hardened R1–R8).
 *
 * A URL + access time is not proof of the offer claims CBW displays, and — after
 * hardening — the PACKET is not trusted to declare its own authorization policy,
 * digest, source bindings or approval identity. Those are code-owned:
 *
 *   R1  the immutable BYBIT_OFFER_CLAIM_POLICY (not the packet) decides the claim
 *       inventory and which claims are required for authorization;
 *   R2  the unsupported-claims list is DERIVED from claim results, never declared;
 *   R3  captures are a structured manifest of recorded facts (no invented headers);
 *   R4  each claim binds to structured sourceRefs that must resolve to declared
 *       official captures / owner-confirmation artifacts (not arbitrary text);
 *   R5  the packet-level digest is RECOMPUTED from the canonical capture manifest
 *       and compared — a look-alike sha256 is not accepted;
 *   R6  approval is validated against a code-owned owner-identity policy with time
 *       and review-reference constraints (arbitrary approvedBy cannot authorize);
 *   R7  artifact-safety (no secrets / absolute paths / URL credentials) is applied
 *       recursively to every string in the packet;
 *   R8  the real-data decision routes through ONE shared evaluation — there is no
 *       second, weaker authorization algorithm.
 *
 * Fail-closed everywhere. Draft/validated/incomplete/inaccessible/contradicted/
 * non-official/stale/future/tampered/unapproved packets can never authorize.
 * Node crypto is used only for build/server-side integrity; this module is not
 * part of the client page bundle.
 */
import { createHash } from 'node:crypto';
import { parseExactIsoDateTime } from './evidenceMetadata';
import {
  type PublicRenderedCapture,
  validatePublicRenderedCapture,
  captureMaySupportClaims,
  fragmentSupportsClaim,
} from './publicRenderedCapture';
import {
  type OfficialSourceCapture,
  validateOfficialSourceCapture,
  sourceMaySupportClaims,
  officialFragmentAddressesClaim,
} from './officialSourceCapture';

/* ─────────────────────────── R1: code-owned claim policy ────────────────────── */

/** The complete canonical Bybit offer-claim inventory (code-owned, immutable). */
export const BYBIT_OFFER_CLAIM_INVENTORY = Object.freeze([
  'bybit.source_identity',
  'bybit.promo_code',
  'bybit.bonus_headline',
  'bybit.realistic_value',
  'bybit.fee_discount',
  'bybit.kyc_required',
  'bybit.deposit_required',
  'bybit.min_deposit',
  'bybit.availability',
  'bybit.restricted_countries',
  'bybit.reward_type',
  'bybit.expiry',
  'bybit.terms_summary',
] as const);

/** Claims REQUIRED for commercial authorization (code-owned, not packet-owned). */
export const BYBIT_OFFER_REQUIRED_CLAIMS = Object.freeze([
  'bybit.source_identity',
  'bybit.promo_code',
  'bybit.bonus_headline',
  'bybit.kyc_required',
  'bybit.deposit_required',
  'bybit.availability',
  'bybit.restricted_countries',
  'bybit.reward_type',
  'bybit.terms_summary',
] as const);

/** Optional claim-ID extensions beyond the canonical inventory (none for the pilot). */
export const BYBIT_OFFER_CLAIM_EXTENSIONS: readonly string[] = Object.freeze([]);

export const BYBIT_OFFER_CLAIM_POLICY = Object.freeze({
  exchangeId: 'bybit',
  inventory: BYBIT_OFFER_CLAIM_INVENTORY,
  required: BYBIT_OFFER_REQUIRED_CLAIMS,
  extensions: BYBIT_OFFER_CLAIM_EXTENSIONS,
});

/* ─────────────────────────── R6: code-owned approval policy ─────────────────── */

/** Permitted owner identities for a trusted approval (code-owned). */
export const ALLOWED_OWNER_IDENTITIES: readonly string[] = Object.freeze(['ros190392-source']);
/** Accepted GitHub owner-review reference format for approvalRef. */
const APPROVAL_REF = /^https:\/\/github\.com\/ros190392-source\/cryptobonusworld\/(pull|issues)\/\d+(#[A-Za-z0-9_-]+)?$/;

/* ─────────────────────────────────── types ─────────────────────────────────── */

export type OfferClaimResult =
  | 'supported'
  | 'partially_supported'
  | 'not_found'
  | 'contradicted'
  | 'inaccessible'
  | 'requires_owner_partner_confirmation';

export type PacketApproval = 'draft' | 'validated' | 'approved' | 'rejected' | 'stale';

export interface OfferCapture {
  captureId: string;
  sourceUrl: string;
  capturedAt: string;
  observedStatus: number;
  redirectLocation: string | null;
  responseBytes: number;
  bodyDigest: string;
  contentType: string | null;
  normalizedObservation: string;
}

export interface OfferClaimVerification {
  claimId: string;
  label: string;
  result: OfferClaimResult;
  observed: string;
  /**
   * Structured references: `capture:<id>`, `rendered:<id>`,
   * `rendered-fragment:<cap>/<frag>`, `editorial:<id>`. The legacy
   * `owner-confirmation:` grammar is retired (Issue #258): generic owner strings
   * can no longer support a claim, and `bybit.promo_code` authority now comes ONLY
   * from the trusted ClaimConfirmation evaluator via the resolution bridge.
   */
  sourceRefs: string[];
  limitation: string;
}

export interface PacketApprover {
  approvedBy: string;
  approvedAt: string;
  approvalRef: string;
  note?: string;
}

export interface OfferEvidencePacket {
  packetId: string;
  exchangeId: string;
  capturedAt: string;
  nextReviewAt: string;
  /** Primary source URL; must equal the primary capture's sourceUrl. */
  sourceUrl: string;
  /** Capture whose sourceUrl is the packet's primary source. */
  primaryCaptureId: string;
  /** Recomputable sha256 over the canonical capture manifest (R5). */
  captureManifestDigest: string;
  captureMethod: string;
  captureTool: string;
  captures: OfferCapture[];
  /**
   * Structured public rendered-capture records (Issue #254). Additive: the HTTP
   * `captures[]` manifest and its digest are unchanged; rendered captures carry
   * their own recomputable integrity and may back a claim only via a FRAGMENT-LEVEL
   * reference (`rendered-fragment:<cap>/<frag>`) on an official + `rendered` capture
   * whose fragment binds the exact claim. A bare `rendered:<cap>` reference is
   * audit/context only and never supplies support (R4).
   */
  renderedCaptures?: PublicRenderedCapture[];
  /**
   * Structured official-source capture records (Issue #260). Additive: bounded anonymous
   * captures of official Bybit sources classified by SCOPE + CURRENCY. A claim may cite
   * one for support only via a FRAGMENT-LEVEL reference (`source-fragment:<src>/<frag>`)
   * on an official `content` capture whose fragment binds the exact claim; a bare
   * `source:<src>` reference is audit/context only and never supplies support. Scope
   * sufficiency itself is decided by the code-owned source plan, not the packet.
   */
  officialSourceCaptures?: OfficialSourceCapture[];
  claims: OfferClaimVerification[];
  warnings: string[];
  limitations: string[];
  approval: PacketApproval;
  approver?: PacketApprover;
}

export interface PacketValidationIssue { field: string; code: string; message: string; }
export interface PacketValidationResult { ok: boolean; value?: OfferEvidencePacket; issues: PacketValidationIssue[]; }

const CANONICAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const CLAIM_RESULTS: OfferClaimResult[] = ['supported', 'partially_supported', 'not_found', 'contradicted', 'inaccessible', 'requires_owner_partner_confirmation'];
const APPROVALS: PacketApproval[] = ['draft', 'validated', 'approved', 'rejected', 'stale'];
const SOURCE_REF = /^(?:(?:capture|rendered|editorial|source):[a-z0-9][a-z0-9._-]*|(?:rendered-fragment|source-fragment):[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*)$/;

/* ─────────────────────────── R7: recursive artifact safety ──────────────────── */

const FORBIDDEN_CONTENT = [
  /[a-zA-Z]:\\/,                                        // Windows absolute path
  /(^|[\s"'(])\/(?:Users|home|root|var|etc|tmp|mnt|Library)\//, // Unix absolute path
  /\bcookie\s*[:=]/i,
  /\b(set-cookie|bearer)\b/i,
  /\bauthorization\s*[:=]/i,
  /\b(password|passwd|secret|api[_-]?key|access[_-]?token|session[_-]?token)\s*[:=]/i,
  /\btoken\s*=/i,
  /[?&](token|access_token|auth|sessionid|sid|cookie)=/i,
  /\.mozilla\/|\/Chrome\/User Data|AppData\\/i,        // local browser profile paths
];

function scanUnsafe(value: string): boolean {
  return FORBIDDEN_CONTENT.some((re) => re.test(value));
}

/** URL string carrying username/password credentials (userinfo) is forbidden. */
function urlHasCredentials(value: string): boolean {
  try {
    const u = new URL(value);
    return u.username !== '' || u.password !== '';
  } catch { return false; }
}

/** Recursively collect unsafe findings from every string in a value. */
function scanUnsafeDeep(value: unknown, path: string, issues: PacketValidationIssue[]): void {
  if (typeof value === 'string') {
    if (scanUnsafe(value)) issues.push({ field: path, code: 'UNSAFE_CONTENT', message: 'Secret / cookie / token / absolute path detected in a public record.' });
    if (/^https?:\/\//i.test(value) && urlHasCredentials(value)) issues.push({ field: path, code: 'URL_CREDENTIALS', message: 'URL must not contain username/password credentials.' });
    return;
  }
  if (Array.isArray(value)) { value.forEach((v, i) => scanUnsafeDeep(v, `${path}.${i}`, issues)); return; }
  if (value && typeof value === 'object') { for (const [k, v] of Object.entries(value)) scanUnsafeDeep(v, `${path}.${k}`, issues); }
}

/* ─────────────────────────── helpers ─────────────────────────── */

function hasText(v: unknown): v is string { return typeof v === 'string' && v.trim().length > 0; }

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value !== value.trim() || !/^https:\/\/[^\s]+$/i.test(value)) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function isOfficialBybitSource(url: unknown): boolean {
  if (!isHttpsUrl(url)) return false;
  try {
    const u = new URL(url);
    if (u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    return host === 'bybit.com' || host === 'www.bybit.com' || host.endsWith('.bybit.com');
  } catch { return false; }
}

/* ─────────────────────────── R5: recomputable manifest digest ───────────────── */

const CAPTURE_KEYS: (keyof OfferCapture)[] = ['captureId', 'sourceUrl', 'capturedAt', 'observedStatus', 'redirectLocation', 'responseBytes', 'bodyDigest', 'contentType', 'normalizedObservation'];

/** Deterministic, order-independent canonical serialization of the capture manifest. */
export function canonicalCaptureManifest(captures: OfferCapture[]): string {
  const sorted = [...captures].sort((a, b) => (a.captureId < b.captureId ? -1 : a.captureId > b.captureId ? 1 : 0));
  return JSON.stringify(sorted.map((c) => {
    const o: Record<string, unknown> = {};
    for (const k of CAPTURE_KEYS) o[k] = c[k];
    return o;
  }));
}

/** Recompute the packet-level digest over the (digest-excluded) capture manifest. */
export function computeCaptureManifestDigest(captures: OfferCapture[]): string {
  return 'sha256:' + createHash('sha256').update(canonicalCaptureManifest(captures), 'utf8').digest('hex');
}

/* ─────────────────────────── per-capture validation ─────────────────────────── */

function validateCapture(c: unknown, index: number, issues: PacketValidationIssue[]): void {
  const path = `captures.${index}`;
  if (typeof c !== 'object' || c === null) { issues.push({ field: path, code: 'NOT_OBJECT', message: 'Capture must be an object.' }); return; }
  const r = c as Record<string, unknown>;
  if (!hasText(r.captureId) || !CANONICAL_SLUG.test(r.captureId as string)) issues.push({ field: `${path}.captureId`, code: 'INVALID_ID', message: 'captureId must be a canonical slug.' });
  if (!isOfficialBybitSource(r.sourceUrl)) issues.push({ field: `${path}.sourceUrl`, code: 'NON_OFFICIAL', message: 'Capture sourceUrl must be an official HTTPS Bybit URL without credentials.' });
  if (!parseExactIsoDateTime(r.capturedAt)) issues.push({ field: `${path}.capturedAt`, code: 'INEXACT_TIMESTAMP', message: 'capturedAt must be an exact ISO datetime.' });
  if (!(typeof r.observedStatus === 'number' && Number.isInteger(r.observedStatus) && r.observedStatus >= 100 && r.observedStatus <= 599)) issues.push({ field: `${path}.observedStatus`, code: 'INVALID_STATUS', message: 'observedStatus must be an integer HTTP status 100–599.' });
  if (!(r.redirectLocation === null || hasText(r.redirectLocation))) issues.push({ field: `${path}.redirectLocation`, code: 'INVALID', message: 'redirectLocation must be a non-empty string or null.' });
  if (!(typeof r.responseBytes === 'number' && Number.isInteger(r.responseBytes) && r.responseBytes >= 0)) issues.push({ field: `${path}.responseBytes`, code: 'INVALID_BYTES', message: 'responseBytes must be a non-negative integer.' });
  if (!hasText(r.bodyDigest) || !SHA256.test(r.bodyDigest as string)) issues.push({ field: `${path}.bodyDigest`, code: 'INVALID_DIGEST', message: 'bodyDigest must be a sha256 digest.' });
  if (!(r.contentType === null || hasText(r.contentType))) issues.push({ field: `${path}.contentType`, code: 'INVALID', message: 'contentType must be a non-empty string or null.' });
  if (!hasText(r.normalizedObservation)) issues.push({ field: `${path}.normalizedObservation`, code: 'REQUIRED', message: 'normalizedObservation required.' });
}

/* ─────────────────────────── packet validation ─────────────────────────── */

export function validateOfferEvidencePacket(input: unknown): PacketValidationResult {
  const issues: PacketValidationIssue[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: [{ field: '$', code: 'NOT_OBJECT', message: 'Packet must be an object.' }] };
  }
  const rec = input as Record<string, unknown>;

  if (!hasText(rec.packetId) || !CANONICAL_SLUG.test(rec.packetId as string)) issues.push({ field: 'packetId', code: 'INVALID_ID', message: 'packetId must be a canonical slug.' });
  if (rec.exchangeId !== BYBIT_OFFER_CLAIM_POLICY.exchangeId) issues.push({ field: 'exchangeId', code: 'EXCHANGE_NOT_BYBIT', message: 'exchangeId must be exactly bybit.' });

  const capAt = parseExactIsoDateTime(rec.capturedAt);
  const revAt = parseExactIsoDateTime(rec.nextReviewAt);
  if (!capAt) issues.push({ field: 'capturedAt', code: 'INEXACT_TIMESTAMP', message: 'capturedAt must be an exact ISO datetime.' });
  if (!revAt) issues.push({ field: 'nextReviewAt', code: 'INEXACT_TIMESTAMP', message: 'nextReviewAt must be an exact ISO datetime.' });
  if (capAt && revAt && revAt.epochMs <= capAt.epochMs) issues.push({ field: 'nextReviewAt', code: 'INVALID_REVIEW_WINDOW', message: 'nextReviewAt must be strictly after capturedAt.' });

  if (!hasText(rec.captureMethod)) issues.push({ field: 'captureMethod', code: 'REQUIRED', message: 'captureMethod required.' });
  if (!hasText(rec.captureTool)) issues.push({ field: 'captureTool', code: 'REQUIRED', message: 'captureTool required.' });

  // Captures manifest (R3).
  const captures = rec.captures;
  const captureIds = new Set<string>();
  if (!Array.isArray(captures) || captures.length === 0) {
    issues.push({ field: 'captures', code: 'NO_CAPTURES', message: 'At least one capture is required.' });
  } else {
    captures.forEach((c, i) => validateCapture(c, i, issues));
    for (const c of captures) { const id = (c as Record<string, unknown>)?.captureId; if (typeof id === 'string') { if (captureIds.has(id)) issues.push({ field: 'captures', code: 'DUPLICATE_CAPTURE', message: 'captureId must be unique.' }); captureIds.add(id); } }
  }

  // Primary capture + top-level sourceUrl consistency.
  if (!hasText(rec.primaryCaptureId) || !captureIds.has(rec.primaryCaptureId as string)) {
    issues.push({ field: 'primaryCaptureId', code: 'UNKNOWN_CAPTURE', message: 'primaryCaptureId must reference a declared capture.' });
  } else if (Array.isArray(captures)) {
    const primary = (captures as OfferCapture[]).find((c) => c.captureId === rec.primaryCaptureId);
    if (!primary || primary.sourceUrl !== rec.sourceUrl) issues.push({ field: 'sourceUrl', code: 'PRIMARY_MISMATCH', message: 'sourceUrl must equal the primary capture sourceUrl.' });
  }
  if (!isOfficialBybitSource(rec.sourceUrl)) issues.push({ field: 'sourceUrl', code: 'NON_OFFICIAL', message: 'sourceUrl must be an official HTTPS Bybit URL.' });

  // R5: capture-manifest digest must recompute exactly.
  if (!hasText(rec.captureManifestDigest) || !SHA256.test(rec.captureManifestDigest as string)) {
    issues.push({ field: 'captureManifestDigest', code: 'INVALID_DIGEST', message: 'captureManifestDigest must be a sha256 digest.' });
  } else if (Array.isArray(captures) && captureIds.size === captures.length) {
    // Only recompute when captures are structurally sane enough to serialize.
    const structurallyOk = captures.every((c) => {
      const r = c as Record<string, unknown>;
      return hasText(r.captureId) && typeof r.sourceUrl === 'string' && typeof r.capturedAt === 'string'
        && typeof r.observedStatus === 'number' && (r.redirectLocation === null || typeof r.redirectLocation === 'string')
        && typeof r.responseBytes === 'number' && typeof r.bodyDigest === 'string'
        && (r.contentType === null || typeof r.contentType === 'string') && typeof r.normalizedObservation === 'string';
    });
    if (structurallyOk) {
      const recomputed = computeCaptureManifestDigest(captures as OfferCapture[]);
      if (recomputed !== rec.captureManifestDigest) issues.push({ field: 'captureManifestDigest', code: 'DIGEST_MISMATCH', message: 'captureManifestDigest does not match the recomputed manifest (tampered).' });
    }
  }

  // Legacy generic owner-confirmation path is RETIRED (Issue #258). Declaring it is
  // a hard error — a generic owner string can no longer support any claim; promo
  // authority comes only from the trusted ClaimConfirmation evaluator (bridge).
  if ('ownerConfirmations' in rec) issues.push({ field: 'ownerConfirmations', code: 'LEGACY_FIELD_FORBIDDEN', message: 'ownerConfirmations is retired; remove it. Use the ClaimConfirmation evaluator bridge.' });

  // Public rendered captures (#254): additive, each with its own integrity. A
  // rendered capture may back a supported claim only when it is official + its
  // outcome is claim-permitting (`rendered`).
  const renderedIds = new Set<string>();
  const renderedSupportIds = new Set<string>();
  const renderedById = new Map<string, PublicRenderedCapture>();
  if (rec.renderedCaptures !== undefined) {
    if (!Array.isArray(rec.renderedCaptures)) issues.push({ field: 'renderedCaptures', code: 'INVALID_ARRAY', message: 'renderedCaptures must be an array.' });
    else rec.renderedCaptures.forEach((c, i) => {
      const v = validatePublicRenderedCapture(c, BYBIT_OFFER_CLAIM_INVENTORY);
      if (!v.ok) v.issues.forEach((iss) => issues.push({ field: `renderedCaptures.${i}.${iss.field}`, code: iss.code, message: iss.message }));
      const id = (c as Record<string, unknown>)?.captureId;
      if (typeof id === 'string') {
        if (renderedIds.has(id)) issues.push({ field: 'renderedCaptures', code: 'DUPLICATE_CAPTURE', message: 'rendered captureId must be unique.' });
        renderedIds.add(id);
        if (v.ok && v.value) {
          renderedById.set(id, v.value);
          if (captureMaySupportClaims(v.value)) renderedSupportIds.add(id);
        }
      }
    });
  }
  // Resolve a `rendered-fragment:<capId>/<fragId>` ref to its validated fragment.
  const resolveRenderedFragment = (ref: string): { capId: string; fragId: string; capture?: PublicRenderedCapture; fragmentExists: boolean } => {
    const body = ref.slice('rendered-fragment:'.length);
    const slash = body.indexOf('/');
    const capId = body.slice(0, slash);
    const fragId = body.slice(slash + 1);
    const capture = renderedById.get(capId);
    const fragmentExists = !!capture && capture.fragments.some((f) => f.fragmentId === fragId);
    return { capId, fragId, capture, fragmentExists };
  };

  // Official-source captures (#260): additive, each with its own integrity. A source
  // may back a supported claim only when it is official + its outcome permits content
  // (`content`) and the cited fragment binds the exact claim.
  const officialIds = new Set<string>();
  const officialSupportIds = new Set<string>();
  const officialById = new Map<string, OfficialSourceCapture>();
  if (rec.officialSourceCaptures !== undefined) {
    if (!Array.isArray(rec.officialSourceCaptures)) issues.push({ field: 'officialSourceCaptures', code: 'INVALID_ARRAY', message: 'officialSourceCaptures must be an array.' });
    else rec.officialSourceCaptures.forEach((c, i) => {
      const v = validateOfficialSourceCapture(c, BYBIT_OFFER_CLAIM_INVENTORY);
      if (!v.ok) v.issues.forEach((iss) => issues.push({ field: `officialSourceCaptures.${i}.${iss.field}`, code: iss.code, message: iss.message }));
      const id = (c as Record<string, unknown>)?.sourceId;
      if (typeof id === 'string') {
        if (officialIds.has(id)) issues.push({ field: 'officialSourceCaptures', code: 'DUPLICATE_SOURCE', message: 'official sourceId must be unique.' });
        officialIds.add(id);
        if (v.ok && v.value) {
          officialById.set(id, v.value);
          if (sourceMaySupportClaims(v.value)) officialSupportIds.add(id);
        }
      }
    });
  }
  const resolveOfficialFragment = (ref: string): { srcId: string; fragId: string; capture?: OfficialSourceCapture; fragmentExists: boolean } => {
    const body = ref.slice('source-fragment:'.length);
    const slash = body.indexOf('/');
    const srcId = body.slice(0, slash);
    const fragId = body.slice(slash + 1);
    const capture = officialById.get(srcId);
    const fragmentExists = !!capture && capture.fragments.some((f) => f.fragmentId === fragId);
    return { srcId, fragId, capture, fragmentExists };
  };

  // Claims: inventory must EXACTLY match the code-owned policy (R1) + sourceRef binding (R4).
  if (!Array.isArray(rec.claims) || rec.claims.length === 0) {
    issues.push({ field: 'claims', code: 'NO_CLAIMS', message: 'Claims are required.' });
  } else {
    const seen = new Set<string>();
    const allowedIds = new Set<string>([...BYBIT_OFFER_CLAIM_INVENTORY, ...BYBIT_OFFER_CLAIM_EXTENSIONS]);
    rec.claims.forEach((c, i) => {
      const path = `claims.${i}`;
      if (typeof c !== 'object' || c === null) { issues.push({ field: path, code: 'NOT_OBJECT', message: 'Claim must be an object.' }); return; }
      const r = c as Record<string, unknown>;
      if (!hasText(r.claimId)) { issues.push({ field: `${path}.claimId`, code: 'REQUIRED', message: 'claimId required.' }); return; }
      if (!allowedIds.has(r.claimId as string)) issues.push({ field: `${path}.claimId`, code: 'PACKET_CLAIM_INVENTORY_INVALID', message: 'Unknown claim id (not in code-owned policy or extensions).' });
      if (seen.has(r.claimId as string)) issues.push({ field: `${path}.claimId`, code: 'PACKET_CLAIM_INVENTORY_INVALID', message: 'Duplicate claim id.' });
      seen.add(r.claimId as string);
      if (!hasText(r.label)) issues.push({ field: `${path}.label`, code: 'REQUIRED', message: 'label required.' });
      if (!CLAIM_RESULTS.includes(r.result as OfferClaimResult)) issues.push({ field: `${path}.result`, code: 'INVALID_RESULT', message: 'Unknown claim result.' });
      // Issue #258: the RAW packet may never hand-set bybit.promo_code to supported.
      // Promo authority is derived only by the confirmation-evaluator bridge into the
      // separate resolved view; the committed record stays a raw observation.
      if (r.claimId === 'bybit.promo_code' && r.result === 'supported') issues.push({ field: `${path}.result`, code: 'PROMO_RAW_SUPPORT_FORBIDDEN', message: 'bybit.promo_code cannot be supported in the raw packet; support comes only from the confirmation bridge.' });
      if (typeof r.observed !== 'string') issues.push({ field: `${path}.observed`, code: 'REQUIRED', message: 'observed required.' });
      if (typeof r.limitation !== 'string') issues.push({ field: `${path}.limitation`, code: 'REQUIRED', message: 'limitation required.' });
      // Reject a packet trying to declare its own requirement.
      if ('requiredForAuthorization' in r) issues.push({ field: `${path}.requiredForAuthorization`, code: 'PACKET_CANNOT_DECLARE_REQUIREMENT', message: 'Requirement is code-owned; remove requiredForAuthorization from the packet.' });
      // sourceRefs binding.
      if (!Array.isArray(r.sourceRefs) || r.sourceRefs.length === 0 || !r.sourceRefs.every((s) => typeof s === 'string' && SOURCE_REF.test(s))) {
        issues.push({ field: `${path}.sourceRefs`, code: 'INVALID_SOURCE_REFS', message: 'sourceRefs must be non-empty structured references (capture:/rendered:/rendered-fragment:/editorial:).' });
      } else {
        for (const ref of r.sourceRefs as string[]) {
          if (ref.startsWith('rendered-fragment:')) {
            const { capId, fragmentExists } = resolveRenderedFragment(ref);
            if (!renderedIds.has(capId)) issues.push({ field: `${path}.sourceRefs`, code: 'UNKNOWN_RENDERED_REF', message: `Unknown rendered-capture reference: ${ref}` });
            else if (!fragmentExists) issues.push({ field: `${path}.sourceRefs`, code: 'UNKNOWN_RENDERED_FRAGMENT_REF', message: `Unknown rendered fragment reference: ${ref}` });
            continue;
          }
          if (ref.startsWith('source-fragment:')) {
            const { srcId, fragmentExists } = resolveOfficialFragment(ref);
            if (!officialIds.has(srcId)) issues.push({ field: `${path}.sourceRefs`, code: 'UNKNOWN_SOURCE_REF', message: `Unknown official-source reference: ${ref}` });
            else if (!fragmentExists) issues.push({ field: `${path}.sourceRefs`, code: 'UNKNOWN_SOURCE_FRAGMENT_REF', message: `Unknown official-source fragment reference: ${ref}` });
            continue;
          }
          const [kind, id] = ref.split(':');
          if (kind === 'capture' && !captureIds.has(id)) issues.push({ field: `${path}.sourceRefs`, code: 'UNKNOWN_CAPTURE_REF', message: `Unknown capture reference: ${ref}` });
          if (kind === 'rendered' && !renderedIds.has(id)) issues.push({ field: `${path}.sourceRefs`, code: 'UNKNOWN_RENDERED_REF', message: `Unknown rendered-capture reference: ${ref}` });
          if (kind === 'source' && !officialIds.has(id)) issues.push({ field: `${path}.sourceRefs`, code: 'UNKNOWN_SOURCE_REF', message: `Unknown official-source reference: ${ref}` });
        }
        // A REQUIRED SUPPORTED claim must cite an admissible source: a declared HTTP
        // capture or a FRAGMENT-LEVEL rendered reference (`rendered-fragment:<cap>/
        // <frag>`) on a claim-permitting capture whose fragment binds this exact
        // claim. A bare `rendered:<cap>` reference is audit/context only and can NEVER
        // supply support. Editorial and walled/errored rendered captures are never
        // admissible for support. (Promo authority never flows through the packet.)
        const isRequired = (BYBIT_OFFER_REQUIRED_CLAIMS as readonly string[]).includes(r.claimId as string);
        if (isRequired && r.result === 'supported') {
          const admissible = (r.sourceRefs as string[]).some((ref) => {
            if (ref.startsWith('capture:')) return true;
            if (ref.startsWith('rendered-fragment:')) {
              const { capId, fragId, capture } = resolveRenderedFragment(ref);
              return renderedSupportIds.has(capId) && !!capture && fragmentSupportsClaim(capture, fragId, r.claimId as string);
            }
            if (ref.startsWith('source-fragment:')) {
              const { srcId, fragId, capture } = resolveOfficialFragment(ref);
              return officialSupportIds.has(srcId) && !!capture && officialFragmentAddressesClaim(capture, fragId, r.claimId as string, 'supports');
            }
            return false;
          });
          if (!admissible) issues.push({ field: `${path}.sourceRefs`, code: 'INADMISSIBLE_SUPPORT', message: 'A required supported claim must cite a declared capture, owner-confirmation, or a claim-bound rendered-fragment reference.' });
        }
      }
    });
    // Inventory completeness: every canonical claim present exactly once.
    for (const id of BYBIT_OFFER_CLAIM_INVENTORY) {
      if (!seen.has(id)) issues.push({ field: 'claims', code: 'PACKET_CLAIM_INVENTORY_INVALID', message: `Missing canonical claim: ${id}` });
    }
  }

  // unsupportedClaims must NOT be declared (R2: it is derived).
  if ('unsupportedClaims' in rec) issues.push({ field: 'unsupportedClaims', code: 'DERIVED_FIELD', message: 'unsupportedClaims is derived and must not be declared in the packet.' });

  if (!Array.isArray(rec.warnings) || !rec.warnings.every((w) => typeof w === 'string')) issues.push({ field: 'warnings', code: 'INVALID_ARRAY', message: 'warnings must be a string array.' });
  if (!Array.isArray(rec.limitations) || !rec.limitations.every((l) => typeof l === 'string')) issues.push({ field: 'limitations', code: 'INVALID_ARRAY', message: 'limitations must be a string array.' });
  if (!APPROVALS.includes(rec.approval as PacketApproval)) issues.push({ field: 'approval', code: 'INVALID_APPROVAL', message: 'Unknown approval state.' });

  // R6: trusted approval metadata (static checks; time-vs-now enforced by adapter).
  if (rec.approval === 'approved') {
    const ap = rec.approver as Record<string, unknown> | undefined;
    if (!ap || typeof ap !== 'object') {
      issues.push({ field: 'approver', code: 'APPROVAL_REQUIRED', message: 'Approved packet requires approver metadata.' });
    } else {
      if (!(hasText(ap.approvedBy) && ALLOWED_OWNER_IDENTITIES.includes(ap.approvedBy as string))) issues.push({ field: 'approver.approvedBy', code: 'UNKNOWN_OWNER', message: 'approvedBy must be an allowed owner identity.' });
      const apAt = parseExactIsoDateTime(ap.approvedAt);
      if (!apAt) issues.push({ field: 'approver.approvedAt', code: 'INEXACT_TIMESTAMP', message: 'approvedAt must be an exact ISO datetime.' });
      if (apAt && capAt && apAt.epochMs < capAt.epochMs) issues.push({ field: 'approver.approvedAt', code: 'APPROVAL_BEFORE_CAPTURE', message: 'approvedAt must be at/after capturedAt.' });
      if (apAt && revAt && apAt.epochMs >= revAt.epochMs) issues.push({ field: 'approver.approvedAt', code: 'APPROVAL_AFTER_REVIEW', message: 'approvedAt must be before nextReviewAt.' });
      if (!APPROVAL_REF.test(String(ap.approvalRef))) issues.push({ field: 'approver.approvalRef', code: 'INVALID_APPROVAL_REF', message: 'approvalRef must be a GitHub owner-review reference.' });
    }
  } else if (rec.approver !== undefined) {
    issues.push({ field: 'approver', code: 'UNEXPECTED_APPROVER', message: 'approver metadata is only allowed on an approved packet.' });
  }

  // R7: recursive artifact-safety over EVERY string in the packet.
  scanUnsafeDeep(rec, '$', issues);

  if (issues.length) return { ok: false, issues };
  return { ok: true, value: input as OfferEvidencePacket, issues };
}

/** Derived unsupported-claims list (R2): sorted claim IDs whose result ≠ supported. */
export function deriveUnsupportedClaims(packet: OfferEvidencePacket): string[] {
  return packet.claims.filter((c) => c.result !== 'supported').map((c) => c.claimId).sort();
}

/* ─────────────────────────── adapter fail reasons ─────────────────── */

/**
 * Fail reasons shared with the resolution bridge. Issue #258: this contract no
 * longer exposes ANY EvidenceMetadata-producing adapter — packet readiness, metadata
 * construction and the authorizing adapter live privately in `offerPacketResolution`,
 * behind the single public product entry point `adaptBybitOfferToEvidence`.
 */
export type PacketAdaptFailReason =
  | 'PACKET_INVALID'
  | 'EXCHANGE_NOT_BYBIT'
  | 'SOURCE_NOT_OFFICIAL'
  | 'CAPTURE_NOT_FRESH'
  | 'REVIEW_OVERDUE'
  | 'REQUIRED_CLAIM_UNSUPPORTED'
  | 'UNRESOLVED_CONTRADICTION'
  | 'NOT_APPROVED'
  | 'APPROVAL_UNTRUSTED'
  | 'CLOCK_INVALID';
