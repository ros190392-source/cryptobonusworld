// CBW AI Ops — shared path policy (dependency-free).
//
// Pure functions for normalizing and classifying repository-relative POSIX
// paths against an authorized scope. No filesystem access, no shell, no
// third-party dependencies. Used by every AI Ops validator so scope rules are
// evaluated identically everywhere.

/** Convert backslashes to forward slashes; do not otherwise alter the value. */
export function toPosix(p) {
  return String(p).replace(/\\/g, '/');
}

/**
 * Return a human-readable reason if `p` is an unsafe path form, else null.
 * Rejects: empty, absolute (POSIX or Windows drive), parent traversal,
 * NUL/CR/LF, and leading `~`.
 */
export function unsafePathReason(rawInput) {
  if (rawInput === null || rawInput === undefined) return 'path is null/undefined';
  const raw = String(rawInput);
  if (raw.trim() === '') return 'path is empty';
  if (/[\0\r\n]/.test(raw)) return 'path contains NUL/CR/LF';
  const p = toPosix(raw);
  if (p.startsWith('/')) return 'absolute POSIX path is not allowed';
  if (/^[A-Za-z]:/.test(p)) return 'absolute Windows path is not allowed';
  if (p.startsWith('~')) return 'home-relative path is not allowed';
  const segs = p.split('/');
  if (segs.some((s) => s === '..')) return 'parent traversal (..) is not allowed';
  return null;
}

/**
 * Normalize a repository-relative path: POSIX separators, strip a single
 * leading `./`, collapse duplicate slashes. Throws on unsafe forms.
 */
export function normalizeRelative(p) {
  const reason = unsafePathReason(p);
  if (reason) throw new Error(`unsafe path "${p}": ${reason}`);
  let out = toPosix(p).replace(/^\.\//, '').replace(/\/{2,}/g, '/');
  if (out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

/** True if `path` is exactly `prefix` or lives under it (prefix should end with /). */
export function underPrefix(path, prefix) {
  const pre = prefix.endsWith('/') ? prefix : prefix + '/';
  return path === prefix.replace(/\/$/, '') || path.startsWith(pre);
}

/**
 * Classify each changed path against an authorized scope.
 * scope = { exactPaths[], allowedPrefixes[], forbiddenPaths[], forbiddenPrefixes[] }
 * Returns { ok, results: [{ path, status: IN_EXACT|IN_PREFIX|FORBIDDEN|OUT_OF_SCOPE|UNSAFE, reason }] }
 */
export function classifyChanged(changed, scope) {
  const exactPaths = new Set((scope.exactPaths || []).map(toPosix));
  const allowedPrefixes = (scope.allowedPrefixes || []).map(toPosix);
  const forbiddenPaths = new Set((scope.forbiddenPaths || []).map(toPosix));
  const forbiddenPrefixes = (scope.forbiddenPrefixes || []).map(toPosix);

  const results = [];
  let ok = true;
  for (const rawPath of changed) {
    const reason = unsafePathReason(rawPath);
    if (reason) {
      results.push({ path: String(rawPath), status: 'UNSAFE', reason });
      ok = false;
      continue;
    }
    const path = normalizeRelative(rawPath);
    if (forbiddenPaths.has(path) || forbiddenPrefixes.some((pre) => underPrefix(path, pre))) {
      results.push({ path, status: 'FORBIDDEN', reason: 'matches a forbidden path/prefix' });
      ok = false;
    } else if (exactPaths.has(path)) {
      results.push({ path, status: 'IN_EXACT', reason: 'exact authorized path' });
    } else if (allowedPrefixes.some((pre) => underPrefix(path, pre))) {
      results.push({ path, status: 'IN_PREFIX', reason: 'under an allowed prefix' });
    } else {
      results.push({ path, status: 'OUT_OF_SCOPE', reason: 'not in exactPaths or allowedPrefixes' });
      ok = false;
    }
  }
  return { ok, results };
}

/** Detect duplicate entries within a list (used to reject conflicting scope). */
export function findDuplicates(list) {
  const seen = new Set();
  const dups = new Set();
  for (const item of list) {
    const k = toPosix(item);
    if (seen.has(k)) dups.add(k);
    seen.add(k);
  }
  return [...dups];
}
