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
import { roleForBranch } from '../lib/roles.mjs';
import { checkEventIntegrity } from '../lib/eventintegrity.mjs';
import { FROZEN_FACTORY_PREFIXES, FACTORY_IMPL_PREFIXES, FACTORY_IMPL_FILES } from '../lib/lineage.mjs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

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
// { state, branch, taskId, history, existsAtBase }. Fixed-arg execFile — no shell.
function taskStateAt(sha, root, repoRoot) {
  try {
    const out = execFileSync('git', ['show', `${sha}:${root}/TASK_STATE.json`], {
      cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', windowsHide: true,
    });
    const obj = JSON.parse(out);
    return { state: obj.state, branch: obj.branch, taskId: obj.taskId, history: obj.history, existsAtBase: true };
  } catch { return { state: null, existsAtBase: false }; }
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
function isAncestor(anc, desc, repoRoot) {
  try { execFileSync('git', ['merge-base', '--is-ancestor', anc, desc], { cwd: repoRoot, stdio: 'ignore', windowsHide: true }); return true; }
  catch { return false; }
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

  // V4-C7 — checkout/event/workspace integrity + ancestry, before boundary evaluation.
  if (a.baseSha && a.headSha) {
    const resolvedRoot = gitFact(['rev-parse', '--show-toplevel'], repoRoot);
    const facts = {
      baseExists: gitFact(['cat-file', '-e', `${a.baseSha}^{commit}`], repoRoot) !== null || isAncestor(a.baseSha, a.headSha, repoRoot),
      headExists: gitFact(['rev-parse', '--verify', `${a.headSha}^{commit}`], repoRoot) !== null,
      headDescendsBase: isAncestor(a.baseSha, a.headSha, repoRoot),
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
      meta.taskStates[root] = {
        base: base.state, head: head.state, existsAtBase: base.existsAtBase,
        headBranch: head.branch, headTaskId: head.taskId,
        baseHistory: base.history, headHistory: head.history,
      };
    }
  }

  // V4-C1/C3/C4 — factory role + owner governed record + ancestry for governance PRs.
  if (a.headBranch && a.baseBranch && roleForBranch(a.headBranch)) {
    const role = roleForBranch(a.headBranch);
    const resultDir = deriveResultDirForCli(records);
    const govRecord = (a.headSha && resultDir) ? govRecordAt(a.headSha, resultDir, repoRoot) : null;
    meta.factory = {
      role,
      govRecord,
      approvedBaseSha: a.baseSha,
      currentResultDir: resultDir,
      headDescendsBase: (a.baseSha && a.headSha) ? isAncestor(a.baseSha, a.headSha, repoRoot) : undefined,
    };
  }

  const res = checkChangedFileBoundary(records, meta);
  console.log(`BOUNDARY mode=${res.mode} taskRoots=[${res.taskRoots.join(', ')}]`);
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

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log('usage: researchops <create|validate|status|check-boundary> [flags]');
    process.exit(cmd ? 0 : 2);
  }
  try {
    if (cmd === 'create') return cmdCreate(rest);
    if (cmd === 'validate') return cmdValidate(rest);
    if (cmd === 'status') return cmdStatus(rest);
    if (cmd === 'check-boundary') return cmdCheckBoundary(rest);
    die(`unknown command: ${cmd}`, 2);
  } catch (e) {
    die(e.message, 2);
  }
}

main();
