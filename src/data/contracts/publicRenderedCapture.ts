/**
 * PublicRenderedCapture — fail-closed contract for a public, anonymous, ephemeral
 * rendered capture of an official offer page (Issue #254).
 *
 * The runner may observe only what an unauthenticated public browser sees. This
 * contract is the deterministic, OFFLINE validator/replay of a committed capture
 * artifact: CI never launches a browser or touches the network — it validates the
 * committed normalized artifact and recomputes its digests.
 *
 * Everything is bounded and copyright-safe: only concise claim-oriented fragments
 * and allowlisted scalar metadata are stored — never full HTML, page text, HAR,
 * cookies, tokens, secrets, personal data or absolute paths. A page merely
 * loading supports no offer claim; only an admissible fragment on an official,
 * claim-permitting capture can.
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
  | 'unsupported';

export const RENDER_OUTCOMES: readonly RenderOutcome[] = Object.freeze([
  'rendered', 'redirect_only', 'login_wall', 'captcha_or_bot_wall', 'geo_restricted', 'empty', 'timeout', 'network_error', 'unsupported',
]);

/** Only outcomes under which a claim may be supported at all. */
export const CLAIM_PERMITTING_OUTCOMES: readonly RenderOutcome[] = Object.freeze(['rendered']);

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
  finalUrl: string;
  redirectChain: string[];
  capturedAt: string;
  browserName: string;
  browserVersion: string;
  runtimeVersion: string;
  ephemeralContext: EphemeralContextAssertions;
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

/* ── bounds ── */
export const MAX_FRAGMENT_TEXT_LENGTH = 300;
export const MAX_FRAGMENTS = 40;
export const MAX_REDIRECTS = 10;
export const MAX_METADATA_FIELD_LENGTH = 400;

const CANONICAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const ALLOWED_METADATA_KEYS = ['pageTitle', 'description', 'canonicalUrl', 'ogTitle', 'ogDescription', 'jsonLdType'];

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

/** A fragment text that resembles raw markup / a script/style / a JSON dump. */
function resemblesRawPayload(text: string): boolean {
  if (/<\/?(?:html|head|body|main|section|div|span|script|style|iframe|nav|footer|header|ul|li|table)\b/i.test(text)) return true;
  if (/<!doctype/i.test(text)) return true;
  if (/^\s*[[{]/.test(text) && /"\s*:/.test(text)) return true; // JSON payload dump
  if ((text.match(/[<>]/g) || []).length >= 4) return true;      // markup-ish
  return false;
}

/* ── digests ── */
export function computeFragmentDigest(f: Pick<CaptureFragment, 'extractionType' | 'locator' | 'text' | 'claimIds'>): string {
  const canonical = JSON.stringify({ extractionType: f.extractionType, locator: f.locator, text: f.text, claimIds: [...f.claimIds].sort() });
  return 'sha256:' + createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/** Canonical serialization of the SAFE, content-bearing fields (excludes digest + volatile env). */
export function canonicalRenderedArtifact(c: PublicRenderedCapture): string {
  const md: Record<string, unknown> = {};
  for (const k of ALLOWED_METADATA_KEYS) md[k] = (c.structuredMetadata as Record<string, unknown>)[k] ?? null;
  return JSON.stringify({
    captureId: c.captureId,
    exchangeId: c.exchangeId,
    requestedUrl: c.requestedUrl,
    finalUrl: c.finalUrl,
    redirectChain: c.redirectChain,
    mainDocumentStatus: c.mainDocumentStatus,
    contentType: c.contentType,
    outcome: c.outcome,
    fragmentDigests: c.fragments.map((f) => f.fragmentDigest).sort(),
    structuredMetadata: md,
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
  if (!hasText(r.text)) issues.push({ field: `${path}.text`, code: 'EMPTY_FRAGMENT', message: 'Fragment text must be non-empty.' });
  else {
    const text = r.text as string;
    if (text.length > MAX_FRAGMENT_TEXT_LENGTH) issues.push({ field: `${path}.text`, code: 'FRAGMENT_TOO_LONG', message: `Fragment exceeds ${MAX_FRAGMENT_TEXT_LENGTH} chars.` });
    if (resemblesRawPayload(text)) issues.push({ field: `${path}.text`, code: 'RAW_PAYLOAD', message: 'Fragment resembles full HTML / script / JSON dump.' });
  }
  if (typeof r.textLength !== 'number' || !Number.isInteger(r.textLength) || (typeof r.text === 'string' && r.textLength !== r.text.length)) issues.push({ field: `${path}.textLength`, code: 'INVALID_LENGTH', message: 'textLength must equal text.length.' });
  if (!Array.isArray(r.claimIds) || !r.claimIds.every((c) => typeof c === 'string' && allowedClaimIds.has(c))) issues.push({ field: `${path}.claimIds`, code: 'INVALID_CLAIM_IDS', message: 'claimIds must be known Bybit claim IDs.' });
  if (typeof r.limitations !== 'string') issues.push({ field: `${path}.limitations`, code: 'REQUIRED', message: 'limitations required.' });
  // Recompute the fragment digest.
  if (!hasText(r.fragmentDigest) || !SHA256.test(r.fragmentDigest as string)) issues.push({ field: `${path}.fragmentDigest`, code: 'INVALID_DIGEST', message: 'fragmentDigest must be sha256.' });
  else if (EXTRACTION_TYPES.includes(r.extractionType as FragmentExtractionType) && typeof r.locator === 'string' && typeof r.text === 'string' && Array.isArray(r.claimIds)) {
    const recomputed = computeFragmentDigest({ extractionType: r.extractionType as FragmentExtractionType, locator: r.locator, text: r.text, claimIds: r.claimIds as string[] });
    if (recomputed !== r.fragmentDigest) issues.push({ field: `${path}.fragmentDigest`, code: 'FRAGMENT_DIGEST_MISMATCH', message: 'fragmentDigest does not recompute (tampered).' });
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

  for (const key of ['requestedUrl', 'finalUrl'] as const) {
    if (!isOfficialBybitUrl(r[key])) issues.push({ field: key, code: 'NON_OFFICIAL_URL', message: `${key} must be an official HTTPS Bybit URL with no credentials/unsafe params.` });
  }
  if (!Array.isArray(r.redirectChain)) issues.push({ field: 'redirectChain', code: 'INVALID_ARRAY', message: 'redirectChain must be an array.' });
  else {
    if (r.redirectChain.length > MAX_REDIRECTS) issues.push({ field: 'redirectChain', code: 'TOO_MANY_REDIRECTS', message: `redirectChain exceeds ${MAX_REDIRECTS}.` });
    r.redirectChain.forEach((u, i) => { if (!isOfficialBybitUrl(u)) issues.push({ field: `redirectChain.${i}`, code: 'NON_OFFICIAL_URL', message: 'Every redirect URL must be an official HTTPS Bybit URL (no external redirect).' }); });
  }

  if (!parseExactIsoDateTime(r.capturedAt)) issues.push({ field: 'capturedAt', code: 'INEXACT_TIMESTAMP', message: 'capturedAt must be an exact ISO datetime.' });
  if (!hasText(r.browserName)) issues.push({ field: 'browserName', code: 'REQUIRED', message: 'browserName required.' });
  if (!hasText(r.browserVersion)) issues.push({ field: 'browserVersion', code: 'REQUIRED', message: 'browserVersion required.' });
  if (!hasText(r.runtimeVersion)) issues.push({ field: 'runtimeVersion', code: 'REQUIRED', message: 'runtimeVersion required.' });

  // Ephemeral-context assertions: every flag must be literally false.
  const ec = r.ephemeralContext as Record<string, unknown> | undefined;
  const ECHK: (keyof EphemeralContextAssertions)[] = ['persistentProfileUsed', 'importedStorageState', 'proxyUsed', 'authenticationUsed', 'formSubmissionPerformed', 'downloadPerformed'];
  if (!ec || typeof ec !== 'object') issues.push({ field: 'ephemeralContext', code: 'REQUIRED', message: 'ephemeralContext required.' });
  else for (const k of ECHK) { if (ec[k] !== false) issues.push({ field: `ephemeralContext.${k}`, code: 'EPHEMERAL_VIOLATION', message: `${k} must be false.` }); }

  const vp = r.viewport as Record<string, unknown> | undefined;
  if (!vp || typeof vp !== 'object' || !Number.isInteger(vp.width) || !Number.isInteger(vp.height) || (vp.width as number) <= 0 || (vp.height as number) <= 0) issues.push({ field: 'viewport', code: 'INVALID_VIEWPORT', message: 'viewport must have positive integer width/height.' });
  if (!hasText(r.locale)) issues.push({ field: 'locale', code: 'REQUIRED', message: 'locale required.' });

  if (!(r.mainDocumentStatus === null || (typeof r.mainDocumentStatus === 'number' && Number.isInteger(r.mainDocumentStatus) && (r.mainDocumentStatus as number) >= 100 && (r.mainDocumentStatus as number) <= 599))) issues.push({ field: 'mainDocumentStatus', code: 'INVALID_STATUS', message: 'mainDocumentStatus must be an integer 100–599 or null.' });
  if (!(r.contentType === null || hasText(r.contentType))) issues.push({ field: 'contentType', code: 'INVALID', message: 'contentType must be a non-empty string or null.' });
  if (!(r.pageTitle === null || typeof r.pageTitle === 'string')) issues.push({ field: 'pageTitle', code: 'INVALID', message: 'pageTitle must be a string or null.' });

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
    // A wall/error outcome may carry NO claim-supporting fragments beyond warnings.
    if (!CLAIM_PERMITTING_OUTCOMES.includes(r.outcome as RenderOutcome) && r.fragments.length > 0) {
      // fragments are allowed for context, but they can never support claims; enforced at the packet layer.
    }
  }

  // Structured metadata: only allowlisted scalar fields, each bounded.
  const md = r.structuredMetadata;
  if (typeof md !== 'object' || md === null || Array.isArray(md)) issues.push({ field: 'structuredMetadata', code: 'INVALID', message: 'structuredMetadata must be an object.' });
  else {
    for (const [k, v] of Object.entries(md)) {
      if (!ALLOWED_METADATA_KEYS.includes(k)) issues.push({ field: `structuredMetadata.${k}`, code: 'DISALLOWED_METADATA', message: 'Only allowlisted scalar metadata fields are permitted.' });
      else if (!(v === null || (typeof v === 'string' && v.length <= MAX_METADATA_FIELD_LENGTH))) issues.push({ field: `structuredMetadata.${k}`, code: 'INVALID_METADATA', message: `Metadata must be null or a string ≤ ${MAX_METADATA_FIELD_LENGTH} chars.` });
    }
  }

  if (!Array.isArray(r.warnings) || !r.warnings.every((w) => typeof w === 'string')) issues.push({ field: 'warnings', code: 'INVALID_ARRAY', message: 'warnings must be a string array.' });
  if (!Array.isArray(r.limitations) || !r.limitations.every((l) => typeof l === 'string')) issues.push({ field: 'limitations', code: 'INVALID_ARRAY', message: 'limitations must be a string array.' });

  // Recompute the artifact digest.
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
