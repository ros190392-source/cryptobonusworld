/**
 * geo-bonus-capture.mjs — shared config, evidence schema, and detection
 * helpers for scripts/verify-geo-bonus.mjs.
 *
 * !! Mirrors src/data/geoBonusEvidence.ts and src/data/geoRankings.ts !!
 * Plain .mjs by necessity — Node scripts here cannot import .ts directly.
 * Keep the country/device/exchange lists in sync if those files change.
 *
 * Rules (non-negotiable):
 *  - postSignupVerification always defaults to 'not_available' — this tool
 *    never performs or claims dashboard/account-level verification.
 *  - A country capture never runs un-proxied. Missing proxy env → 'skipped'.
 *  - Never log or persist the resolved proxy host/credentials — only the
 *    env var NAME is recorded.
 *  - 'global' is not proxied (direct connection is the correct baseline).
 *  - 'european-union' is not a capture target — not a real country.
 */

import { createHash } from 'crypto';
import { AFFILIATE_SNAPSHOT } from './affiliate-snapshot.mjs';

// ── Capture matrix (mirrors geoRankings.SUPPORTED_PROMO_COUNTRIES minus EU) ─
export const CAPTURE_COUNTRIES = [
  'global', 'poland', 'germany', 'kazakhstan', 'turkey', 'united-kingdom', 'united-states',
];
export const CAPTURE_DEVICES = ['desktop', 'mobile'];
export const CAPTURE_EXCHANGES = ['bybit', 'mexc', 'okx', 'bitget', 'kucoin', 'bingx'];

export const PROXY_ENV_PLACEHOLDERS = {
  poland: 'PROXY_PL',
  germany: 'PROXY_DE',
  kazakhstan: 'PROXY_KZ',
  turkey: 'PROXY_TR',
  'united-kingdom': 'PROXY_UK',
  'united-states': 'PROXY_US',
  // 'global' intentionally absent — no proxy required.
};

// Maps our country slug to the 2-letter geo code our own /go/{exchange}
// redirect already understands (see src/pages/go/[exchange].astro, which
// reads ?geo= to select ex.affiliateLinks.geo[geo], same codes cbw_geo
// stores). 'global' sends no geo param — that's the untargeted baseline.
export const GEO_PARAM_MAP = {
  poland: 'pl',
  germany: 'de',
  kazakhstan: 'kz',
  turkey: 'tr',
  'united-kingdom': 'gb',
  'united-states': 'us',
};

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false },
  mobile:  { width: 390,  height: 844, isMobile: true,  hasTouch: true },
};
export const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const MOBILE_UA  = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

export const DEFAULT_BASE_URL = 'https://cryptobonusworld.com';

// ── Timeouts ──────────────────────────────────────────────────────────────
// Proxied navigation goes through residential/mobile exits that are MUCH
// slower than direct connections (observed: mexc.com through PROXY_KZ takes
// >60s to first byte). navigationTimeoutMs applies to proxied runs;
// softTimeoutMs keeps un-proxied (global baseline) runs fast.
export const TIMEOUTS = {
  navigationTimeoutMs: 90000, // proxied page.goto
  softTimeoutMs: 30000,       // un-proxied page.goto (global)
  targetTimeoutMs: 90000,     // overall per-target budget (== navigation)
  settleTimeoutMs: 20000,     // best-effort networkidle after goto
  preflightTimeoutMs: 15000,  // per-request preflight budget
  partialCaptureMs: 10000,    // screenshot/html attempts after a timeout
};

// ── Failure classification ────────────────────────────────────────────────
export const ERROR_CLASSES = [
  'BASE_SITE_UNREACHABLE',  // our own site unreachable through this route
  'GO_ROUTE_UNREACHABLE',   // /go/{exchange} itself failed
  'TARGET_TIMEOUT',         // exchange target too slow (direct connection)
  'PROXY_TARGET_TIMEOUT',   // exchange target too slow THROUGH the proxy
  'CLOUDFLARE_BLOCKED',     // challenge/anti-bot interstitial detected
  'PROXY_BLOCKED',          // proxy tunnel/auth failed
  'BROWSER_PROXY_RENDER_FAILURE', // preflight reached everything, but Chromium landed on chrome-error:// through the proxy
  'NETWORK_FAILURE',        // DNS/connection-level failure
  'UNKNOWN_FAILURE',
];

// Anti-bot / challenge interstitials (checked against partial text+HTML).
export const CHALLENGE_RE = /(checking your browser|just a moment|attention required|cf-browser-verification|verify (that )?you are (a )?human|ddos[- ]protection|enable javascript and cookies)/i;

/**
 * Map a capture failure to an ERROR_CLASSES value. A timeout on the exchange
 * target is NEVER a country restriction — when preflight proved the proxy
 * exit, our base site and the /go route all work, a slow/unreachable target
 * is classified as (PROXY_)TARGET_TIMEOUT and stays status='error'.
 */
export function classifyFailure({ message = '', proxied = false, preflight = null, partialText = '', partialHtml = '', partialUrl = '' }) {
  const msg = message || '';
  if (CHALLENGE_RE.test(partialText) || CHALLENGE_RE.test(partialHtml)) return 'CLOUDFLARE_BLOCKED';
  if (/ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY_|ERR_NO_SUPPORTED_PROXIES|ERR_SOCKS_CONNECTION/i.test(msg)) return 'PROXY_BLOCKED';
  // Chromium landed on chrome-error:// through a proxy that preflight PROVED
  // can reach the exit/base//go route — a browser-level rendering/tunnel
  // problem, never a country restriction. If the target itself also failed
  // preflight, it's the target being slow/unreachable through this proxy.
  const hitChromeError = /chrome-error:/i.test(msg) || /^chrome-error:/i.test(partialUrl || '');
  if (proxied && hitChromeError && preflight?.baseReachable && preflight?.goRouteReachable) {
    return preflight?.targetReachable === false ? 'PROXY_TARGET_TIMEOUT' : 'BROWSER_PROXY_RENDER_FAILURE';
  }
  if (/ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_|ERR_INTERNET_DISCONNECTED|ERR_ADDRESS_UNREACHABLE|ERR_EMPTY_RESPONSE|ERR_HTTP2_PROTOCOL_ERROR|net::ERR_|chrome-error:/i.test(msg)) return 'NETWORK_FAILURE';
  if (preflight) {
    if (preflight.baseReachable === false) return 'BASE_SITE_UNREACHABLE';
    if (preflight.goRouteReachable === false) return 'GO_ROUTE_UNREACHABLE';
  }
  if (/Timeout .*exceeded|TimeoutError|timed? ?out/i.test(msg)) return proxied ? 'PROXY_TARGET_TIMEOUT' : 'TARGET_TIMEOUT';
  return 'UNKNOWN_FAILURE';
}

// ── Proxy resolution ─────────────────────────────────────────────────────
// Never hardcode credentials. Only reads process.env at call time and never
// returns the raw value to a caller that might log/persist it — call
// resolveProxy() to get { configured, playwrightProxy, envKey } and use
// describeProxy() for anything that gets written to disk/console.
export function resolveProxy(countrySlug) {
  if (countrySlug === 'global') {
    return { configured: true, required: false, envKey: null, playwrightProxy: null };
  }
  const envKey = PROXY_ENV_PLACEHOLDERS[countrySlug] ?? null;
  if (!envKey) {
    // Country has no proxy mapping at all (shouldn't happen for supported slugs).
    return { configured: false, required: true, envKey: null, playwrightProxy: null };
  }
  const raw = process.env[envKey];
  if (!raw) {
    return { configured: false, required: true, envKey, playwrightProxy: null };
  }
  try {
    // Accept "http://user:pass@host:port" or bare "host:port".
    const hasScheme = /^[a-z]+:\/\//i.test(raw);
    const url = new URL(hasScheme ? raw : `http://${raw}`);
    const playwrightProxy = {
      server: `${url.protocol}//${url.hostname}:${url.port || 80}`,
      username: url.username || undefined,
      password: url.password || undefined,
    };
    return { configured: true, required: true, envKey, playwrightProxy };
  } catch {
    return { configured: false, required: true, envKey, invalid: true, playwrightProxy: null };
  }
}

/** Safe-to-log description of a resolved proxy — never includes host/credentials. */
export function describeProxy(proxyInfo) {
  if (!proxyInfo.required) return 'not required (global)';
  if (!proxyInfo.envKey) return 'no proxy env mapping for this country';
  if (proxyInfo.invalid) return `${proxyInfo.envKey} set but invalid — credentials redacted`;
  if (!proxyInfo.configured) return `${proxyInfo.envKey} not set`;
  return `${proxyInfo.envKey} configured (host redacted)`;
}

// ── Target URL ────────────────────────────────────────────────────────────
// Always the internal /go/{exchange} route — never a raw affiliate URL, so
// this tool exercises the exact path a real visitor takes, including our
// own geo-resolution logic.
export function buildTestedUrl(exchangeSlug, countrySlug, baseUrl = DEFAULT_BASE_URL) {
  const geo = GEO_PARAM_MAP[countrySlug];
  return geo ? `${baseUrl}/go/${exchangeSlug}?geo=${geo}` : `${baseUrl}/go/${exchangeSlug}`;
}

// ── Detection ─────────────────────────────────────────────────────────────
const BONUS_RE = /\b(bonus|welcome|reward|usdt|up to|deposit|trading bonus)\b/i;
const PROMO_RE = /\b(promo code|referral code|invite code)\b/i;
const RESTRICTION_RE = /(not available in your|restricted|cannot provide services|unsupported country|not eligible|region not supported|access denied)/i;
const TERMS_RE = /(terms and conditions|terms apply|subject to (our )?terms)/i;

function snippetAround(text, matchIndex, radius = 90) {
  if (matchIndex < 0) return null;
  return text.slice(Math.max(0, matchIndex - radius), matchIndex + radius).replace(/\s+/g, ' ').trim();
}

/**
 * Conservative, non-exchange-specific detection. Bonus/promo-keyword/
 * restriction/terms regexes run ONLY against visible rendered text
 * (document.body.innerText) — modern exchange SPAs embed large i18n JSON
 * blobs in their raw HTML containing strings like "not eligible" that were
 * never shown to a user; matching those in markup produces false positives
 * (observed live against mexc.com during v1 smoke testing). Raw HTML is
 * used only as a secondary check for the exact KNOWN promo code string,
 * which carries much lower false-positive risk than a generic keyword.
 * Restriction always takes priority over bonus text — a page that says
 * "not available in your region" is never 'shown', even if bonus marketing
 * copy is also present elsewhere on the page.
 */
export function detectSignals(rawText, rawHtml, exchangeSlug) {
  const text = (rawText || '').replace(/\s+/g, ' ');
  const lower = text.toLowerCase();
  const htmlLower = (rawHtml || '').toLowerCase();
  const knownCode = AFFILIATE_SNAPSHOT[exchangeSlug]?.promoCode ?? null;

  const restrictionMatch = lower.match(RESTRICTION_RE);
  const bonusMatch = lower.match(BONUS_RE);
  const hasDollarSign = text.includes('$');
  const promoKeywordMatch = lower.match(PROMO_RE);
  const termsMatch = lower.match(TERMS_RE);
  const knownCodeFound = knownCode
    ? (lower.includes(knownCode.toLowerCase()) || htmlLower.includes(knownCode.toLowerCase()))
    : false;

  const detectedRestrictionText = restrictionMatch ? snippetAround(text, restrictionMatch.index) : null;
  const detectedBonusText = bonusMatch
    ? snippetAround(text, bonusMatch.index)
    : (hasDollarSign ? snippetAround(text, text.indexOf('$')) : null);
  const detectedTermsText = termsMatch ? snippetAround(text, termsMatch.index) : null;
  const detectedPromoCode = knownCodeFound
    ? knownCode
    : (promoKeywordMatch ? snippetAround(text, promoKeywordMatch.index) : null);

  let status;
  let confidence;
  if (detectedRestrictionText) {
    status = 'blocked';
    confidence = 'partial'; // page loaded and gave a clear signal, but not a dedicated official source
  } else if (knownCodeFound) {
    status = 'shown';
    confidence = 'verified';
  } else if (detectedBonusText) {
    status = 'shown';
    confidence = 'partial';
  } else if (promoKeywordMatch) {
    status = 'unclear';
    confidence = 'unknown';
  } else {
    status = 'not_shown';
    confidence = 'unknown';
  }

  return { status, confidence, detectedBonusText, detectedPromoCode, detectedRestrictionText, detectedTermsText };
}

// ── Evidence snapshot schema ─────────────────────────────────────────────
/**
 * @typedef {Object} GeoBonusCaptureSnapshot
 * @property {string} exchangeSlug
 * @property {string} countrySlug
 * @property {'desktop'|'mobile'} deviceViewport
 * @property {string} testedUrl
 * @property {string|null} finalUrl
 * @property {string[]} redirectChain
 * @property {number|null} httpStatus
 * @property {string} capturedAt
 * @property {string|null} screenshotPath
 * @property {string|null} htmlSnapshotPath
 * @property {string|null} screenshotHash
 * @property {string|null} detectedBonusText
 * @property {string|null} detectedPromoCode
 * @property {string|null} detectedRestrictionText
 * @property {string|null} detectedTermsText
 * @property {'shown'|'not_shown'|'blocked'|'redirected'|'unclear'|'skipped'|'error'} status
 * @property {'verified'|'partial'|'unknown'} confidence
 * @property {'not_available'|'verified'|'not_verified'|'blocked'} postSignupVerification
 * @property {string|null} note
 * @property {string|null} errorClass  one of ERROR_CLASSES when status='error'
 * @property {object|null} preflight   { proxyExitCountry, baseReachable, goRouteReachable, targetReachable, targetHost, preflightError }
 */

export function buildSnapshot(fields) {
  return {
    exchangeSlug: fields.exchangeSlug,
    countrySlug: fields.countrySlug,
    deviceViewport: fields.deviceViewport,
    testedUrl: fields.testedUrl,
    finalUrl: fields.finalUrl ?? null,
    redirectChain: fields.redirectChain ?? [],
    httpStatus: fields.httpStatus ?? null,
    capturedAt: fields.capturedAt,
    screenshotPath: fields.screenshotPath ?? null,
    htmlSnapshotPath: fields.htmlSnapshotPath ?? null,
    screenshotHash: fields.screenshotHash ?? null,
    detectedBonusText: fields.detectedBonusText ?? null,
    detectedPromoCode: fields.detectedPromoCode ?? null,
    detectedRestrictionText: fields.detectedRestrictionText ?? null,
    detectedTermsText: fields.detectedTermsText ?? null,
    status: fields.status,
    confidence: fields.confidence,
    // Binding default — this tool never performs account/dashboard verification.
    postSignupVerification: fields.postSignupVerification ?? 'not_available',
    note: fields.note ?? null,
    errorClass: fields.errorClass ?? null,
    preflight: fields.preflight ?? null,
    // Direct-target browser fallback (used when the /go navigation dies on
    // chrome-error but preflight proved the target host reachable).
    fallbackAttempted: fields.fallbackAttempted ?? false,
    fallbackResult: fields.fallbackResult ?? null,
  };
}

export function hashBuffer(buf) {
  return createHash('sha256').update(buf).digest('hex');
}
