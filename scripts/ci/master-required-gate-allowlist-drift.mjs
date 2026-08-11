#!/usr/bin/env node
// Allowlist DEPENDENCY-DRIFT guard for the master required gate (issue #366).
//
// NON_MATERIAL_PATHS claims four root-level markdown files are inert: not a
// workflow trigger, not a build input, not read by any script at build/test
// time. The contract already re-proves the first clause by intersecting the
// allowlist with every workflow `paths` / `paths-ignore` pattern. That is not
// enough — a trigger is only ONE of the ways a file becomes load-bearing. A
// script could `readFileSync('AUDIT_REPORT.md')`, a package manifest could list
// it under `files`, a systemd unit could reference it, an Astro page could
// import it. None of those shows up as a trigger pattern, and the file would
// keep its non-material status while genuinely feeding the build.
//
// SCOPE MODEL — EXTENSION-CLOSED, NOT DIRECTORY-BOUNDED (reviewed MEDIUM).
// The first version of this guard bounded the scan by an enumerated list of
// directory prefixes (src/, scripts/, config/, tests/, .github/workflows/).
// That list was stale on the day it was written: it missed `server/**` (a live
// Node service, its shell backup script and its systemd units) and `tools/**`,
// so a reference from any of them was invisible. Worse, the shape of the bug is
// self-renewing — every new top-level runtime directory silently falls outside
// the scan, and nothing says so.
//
// The scan is therefore bounded by FILE TYPE, not by location:
//
//   * EVERY tracked file whose extension (or exact extensionless basename) is
//     classified as text-bearing build/test/runtime/gate surface is scanned,
//     wherever it lives. server/**, tools/** and any future top-level directory
//     are covered automatically and by construction.
//   * The classification is TOTAL and asserted: every extension present in the
//     tracked inventory must appear in SCANNED_EXTENSIONS or in
//     IGNORED_EXTENSIONS, and every extensionless tracked basename must appear
//     in SCANNED_BASENAMES or IGNORED_BASENAMES. A new file type entering the
//     repository FAILS the contract until somebody classifies it. That is what
//     keeps "the claimed scope" and "what is actually scanned" identical, and
//     it is the property the prefix model could never have.
//   * DETERMINISTIC — a raw substring search for the EXACT allowlisted
//     filename. No parsing, no import resolution, no inference. This is
//     deliberately NOT a whole-repository dependency parser: a parser that
//     resolves imports, globs and dynamic requires would be a heuristic, and a
//     heuristic that misses a reference LIES in the fail-open direction.
//   * FAIL-CLOSED — any occurrence at all is a FAILURE. It does not try to
//     decide whether a given occurrence is "really" a dependency; that is a
//     human review act. Over-reporting costs one review; under-reporting
//     silently restores the fail-open.
//
// The only exclusions are the gate's OWN files, which must name the allowlisted
// paths in order to define and test the allowlist. They are enumerated exactly,
// not pattern-matched, so a new file cannot quietly join the exclusion set.

// Text-bearing types that can express a build/test/runtime/gate dependency.
// Every entry is justified against what this repository actually tracks:
//
//   .mjs .js .cjs .ts .tsx   Node/TypeScript sources — scripts, server, tools
//   .astro                   build inputs (pages, components, layouts)
//   .py                      tracked Python (deploy.py at the root)
//   .sh                      shell (server/votes/backup.sh)
//   .gs                      Google Apps Script
//   .service .timer          systemd units (server/votes/*.service|.timer)
//   .conf                    service/webserver configuration
//   .json .yml .yaml         manifests, lockfiles, workflows, config, schemas
//   .css                     build inputs
//   .html .xml .webmanifest  emitted/served assets and site manifests
//   .txt                     served control files (public/robots.txt)
//   .example                 .env.example — runtime configuration template
//   .gitattributes .gitignore  affect what is built, shipped and checked out
export const SCANNED_EXTENSIONS = Object.freeze([
  '.astro',
  '.cjs',
  '.conf',
  '.css',
  '.example',
  '.gitattributes',
  '.gitignore',
  '.gs',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.py',
  '.service',
  '.sh',
  '.timer',
  '.ts',
  '.tsx',
  '.txt',
  '.webmanifest',
  '.xml',
  '.yaml',
  '.yml',
]);

// Tracked files with NO extension, by exact basename.
//   CODEOWNERS  .github/CODEOWNERS — review routing, a gate input
export const SCANNED_BASENAMES = Object.freeze(['CODEOWNERS']);

// Deliberately NOT scanned. Each entry states why it cannot carry a
// build/test/runtime/gate dependency on an allowlisted file.
//
//   .md        Human documentation prose. The allowlisted entries are
//              THEMSELVES .md files, so scanning markdown would make the
//              allowlist self-flagging and the guard would report drift that
//              does not exist. The one way a markdown file is genuinely
//              load-bearing here — being a workflow trigger, as
//              docs/tasks/**.md is for the autodeploy workflow — is covered by
//              the separate trigger-intersection assertion in the contract
//              test, which no extension list can weaken.
//   media      Binary raster/vector assets and empty directory placeholders.
//              They are copied, never read as text, and cannot express a
//              dependency on a path.
export const IGNORED_EXTENSIONS = Object.freeze([
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.ico',
  '.gitkeep',
]);

export const IGNORED_BASENAMES = Object.freeze([]);

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

// Runtime/build/test/gate surfaces that must be REPRESENTED in the scan. If any
// of these stops contributing files, the scan has silently lost a surface and
// the contract fails rather than passing over a smaller repository than it
// claims to cover. Codex named server/** and tools/** specifically.
export const REQUIRED_SURFACE_PREFIXES = Object.freeze([
  '.github/workflows/',
  'config/',
  'schemas/',
  'scripts/',
  'server/',
  'src/',
  'tests/',
  'tools/',
]);

// Exact files whose omission was the reviewed defect. Asserted conditionally —
// "if tracked, then scanned" — so a legitimate rename cannot fail the gate for
// the wrong reason while a scan regression still cannot hide.
export const REQUIRED_SCANNED_IF_TRACKED = Object.freeze([
  'server/votes/server.mjs',
  'server/votes/backup.sh',
  'server/votes/cbw-votes.service',
  'server/votes/cbw-votes-backup.timer',
  'tools/evidence-capture/capture-evidence.mjs',
  'tools/evidence-capture/exchanges.config.json',
  'package.json',
  'package-lock.json',
  '.github/CODEOWNERS',
]);

const EXCLUDED_SET = new Set(EXCLUDED_PATHS);

// Lowest plausible size of the tracked inventory. A `git ls-files` that returns
// a handful of paths means the inventory call degraded, not that the repository
// shrank; treating that as "nothing to scan" would pass vacuously.
export const MINIMUM_TRACKED_INVENTORY = 500;
export const MINIMUM_SCANNED_FILES = 300;

// The trailing extension of a path, or '' when the basename carries none.
// A leading-dot basename (.gitignore) IS its extension.
export function pathExtension(path) {
  const basename = String(path).split('/').pop() ?? '';
  const dot = basename.lastIndexOf('.');
  if (dot <= 0) return dot === 0 ? basename : '';
  return basename.slice(dot);
}

export function pathBasename(path) {
  return String(path).split('/').pop() ?? '';
}

// Deterministic, bounded selection over a tracked-file list (`git ls-files`).
export function selectScannedFiles(trackedPaths) {
  if (!Array.isArray(trackedPaths)) return [];
  const scannedExtensions = new Set(SCANNED_EXTENSIONS);
  const scannedBasenames = new Set(SCANNED_BASENAMES);
  return trackedPaths
    .filter((path) => typeof path === 'string' && path.length > 0)
    .filter((path) => !EXCLUDED_SET.has(path))
    .filter((path) => {
      const extension = pathExtension(path);
      return extension === ''
        ? scannedBasenames.has(pathBasename(path))
        : scannedExtensions.has(extension);
    })
    .sort();
}

// Proves the type classification is TOTAL over the tracked inventory. Anything
// unclassified is unscanned surface nobody decided was inert — fail closed.
export function auditTypeCoverage(trackedPaths) {
  const results = [];
  const check = (label, ok, detail = '') => results.push({ label, ok: Boolean(ok), detail });

  const paths = Array.isArray(trackedPaths) ? trackedPaths : [];
  check(
    'tracked inventory is present and plausible (git ls-files did not degrade)',
    paths.length >= MINIMUM_TRACKED_INVENTORY,
    `tracked ${paths.length}`,
  );

  const scanned = new Set(SCANNED_EXTENSIONS);
  const ignored = new Set(IGNORED_EXTENSIONS);
  const scannedNames = new Set(SCANNED_BASENAMES);
  const ignoredNames = new Set(IGNORED_BASENAMES);

  check(
    'no extension is BOTH scanned and ignored',
    SCANNED_EXTENSIONS.every((extension) => !ignored.has(extension)),
    SCANNED_EXTENSIONS.filter((extension) => ignored.has(extension)).join(','),
  );
  check(
    'no extensionless basename is BOTH scanned and ignored',
    SCANNED_BASENAMES.every((name) => !ignoredNames.has(name)),
  );

  const unclassifiedExtensions = new Map();
  const unclassifiedBasenames = new Map();
  for (const path of paths) {
    if (EXCLUDED_SET.has(path)) continue;
    const extension = pathExtension(path);
    if (extension === '') {
      const basename = pathBasename(path);
      if (!scannedNames.has(basename) && !ignoredNames.has(basename)) {
        unclassifiedBasenames.set(basename, path);
      }
      continue;
    }
    if (!scanned.has(extension) && !ignored.has(extension)) {
      unclassifiedExtensions.set(extension, path);
    }
  }
  check(
    'every tracked file extension is classified as scanned or explicitly ignored',
    unclassifiedExtensions.size === 0,
    [...unclassifiedExtensions.entries()]
      .map(([extension, example]) => `${extension} (e.g. ${example})`)
      .join(', '),
  );
  check(
    'every extensionless tracked file is classified as scanned or explicitly ignored',
    unclassifiedBasenames.size === 0,
    [...unclassifiedBasenames.entries()].map(([name, example]) => `${name} (${example})`).join(', '),
  );

  return results;
}

// files: [{ path, text }] — already selected and read by the caller.
// allowlist: the exact NON_MATERIAL_PATHS entries.
// tracked: the full tracked inventory, for the "if tracked, then scanned" proofs.
// Returns [{ label, ok, detail }], matching the shape the contract test folds in.
export function auditAllowlistDependencyDrift({ files, allowlist, tracked = [] }) {
  const results = [];
  const check = (label, ok, detail = '') => results.push({ label, ok: Boolean(ok), detail });

  const entries = Array.isArray(allowlist) ? allowlist : [];
  check('allowlist drift scan received an allowlist to prove', entries.length > 0);

  const scanned = Array.isArray(files) ? files : [];
  const scannedPaths = new Set(scanned.map((file) => String(file?.path)));
  // A scan over nothing would pass vacuously and is the single most likely way
  // this guard silently stops guarding, so the population itself is asserted.
  check(
    'allowlist drift scan covers a plausible tracked file population',
    scanned.length >= MINIMUM_SCANNED_FILES,
    `scanned ${scanned.length} files`,
  );
  for (const prefix of REQUIRED_SURFACE_PREFIXES) {
    check(
      `allowlist drift scan reaches the "${prefix}" runtime/build/test/gate surface`,
      scanned.some((file) => String(file?.path).startsWith(prefix)),
      'this surface contributed no scanned file',
    );
  }
  const trackedSet = new Set(Array.isArray(tracked) ? tracked : []);
  for (const path of REQUIRED_SCANNED_IF_TRACKED) {
    if (!trackedSet.has(path)) continue;
    check(`tracked runtime file "${path}" is actually scanned`, scannedPaths.has(path));
  }
  check(
    "allowlist drift scan excludes only the gate's own enumerated files",
    scanned.every((file) => !EXCLUDED_SET.has(String(file?.path))),
  );
  check(
    'every scanned file was actually readable (an unreadable file is an unproven file)',
    scanned.every((file) => typeof file?.text === 'string'),
    scanned
      .filter((file) => typeof file?.text !== 'string')
      .map((file) => file?.path)
      .join(','),
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
