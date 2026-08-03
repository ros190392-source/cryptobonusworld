/**
 * Canonical internal-path contract.
 *
 * ONE validator for "a normalized, same-origin internal path ending in a slash".
 * Replaces the several drifting copies of `/^\/[a-z0-9/_-]*\/$/`, which wrongly
 * accepted protocol-relative values such as `//host/` (a cross-origin redirect
 * vector).
 *
 * ACCEPT: `/`, `/methodology/`, `/exchanges/bybit/`, `/__design/cbw-v2/contracts/`
 * REJECT: `//host/`, `///host/`, `https://host/path/`, `http://…`,
 *         `javascript:…`, backslash paths, control characters, query/fragment,
 *         duplicate slashes, `..` traversal, `%`-encoded escapes, and (by
 *         default) any `/go/*` affiliate target when an internal destination is
 *         required.
 */

// A leading single slash, then zero or more `segment/` groups. Each segment is
// one or more of [a-z0-9_-] (case-insensitive) and contains no slash, so
// duplicate slashes, protocol-relative `//`, `..`, `.`, `?`, `#`, `%`, control
// characters and backslashes can never match.
const INTERNAL_PATH_PATTERN = /^\/(?:[a-z0-9_-]+\/)*$/i;
const GO_PREFIX = '/go/';

export interface InternalPathOptions {
  /** Allow an affiliate `/go/*` target. Default false: internal-only. */
  allowGo?: boolean;
}

/** True iff `value` is a normalized internal path per the contract above. */
export function isInternalPath(value: unknown, options: InternalPathOptions = {}): value is string {
  if (typeof value !== 'string') return false;
  if (!INTERNAL_PATH_PATTERN.test(value)) return false;
  if (!options.allowGo && (value === GO_PREFIX || value.startsWith(GO_PREFIX))) return false;
  return true;
}

/** Assert `value` is a normalized internal path, or throw with a clear label. */
export function assertInternalPath(value: unknown, label = 'path', options: InternalPathOptions = {}): string {
  if (!isInternalPath(value, options)) {
    throw new Error(`${label} must be a normalized internal path ending with '/' (got: ${String(value)}).`);
  }
  return value;
}
