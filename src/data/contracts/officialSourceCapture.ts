/**
 * OfficialSourceCapture — fail-closed contract for a bounded, anonymous capture of an
 * OFFICIAL public Bybit source (Issue #260).
 *
 * A sibling to `publicRenderedCapture` for the multi-source claim-evidence layer: it
 * records what an unauthenticated, anonymous HTTPS request (optionally an ephemeral
 * render) observed on an official Bybit property, classified by SOURCE SCOPE and
 * CURRENCY, with bounded claim-oriented fragments. Like every capture contract here it
 * is the deterministic OFFLINE validator/replay of a committed artifact: CI never
 * touches the network — it re-validates the committed normalized artifact and recomputes
 * every digest.
 *
 * Fail-closed guarantees:
 *   * requestedUrl is always official; finalUrl is official-or-null (a terminal state
 *     must not claim a final document);
 *   * a centralized OUTCOME MATRIX rejects internally inconsistent artifacts — only the
 *     `content` outcome may ever carry claim-supporting fragments; terminal/wall/redirect
 *     outcomes may not fabricate a status/title/metadata/fragment;
 *   * every fragment binds to an official source, a bounded raw-safe normalized text, a
 *     locator, the claim IDs and assertion-component IDs it addresses, a supports/
 *     contradicts stance, and a recomputable fragment digest;
 *   * the source digest covers EVERY committed field (only the digest itself excluded),
 *     with deterministic ordering — a tampered artifact fails replay;
 *   * a safe HTTP receipt records only aggregate booleans/counts (never a cookie, token
 *     or credential) and is bound into the digest;
 *   * recursive artifact safety forbids secrets / cookies / tokens / absolute paths / URL
 *     credentials / raw markup anywhere in the artifact.
 *
 * Only concise, copyright-safe fragments and allowlisted scalar metadata are stored —
 * never full HTML, page body text, HAR, cookies, tokens, secrets or personal data. A
 * source merely responding supports NO offer claim; only an admissible fragment on an
 * official `content` capture can (scope + fragment binding enforced by the source plan).
 * Node crypto is build/server-side only; this module is never in the client bundle.
 */
import { createHash } from 'node:crypto';
import { parseExactIsoDateTime } from './evidenceMetadata';

/* ─────────────────────────── scope + currency + outcome ─────────────────────── */

/** Code-owned catalogue of source scopes a candidate may declare / be classified as. */
export type OfficialSourceScope =
  | 'promotion_specific'
  | 'campaign_terms'
  | 'account_wide_general'
  | 'jurisdiction_specific'
  | 'legal_restrictions'
  | 'reward_mechanics'
  | 'identity_verification_general'
  | 'historical_campaign'
  | 'ambiguous';

export const OFFICIAL_SOURCE_SCOPES: readonly OfficialSourceScope[] = Object.freeze([
  'promotion_specific', 'campaign_terms', 'account_wide_general', 'jurisdiction_specific',
  'legal_restrictions', 'reward_mechanics', 'identity_verification_general',
  'historical_campaign', 'ambiguous',
]);

/** Whether the observed document is the current offer, a past campaign, or unclear. */
export type SourceCurrency = 'current' | 'historical' | 'ambiguous';
export const SOURCE_CURRENCIES: readonly SourceCurrency[] = Object.freeze(['current', 'historical', 'ambiguous']);

/**
 * Deterministic capture outcomes. Only `content` permits claim-supporting fragments.
 * `spa_shell` = an official 2xx response whose offer content is client-rendered and was
 * NOT server-observable to an anonymous request (a shell, not the offer).
 */
export type OfficialSourceOutcome =
  | 'content'
  | 'redirect_only'
  | 'spa_shell'
  | 'not_found'
  | 'login_wall'
  | 'captcha_or_bot_wall'
  | 'geo_restricted'
  | 'empty'
  | 'timeout'
  | 'network_error'
  | 'external_redirect'
  | 'unsupported';

export const OFFICIAL_SOURCE_OUTCOMES: readonly OfficialSourceOutcome[] = Object.freeze([
  'content', 'redirect_only', 'spa_shell', 'not_found', 'login_wall', 'captcha_or_bot_wall',
  'geo_restricted', 'empty', 'timeout', 'network_error', 'external_redirect', 'unsupported',
]);

/** Only outcomes under which a claim may be supported at all. */
export const CONTENT_OUTCOMES: readonly OfficialSourceOutcome[] = Object.freeze(['content']);

/**
 * Outcomes where an official HTTP response WAS observed (the source was reachable). A
 * claim absent from a reachable source is NOT_FOUND; a claim on an unreachable source is
 * INACCESSIBLE. `redirect_only`/`spa_shell`/`empty` are reachable-but-target-not-served.
 */
export const REACHABLE_OUTCOMES: readonly OfficialSourceOutcome[] = Object.freeze([
  'content', 'not_found', 'spa_shell', 'redirect_only', 'empty',
]);

export const CONTENT_TYPES: readonly string[] = Object.freeze(['text/html', 'application/xhtml+xml']);

export type OfficialFragmentExtractionType = 'visible_text' | 'meta' | 'json_ld' | 'http_header_note';
const EXTRACTION_TYPES: readonly OfficialFragmentExtractionType[] = Object.freeze(['visible_text', 'meta', 'json_ld', 'http_header_note']);

export type FragmentStance = 'supports' | 'contradicts';
const STANCES: readonly FragmentStance[] = Object.freeze(['supports', 'contradicts']);

/**
 * Safe aggregate HTTP receipt — only booleans/counts. Anonymous means: no auth, no
 * cookies sent or stored, no proxy, and the raw body is NEVER committed.
 */
export interface HttpSafetyReceipt {
  authenticationUsed: false;
  cookiesSent: false;
  cookiesStored: false;
  proxyConfigured: false;
  bodyPersisted: false;
  redirectsObserved: number;
  externalRedirectsBlocked: number;
}

export interface OfficialSourceFragment {
  fragmentId: string;
  sourceId: string;
  extractionType: OfficialFragmentExtractionType;
  /** CSS selector, semantic locator, or metadata/header path. */
  locator: string;
  /** Concise NORMALIZED text (bounded; never a full page). */
  text: string;
  textLength: number;
  /** Claim IDs this fragment MAY address (does not by itself make them supported). */
  claimIds: string[];
  /** Material assertion-component IDs this fragment addresses (may be empty). */
  assertionComponentIds: string[];
  /** Whether the fragment supports or contradicts the claim wording. */
  stance: FragmentStance;
  fragmentDigest: string;
  limitation: string;
}

export interface OfficialStructuredMetadata {
  pageTitle?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  jsonLdType?: string | null;
}

export interface OfficialSourceCapture {
  sourceId: string;
  exchangeId: string;
  requestedUrl: string;
  /** Null when no official final document was resolved (terminal/external states). */
  finalUrl: string | null;
  redirectChain: string[];
  capturedAt: string;
  captureMethod: string;
  captureTool: string;
  runtimeVersion: string;
  httpStatus: number | null;
  contentType: string | null;
  /** Scope the source plan EXPECTED for this candidate. */
  declaredScope: OfficialSourceScope;
  /** Scope actually classified from the served document. */
  observedScope: OfficialSourceScope;
  currency: SourceCurrency;
  outcome: OfficialSourceOutcome;
  responseBytes: number;
  /** sha256 of the raw response body (the body itself is NEVER committed). */
  bodyDigest: string;
  fragments: OfficialSourceFragment[];
  structuredMetadata: OfficialStructuredMetadata;
  runtimeReceipt: HttpSafetyReceipt;
  warnings: string[];
  limitations: string[];
  sourceDigest: string;
}

export interface SourceValidationIssue { field: string; code: string; message: string; }
export interface SourceValidationResult { ok: boolean; value?: OfficialSourceCapture; issues: SourceValidationIssue[]; }

/* ── bounds ── */
export const MAX_SOURCE_FRAGMENT_TEXT = 300;
export const MAX_SOURCE_FRAGMENTS = 40;
export const MAX_SOURCE_REDIRECTS = 10;
export const MAX_SOURCE_METADATA_FIELD = 400;
export const MAX_SOURCE_LOCATOR = 200;
export const MAX_SOURCE_WARNINGS = 20;
export const MAX_SOURCE_STRING = 300;
export const MAX_SOURCE_CLAIM_IDS = 13;
export const MAX_SOURCE_COMPONENT_IDS = 13;

const CANONICAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const COMPONENT_SLUG = /^[a-z0-9][a-z0-9._-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const ALLOWED_METADATA_KEYS = ['pageTitle', 'description', 'canonicalUrl', 'ogTitle', 'ogDescription', 'jsonLdType'];
const RECEIPT_FALSE_KEYS: (keyof HttpSafetyReceipt)[] = ['authenticationUsed', 'cookiesSent', 'cookiesStored', 'proxyConfigured', 'bodyPersisted'];
const RECEIPT_COUNT_KEYS: (keyof HttpSafetyReceipt)[] = ['redirectsObserved', 'externalRedirectsBlocked'];
const RECEIPT_KEYS: (keyof HttpSafetyReceipt)[] = [...RECEIPT_FALSE_KEYS, ...RECEIPT_COUNT_KEYS];

const OFFICIAL_BYBIT_HOSTS = (host: string) => host === 'bybit.com' || host === 'www.bybit.com' || host.endsWith('.bybit.com');

/* ── artifact safety (mirrors the packet/rendered scans) ── */
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
function scanUnsafeDeep(value: unknown, path: string, issues: SourceValidationIssue[]): void {
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
  if (/^\s*[[{]/.test(text) && /"\s*:/.test(text)) return true;
  if ((text.match(/[<>]/g) || []).length >= 4) return true;
  return false;
}

/* ── digests (complete subject) ── */
export function computeOfficialFragmentDigest(
  f: Pick<OfficialSourceFragment, 'extractionType' | 'locator' | 'text' | 'claimIds' | 'assertionComponentIds' | 'stance'>,
): string {
  const canonical = JSON.stringify({
    extractionType: f.extractionType,
    locator: f.locator,
    text: f.text,
    claimIds: [...f.claimIds].sort(),
    assertionComponentIds: [...f.assertionComponentIds].sort(),
    stance: f.stance,
  });
  return 'sha256:' + createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function canonicalFragment(f: OfficialSourceFragment): Record<string, unknown> {
  return {
    fragmentId: f.fragmentId,
    sourceId: f.sourceId,
    extractionType: f.extractionType,
    locator: f.locator,
    text: f.text,
    textLength: f.textLength,
    claimIds: [...(f.claimIds || [])].sort(),
    assertionComponentIds: [...(f.assertionComponentIds || [])].sort(),
    stance: f.stance,
    limitation: f.limitation,
    fragmentDigest: f.fragmentDigest,
  };
}

/** Canonical serialization of EVERY committed field (sourceDigest excluded). */
export function canonicalOfficialSource(c: OfficialSourceCapture): string {
  const md: Record<string, unknown> = {};
  for (const k of ALLOWED_METADATA_KEYS) md[k] = (c.structuredMetadata as Record<string, unknown>)?.[k] ?? null;
  const receipt: Record<string, unknown> = {};
  for (const k of RECEIPT_KEYS) receipt[k] = (c.runtimeReceipt as unknown as Record<string, unknown>)?.[k];
  return JSON.stringify({
    sourceId: c.sourceId,
    exchangeId: c.exchangeId,
    requestedUrl: c.requestedUrl,
    finalUrl: c.finalUrl ?? null,
    redirectChain: c.redirectChain,
    capturedAt: c.capturedAt,
    captureMethod: c.captureMethod,
    captureTool: c.captureTool,
    runtimeVersion: c.runtimeVersion,
    httpStatus: c.httpStatus,
    contentType: c.contentType,
    declaredScope: c.declaredScope,
    observedScope: c.observedScope,
    currency: c.currency,
    outcome: c.outcome,
    responseBytes: c.responseBytes,
    bodyDigest: c.bodyDigest,
    fragments: c.fragments.map(canonicalFragment),
    structuredMetadata: md,
    runtimeReceipt: receipt,
    warnings: c.warnings,
    limitations: c.limitations,
  });
}

export function computeOfficialSourceDigest(c: OfficialSourceCapture): string {
  return 'sha256:' + createHash('sha256').update(canonicalOfficialSource(c), 'utf8').digest('hex');
}

/* ── fragment validation ── */
function validateFragment(f: unknown, index: number, sourceId: string, allowedClaimIds: Set<string>, issues: SourceValidationIssue[]): void {
  const path = `fragments.${index}`;
  if (typeof f !== 'object' || f === null) { issues.push({ field: path, code: 'NOT_OBJECT', message: 'Fragment must be an object.' }); return; }
  const r = f as Record<string, unknown>;
  if (!hasText(r.fragmentId) || !CANONICAL_SLUG.test(r.fragmentId as string)) issues.push({ field: `${path}.fragmentId`, code: 'INVALID_ID', message: 'fragmentId must be a canonical slug.' });
  if (r.sourceId !== sourceId) issues.push({ field: `${path}.sourceId`, code: 'SOURCE_MISMATCH', message: 'Fragment sourceId must match the source.' });
  if (!EXTRACTION_TYPES.includes(r.extractionType as OfficialFragmentExtractionType)) issues.push({ field: `${path}.extractionType`, code: 'INVALID_TYPE', message: 'Unknown extractionType.' });
  if (!hasText(r.locator) || (r.locator as string).length > MAX_SOURCE_LOCATOR || resemblesRawPayload(r.locator as string)) issues.push({ field: `${path}.locator`, code: 'INVALID_LOCATOR', message: `locator required, ≤ ${MAX_SOURCE_LOCATOR} chars, not raw markup.` });
  if (!hasText(r.text)) issues.push({ field: `${path}.text`, code: 'EMPTY_FRAGMENT', message: 'Fragment text must be non-empty.' });
  else {
    const text = r.text as string;
    if (text.length > MAX_SOURCE_FRAGMENT_TEXT) issues.push({ field: `${path}.text`, code: 'FRAGMENT_TOO_LONG', message: `Fragment exceeds ${MAX_SOURCE_FRAGMENT_TEXT} chars.` });
    if (resemblesRawPayload(text)) issues.push({ field: `${path}.text`, code: 'RAW_PAYLOAD', message: 'Fragment resembles full HTML / script / JSON dump.' });
  }
  if (typeof r.textLength !== 'number' || !Number.isInteger(r.textLength) || (typeof r.text === 'string' && r.textLength !== (r.text as string).length)) issues.push({ field: `${path}.textLength`, code: 'INVALID_LENGTH', message: 'textLength must equal text.length.' });
  if (!Array.isArray(r.claimIds) || r.claimIds.length === 0 || r.claimIds.length > MAX_SOURCE_CLAIM_IDS || !r.claimIds.every((c) => typeof c === 'string' && allowedClaimIds.has(c)) || new Set(r.claimIds as string[]).size !== (r.claimIds as string[]).length) issues.push({ field: `${path}.claimIds`, code: 'INVALID_CLAIM_IDS', message: 'claimIds must be non-empty unique known Bybit claim IDs within bounds.' });
  if (!Array.isArray(r.assertionComponentIds) || r.assertionComponentIds.length > MAX_SOURCE_COMPONENT_IDS || !r.assertionComponentIds.every((c) => typeof c === 'string' && COMPONENT_SLUG.test(c)) || new Set(r.assertionComponentIds as string[]).size !== (r.assertionComponentIds as string[]).length) issues.push({ field: `${path}.assertionComponentIds`, code: 'INVALID_COMPONENT_IDS', message: 'assertionComponentIds must be unique component slugs within bounds.' });
  if (!STANCES.includes(r.stance as FragmentStance)) issues.push({ field: `${path}.stance`, code: 'INVALID_STANCE', message: 'stance must be supports or contradicts.' });
  if (typeof r.limitation !== 'string' || r.limitation.length > MAX_SOURCE_STRING || resemblesRawPayload(r.limitation)) issues.push({ field: `${path}.limitation`, code: 'INVALID_LIMITATION', message: `limitation required, ≤ ${MAX_SOURCE_STRING} chars, not raw markup.` });
  if (!hasText(r.fragmentDigest) || !SHA256.test(r.fragmentDigest as string)) issues.push({ field: `${path}.fragmentDigest`, code: 'INVALID_DIGEST', message: 'fragmentDigest must be sha256.' });
  else if (EXTRACTION_TYPES.includes(r.extractionType as OfficialFragmentExtractionType) && typeof r.locator === 'string' && typeof r.text === 'string' && Array.isArray(r.claimIds) && Array.isArray(r.assertionComponentIds) && STANCES.includes(r.stance as FragmentStance)) {
    const recomputed = computeOfficialFragmentDigest({ extractionType: r.extractionType as OfficialFragmentExtractionType, locator: r.locator as string, text: r.text as string, claimIds: r.claimIds as string[], assertionComponentIds: r.assertionComponentIds as string[], stance: r.stance as FragmentStance });
    if (recomputed !== r.fragmentDigest) issues.push({ field: `${path}.fragmentDigest`, code: 'FRAGMENT_DIGEST_MISMATCH', message: 'fragmentDigest does not recompute (tampered).' });
  }
}

/**
 * Centralized outcome matrix. Only `content` may carry claim fragments; terminal/wall/
 * redirect outcomes must not fabricate a document.
 */
function validateOutcomeMatrix(r: Record<string, unknown>, issues: SourceValidationIssue[]): void {
  const outcome = r.outcome as OfficialSourceOutcome;
  if (!OFFICIAL_SOURCE_OUTCOMES.includes(outcome)) return;
  const frags = Array.isArray(r.fragments) ? r.fragments : [];
  const status = r.httpStatus;
  const finalOfficial = isOfficialBybitUrl(r.finalUrl);
  const ct = typeof r.contentType === 'string' ? (r.contentType as string).toLowerCase().split(';')[0].trim() : null;

  if (outcome !== 'content' && frags.length > 0) {
    issues.push({ field: 'fragments', code: 'MATRIX_NO_CLAIM_FRAGMENTS', message: `outcome=${outcome} must not carry fragments.` });
  }

  switch (outcome) {
    case 'content': {
      if (!finalOfficial) issues.push({ field: 'finalUrl', code: 'MATRIX_CONTENT_FINAL_URL', message: 'content requires a confirmed official finalUrl.' });
      if (!(typeof status === 'number' && status >= 200 && status <= 299)) issues.push({ field: 'httpStatus', code: 'MATRIX_CONTENT_STATUS', message: 'content requires a 2xx httpStatus.' });
      if (!(ct && CONTENT_TYPES.includes(ct))) issues.push({ field: 'contentType', code: 'MATRIX_CONTENT_TYPE', message: `content requires an allowlisted content type (${CONTENT_TYPES.join(', ')}).` });
      if (frags.length < 1) issues.push({ field: 'fragments', code: 'MATRIX_CONTENT_NEEDS_FRAGMENT', message: 'content requires at least one validated fragment.' });
      break;
    }
    case 'redirect_only': {
      if (!finalOfficial) issues.push({ field: 'finalUrl', code: 'MATRIX_REDIRECT_FINAL_URL', message: 'redirect_only requires a confirmed official finalUrl.' });
      const hasRedirect = (Array.isArray(r.redirectChain) && (r.redirectChain as unknown[]).length > 0) || (typeof r.finalUrl === 'string' && r.finalUrl !== r.requestedUrl);
      if (!hasRedirect) issues.push({ field: 'redirectChain', code: 'MATRIX_REDIRECT_NEEDS_EVIDENCE', message: 'redirect_only requires actual redirect evidence.' });
      break;
    }
    case 'spa_shell':
    case 'not_found':
    case 'empty': {
      // Reachable official response but the target content was not server-observable.
      if (!(typeof status === 'number' && status >= 100 && status <= 599)) issues.push({ field: 'httpStatus', code: 'MATRIX_REACHABLE_STATUS', message: `${outcome} requires an observed HTTP status.` });
      break;
    }
    case 'login_wall':
    case 'captcha_or_bot_wall':
    case 'geo_restricted':
      break;
    case 'timeout':
    case 'network_error':
    case 'external_redirect': {
      if (r.finalUrl !== null) issues.push({ field: 'finalUrl', code: 'MATRIX_NO_DOCUMENT', message: `${outcome} must not present a finalUrl (must be null).` });
      if (status !== null) issues.push({ field: 'httpStatus', code: 'MATRIX_NO_DOCUMENT', message: `${outcome} requires a null httpStatus.` });
      if (r.contentType !== null) issues.push({ field: 'contentType', code: 'MATRIX_NO_DOCUMENT', message: `${outcome} requires a null contentType.` });
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
 * Validate an OfficialSourceCapture fail-closed. `allowedClaimIds` is the code-owned
 * Bybit claim inventory (injected to avoid a circular import).
 */
export function validateOfficialSourceCapture(input: unknown, allowedClaimIds: readonly string[]): SourceValidationResult {
  const issues: SourceValidationIssue[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: [{ field: '$', code: 'NOT_OBJECT', message: 'Source must be an object.' }] };
  }
  const r = input as Record<string, unknown>;
  const claimSet = new Set(allowedClaimIds);

  if (!hasText(r.sourceId) || !CANONICAL_SLUG.test(r.sourceId as string)) issues.push({ field: 'sourceId', code: 'INVALID_ID', message: 'sourceId must be a canonical slug.' });
  if (r.exchangeId !== 'bybit') issues.push({ field: 'exchangeId', code: 'EXCHANGE_NOT_BYBIT', message: 'exchangeId must be bybit.' });

  if (!isOfficialBybitUrl(r.requestedUrl)) issues.push({ field: 'requestedUrl', code: 'NON_OFFICIAL_URL', message: 'requestedUrl must be an official HTTPS Bybit URL with no credentials/unsafe params.' });
  if (!(r.finalUrl === null || isOfficialBybitUrl(r.finalUrl))) issues.push({ field: 'finalUrl', code: 'NON_OFFICIAL_URL', message: 'finalUrl must be an official HTTPS Bybit URL or null.' });

  if (!Array.isArray(r.redirectChain)) issues.push({ field: 'redirectChain', code: 'INVALID_ARRAY', message: 'redirectChain must be an array.' });
  else {
    if (r.redirectChain.length > MAX_SOURCE_REDIRECTS) issues.push({ field: 'redirectChain', code: 'TOO_MANY_REDIRECTS', message: `redirectChain exceeds ${MAX_SOURCE_REDIRECTS}.` });
    r.redirectChain.forEach((u, i) => { if (!isOfficialBybitUrl(u)) issues.push({ field: `redirectChain.${i}`, code: 'NON_OFFICIAL_URL', message: 'Every redirect URL must be an official HTTPS Bybit URL (no external redirect).' }); });
  }

  if (!parseExactIsoDateTime(r.capturedAt)) issues.push({ field: 'capturedAt', code: 'INEXACT_TIMESTAMP', message: 'capturedAt must be an exact ISO datetime.' });
  if (!hasText(r.captureMethod) || (r.captureMethod as string).length > MAX_SOURCE_STRING) issues.push({ field: 'captureMethod', code: 'REQUIRED', message: 'captureMethod required.' });
  if (!hasText(r.captureTool) || (r.captureTool as string).length > MAX_SOURCE_STRING) issues.push({ field: 'captureTool', code: 'REQUIRED', message: 'captureTool required.' });
  if (!hasText(r.runtimeVersion) || (r.runtimeVersion as string).length > MAX_SOURCE_STRING) issues.push({ field: 'runtimeVersion', code: 'REQUIRED', message: 'runtimeVersion required.' });

  if (!(r.httpStatus === null || (typeof r.httpStatus === 'number' && Number.isInteger(r.httpStatus) && (r.httpStatus as number) >= 100 && (r.httpStatus as number) <= 599))) issues.push({ field: 'httpStatus', code: 'INVALID_STATUS', message: 'httpStatus must be an integer 100–599 or null.' });
  if (!(r.contentType === null || hasText(r.contentType))) issues.push({ field: 'contentType', code: 'INVALID', message: 'contentType must be a non-empty string or null.' });

  if (!OFFICIAL_SOURCE_SCOPES.includes(r.declaredScope as OfficialSourceScope)) issues.push({ field: 'declaredScope', code: 'INVALID_SCOPE', message: 'Unknown declaredScope.' });
  if (!OFFICIAL_SOURCE_SCOPES.includes(r.observedScope as OfficialSourceScope)) issues.push({ field: 'observedScope', code: 'INVALID_SCOPE', message: 'Unknown observedScope.' });
  if (!SOURCE_CURRENCIES.includes(r.currency as SourceCurrency)) issues.push({ field: 'currency', code: 'INVALID_CURRENCY', message: 'Unknown currency.' });
  if (!OFFICIAL_SOURCE_OUTCOMES.includes(r.outcome as OfficialSourceOutcome)) issues.push({ field: 'outcome', code: 'INVALID_OUTCOME', message: 'Unknown outcome.' });

  if (!(typeof r.responseBytes === 'number' && Number.isInteger(r.responseBytes) && (r.responseBytes as number) >= 0)) issues.push({ field: 'responseBytes', code: 'INVALID_BYTES', message: 'responseBytes must be a non-negative integer.' });
  if (!hasText(r.bodyDigest) || !SHA256.test(r.bodyDigest as string)) issues.push({ field: 'bodyDigest', code: 'INVALID_DIGEST', message: 'bodyDigest must be sha256.' });

  // Safe HTTP receipt.
  const rc = r.runtimeReceipt as Record<string, unknown> | undefined;
  if (!rc || typeof rc !== 'object' || Array.isArray(rc)) issues.push({ field: 'runtimeReceipt', code: 'REQUIRED', message: 'runtimeReceipt required.' });
  else {
    for (const k of RECEIPT_FALSE_KEYS) if (rc[k] !== false) issues.push({ field: `runtimeReceipt.${k}`, code: 'RECEIPT_VIOLATION', message: `${k} must be false.` });
    for (const k of RECEIPT_COUNT_KEYS) if (!(typeof rc[k] === 'number' && Number.isInteger(rc[k]) && (rc[k] as number) >= 0)) issues.push({ field: `runtimeReceipt.${k}`, code: 'RECEIPT_VIOLATION', message: `${k} must be a non-negative integer.` });
    for (const k of Object.keys(rc)) if (!(RECEIPT_KEYS as string[]).includes(k)) issues.push({ field: `runtimeReceipt.${k}`, code: 'RECEIPT_UNKNOWN_FIELD', message: 'Unknown runtimeReceipt field.' });
  }

  // Fragments.
  if (!Array.isArray(r.fragments)) issues.push({ field: 'fragments', code: 'INVALID_ARRAY', message: 'fragments must be an array.' });
  else {
    if (r.fragments.length > MAX_SOURCE_FRAGMENTS) issues.push({ field: 'fragments', code: 'TOO_MANY_FRAGMENTS', message: `fragments exceed ${MAX_SOURCE_FRAGMENTS}.` });
    const fids = new Set<string>();
    r.fragments.forEach((f, i) => {
      validateFragment(f, i, r.sourceId as string, claimSet, issues);
      const id = (f as Record<string, unknown>)?.fragmentId;
      if (typeof id === 'string') { if (fids.has(id)) issues.push({ field: 'fragments', code: 'DUPLICATE_FRAGMENT', message: 'fragmentId must be unique.' }); fids.add(id); }
    });
  }

  validateOutcomeMatrix(r, issues);

  // Structured metadata: allowlisted bounded raw-safe scalars; canonicalUrl official.
  const md = r.structuredMetadata;
  if (typeof md !== 'object' || md === null || Array.isArray(md)) issues.push({ field: 'structuredMetadata', code: 'INVALID', message: 'structuredMetadata must be an object.' });
  else {
    for (const [k, v] of Object.entries(md)) {
      if (!ALLOWED_METADATA_KEYS.includes(k)) issues.push({ field: `structuredMetadata.${k}`, code: 'DISALLOWED_METADATA', message: 'Only allowlisted scalar metadata fields are permitted.' });
      else if (!(v === null || (typeof v === 'string' && v.length <= MAX_SOURCE_METADATA_FIELD && !resemblesRawPayload(v)))) issues.push({ field: `structuredMetadata.${k}`, code: 'INVALID_METADATA', message: `Metadata must be null or a bounded raw-safe string ≤ ${MAX_SOURCE_METADATA_FIELD} chars.` });
    }
    const canon = (md as Record<string, unknown>).canonicalUrl;
    if (canon != null && !isOfficialBybitUrl(canon)) issues.push({ field: 'structuredMetadata.canonicalUrl', code: 'NON_OFFICIAL_URL', message: 'canonicalUrl must be an official HTTPS Bybit URL or null.' });
  }

  if (!Array.isArray(r.warnings) || r.warnings.length > MAX_SOURCE_WARNINGS || !r.warnings.every((w) => typeof w === 'string' && w.length <= MAX_SOURCE_STRING && !resemblesRawPayload(w))) issues.push({ field: 'warnings', code: 'INVALID_ARRAY', message: `warnings must be ≤ ${MAX_SOURCE_WARNINGS} bounded raw-safe strings.` });
  if (!Array.isArray(r.limitations) || r.limitations.length > MAX_SOURCE_WARNINGS || !r.limitations.every((l) => typeof l === 'string' && l.length <= MAX_SOURCE_STRING && !resemblesRawPayload(l))) issues.push({ field: 'limitations', code: 'INVALID_ARRAY', message: `limitations must be ≤ ${MAX_SOURCE_WARNINGS} bounded raw-safe strings.` });

  // Recompute the source digest (complete subject).
  if (!hasText(r.sourceDigest) || !SHA256.test(r.sourceDigest as string)) {
    issues.push({ field: 'sourceDigest', code: 'INVALID_DIGEST', message: 'sourceDigest must be sha256.' });
  } else if (issues.length === 0) {
    const recomputed = computeOfficialSourceDigest(input as OfficialSourceCapture);
    if (recomputed !== r.sourceDigest) issues.push({ field: 'sourceDigest', code: 'SOURCE_DIGEST_MISMATCH', message: 'sourceDigest does not recompute (tampered).' });
  }

  scanUnsafeDeep(r, '$', issues);

  if (issues.length) return { ok: false, issues };
  return { ok: true, value: input as OfficialSourceCapture, issues };
}

/** True when a source may back a SUPPORTED claim (official content outcome). */
export function sourceMaySupportClaims(c: OfficialSourceCapture): boolean {
  return c.exchangeId === 'bybit' && isOfficialBybitUrl(c.finalUrl) && CONTENT_OUTCOMES.includes(c.outcome);
}

/** True when the source reached an official HTTP response (reachable, not a wall/error). */
export function sourceWasReachable(c: OfficialSourceCapture): boolean {
  return REACHABLE_OUTCOMES.includes(c.outcome);
}

/**
 * Fragment-level admissibility: a specific fragment on a specific source may address
 * `claimId` with the given stance only when the source permits support, the fragment
 * exists, its claimIds include the exact claim, and it has a locator.
 */
export function officialFragmentAddressesClaim(c: OfficialSourceCapture, fragmentId: string, claimId: string, stance: FragmentStance): boolean {
  if (!sourceMaySupportClaims(c)) return false;
  const frag = c.fragments.find((f) => f.fragmentId === fragmentId);
  if (!frag) return false;
  return frag.stance === stance && hasText(frag.locator) && Array.isArray(frag.claimIds) && frag.claimIds.includes(claimId);
}
