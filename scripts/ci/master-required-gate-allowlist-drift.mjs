#!/usr/bin/env node
// Allowlist DEPENDENCY-DRIFT guard for the master required gate (issue #366).
//
// NON_MATERIAL_PATHS claims four root-level markdown files are inert: not a
// workflow trigger, not a build input, not read by any script at build/test
// time. The contract already re-proves the first clause by intersecting the
// allowlist with every workflow `paths` / `paths-ignore` pattern. That is not
// enough — a trigger is only ONE of the ways a file becomes load-bearing. A
// script could `readFileSync('AUDIT_REPORT.md')`, a package manifest could list
// it under `files`, an Astro page could import it. None of those shows up as a
// trigger pattern, and the file would keep its non-material status while
// genuinely feeding the build.
//
// SCOPE DISCIPLINE — deliberately NOT a whole-repository dependency parser.
// A parser that resolves imports, globs and dynamic requires across this repo
// would be a heuristic, and a heuristic that misses a reference LIES: it reports
// "allowlist still inert" when it is not, which is exactly the fail-open shape
// this gate exists to prevent. Instead this guard is:
//
//   * BOUNDED   — a fixed, enumerated set of tracked path prefixes and file
//                 extensions (the build/test/runtime/gate surface), never the
//                 whole tree, never untracked files.
//   * DETERMINISTIC — a raw substring search for the EXACT allowlisted
//                 filename. No parsing, no resolution, no inference. The same
//                 inputs always give the same verdict.
//   * FAIL-CLOSED — any occurrence at all is a FAILURE. It does not try to
//                 decide whether a given occurrence is "really" a dependency;
//                 deciding that is a human review act. Over-reporting costs one
//                 review; under-reporting silently restores the fail-open.
//
// The only exclusions are the gate's OWN files, which must name the allowlisted
// paths in order to define and test the allowlist. They are enumerated exactly,
// not pattern-matched, so a new file cannot quietly join the exclusion set.

// Tracked path prefixes that make up the build / test / runtime / gate surface.
export const SCANNED_PREFIXES = Object.freeze([
  'src/',
  'scripts/',
  'config/',
  'tests/',
  '.github/workflows/',
]);

// Plus every ROOT-level tracked file with a scanned extension — this is where
// package manifests and build config live (package.json, package-lock.json,
// astro.config.mjs, tsconfig.json, ...). Root-level markdown is excluded by the
// extension filter, so the allowlisted documents cannot flag one another.
export const SCANNED_EXTENSIONS = Object.freeze([
  '.mjs',
  '.js',
  '.cjs',
  '.ts',
  '.tsx',
  '.astro',
  '.json',
  '.yml',
  '.yaml',
]);

// The gate's own definition/test surface. These files MUST contain the exact
// allowlisted filenames — that is what defines and proves the allowlist — so
// scanning them would be self-referential. Exact paths only: a prefix or glob
// would let a future scripts/ci/master-required-gate-*.mjs file opt itself out
// of the scan.
export const EXCLUDED_PATHS = Object.freeze([
  'scripts/ci/master-required-gate-classify.mjs',
  'scripts/ci/master-required-gate-contract-test.mjs',
  'scripts/ci/master-required-gate-classifier-fixture-test.mjs',
  'scripts/ci/master-required-gate-mutation-test.mjs',
  'scripts/ci/master-required-gate-validate-output.mjs',
  'scripts/ci/master-required-gate-workflow-contract.mjs',
  'scripts/ci/master-required-gate-allowlist-drift.mjs',
]);

const EXCLUDED_SET = new Set(EXCLUDED_PATHS);

// Deterministic, bounded selection over a tracked-file list (`git ls-files`).
export function selectScannedFiles(trackedPaths) {
  if (!Array.isArray(trackedPaths)) return [];
  return trackedPaths
    .filter((path) => typeof path === 'string' && path.length > 0)
    .filter((path) => !EXCLUDED_SET.has(path))
    .filter((path) => SCANNED_EXTENSIONS.some((extension) => path.endsWith(extension)))
    .filter(
      (path) =>
        SCANNED_PREFIXES.some((prefix) => path.startsWith(prefix)) || !path.includes('/'),
    )
    .sort();
}

// files: [{ path, text }] — already selected and read by the caller.
// allowlist: the exact NON_MATERIAL_PATHS entries.
// Returns [{ label, ok, detail }], matching the shape the contract test folds in.
export function auditAllowlistDependencyDrift({ files, allowlist }) {
  const results = [];
  const check = (label, ok, detail = '') => results.push({ label, ok: Boolean(ok), detail });

  const entries = Array.isArray(allowlist) ? allowlist : [];
  check('allowlist drift scan received an allowlist to prove', entries.length > 0);

  const scanned = Array.isArray(files) ? files : [];
  // A scan over nothing would pass vacuously and is the single most likely way
  // this guard silently stops guarding, so the population itself is asserted.
  check(
    'allowlist drift scan covers a non-trivial tracked file population',
    scanned.length >= 100,
    `scanned ${scanned.length} files`,
  );
  check(
    'allowlist drift scan reaches the build/test/runtime surface',
    SCANNED_PREFIXES.every((prefix) => scanned.some((file) => String(file?.path).startsWith(prefix))),
    SCANNED_PREFIXES.filter(
      (prefix) => !scanned.some((file) => String(file?.path).startsWith(prefix)),
    ).join(','),
  );
  check(
    'allowlist drift scan reaches the root package manifest',
    scanned.some((file) => file?.path === 'package.json'),
  );
  check(
    'allowlist drift scan excludes only the gate\'s own enumerated files',
    scanned.every((file) => !EXCLUDED_SET.has(String(file?.path))),
  );

  for (const entry of entries) {
    const referencing = scanned
      .filter((file) => typeof file?.text === 'string' && file.text.includes(entry))
      .map((file) => file.path);
    check(
      `allowlisted "${entry}" is referenced by NO tracked build/test/runtime/gate file`,
      referencing.length === 0,
      referencing.length > 0
        ? `referenced by ${referencing.join(', ')} — it is now a build/test/runtime/gate input and ` +
            'must be removed from NON_MATERIAL_PATHS rather than keep non-material status'
        : '',
    );
  }

  return results;
}
