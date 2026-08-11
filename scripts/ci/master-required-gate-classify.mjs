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
//
// A trigger intersection is not the only way an allowlisted file can become
// load-bearing, so the same contract additionally runs a bounded, deterministic
// DEPENDENCY-DRIFT scan (scripts/ci/master-required-gate-allowlist-drift.mjs)
// over the currently tracked source/scripts/config/package/workflow files for
// direct references to these exact filenames. The moment one of them becomes a
// build, test, runtime or gate input, the contract FAILS rather than letting the
// file keep its non-material status.

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

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

// The complete, closed set of classification reasons AND the materiality each
// one necessarily implies. This is the single source of truth for the pair.
//
// WHY A MAPPING AND NOT TWO INDEPENDENT VOCABULARIES — reviewed MEDIUM. The
// validator previously checked `material` against {true,false} and `reason`
// against the reason list SEPARATELY, so every cross-product was accepted:
// `material=false reason=material-path-changed` passed, as did
// `material=false reason=unresolved-or-empty-change-set` and
// `material=true reason=only-allowlisted-non-material-paths`. Each of those is
// a contradiction the producer can never legitimately emit, and the first two
// are precisely the shape of a fail-open bug — a MATERIAL classification
// reported as non-material, skipping the build, header matrix and indexability
// under a SUCCESS conclusion. A reason must therefore PIN its materiality.
//
// Both fail-closed reasons imply MATERIAL. Only the one affirmative
// "everything changed is on the exact allowlist" reason implies non-material.
export const REASON_MATERIALITY = Object.freeze({
  'unresolved-or-empty-change-set': true,
  'material-path-changed': true,
  'only-allowlisted-non-material-paths': false,
});

// Derived, never hand-maintained: a reason that exists without a declared
// materiality cannot silently become valid.
export const VALID_REASONS = Object.freeze(Object.keys(REASON_MATERIALITY));

// True when the pair is semantically possible. `material` is the RAW string
// form used on the wire (`'true'` / `'false'`); `reason` is the raw reason.
export function isConsistentClassification(material, reason) {
  if (material !== 'true' && material !== 'false') return false;
  if (!Object.prototype.hasOwnProperty.call(REASON_MATERIALITY, reason)) return false;
  return REASON_MATERIALITY[reason] === (material === 'true');
}

export const SIDECAR_BASENAME = 'cbw-master-required-gate-classification.json';

// Sidecar written by the producer and cross-checked by the unconditional
// validator. It binds producer to consumer at RUNTIME: if the producer step is
// removed the file is absent, and if the producer step id is renamed the
// consumer's `steps.classify.outputs.*` expressions resolve to empty while the
// sidecar still holds a real value — either way the validator fails closed.
//
// RUNNER_TEMP IS REQUIRED — there is deliberately NO os.tmpdir() fallback.
// RUNNER_TEMP is guaranteed present and job-scoped in the GitHub-hosted runtime
// this gate runs in. A fallback to the process-global temp directory is
// fail-OPEN in two directions: producer and validator could silently resolve to
// DIFFERENT directories (the binding is then vacuous — no sidecar, gate fails
// for the wrong reason, or worse a stale file in a shared directory satisfies
// it), and on a self-hosted or reused runner the global temp is not job-scoped,
// so any leftover file could stand in for a producer that never ran. An absent,
// empty or unusable RUNNER_TEMP means the runtime is not the one this gate was
// proven against, so it throws and the step fails CLOSED.
export function classifierResultFilePath() {
  const runnerTemp = process.env.RUNNER_TEMP;
  if (typeof runnerTemp !== 'string') {
    throw new Error(
      'master-required-gate: RUNNER_TEMP is not set — the classifier sidecar has no job-scoped ' +
        'directory and must not fall back to the process-global temp directory',
    );
  }
  if (runnerTemp.length === 0) {
    throw new Error('master-required-gate: RUNNER_TEMP is empty');
  }
  if (runnerTemp.includes('\0')) {
    throw new Error('master-required-gate: RUNNER_TEMP contains a NUL byte and is unusable');
  }
  if (!isAbsolute(runnerTemp)) {
    throw new Error(
      `master-required-gate: RUNNER_TEMP is not an absolute path (${JSON.stringify(runnerTemp)}) — ` +
        'a relative sidecar directory resolves against each step\'s cwd and cannot bind them',
    );
  }
  let stats = null;
  try {
    stats = statSync(runnerTemp);
  } catch {
    throw new Error(
      `master-required-gate: RUNNER_TEMP ${JSON.stringify(runnerTemp)} does not exist or is not readable`,
    );
  }
  if (!stats.isDirectory()) {
    throw new Error(`master-required-gate: RUNNER_TEMP ${JSON.stringify(runnerTemp)} is not a directory`);
  }
  return join(runnerTemp, SIDECAR_BASENAME);
}

// Env vars that identify the ONE gate run the sidecar is allowed to speak for.
// Both the producer and the unconditional validator resolve this from their own
// environment inside the same job, so a sidecar left behind by an earlier run,
// an earlier re-run attempt, or a different PR head cannot be mistaken for this
// run's classification. Without it a STALE sidecar whose content happens to
// agree with the step outputs is indistinguishable from a fresh one.
export const RUN_IDENTITY_ENV = Object.freeze(['HEAD_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']);

export function resolveRunIdentity(env = process.env) {
  const values = {};
  for (const name of RUN_IDENTITY_ENV) {
    const value = env?.[name];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(
        `master-required-gate: ${name} is missing or empty — the classifier sidecar cannot be ` +
          'bound to this gate run and must not be trusted',
      );
    }
    values[name] = value;
  }
  return {
    headSha: values.HEAD_SHA,
    runId: values.GITHUB_RUN_ID,
    runAttempt: values.GITHUB_RUN_ATTEMPT,
  };
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
    // Sidecar first, output line second. The sidecar carries the classification
    // AND the identity of this exact gate run; the unconditional validator
    // rejects any sidecar that does not match both its own step outputs and its
    // own run identity. Resolving the path or the identity throws on a missing/
    // unusable RUNNER_TEMP or an unidentifiable run, which fails the step closed
    // before any output line is emitted.
    const identity = resolveRunIdentity();
    writeFileSync(
      classifierResultFilePath(),
      `${JSON.stringify({
        material: result.material,
        reason: result.reason,
        headSha: identity.headSha,
        runId: identity.runId,
        runAttempt: identity.runAttempt,
      })}\n`,
      'utf8',
    );
    appendFileSync(outputFile, `material=${result.material}\nreason=${result.reason}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
    process.argv[1]?.endsWith('master-required-gate-classify.mjs')) {
  main();
}
