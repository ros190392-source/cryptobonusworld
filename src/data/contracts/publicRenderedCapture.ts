/**
 * PublicRenderedCapture — fail-closed contract for a public, anonymous, ephemeral
 * rendered capture of an official offer page (Issue #254, hardened R1–R9).
 *
 * The runner may observe only what an unauthenticated public browser sees. This
 * contract is the deterministic, OFFLINE validator/replay of a committed capture
 * artifact: CI never launches a browser or touches the network — it validates the
 * committed normalized artifact and recomputes its digests.
 *
 * Hardening in this revision:
 *   R1  an explicit non-claim-permitting `external_redirect` outcome — the runner
 *       blocks external main-document navigation before extracting anything, and a
 *       capture that left the official host can never masquerade as a Bybit final URL;
 *   R2  `finalUrl` is nullable — a terminal state (network_error / timeout /
 *       external_redirect) must not claim the requested URL as its final URL;
 *   R3  a centralized OUTCOME MATRIX rejects internally inconsistent artifacts
 *       (e.g. rendered+status=null, rendered+fragments=[], network_error+fragments);
 *   R6  the artifact digest covers EVERY committed provenance/safety field (only the
 *       digest itself is excluded), with deterministic ordering;
 *   R7  every public string and collection is bounded and raw-payload-scanned, and
 *       structuredMetadata.canonicalUrl must itself be an official Bybit URL;
 *   R8  a runtime safety receipt records safe aggregate assertions (never cookie
 *       names/values) and is bound into the digest.
 *
 * Everything is bounded and copyright-safe: only concise claim-oriented fragments
 * and allowlisted scalar metadata are stored — never full HTML, page text, HAR,
 * cookies, tokens, secrets, personal data or absolute paths. A page merely
 * loading supports no offer claim; only an admissible fragment on an official,
 * `rendered` capture can (fragment-level binding enforced at the packet layer).
 */
import { createHash } from 'node:crypto';
import { parseExactIsoDateTime } from './evidenceMetadata';

/** Allowed, deterministic render outcomes. Any other value is rejected. */
export type RenderOutcome =
  | 'rendered'
  | 'redirect_only'
  | 'login_wall'
  | 'captcha_or_bot_wall'
  | 'geo_restricted'
  | 'empty'
  | 'timeout'
  | 'network_error'
  | 'external_redirect'
  | 'unsupported';

export const RENDER_OUTCOMES: readonly RenderOutcome[] = Object.freeze([
  'rendered', 'redirect_only', 'login_wall', 'captcha_or_bot_wall', 'geo_restricted', 'empty', 'timeout', 'network_error', 'external_redirect', 'unsupported',
]);

/** Only outcomes under which a claim may be supported at all. */
export const CLAIM_PERMITTING_OUTCOMES: readonly RenderOutcome[] = Object.freeze(['rendered']);

/** Content types an authentic `rendered` document may carry. */
export const RENDERED_CONTENT_TYPES: readonly string[] = Object.freeze(['text/html', 'application/xhtml+xml']);

export type FragmentExtractionType = 'visible_text' | 'meta' | 'json_ld' | 'accessible_name';
const EXTRACTION_TYPES: readonly FragmentExtractionType[] = Object.freeze(['visible_text', 'meta', 'json_ld', 'accessible_name']);

/** Ephemeral-context assertions — every flag MUST be literally false. */
export interface EphemeralContextAssertions {
  persistentProfileUsed: false;
  importedStorageState: false;
  proxyUsed: false;
  authenticationUsed: false;
  formSubmissionPerformed: false;
  downloadPerformed: false;
}

/**
 * R8 — safe aggregate runtime receipt. Records counts and booleans only; never a
 * cookie name/value, storage entry or URL with credentials. Site-created ephemeral
 * cookies may exist in memory during the run but are destroyed with the context and
 * are NEVER imported or committed (`artifactContainsCookieValues` must be false).
 */
export interface RuntimeSafetyReceipt {
  persistentContextUsed: false;
  storageStateImported: false;
  proxyConfigured: false;
  httpCredentialsConfigured: false;
  initialCookieCount: 0;
  initialLocalStorageEntryCount: 0;
  initialSessionStorageEntryCount: 0;
  formSubmissionsObserved: 0;
  downloadsObserved: number;
  fileChoosersObserved: number;
  externalMainFrameNavigationsBlocked: number;
  artifactContainsCookieValues: false;
}

export interface CaptureFragment {
  fragmentId: string;
  captureId: string;
  extractionType: FragmentExtractionType;
  /** CSS selector or semantic locator the fragment came from. */
  locator: string;
  /** Concise NORMALIZED text (bounded; never a full page). */
  text: string;
  textLength: number;
  fragmentDigest: string;
  /** Claim IDs this fragment MAY support (does not by itself make them supported). */
  claimIds: string[];
  limitations: string;
}

export interface StructuredMetadata {
  pageTitle?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  jsonLdType?: string | null;
}

export interface PublicRenderedCapture {
  captureId: string;
  exchangeId: string;
  requestedUrl: string;
  /** Null when no official final document was resolved (terminal/external states). */
  finalUrl: string | null;
  redirectChain: string[];
  capturedAt: string;
  browserName: string;
  browserVersion: string;
  runtimeVersion: string;
  ephemeralContext: EphemeralContextAssertions;
  runtimeReceipt: RuntimeSafetyReceipt;
  viewport: { width: number; height: number };
  locale: string;
  mainDocumentStatus: number | null;
  contentType: string | null;
  pageTitle: string | null;
  outcome: RenderOutcome;
  fragments: CaptureFragment[];
  structuredMetadata: StructuredMetadata;
  warnings: string[];
  limitations: string[];
  normalizedArtifactDigest: string;
}

export interface CaptureValidationIssue { field: string; code: string; message: string; }
export interface CaptureValidationResult { ok: boolean; value?: PublicRenderedCapture; issues: CaptureValidationIssue[]; }

/* ── bounds (R7) ── */
export const MAX_FRAGMENT_TEXT_LENGTH = 300;
export const MAX_FRAGMENTS = 40;
export const MAX_REDIRECTS = 10;
export const MAX_METADATA_FIELD_LENGTH = 400;
export const MAX_VERSION_LENGTH = 40;
export const MAX_LOCALE_LENGTH = 35;
export const MAX_PAGE_TITLE_LENGTH = 300;
export const MAX_WARNINGS = 20;
export const MAX_WARNING_LENGTH = 300;
export const MAX_LIMITATIONS = 20;
export const MAX_LIMITATION_LENGTH = 300;
export const MAX_LOCATOR_LENGTH = 200;
export const MAX_FRAGMENT_LIMITATION_LENGTH = 300;
export const MAX_CLAIM_IDS = 13;

const CANONICAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const ALLOWED_METADATA_KEYS = ['pageTitle', 'description', 'canonicalUrl', 'ogTitle', 'ogDescription', 'jsonLdType'];
const EC_KEYS: (keyof EphemeralContextAssertions)[] = ['persistentProfileUsed', 'importedStorageState', 'proxyUsed', 'authenticationUsed', 'formSubmissionPerformed', 'downloadPerformed'];
const RECEIPT_FALSE_KEYS: (keyof RuntimeSafetyReceipt)[] = ['persistentContextUsed', 'storageStateImported', 'proxyConfigured', 'httpCredentialsConfigured', 'artifactContainsCookieValues'];
const RECEIPT_ZERO_KEYS: (keyof RuntimeSafetyReceipt)[] = ['initialCookieCount', 'initialLocalStorageEntryCount', 'initialSessionStorageEntryCount', 'formSubmissionsObserved'];
const RECEIPT_COUNT_KEYS: (keyof RuntimeSafetyReceipt)[] = ['downloadsObserved', 'fileChoosersObserved', 'externalMainFrameNavigationsBlocked'];
const RECEIPT_KEYS: (keyof RuntimeSafetyReceipt)[] = [...RECEIPT_FALSE_KEYS, ...RECEIPT_ZERO_KEYS, ...RECEIPT_COUNT_KEYS];

/** Code-owned official Bybit host policy (mirrors offerEvidencePacket). */
const OFFICIAL_BYBIT_HOSTS = (host: string) => host === 'bybit.com' || host === 'www.bybit.com' || host.endsWith('.bybit.com');

/* ── artifact safety (mirrors the packet's recursive scan) ── */
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
function scanUnsafe(v: string): boolean { return FORBIDDEN_CONTENT.some((re) => re.test(v)); }
function urlHasCredentials(v: string): boolean { try { const u = new URL(v); return u.username !== '' || u.password !== ''; } catch { return false; } }
function scanUnsafeDeep(value: unknown, path: string, issues: CaptureValidationIssue[]): void {
  if (typeof value === 'string') {
    if (scanUnsafe(value)) issues.push({ field: path, code: 'UNSAFE_CONTENT', message: 'Secret / cookie / token / absolute path detected.' });
    if (/^https?:\/\//i.test(value) && urlHasCredentials(value)) issues.push({ field: path, code: 'URL_CREDENTIALS', message: 'URL must not contain credentials.' });
    return;
  }
  if (Array.isArray(value)) { value.forEach((v, i) => scanUnsafeDeep(v, `${path}.${i}`, issues)); return; }
  if (value && typeof value === 'object') { for (const [k, v] of Object.entries(value)) scanUnsafeDeep(v, `${path}.${k}`, issues); }
}

function hasText(v: unknown): v is string { return typeof v === 'string' && v.trim().length > 0; }

/** An official HTTPS Bybit URL with no credentials and no unsafe query params. */
export function isOfficialBybitUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url !== url.trim() || !/^https:\/\/[^\s]+$/i.test(url)) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.username || u.password) return false;
    if (!OFFICIAL_BYBIT_HOSTS(u.hostname.toLowerCase())) return false;
    if (/[?&](token|access_token|auth|sessionid|sid|cookie)=/i.test(url)) return false;
    return true;
  } catch { return false; }
}

/** A public string that resembles raw markup / a script/style / a JSON dump. */
export function resemblesRawPayload(text: string): boolean {
  if (/<\/?(?:html|head|body|main|section|div|span|script|style|iframe|nav|footer|header|ul|li|table)\b/i.test(text)) return true;
  if (/<!doctype/i.test(text)) return true;
  if (/^\s*[[{]/.test(text) && /"\s*:/.test(text)) return true; // JSON payload dump
  if ((text.match(/[<>]/g) || []).length >= 4) return true;      // markup-ish
  return false;
}

/** A bounded, raw-payload-safe public string (returns an issue code or null). */
function boundedStringIssue(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return 'NOT_STRING';
  if (v.length > max) return 'TOO_LONG';
  if (resemblesRawPayload(v)) return 'RAW_PAYLOAD';
  return null;
}

/* ── digests (R6: complete subject) ── */
export function computeFragmentDigest(f: Pick<CaptureFragment, 'extractionType' | 'locator' | 'text' | 'claimIds'>): string {
  const canonical = JSON.stringify({ extractionType: f.extractionType, locator: f.locator, text: f.text, claimIds: [...f.claimIds].sort() });
  return 'sha256:' + createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function canonicalFragment(f: CaptureFragment): Record<string, unknown> {
  return {
    fragmentId: f.fragmentId,
    captureId: f.captureId,
    extractionType: f.extractionType,
    locator: f.locator,
    text: f.text,
    textLength: f.textLength,
    claimIds: [...(f.claimIds || [])].sort(),
    limitations: f.limitations,
    fragmentDigest: f.fragmentDigest,
  };
}

/**
 * Canonical serialization of EVERY committed provenance/safety field (R6). Only
 * `normalizedArtifactDigest` is excluded. Ordering is deterministic; redirectChain
 * and fragments keep their observed order (reordering therefore breaks the digest).
 */
export function canonicalRenderedArtifact(c: PublicRenderedCapture): string {
  const md: Record<string, unknown> = {};
  for (const k of ALLOWED_METADATA_KEYS) md[k] = (c.structuredMetadata as Record<string, unknown>)?.[k] ?? null;
  const ec: Record<string, unknown> = {};
  for (const k of EC_KEYS) ec[k] = (c.ephemeralContext as unknown as Record<string, unknown>)?.[k];
  const receipt: Record<string, unknown> = {};
  for (const k of RECEIPT_KEYS) receipt[k] = (c.runtimeReceipt as unknown as Record<string, unknown>)?.[k];
  return JSON.stringify({
    captureId: c.captureId,
    exchangeId: c.exchangeId,
    requestedUrl: c.requestedUrl,
    finalUrl: c.finalUrl ?? null,
    redirectChain: c.redirectChain,
    capturedAt: c.capturedAt,
    browserName: c.browserName,
    browserVersion: c.browserVersion,
    runtimeVersion: c.runtimeVersion,
    ephemeralContext: ec,
    runtimeReceipt: receipt,
    viewport: { width: c.viewport?.width, height: c.viewport?.height },
    locale: c.locale,
    mainDocumentStatus: c.mainDocumentStatus,
    contentType: c.contentType,
    pageTitle: c.pageTitle,
    outcome: c.outcome,
    fragments: c.fragments.map(canonicalFragment),
    structuredMetadata: md,
    warnings: c.warnings,
    limitations: c.limitations,
  });
}

export function computeRenderedArtifactDigest(c: PublicRenderedCapture): string {
  return 'sha256:' + createHash('sha256').update(canonicalRenderedArtifact(c), 'utf8').digest('hex');
}

/* ── fragment validation ── */
function validateFragment(f: unknown, index: number, captureId: string, allowedClaimIds: Set<string>, issues: CaptureValidationIssue[]): void {
  const path = `fragments.${index}`;
  if (typeof f !== 'object' || f === null) { issues.push({ field: path, code: 'NOT_OBJECT', message: 'Fragment must be an object.' }); return; }
  const r = f as Record<string, unknown>;
  if (!hasText(r.fragmentId) || !CANONICAL_SLUG.test(r.fragmentId as string)) issues.push({ field: `${path}.fragmentId`, code: 'INVALID_ID', message: 'fragmentId must be a canonical slug.' });
  if (r.captureId !== captureId) issues.push({ field: `${path}.captureId`, code: 'CAPTURE_MISMATCH', message: 'Fragment captureId must match the capture.' });
  if (!EXTRACTION_TYPES.includes(r.extractionType as FragmentExtractionType)) issues.push({ field: `${path}.extractionType`, code: 'INVALID_TYPE', message: 'Unknown extractionType.' });
  if (!hasText(r.locator)) issues.push({ field: `${path}.locator`, code: 'REQUIRED', message: 'A selector or semantic locator is required.' });
  else if (boundedStringIssue(r.locator, MAX_LOCATOR_LENGTH)) issues.push({ field: `${path}.locator`, code: 'INVALID_LOCATOR', message: `locator must be ≤ ${MAX_LOCATOR_LENGTH} chars and not raw markup.` });
  if (!hasText(r.text)) issues.push({ field: `${path}.text`, code: 'EMPTY_FRAGMENT', message: 'Fragment text must be non-empty.' });
  else {
    const text = r.text as string;
    if (text.length > MAX_FRAGMENT_TEXT_LENGTH) issues.push({ field: `${path}.text`, code: 'FRAGMENT_TOO_LONG', message: `Fragment exceeds ${MAX_FRAGMENT_TEXT_LENGTH} chars.` });
    if (resemblesRawPayload(text)) issues.push({ field: `${path}.text`, code: 'RAW_PAYLOAD', message: 'Fragment resembles full HTML / script / JSON dump.' });
  }
  if (typeof r.textLength !== 'number' || !Number.isInteger(r.textLength) || (typeof r.text === 'string' && r.textLength !== r.text.length)) issues.push({ field: `${path}.textLength`, code: 'INVALID_LENGTH', message: 'textLength must equal text.length.' });
  if (!Array.isArray(r.claimIds) || r.claimIds.length > MAX_CLAIM_IDS || !r.claimIds.every((c) => typeof c === 'string' && allowedClaimIds.has(c)) || new Set(r.claimIds as string[]).size !== (r.claimIds as string[]).length) issues.push({ field: `${path}.claimIds`, code: 'INVALID_CLAIM_IDS', message: 'claimIds must be unique known Bybit claim IDs within bounds.' });
  if (typeof r.limitations !== 'string') issues.push({ field: `${path}.limitations`, code: 'REQUIRED', message: 'limitations required.' });
  else if (r.limitations.length > MAX_FRAGMENT_LIMITATION_LENGTH || resemblesRawPayload(r.limitations)) issues.push({ field: `${path}.limitations`, code: 'INVALID_LIMITATION', message: `limitations must be ≤ ${MAX_FRAGMENT_LIMITATION_LENGTH} chars and not raw markup.` });
  // Recompute the fragment digest.
  if (!hasText(r.fragmentDigest) || !SHA256.test(r.fragmentDigest as string)) issues.push({ field: `${path}.fragmentDigest`, code: 'INVALID_DIGEST', message: 'fragmentDigest must be sha256.' });
  else if (EXTRACTION_TYPES.includes(r.extractionType as FragmentExtractionType) && typeof r.locator === 'string' && typeof r.text === 'string' && Array.isArray(r.claimIds)) {
    const recomputed = computeFragmentDigest({ extractionType: r.extractionType as FragmentExtractionType, locator: r.locator, text: r.text, claimIds: r.claimIds as string[] });
    if (recomputed !== r.fragmentDigest) issues.push({ field: `${path}.fragmentDigest`, code: 'FRAGMENT_DIGEST_MISMATCH', message: 'fragmentDigest does not recompute (tampered).' });
  }
}

/** Number of fragments that assert a claim (non-empty claimIds). */
function claimSupportingCount(frags: unknown[]): number {
  return frags.filter((f) => f && typeof f === 'object' && Array.isArray((f as Record<string, unknown>).claimIds) && ((f as Record<string, unknown>).claimIds as unknown[]).length > 0).length;
}

/**
 * R3 — centralized outcome matrix. Rejects internally inconsistent artifacts and
 * enforces that only `rendered` may carry claim-supporting fragments.
 */
function validateOutcomeMatrix(r: Record<string, unknown>, issues: CaptureValidationIssue[]): void {
  const outcome = r.outcome as RenderOutcome;
  if (!RENDER_OUTCOMES.includes(outcome)) return; // outcome invalidity reported elsewhere
  const frags = Array.isArray(r.fragments) ? r.fragments : [];
  const supporting = claimSupportingCount(frags);
  const status = r.mainDocumentStatus;
  const finalOfficial = isOfficialBybitUrl(r.finalUrl);
  const ct = typeof r.contentType === 'string' ? r.contentType.toLowerCase() : null;

  // Only `rendered` may ever carry a claim-supporting fragment.
  if (outcome !== 'rendered' && supporting > 0) {
    issues.push({ field: 'fragments', code: 'MATRIX_NO_CLAIM_FRAGMENTS', message: `outcome=${outcome} must not carry claim-supporting fragments.` });
  }

  switch (outcome) {
    case 'rendered': {
      if (!finalOfficial) issues.push({ field: 'finalUrl', code: 'MATRIX_RENDERED_FINAL_URL', message: 'rendered requires a confirmed official finalUrl.' });
      if (!(typeof status === 'number' && status >= 200 && status <= 299)) issues.push({ field: 'mainDocumentStatus', code: 'MATRIX_RENDERED_STATUS', message: 'rendered requires a 2xx mainDocumentStatus.' });
      if (!(ct && RENDERED_CONTENT_TYPES.includes(ct))) issues.push({ field: 'contentType', code: 'MATRIX_RENDERED_CONTENT_TYPE', message: `rendered requires an allowlisted content type (${RENDERED_CONTENT_TYPES.join(', ')}).` });
      if (frags.length < 1) issues.push({ field: 'fragments', code: 'MATRIX_RENDERED_NEEDS_FRAGMENT', message: 'rendered requires at least one validated fragment.' });
      break;
    }
    case 'redirect_only': {
      if (!finalOfficial) issues.push({ field: 'finalUrl', code: 'MATRIX_REDIRECT_FINAL_URL', message: 'redirect_only requires a confirmed official finalUrl.' });
      const hasRedirect = (Array.isArray(r.redirectChain) && r.redirectChain.length > 0) || (typeof r.finalUrl === 'string' && r.finalUrl !== r.requestedUrl);
      if (!hasRedirect) issues.push({ field: 'redirectChain', code: 'MATRIX_REDIRECT_NEEDS_EVIDENCE', message: 'redirect_only requires actual redirect evidence.' });
      break;
    }
    case 'login_wall':
    case 'captcha_or_bot_wall':
    case 'geo_restricted':
    case 'empty':
      // Non-claim-permitting; fragments (if any) must have empty claimIds — enforced above.
      break;
    case 'timeout':
    case 'network_error':
    case 'external_redirect': {
      // No official document was observed: nothing factual may be recorded. A
      // fabricated finalUrl / status / title / metadata / fragment is rejected.
      if (r.finalUrl !== null) issues.push({ field: 'finalUrl', code: 'MATRIX_NO_DOCUMENT', message: `${outcome} must not present a finalUrl (must be null).` });
      if (status !== null) issues.push({ field: 'mainDocumentStatus', code: 'MATRIX_NO_DOCUMENT', message: `${outcome} requires a null mainDocumentStatus.` });
      if (r.contentType !== null) issues.push({ field: 'contentType', code: 'MATRIX_NO_DOCUMENT', message: `${outcome} requires a null contentType.` });
      if (r.pageTitle !== null) issues.push({ field: 'pageTitle', code: 'MATRIX_NO_DOCUMENT', message: `${outcome} must not record a page title.` });
      if (frags.length > 0) issues.push({ field: 'fragments', code: 'MATRIX_NO_DOCUMENT', message: `${outcome} must not record fragments.` });
      const md = r.structuredMetadata as Record<string, unknown> | undefined;
      if (md && typeof md === 'object' && Object.values(md).some((v) => v !== null)) issues.push({ field: 'structuredMetadata', code: 'MATRIX_NO_DOCUMENT', message: `${outcome} must not record structured metadata.` });
      break;
    }
    case 'unsupported':
      break;
  }
}

/**
 * Validate a PublicRenderedCapture fail-closed. `allowedClaimIds` is the code-owned
 * Bybit claim inventory (injected to avoid a circular import).
 */
export function validatePublicRenderedCapture(input: unknown, allowedClaimIds: readonly string[]): CaptureValidationResult {
  const issues: CaptureValidationIssue[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: [{ field: '$', code: 'NOT_OBJECT', message: 'Capture must be an object.' }] };
  }
  const r = input as Record<string, unknown>;
  const claimSet = new Set(allowedClaimIds);

  if (!hasText(r.captureId) || !CANONICAL_SLUG.test(r.captureId as string)) issues.push({ field: 'captureId', code: 'INVALID_ID', message: 'captureId must be a canonical slug.' });
  if (r.exchangeId !== 'bybit') issues.push({ field: 'exchangeId', code: 'EXCHANGE_NOT_BYBIT', message: 'exchangeId must be bybit.' });

  // requestedUrl is always an official URL; finalUrl is official-or-null (R2).
  if (!isOfficialBybitUrl(r.requestedUrl)) issues.push({ field: 'requestedUrl', code: 'NON_OFFICIAL_URL', message: 'requestedUrl must be an official HTTPS Bybit URL with no credentials/unsafe params.' });
  if (!(r.finalUrl === null || isOfficialBybitUrl(r.finalUrl))) issues.push({ field: 'finalUrl', code: 'NON_OFFICIAL_URL', message: 'finalUrl must be an official HTTPS Bybit URL or null.' });

  if (!Array.isArray(r.redirectChain)) issues.push({ field: 'redirectChain', code: 'INVALID_ARRAY', message: 'redirectChain must be an array.' });
  else {
    if (r.redirectChain.length > MAX_REDIRECTS) issues.push({ field: 'redirectChain', code: 'TOO_MANY_REDIRECTS', message: `redirectChain exceeds ${MAX_REDIRECTS}.` });
    r.redirectChain.forEach((u, i) => { if (!isOfficialBybitUrl(u)) issues.push({ field: `redirectChain.${i}`, code: 'NON_OFFICIAL_URL', message: 'Every redirect URL must be an official HTTPS Bybit URL (no external redirect).' }); });
  }

  if (!parseExactIsoDateTime(r.capturedAt)) issues.push({ field: 'capturedAt', code: 'INEXACT_TIMESTAMP', message: 'capturedAt must be an exact ISO datetime.' });
  if (!hasText(r.browserName) || (r.browserName as string).length > MAX_VERSION_LENGTH) issues.push({ field: 'browserName', code: 'INVALID', message: `browserName required, ≤ ${MAX_VERSION_LENGTH} chars.` });
  if (!hasText(r.browserVersion) || (r.browserVersion as string).length > MAX_VERSION_LENGTH) issues.push({ field: 'browserVersion', code: 'INVALID', message: `browserVersion required, ≤ ${MAX_VERSION_LENGTH} chars.` });
  if (!hasText(r.runtimeVersion) || (r.runtimeVersion as string).length > MAX_VERSION_LENGTH) issues.push({ field: 'runtimeVersion', code: 'INVALID', message: `runtimeVersion required, ≤ ${MAX_VERSION_LENGTH} chars.` });

  // Ephemeral-context assertions: every flag must be literally false.
  const ec = r.ephemeralContext as Record<string, unknown> | undefined;
  if (!ec || typeof ec !== 'object') issues.push({ field: 'ephemeralContext', code: 'REQUIRED', message: 'ephemeralContext required.' });
  else for (const k of EC_KEYS) { if (ec[k] !== false) issues.push({ field: `ephemeralContext.${k}`, code: 'EPHEMERAL_VIOLATION', message: `${k} must be false.` }); }

  // R8: runtime safety receipt — false flags false, zero counts zero, counters ≥ 0.
  const rc = r.runtimeReceipt as Record<string, unknown> | undefined;
  if (!rc || typeof rc !== 'object' || Array.isArray(rc)) issues.push({ field: 'runtimeReceipt', code: 'REQUIRED', message: 'runtimeReceipt required.' });
  else {
    for (const k of RECEIPT_FALSE_KEYS) if (rc[k] !== false) issues.push({ field: `runtimeReceipt.${k}`, code: 'RECEIPT_VIOLATION', message: `${k} must be false.` });
    for (const k of RECEIPT_ZERO_KEYS) if (rc[k] !== 0) issues.push({ field: `runtimeReceipt.${k}`, code: 'RECEIPT_VIOLATION', message: `${k} must be 0.` });
    for (const k of RECEIPT_COUNT_KEYS) if (!(typeof rc[k] === 'number' && Number.isInteger(rc[k]) && (rc[k] as number) >= 0)) issues.push({ field: `runtimeReceipt.${k}`, code: 'RECEIPT_VIOLATION', message: `${k} must be a non-negative integer.` });
    for (const k of Object.keys(rc)) if (!(RECEIPT_KEYS as string[]).includes(k)) issues.push({ field: `runtimeReceipt.${k}`, code: 'RECEIPT_UNKNOWN_FIELD', message: 'Unknown runtimeReceipt field.' });
  }

  const vp = r.viewport as Record<string, unknown> | undefined;
  if (!vp || typeof vp !== 'object' || !Number.isInteger(vp.width) || !Number.isInteger(vp.height) || (vp.width as number) <= 0 || (vp.height as number) <= 0) issues.push({ field: 'viewport', code: 'INVALID_VIEWPORT', message: 'viewport must have positive integer width/height.' });
  if (!hasText(r.locale) || (r.locale as string).length > MAX_LOCALE_LENGTH) issues.push({ field: 'locale', code: 'INVALID', message: `locale required, ≤ ${MAX_LOCALE_LENGTH} chars.` });

  if (!(r.mainDocumentStatus === null || (typeof r.mainDocumentStatus === 'number' && Number.isInteger(r.mainDocumentStatus) && (r.mainDocumentStatus as number) >= 100 && (r.mainDocumentStatus as number) <= 599))) issues.push({ field: 'mainDocumentStatus', code: 'INVALID_STATUS', message: 'mainDocumentStatus must be an integer 100–599 or null.' });
  if (!(r.contentType === null || hasText(r.contentType))) issues.push({ field: 'contentType', code: 'INVALID', message: 'contentType must be a non-empty string or null.' });
  if (!(r.pageTitle === null || (typeof r.pageTitle === 'string' && !boundedStringIssue(r.pageTitle, MAX_PAGE_TITLE_LENGTH)))) issues.push({ field: 'pageTitle', code: 'INVALID', message: `pageTitle must be null or a bounded string ≤ ${MAX_PAGE_TITLE_LENGTH} chars.` });

  if (!RENDER_OUTCOMES.includes(r.outcome as RenderOutcome)) issues.push({ field: 'outcome', code: 'INVALID_OUTCOME', message: 'Unknown render outcome.' });

  // Fragments.
  if (!Array.isArray(r.fragments)) issues.push({ field: 'fragments', code: 'INVALID_ARRAY', message: 'fragments must be an array.' });
  else {
    if (r.fragments.length > MAX_FRAGMENTS) issues.push({ field: 'fragments', code: 'TOO_MANY_FRAGMENTS', message: `fragments exceed ${MAX_FRAGMENTS}.` });
    const fids = new Set<string>();
    r.fragments.forEach((f, i) => {
      validateFragment(f, i, r.captureId as string, claimSet, issues);
      const id = (f as Record<string, unknown>)?.fragmentId;
      if (typeof id === 'string') { if (fids.has(id)) issues.push({ field: 'fragments', code: 'DUPLICATE_FRAGMENT', message: 'fragmentId must be unique.' }); fids.add(id); }
    });
  }

  // R3: outcome matrix consistency.
  validateOutcomeMatrix(r, issues);

  // Structured metadata: only allowlisted scalar fields, each bounded + raw-safe.
  const md = r.structuredMetadata;
  if (typeof md !== 'object' || md === null || Array.isArray(md)) issues.push({ field: 'structuredMetadata', code: 'INVALID', message: 'structuredMetadata must be an object.' });
  else {
    for (const [k, v] of Object.entries(md)) {
      if (!ALLOWED_METADATA_KEYS.includes(k)) issues.push({ field: `structuredMetadata.${k}`, code: 'DISALLOWED_METADATA', message: 'Only allowlisted scalar metadata fields are permitted.' });
      else if (!(v === null || (typeof v === 'string' && v.length <= MAX_METADATA_FIELD_LENGTH && !resemblesRawPayload(v)))) issues.push({ field: `structuredMetadata.${k}`, code: 'INVALID_METADATA', message: `Metadata must be null or a bounded raw-safe string ≤ ${MAX_METADATA_FIELD_LENGTH} chars.` });
    }
    // R7: canonicalUrl (when present) must itself be an official Bybit URL.
    const canon = (md as Record<string, unknown>).canonicalUrl;
    if (canon != null && !isOfficialBybitUrl(canon)) issues.push({ field: 'structuredMetadata.canonicalUrl', code: 'NON_OFFICIAL_URL', message: 'canonicalUrl must be an official HTTPS Bybit URL or null.' });
    // R7: pageTitle must be the single canonical field (metadata mirror must match).
    const mdTitle = (md as Record<string, unknown>).pageTitle ?? null;
    if (mdTitle !== (r.pageTitle ?? null)) issues.push({ field: 'structuredMetadata.pageTitle', code: 'PAGE_TITLE_MISMATCH', message: 'structuredMetadata.pageTitle must equal the capture pageTitle.' });
  }

  // Bounded collections (R7).
  if (!Array.isArray(r.warnings) || r.warnings.length > MAX_WARNINGS || !r.warnings.every((w) => typeof w === 'string' && w.length <= MAX_WARNING_LENGTH && !resemblesRawPayload(w))) issues.push({ field: 'warnings', code: 'INVALID_ARRAY', message: `warnings must be ≤ ${MAX_WARNINGS} bounded raw-safe strings.` });
  if (!Array.isArray(r.limitations) || r.limitations.length > MAX_LIMITATIONS || !r.limitations.every((l) => typeof l === 'string' && l.length <= MAX_LIMITATION_LENGTH && !resemblesRawPayload(l))) issues.push({ field: 'limitations', code: 'INVALID_ARRAY', message: `limitations must be ≤ ${MAX_LIMITATIONS} bounded raw-safe strings.` });

  // Recompute the artifact digest (R6: complete subject).
  if (!hasText(r.normalizedArtifactDigest) || !SHA256.test(r.normalizedArtifactDigest as string)) {
    issues.push({ field: 'normalizedArtifactDigest', code: 'INVALID_DIGEST', message: 'normalizedArtifactDigest must be sha256.' });
  } else if (issues.length === 0) {
    const recomputed = computeRenderedArtifactDigest(input as PublicRenderedCapture);
    if (recomputed !== r.normalizedArtifactDigest) issues.push({ field: 'normalizedArtifactDigest', code: 'ARTIFACT_DIGEST_MISMATCH', message: 'normalizedArtifactDigest does not recompute (tampered).' });
  }

  // Recursive artifact-safety over every string.
  scanUnsafeDeep(r, '$', issues);

  if (issues.length) return { ok: false, issues };
  return { ok: true, value: input as PublicRenderedCapture, issues };
}

/** True when a rendered capture may back a SUPPORTED claim (official + rendered outcome). */
export function captureMaySupportClaims(c: PublicRenderedCapture): boolean {
  return c.exchangeId === 'bybit' && isOfficialBybitUrl(c.finalUrl) && CLAIM_PERMITTING_OUTCOMES.includes(c.outcome);
}

/**
 * Fragment-level admissibility (R4): a specific fragment on a specific capture may
 * back `claimId` only when the capture permits support, the fragment exists, its
 * claimIds include the exact claim, and it has a locator. Digest integrity is
 * enforced separately by validation.
 */
export function fragmentSupportsClaim(c: PublicRenderedCapture, fragmentId: string, claimId: string): boolean {
  if (!captureMaySupportClaims(c)) return false;
  const frag = c.fragments.find((f) => f.fragmentId === fragmentId);
  if (!frag) return false;
  return hasText(frag.locator) && Array.isArray(frag.claimIds) && frag.claimIds.length > 0 && frag.claimIds.includes(claimId);
}
