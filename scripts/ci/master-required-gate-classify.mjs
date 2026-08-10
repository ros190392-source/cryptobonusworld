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
import { appendFileSync } from 'node:fs';

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

// Normalizes to a comparable repo-relative form, or returns null when the
// path is unusable/suspicious — null always resolves to MATERIAL upstream.
function normalizePath(path) {
  if (typeof path !== 'string') return null;
  const normalized = path.replace(/\\/g, '/').replace(/^\.\//, '').trim();
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
    const paths = out.split('\0').map((entry) => entry.trim()).filter(Boolean);
    return paths.length > 0 ? paths : null; // empty diff -> fail-closed
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
    appendFileSync(outputFile, `material=${result.material}\nreason=${result.reason}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
    process.argv[1]?.endsWith('master-required-gate-classify.mjs')) {
  main();
}
