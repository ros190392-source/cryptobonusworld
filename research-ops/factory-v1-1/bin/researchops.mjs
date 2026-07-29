#!/usr/bin/env node
// ResearchOps Subscription Factory V1.1 — canonical CLI.
// Runs directly with Node 20 and built-in modules only:
//   node research-ops/factory-v1-1/bin/researchops.mjs <create|validate|status|check-boundary> [flags]
// Exit 0 = success/valid, non-zero = failure/invalid. Fail-closed.
//
// The canonical CLI never accepts a user-controlled task output path. `create`
// always writes below repository-relative `research-ops/tasks/` (see C6).

import { writeCanonical, writeJson, ensureDir, exists, readText } from '../lib/util.mjs';
import { parseArgs } from '../lib/args.mjs';
import { createTask } from '../lib/create.mjs';
import { validateTask } from '../lib/validate.mjs';
import { statusTask } from '../lib/status.mjs';
import { parseNameStatus, parseNameStatusZ, checkChangedFileBoundary } from '../lib/boundary.mjs';
import { resolveMutationChain, gitAccessors, scopeSegmentDiff } from '../lib/taskhistory.mjs';
import { validateHistoricalChain } from '../lib/taskhistoryvalidate.mjs';
import { roleForBranch } from '../lib/roles.mjs';
import { checkEventIntegrity } from '../lib/eventintegrity.mjs';
import { resolveEnforcement, checkSetupPhase, discoverFrozenSetupBoundary } from '../lib/bootstrap.mjs';
import { FROZEN_FACTORY_PREFIXES, FACTORY_IMPL_PREFIXES, FACTORY_IMPL_FILES } from '../lib/lineage.mjs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Mirror of the boundary's result-dir derivation, for the CLI to locate the governed
// record on the appropriate tree.
function deriveResultDirForCli(records) {
  const dirs = new Set();
  for (const r of records) for (const p of (r.paths || [])) {
    const np = String(p).replace(/\\/g, '/');
    if (!np.startsWith('research-ops/factory-v1-1/')) continue;
    if (FACTORY_IMPL_PREFIXES.some((fp) => np.startsWith(fp)) || FACTORY_IMPL_FILES.includes(np)) continue;
    if (FROZEN_FACTORY_PREFIXES.some((fp) => np.startsWith(fp))) continue;
    const m = /^(research-ops\/factory-v1-1\/[^/]+)\//.exec(np);
    if (m) dirs.add(`${m[1]}/`);
  }
  return dirs.size === 1 ? [...dirs][0] : null;
}

function die(msg, code = 2) { console.error(`researchops: ${msg}`); process.exit(code); }

function renderChecks(report) {
  const lines = [];
  for (const c of report.checks) lines.push(`  [${c.ok ? 'ok ' : 'FAIL'}] ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  lines.push(`  => ${report.passed}/${report.total} checks passed`);
  return lines.join('\n');
}

function cmdCreate(argv) {
  const a = parseArgs(argv, {
    flags: {
      '--task-id': { required: true, aliasKey: 'taskId' },
      '--country-code': { required: true, aliasKey: 'countryCode' },
      '--country-name': { required: true, aliasKey: 'countryName' },
      '--exchange-id': { required: true, aliasKey: 'exchangeId' },
      '--exchange-name': { required: true, aliasKey: 'exchangeName' },
      '--batch-id': { required: true, aliasKey: 'batchId' },
      '--priority': { required: true, aliasKey: 'priority' },
      '--created-at': { required: false, aliasKey: 'createdAt' },
    },
  });
  // C6: no user path flag. Always confined to <cwd>/research-ops/tasks/.
  let res;
  try { res = createTask(a); }
  catch (e) { die(`create failed: ${e.message}`, 2); }
  console.log(`CREATED ${res.taskDir} (state=PREPARED, inventory=${res.files} files, created=${res.createdAt})`);
  process.exit(0);
}

function cmdValidate(argv) {
  const a = parseArgs(argv, {
    flags: {
      '--task-dir': { required: true, aliasKey: 'taskDir' },
      '--to-state': { required: false, aliasKey: 'toState' },
      '--owner-receipt': { required: false, aliasKey: 'ownerReceiptPath' },
      '--changed-files': { required: false, aliasKey: 'changedFilesPath' },
      '--changed-status': { required: false, aliasKey: 'changedStatusPath' },
      '--report-dir': { required: false, aliasKey: 'reportDir' },
    },
    booleans: { '--require-package': { aliasKey: 'requirePackage' }, '--json': { aliasKey: 'json' } },
  });
  const report = validateTask(a.taskDir, a);
  if (a.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`VALIDATE ${a.taskDir}`);
    console.log(renderChecks(report));
    console.log(report.ok ? 'RESULT: VALID' : 'RESULT: INVALID');
  }
  if (a.reportDir) {
    ensureDir(a.reportDir);
    writeJson(join(a.reportDir, 'VALIDATION_REPORT.json'), report);
    const md = [`# ResearchOps validation report`, ``, `Task dir: \`${a.taskDir}\``, `Result: **${report.ok ? 'VALID' : 'INVALID'}** (${report.passed}/${report.total})`, ``, ...report.checks.map((c) => `- [${c.ok ? 'x' : ' '}] ${c.name}${c.detail ? ` — ${c.detail}` : ''}`), ``].join('\n');
    writeCanonical(join(a.reportDir, 'VALIDATION_REPORT.md'), md);
  }
  process.exit(report.ok ? 0 : 1);
}

function cmdStatus(argv) {
  const a = parseArgs(argv, {
    flags: { '--task-dir': { required: true, aliasKey: 'taskDir' } },
    booleans: { '--json': { aliasKey: 'json' } },
  });
  const s = statusTask(a.taskDir);
  if (a.json) { console.log(JSON.stringify(s, null, 2)); }
  else {
    console.log(`STATUS ${a.taskDir}`);
    console.log(`  declaredState: ${s.declaredState}`);
    console.log(`  evidenceState: ${s.evidenceState}`);
    console.log(`  packagePresent: ${s.packagePresent}`);
    console.log(`  packageValid: ${s.packageValid}`);
    console.log(`  consistent: ${s.consistent}`);
    if (s.notes.length) console.log(`  notes: ${s.notes.join('; ')}`);
  }
  process.exit(s.consistent ? 0 : 1);
}

// Read a task's TASK_STATE from a trusted Git blob at <sha>. Returns
// { state, branch, taskId, history, existsAtBase, full }. `full` is the complete parsed
// object (used for the immutable identity projection). Fixed-arg execFile — no shell.
function taskStateAt(sha, root, repoRoot) {
  try {
    const out = execFileSync('git', ['show', `${sha}:${root}/TASK_STATE.json`], {
      cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true,
    });
    const obj = JSON.parse(out);
    return { state: obj.state, branch: obj.branch, taskId: obj.taskId, history: obj.history, existsAtBase: true, full: obj };
  } catch { return { state: null, existsAtBase: false, full: null }; }
}

// Read an owner governed record (a `*_STATE.json`) from a Git tree at <sha> under
// <resultDir>. The record is created by owner setup; this reads it as trusted data.
function govRecordAt(sha, resultDir, repoRoot) {
  try {
    const list = execFileSync('git', ['ls-tree', '--name-only', sha, `${resultDir}`], {
      cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true,
    }).split('\n').map((s) => s.trim()).filter(Boolean);
    const statePath = list.find((p) => /_STATE\.json$/.test(p));
    if (!statePath) return null;
    const out = execFileSync('git', ['show', `${sha}:${statePath}`], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true });
    return JSON.parse(out);
  } catch { return null; }
}

function gitFact(args, repoRoot) {
  try { return execFileSync('git', args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true }).trim(); }
  catch { return null; }
}
// R031-B — typed Git runner: { ok, out } with ok reflecting a zero exit code, so callers
// can distinguish an empty successful result from a command failure (ACCESS_ERROR).
function runGit(args, repoRoot) {
  try {
    const out = execFileSync('git', args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true });
    return { ok: true, out };
  } catch { return { ok: false, out: '' }; }
}
function isAncestor(anc, desc, repoRoot) {
  try { execFileSync('git', ['merge-base', '--is-ancestor', anc, desc], { cwd: repoRoot, stdio: 'ignore', windowsHide: true }); return true; }
  catch { return false; }
}

// R031-A — root-scoped NUL-delimited name-status between two commits as an EXPLICIT
// result: a git failure or malformed stream fails closed and never becomes an empty
// (valid) record set.
function segmentRecords(baseSha, headSha, root, repoRoot) {
  const rr = runGit(['-c', 'core.quotePath=false', 'diff', '-z', '--name-status', baseSha, headSha, '--', `${root}/`], repoRoot);
  return scopeSegmentDiff(rr, root, parseNameStatusZ);
}

// R031-C — historical validation dependencies: a detached temporary worktree under an
// OS-generated path (never from task content), the canonical validator, cleanup via
// `git worktree remove`. Never persists credentials; no ref mutation.
function historicalDeps(repoRoot) {
  return {
    mkdtemp: () => mkdtempSync(join(tmpdir(), 'rops-hist-')),
    // Materialize with NO end-of-line conversion so the working tree matches the exact
    // canonical LF committed blobs (otherwise autocrlf would corrupt the historical
    // content and its manifest hashes on a CRLF platform).
    worktreeAdd: (dir, sha) => { execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'worktree', 'add', '--detach', dir, sha], { cwd: repoRoot, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }); },
    worktreeRemove: (dir) => {
      execFileSync('git', ['worktree', 'remove', '--force', dir], { cwd: repoRoot, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
    },
    pathJoin: (a, b) => join(a, b),
    existsFn: (p) => exists(p),
    readStateFn: (taskDir) => JSON.parse(readText(join(taskDir, 'TASK_STATE.json'))).state,
    validateTaskFn: (taskDir, opts) => validateTask(taskDir, opts),
  };
}

// R030 Layer B + R031 — resolve the trusted task mutation chain from Git objects and
// enrich each segment with a proven root-scoped diff, canonical HISTORICAL validation of
// its head tree, and the immutable identity projection. Topology comes only from
// first-parent history and tree identity; every fail-closed check surfaces as a
// per-segment or chain violation for the pure boundary to fold.
function resolveTaskChain(root, headSha, repoRoot) {
  const acc = gitAccessors((args) => runGit(args, repoRoot), root);
  const chain = resolveMutationChain({ headSha, ...acc });
  if (!chain.ok) return { ok: false, violations: chain.violations, segments: [], headTreeMatchesFinal: chain.headTreeMatchesFinal };

  const segments = chain.segments.map((s) => {
    const head = taskStateAt(s.headSha, root, repoRoot);
    const base = s.introduction ? { state: null, history: null, full: null } : taskStateAt(s.baseSha, root, repoRoot);
    const seg = {
      baseSha: s.baseSha, headSha: s.headSha, introduction: s.introduction,
      baseState: base.state ?? null, headState: head.state ?? null,
      baseHistory: base.history ?? null, headHistory: head.history ?? null,
      fullHeadState: head.full ?? null,
      segmentViolations: [],
    };
    // R031-A — proven, non-empty root-scoped diff for every mutation edge.
    const sr = segmentRecords(s.baseSha, s.headSha, root, repoRoot);
    if (!sr.ok) { seg.records = []; seg.segmentViolations.push(`segment diff ${sr.errorCode} (${s.baseSha || 'ABSENT'}->${s.headSha}): ${sr.detail || ''}`.trim()); }
    else {
      seg.records = sr.records;
      if (sr.records.length === 0) seg.segmentViolations.push(`segment ${s.baseSha || 'ABSENT'}->${s.headSha} changed the task-root tree but produced an empty diff — fail closed`);
    }
    return seg;
  });

  // R031-C — canonical historical validation of every mutation-segment head + immutable
  // identity projection from the introduction head.
  const heads = segments.map((seg) => ({ sha: seg.headSha, introduction: seg.introduction, fullState: seg.fullHeadState }));
  const hist = validateHistoricalChain({ heads, taskRoot: root, deps: historicalDeps(repoRoot) });
  const histBySha = new Map((hist.results || []).map((r) => [r.sha, r]));
  for (const seg of segments) {
    const hr = histBySha.get(seg.headSha);
    seg.historical = hr ? { ok: hr.ok, summary: hr.summary, cleanupError: hr.cleanupError } : null;
  }

  return { ok: chain.ok && hist.ok, violations: [...chain.violations, ...hist.violations], segments, headTreeMatchesFinal: chain.headTreeMatchesFinal };
}

// C3/C4/C5/V2/V4 — CI-facing append-only boundary enforcement over a `git diff`
// name-status stream plus TRUSTED GitHub event metadata. V4 adds role/governed-record
// authorization, commit ancestry and checkout/event/workspace integrity. Fail-closed.
function cmdCheckBoundary(argv) {
  const a = parseArgs(argv, {
    flags: {
      '--changed-status': { required: false, aliasKey: 'changedStatusPath' },
      '--changed-status-z': { required: false, aliasKey: 'changedStatusZPath' },
      '--emit-task-roots': { required: false, aliasKey: 'emitTaskRoots' },
      '--head-branch': { required: false, aliasKey: 'headBranch' },
      '--base-branch': { required: false, aliasKey: 'baseBranch' },
      '--base-sha': { required: false, aliasKey: 'baseSha' },
      '--head-sha': { required: false, aliasKey: 'headSha' },
      '--approved-base-sha': { required: false, aliasKey: 'approvedBaseSha' },
      '--repo-root': { required: false, aliasKey: 'repoRoot' },
      '--checked-out-head': { required: false, aliasKey: 'checkedOutHead' },
      '--workspace': { required: false, aliasKey: 'workspace' },
    },
  });
  // V3-C10 — prefer the unambiguous NUL-delimited form when provided.
  let records;
  if (a.changedStatusZPath) {
    if (!exists(a.changedStatusZPath)) die(`changed-status-z file not found: ${a.changedStatusZPath}`, 1);
    records = parseNameStatusZ(readText(a.changedStatusZPath));
  } else if (a.changedStatusPath) {
    if (!exists(a.changedStatusPath)) die(`changed-status file not found: ${a.changedStatusPath}`, 1);
    records = parseNameStatus(readText(a.changedStatusPath));
  } else {
    die('one of --changed-status or --changed-status-z is required', 2);
  }
  if (records.length === 0) die('empty changed set — refusing to pass on an unresolved diff', 1);

  const meta = {};
  if (a.headBranch) meta.headBranch = a.headBranch;
  if (a.baseBranch) meta.baseBranch = a.baseBranch;
  const repoRoot = a.repoRoot || process.cwd();
  // R1 — `--base-sha` is the WORKER diff / governed-record base (the frozen owner-setup
  // SHA in bootstrap runs); `--approved-base-sha` is the pinned approved base used for
  // ancestry and the governed record's approved-base binding (falls back to base-sha).
  const approvedBaseSha = a.approvedBaseSha || a.baseSha;

  // V4-C7 — checkout/event/workspace integrity + ancestry, before boundary evaluation.
  if (a.baseSha && a.headSha) {
    const resolvedRoot = gitFact(['rev-parse', '--show-toplevel'], repoRoot);
    const facts = {
      baseExists: gitFact(['cat-file', '-e', `${a.baseSha}^{commit}`], repoRoot) !== null || isAncestor(a.baseSha, a.headSha, repoRoot),
      headExists: gitFact(['rev-parse', '--verify', `${a.headSha}^{commit}`], repoRoot) !== null,
      headDescendsBase: isAncestor(approvedBaseSha, a.headSha, repoRoot),
      shallow: gitFact(['rev-parse', '--is-shallow-repository'], repoRoot) === 'true',
    };
    if (a.checkedOutHead) { facts.checkedOutHead = a.checkedOutHead; facts.trustedHeadSha = a.headSha; }
    if (a.workspace) { facts.workspace = a.workspace; facts.resolvedRoot = resolvedRoot; }
    const ev = checkEventIntegrity(facts);
    if (!ev.ok) { for (const v of ev.violations) console.error(`  - event: ${v}`); die('event/checkout integrity failed', 1); }
  }

  // V2-C5 / V3-C3 / V3-C9 — trusted per-root base/head state from Git blobs.
  if (a.baseSha && a.headSha) {
    const roots = [...new Set(records.flatMap((r) => (r.paths || [])).map((p) => {
      const m = /^research-ops\/tasks\/([A-Z0-9][A-Z0-9-]*)\//.exec(String(p).replace(/\\/g, '/'));
      return m ? `research-ops/tasks/${m[1]}` : null;
    }).filter(Boolean))];
    meta.taskStates = {};
    for (const root of roots) {
      const base = taskStateAt(a.baseSha, root, repoRoot);
      const head = taskStateAt(a.headSha, root, repoRoot);
      const entry = {
        base: base.state, head: head.state, existsAtBase: base.existsAtBase,
        headBranch: head.branch, headTaskId: head.taskId,
        baseHistory: base.history, headHistory: head.history,
      };
      // R030 Layer B — when the root is absent at the trusted PR base, the cumulative
      // base->head diff misclassifies the progressed root as a fresh creation. Resolve
      // the actual task mutation chain from trusted Git first-parent history so each
      // real transition (ABSENT->PREPARED, then every later stage) is validated
      // separately with the unweakened canonical rules. Cumulative PR path-scope
      // enforcement (Layer A) is unchanged.
      if (a.headSha && !base.existsAtBase) entry.mutationChain = resolveTaskChain(root, a.headSha, repoRoot);
      meta.taskStates[root] = entry;
    }
  }

  // V4-C1/C3/C4 — factory role + owner governed record + ancestry for governance PRs.
  // R1 — the governed record is read from the FROZEN SETUP / base tree (a.baseSha), so
  // the head cannot rewrite its own governing record; its approved-base binding is the
  // pinned approved base SHA.
  if (a.headBranch && a.baseBranch && roleForBranch(a.headBranch)) {
    const role = roleForBranch(a.headBranch);
    const resultDir = deriveResultDirForCli(records);
    const govRecord = (a.baseSha && resultDir) ? govRecordAt(a.baseSha, resultDir, repoRoot) : null;
    meta.factory = {
      role,
      govRecord,
      approvedBaseSha,
      currentResultDir: resultDir,
      headDescendsBase: (a.headSha) ? isAncestor(approvedBaseSha, a.headSha, repoRoot) : undefined,
    };
  }

  const res = checkChangedFileBoundary(records, meta);
  console.log(`BOUNDARY mode=${res.mode} taskRoots=[${res.taskRoots.join(', ')}]`);
  // R030 — expose the deterministic, machine-readable task mutation chain for a
  // progressed research task. Derived purely from trusted Git objects; never from
  // commit messages, comments, mutable task fields or environment SHAs.
  if (meta.taskStates) {
    for (const [root, ts] of Object.entries(meta.taskStates)) {
      if (!ts.mutationChain) continue;
      console.log(`TASK_CHAIN root=${root}`);
      for (const seg of ts.mutationChain.segments) {
        const from = seg.introduction ? 'ABSENT' : seg.baseState;
        console.log(`TRANSITION ${from} -> ${seg.headState} base=${seg.baseSha || 'ABSENT'} head=${seg.headSha}`);
        if (seg.historical && seg.historical.summary) {
          const s = seg.historical.summary;
          console.log(`HISTORICAL_VALIDATION head=${seg.headSha} ok=${seg.historical.ok} passed=${s.passed}/${s.total} requirePackage=${s.requirePackage}`);
        }
      }
      const last = ts.mutationChain.segments[ts.mutationChain.segments.length - 1];
      if (last && !last.introduction) {
        console.log(`TRANSITION_BASE_SHA=${last.baseSha}`);
        console.log(`TRANSITION_HEAD_SHA=${last.headSha}`);
      }
    }
  }
  if (a.emitTaskRoots) writeCanonical(a.emitTaskRoots, res.taskRoots.join('\n'));
  if (!res.ok) {
    for (const v of res.violations) console.error(`  - ${v}`);
    die('append-only boundary violated', 1);
  }
  // C4 — reject a research-task PR whose declared root no longer exists on disk.
  if (res.mode === 'RESEARCH_TASK') {
    for (const root of res.taskRoots) {
      if (!exists(root)) die(`task root referenced by the diff is missing on disk: ${root}`, 1);
    }
  }
  console.log('RESULT: BOUNDARY OK');
  process.exit(0);
}

// R1 — resolve the trusted enforcement source (DESCENDANT vs one-time BOOTSTRAP), fail
// closed. The workflow calls this before running the boundary. `--base-has-v4-policy`
// is passed by the workflow after testing the approved base tree for the V4 modules.
function cmdResolveEnforcement(argv) {
  const a = parseArgs(argv, {
    flags: {
      '--issue': { required: false, aliasKey: 'issue' },
      '--pull-request': { required: false, aliasKey: 'pullRequest' },
      '--head-branch': { required: true, aliasKey: 'headBranch' },
      '--base-branch': { required: true, aliasKey: 'baseBranch' },
      '--approved-base-sha': { required: true, aliasKey: 'approvedBaseSha' },
      '--frozen-setup-sha': { required: false, aliasKey: 'frozenSetupSha' },
      '--head-sha': { required: true, aliasKey: 'headSha' },
      '--repo-root': { required: false, aliasKey: 'repoRoot' },
    },
    booleans: { '--base-has-v4-policy': { aliasKey: 'baseHasV4Policy' } },
  });
  const repoRoot = a.repoRoot || process.cwd();
  const ctx = {
    baseHasV4Policy: a.baseHasV4Policy === true,
    issue: a.issue, pullRequest: a.pullRequest,
    headBranch: a.headBranch, baseBranch: a.baseBranch,
    approvedBaseSha: a.approvedBaseSha, frozenSetupSha: a.frozenSetupSha,
    headDescendsApprovedBase: isAncestor(a.approvedBaseSha, a.headSha, repoRoot),
    headDescendsFrozenSetup: a.frozenSetupSha ? isAncestor(a.frozenSetupSha, a.headSha, repoRoot) : undefined,
  };
  const r = resolveEnforcement(ctx);
  console.log(`ENFORCEMENT ${r.mode}: ${r.reason}`);
  if (r.mode === 'REJECT') process.exit(1);
  process.exit(0);
}

// R1 — verify the owner setup phase introduced exactly the governed setup files.
function cmdCheckSetupPhase(argv) {
  const a = parseArgs(argv, {
    flags: {
      '--approved-base-sha': { required: true, aliasKey: 'approvedBaseSha' },
      '--frozen-setup-sha': { required: true, aliasKey: 'frozenSetupSha' },
      '--repo-root': { required: false, aliasKey: 'repoRoot' },
    },
  });
  const repoRoot = a.repoRoot || process.cwd();
  let out;
  try {
    out = execFileSync('git', ['-c', 'core.quotePath=false', 'diff', '-z', '--name-status', a.approvedBaseSha, a.frozenSetupSha], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true });
  } catch (e) { die(`setup-phase diff failed: ${e.message}`, 1); }
  const records = parseNameStatusZ(out);
  const r = checkSetupPhase(records);
  if (!r.ok) { for (const v of r.violations) console.error(`  - setup: ${v}`); die('owner setup phase integrity failed', 1); }
  console.log('RESULT: SETUP PHASE OK (exactly the governed owner setup files, additions only)');
  process.exit(0);
}

// R2 — GENERIC descendant frozen owner-setup boundary discovery. Walks the exact
// commits approvedBase..head (from trusted event SHAs), derives the task result dir from
// the full diff, and deterministically locates the unique frozen setup boundary. Prints
// `FROZEN_SETUP_SHA=<sha>` for the workflow to capture. Fail closed. Read-only Git.
function cmdDiscoverSetupBoundary(argv) {
  const a = parseArgs(argv, {
    flags: {
      '--approved-base-sha': { required: true, aliasKey: 'approvedBaseSha' },
      '--head-sha': { required: true, aliasKey: 'headSha' },
      '--head-branch': { required: false, aliasKey: 'headBranch' },
      '--repo-root': { required: false, aliasKey: 'repoRoot' },
    },
  });
  const repoRoot = a.repoRoot || process.cwd();
  // Derive the task result directory from the FULL approvedBase..head diff (trusted SHAs).
  let fullZ;
  try { fullZ = execFileSync('git', ['-c', 'core.quotePath=false', 'diff', '-z', '--name-status', a.approvedBaseSha, a.headSha], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true }); }
  catch (e) { die(`full diff failed: ${e.message}`, 1); }
  const resultDir = deriveResultDirForCli(parseNameStatusZ(fullZ));
  if (!resultDir) die('could not derive a single task result directory from the range', 1);

  // Ordered commit list (oldest first) with per-commit name-status.
  let shaList;
  try { shaList = execFileSync('git', ['rev-list', '--reverse', `${a.approvedBaseSha}..${a.headSha}`], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true }).split('\n').map((s) => s.trim()).filter(Boolean); }
  catch (e) { die(`rev-list failed: ${e.message}`, 1); }
  const commits = shaList.map((sha) => {
    const z = execFileSync('git', ['-c', 'core.quotePath=false', 'diff-tree', '--no-commit-id', '-r', '--name-status', '-z', sha], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true });
    return { sha, records: parseNameStatusZ(z) };
  });

  const r = discoverFrozenSetupBoundary(commits, resultDir);
  if (!r.ok) { for (const v of r.violations) console.error(`  - setup-boundary: ${v}`); die('descendant owner setup-phase boundary invalid', 1); }
  console.log(`FROZEN_SETUP_SHA=${r.frozenSetupSha}`);
  console.log(`RESULT: SETUP BOUNDARY OK (resultDir=${resultDir}, frozenSetup=${r.frozenSetupSha})`);
  process.exit(0);
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log('usage: researchops <create|validate|status|check-boundary|resolve-enforcement|check-setup-phase|discover-setup-boundary> [flags]');
    process.exit(cmd ? 0 : 2);
  }
  try {
    if (cmd === 'create') return cmdCreate(rest);
    if (cmd === 'validate') return cmdValidate(rest);
    if (cmd === 'status') return cmdStatus(rest);
    if (cmd === 'check-boundary') return cmdCheckBoundary(rest);
    if (cmd === 'resolve-enforcement') return cmdResolveEnforcement(rest);
    if (cmd === 'check-setup-phase') return cmdCheckSetupPhase(rest);
    if (cmd === 'discover-setup-boundary') return cmdDiscoverSetupBoundary(rest);
    die(`unknown command: ${cmd}`, 2);
  } catch (e) {
    die(e.message, 2);
  }
}

main();
