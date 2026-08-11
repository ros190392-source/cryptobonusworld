#!/usr/bin/env node
// Fail-closed change classification for the stable master required gate.
//
// The required gate ("Master required gate") is always triggered on
// pull_request -> master with NO paths filter, so the check context is always
// reported and can never deadlock branch protection. Inside the job this
// module decides whether the PR touches MATERIAL surface, i.e. surface that
// must run the full production build + Global Header Interaction matrix +
// indexability inventory.
//
// CLASSIFICATION MODEL — negative allowlist, default MATERIAL.
//
// There is deliberately NO positive "material patterns" list. A positive list
// is fail-OPEN: every path nobody thought to enumerate (a new top-level file,
// scripts/portal/**, scripts/deploy.mjs, config/**, a future hard gate under
// scripts/hard-gates/**) would silently classify as non-material and skip the
// matrix. The contract is the opposite:
//
//   * a path is non-material ONLY if it appears verbatim in NON_MATERIAL_PATHS
//   * every other path                          -> MATERIAL
//   * any unknown / new / unlisted path         -> MATERIAL
//   * a mixed change set with one unknown path  -> MATERIAL
//   * any error while resolving changed files   -> MATERIAL
//   * empty / unresolvable changed-file list    -> MATERIAL
//
// NON_MATERIAL_PATHS is intentionally tiny and holds EXACT repo-relative paths
// only — no `dir/**` prefixes and no extension globs. A prefix rule would let
// a future file dropped into that directory inherit non-material status
// without anyone deciding it is inert, which is the same fail-open failure in
// a different shape.
//
// Why `docs/**` is NOT allowlisted: docs paths are already load-bearing for
// workflow behaviour in this repository —
// .github/workflows/cbw-production-safe-batch-autodeploy.yml triggers on
// 'docs/tasks/CBW_PRODUCTION_P2_SAFE_BATCH_AUTODEPLOY_001.md'. A docs change
// can therefore start a deployment, so docs cannot be proven governance-only.
// scripts/ci/master-required-gate-contract-test.mjs re-proves on every run
// that no workflow trigger pattern intersects NON_MATERIAL_PATHS; adding such
// a trigger fails the gate rather than silently widening the allowlist.

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// EXACT repo-relative paths proven inert: pure human-readable governance
// records at the repository root. None is a workflow trigger, a build input,
// or read by any script at build/test time. Extending this list is a
// deliberate, reviewable act — everything else is MATERIAL by default.
export const NON_MATERIAL_PATHS = Object.freeze([
  'README.md',
  'AUDIT_REPORT.md',
  'CryptoBonusWorld_Master_Architecture.md',
  'SCREENSHOT_PROCESSING_CONSTITUTION_v1.md',
]);

const NON_MATERIAL_SET = new Set(NON_MATERIAL_PATHS);

// The complete, closed set of classification reasons. The downstream validator
// rejects anything outside it, so a truncated/garbled output cannot pass.
export const VALID_REASONS = Object.freeze([
  'unresolved-or-empty-change-set',
  'material-path-changed',
  'only-allowlisted-non-material-paths',
]);

// Sidecar written by the producer and cross-checked by the unconditional
// validator. It binds producer to consumer at RUNTIME: if the producer step is
// removed the file is absent, and if the producer step id is renamed the
// consumer's `steps.classify.outputs.*` expressions resolve to empty while the
// sidecar still holds a real value — either way the validator fails closed.
export function classifierResultFilePath() {
  return join(process.env.RUNNER_TEMP || tmpdir(), 'cbw-master-required-gate-classification.json');
}

// Normalizes to a comparable repo-relative form, or returns null when the
// path is unusable/suspicious — null always resolves to MATERIAL upstream.
//
// RAW-FILENAME RULE — this function MUST NOT trim, case-fold, or otherwise
// rewrite filename bytes. A Git filename may legally contain leading/trailing
// spaces, tabs and newlines: `README.md ` (trailing space) is a DIFFERENT file
// from `README.md`. Trimming collapsed the former onto the latter and made a
// material, unreviewed file inherit allowlisted status — fail-open.
//
// The only permitted rewrite is stripping a single leading `./`, which is a
// pure path-syntax prefix meaning "this directory" and cannot be part of a
// name Git emits under `-z`. Note that a separator rewrite can only ever
// INSERT a `/` into the string, and every NON_MATERIAL_PATHS entry is a
// root-level name containing no `/`, so no normalization here can manufacture
// an allowlist hit out of a nested path. Backslashes are deliberately NOT
// rewritten: `\` is a legal POSIX filename character and Git `-z` always emits
// `/` separators, so rewriting it would corrupt a raw filename.
function normalizePath(path) {
  if (typeof path !== 'string') return null;
  if (path.length === 0) return null;
  const normalized = path.startsWith('./') ? path.slice(2) : path;
  if (normalized.length === 0) return null;
  if (normalized.startsWith('/')) return null; // absolute: not repo-relative
  if (normalized.split('/').includes('..')) return null; // traversal
  return normalized;
}

export function isNonMaterialPath(path) {
  const normalized = normalizePath(path);
  if (normalized === null) return false; // fail-closed -> material
  return NON_MATERIAL_SET.has(normalized);
}

// A path is material unless it is provably, explicitly non-material.
export function isMaterialPath(path) {
  return !isNonMaterialPath(path);
}

// paths: array of repo-relative changed files, or null/undefined when the
// changed-file resolution itself failed.
export function classifyChangedPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return { material: true, reason: 'unresolved-or-empty-change-set', matched: [] };
  }
  const matched = paths.filter(isMaterialPath);
  return matched.length > 0
    ? { material: true, reason: 'material-path-changed', matched }
    : { material: false, reason: 'only-allowlisted-non-material-paths', matched: [] };
}

// Resolves the changed-path set for base..head.
//
// `--no-renames` is required, not cosmetic: with rename detection on,
// `git diff --name-only` reports ONLY the destination of a detected rename.
// Renaming src/foo.ts -> docs/foo.md would then present a single docs path and
// hide the material deletion. `--no-renames` forces git to report the rename
// as a delete of the source plus an add of the destination, so both sides are
// classified. `-z` avoids git's C-style quoting of unusual filenames.
export function resolveChangedPaths(baseSha, headSha, options = {}) {
  if (!baseSha || !headSha) return null; // fail-closed
  try {
    const out = execFileSync(
      'git',
      ['diff', '--no-renames', '--name-only', '-z', `${baseSha}`, `${headSha}`],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        ...(options.cwd ? { cwd: options.cwd } : {}),
      },
    );
    // `-z` NUL-TERMINATES (not NUL-separates) every entry, so a well-formed
    // stream always ends with one trailing empty segment. Remove ONLY that
    // terminator. Deliberately no `.trim()` and no `.filter(Boolean)`: both
    // would rewrite or drop legal Git filenames such as `README.md ` and let a
    // material file masquerade as an allowlisted one.
    const segments = out.split('\0');
    if (segments[segments.length - 1] === '') segments.pop();
    return segments.length > 0 ? segments : null; // empty diff -> fail-closed
  } catch {
    return null; // fail-closed
  }
}

function main() {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA;
  const paths = resolveChangedPaths(baseSha, headSha);
  const result = classifyChangedPaths(paths);

  console.log(`master-required-gate: material=${result.material} reason=${result.reason}`);
  if (result.matched.length > 0) {
    console.log(`master-required-gate: matched ${result.matched.length} material path(s)`);
    for (const path of result.matched.slice(0, 50)) console.log(` - ${path}`);
  }

  if (process.argv.includes('--emit-github-output')) {
    const outputFile = process.env.GITHUB_OUTPUT;
    if (!outputFile) {
      console.error('master-required-gate: GITHUB_OUTPUT is not set');
      process.exit(1); // fail-closed: never silently drop the classification
    }
    // Duplicate/ambiguous emission guard. GitHub keeps the LAST `material=`
    // line, so a second write would silently override the classification.
    if (existsSync(outputFile) && /^material=/m.test(readFileSync(outputFile, 'utf8'))) {
      console.error('master-required-gate: GITHUB_OUTPUT already carries a material= line (ambiguous)');
      process.exit(1);
    }
    writeFileSync(
      classifierResultFilePath(),
      `${JSON.stringify({ material: result.material, reason: result.reason })}\n`,
      'utf8',
    );
    appendFileSync(outputFile, `material=${result.material}\nreason=${result.reason}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
    process.argv[1]?.endsWith('master-required-gate-classify.mjs')) {
  main();
}
