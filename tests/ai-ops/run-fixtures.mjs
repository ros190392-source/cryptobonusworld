#!/usr/bin/env node
// CBW AI Ops — fixture runner. Executes the validators against committed fixtures
// and against ephemeral cases (task-ID grammar, contract field types, branch
// authority exact/prefix), asserting the expected PASS/FAIL per case. Ephemeral
// cases are written under the OS temp dir (never repository paths). No
// third-party dependencies.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SCRIPTS = join(ROOT, 'scripts', 'ai-ops');
const FIX = join(HERE, 'fixtures');
const MAP = join(ROOT, 'owner-ops', 'ai-ops', 'CBW_BRANCH_AUTHORITY_MAP_v1.json');
const EXAMPLE = join(ROOT, 'owner-ops', 'ai-ops', 'examples', 'CBW_AI_TASK_CONTRACT_EXAMPLE_v1.json');
const VALID = JSON.parse(readFileSync(join(FIX, 'valid-contract.json'), 'utf8'));

let pass = 0, fail = 0;
const failed = [];

function runExit(script, args) {
  try { execFileSync(process.execPath, [join(SCRIPTS, script), ...args], { stdio: 'pipe' }); return 0; }
  catch (e) { return typeof e.status === 'number' ? e.status : 1; }
}
function expect(name, actualExit, wantPass) {
  const ok = wantPass ? actualExit === 0 : actualExit !== 0;
  if (ok) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; failed.push(name); console.log(`  [FAIL] ${name} (exit ${actualExit}, expected ${wantPass ? 'PASS' : 'FAIL'})`); }
}

const tmp = mkdtempSync(join(tmpdir(), 'cbw-aiops-'));
const writeTmp = (name, obj) => { const p = join(tmp, name); writeFileSync(p, typeof obj === 'string' ? obj : JSON.stringify(obj)); return p; };
const contractWithTaskId = (id) => { const c = JSON.parse(JSON.stringify(VALID)); c.taskId = id; return writeTmp(`tid-${Buffer.from(id).toString('hex').slice(0,16)}.json`, c); };
const authorityContract = (base, exactPaths, allowedPrefixes) => writeTmp(`auth-${base}-${Math.random().toString(36).slice(2)}.json`, {
  baseBranch: base,
  authorizedScope: { exactPaths, allowedPrefixes, forbiddenPaths: [], forbiddenPrefixes: [] },
  forbiddenActions: ['merge-main-into-master', 'merge-master-into-main']
});

try {
  console.log('CBW AI Ops fixtures');

  // 1. committed task-contract + scope fixtures
  expect('valid-contract PASSES', runExit('validate-task-contract.mjs', [join(FIX, 'valid-contract.json')]), true);
  expect('invalid-missing-field FAILS', runExit('validate-task-contract.mjs', [join(FIX, 'invalid-missing-field.json')]), false);
  expect('invalid-authorization FAILS', runExit('validate-task-contract.mjs', [join(FIX, 'invalid-authorization.json')]), false);
  expect('example-contract PASSES', runExit('validate-task-contract.mjs', [EXAMPLE]), true);
  expect('valid-changed-files PASSES scope', runExit('validate-scope.mjs', [join(FIX, 'valid-contract.json'), join(FIX, 'valid-changed-files.txt')]), true);
  expect('invalid-changed-files FAILS scope', runExit('validate-scope.mjs', [join(FIX, 'valid-contract.json'), join(FIX, 'invalid-changed-files.txt')]), false);

  // 2. task-ID grammar coverage
  for (const id of ['CBW-AI-OPS-FOUNDATION-V1-001', 'CBW-AI-OPS-FOUNDATION-V1-DUAL-PR-FIX-002A', 'CBW-PRODUCTION-SECRETS-EMERGENCY-FINAL-FIX-015C', 'CBW-SITE-PLATFORM-CURRENT-STATE-COMMIT-013-R2']) {
    expect(`taskId VALID ${id}`, runExit('validate-task-contract.mjs', [contractWithTaskId(id)]), true);
  }
  for (const [id, why] of [['CBW-AI-OPS-FOUNDATION', 'missing sequence'], ['cbw-ai-ops-foundation-v1-001', 'lowercase'], ['CBW-AI-$(x)-001', 'shell chars'], ['CBW AI OPS 001', 'spaces'], ['CBW-AI-OPS-0012-EXTRA-BAD', 'malformed suffix']]) {
    expect(`taskId INVALID (${why}) ${JSON.stringify(id)}`, runExit('validate-task-contract.mjs', [contractWithTaskId(id)]), false);
  }

  // 3. field-type coverage (clone valid, break one field)
  const mutate = (fn) => { const c = JSON.parse(JSON.stringify(VALID)); fn(c); return writeTmp(`mut-${Math.random().toString(36).slice(2)}.json`, c); };
  expect('bad repository FAILS', runExit('validate-task-contract.mjs', [mutate((c) => c.repository = 'someone/else')]), false);
  expect('uppercase baseSha FAILS', runExit('validate-task-contract.mjs', [mutate((c) => c.baseSha = c.baseSha.toUpperCase())]), false);
  expect('relative worktreePath FAILS', runExit('validate-task-contract.mjs', [mutate((c) => c.worktreePath = 'projects/x')]), false);
  expect('featureBranch master FAILS', runExit('validate-task-contract.mjs', [mutate((c) => c.featureBranch = 'master')]), false);
  expect('multiline title FAILS', runExit('validate-task-contract.mjs', [mutate((c) => c.title = 'a\nb')]), false);
  expect('empty array entry FAILS', runExit('validate-task-contract.mjs', [mutate((c) => c.requiredChecks = [''])]), false);
  expect('deploy true w/o sha FAILS', runExit('validate-task-contract.mjs', [mutate((c) => { c.ownerAuthorizations.deploy = true; })]), false);
  expect('deploy true w/ good sha+master PASSES', runExit('validate-task-contract.mjs', [mutate((c) => { c.ownerAuthorizations.deploy = true; c.baseBranch = 'master'; c.ownerApprovedDeploySha = 'aacdfe00bd97a39c3864947bf6e1e0db6de183aa'; })]), true);
  expect('deploy true on main FAILS', runExit('validate-task-contract.mjs', [mutate((c) => { c.ownerAuthorizations.deploy = true; c.baseBranch = 'main'; c.ownerApprovedDeploySha = 'aacdfe00bd97a39c3864947bf6e1e0db6de183aa'; })]), false);
  expect('repair enabled=false maxAttempts=2 FAILS', runExit('validate-task-contract.mjs', [mutate((c) => { c.repairPolicy.enabled = false; c.repairPolicy.maxAttempts = 2; })]), false);
  expect('repair enabled=true maxAttempts=3 FAILS', runExit('validate-task-contract.mjs', [mutate((c) => { c.repairPolicy.maxAttempts = 3; })]), false);
  expect('scope exact under forbidden prefix FAILS', runExit('validate-task-contract.mjs', [mutate((c) => { c.authorizedScope.exactPaths = ['docs/security/x.md']; c.authorizedScope.forbiddenPrefixes = ['docs/security/']; })]), false);
  expect('scope allowed overlaps forbidden prefix FAILS', runExit('validate-task-contract.mjs', [mutate((c) => { c.authorizedScope.allowedPrefixes = ['src/']; c.authorizedScope.forbiddenPrefixes = ['src/pages/']; })]), false);

  // 4. branch authority — changed-file mode (fail-closed default=master)
  const wl = (name, lines) => writeTmp(name, lines.join('\n') + '\n');
  expect('main PR unknown/master-default path FAILS', runExit('validate-branch-authority.mjs', [MAP, 'main', wl('m1.txt', ['some/unknown/file.txt'])]), false);
  expect('main PR master-owned path FAILS', runExit('validate-branch-authority.mjs', [MAP, 'main', wl('m2.txt', ['scripts/ai-ops/x.mjs'])]), false);
  expect('master PR master-default path PASSES', runExit('validate-branch-authority.mjs', [MAP, 'master', wl('m3.txt', ['some/unknown/file.txt'])]), true);
  expect('master PR main-owned file FAILS', runExit('validate-branch-authority.mjs', [MAP, 'master', wl('m4.txt', ['.github/ISSUE_TEMPLATE/cbw-task.yml'])]), false);
  expect('main PR main-owned file PASSES', runExit('validate-branch-authority.mjs', [MAP, 'main', wl('m5.txt', ['.github/pull_request_template.md'])]), true);

  // 5. branch authority — contract mode allowedPrefix authority
  expect("master allowing '.github/' FAILS", runExit('validate-branch-authority.mjs', [MAP, authorityContract('master', [], ['.github/'])]), false);
  expect("master allowing '.github/ISSUE_TEMPLATE/' FAILS", runExit('validate-branch-authority.mjs', [MAP, authorityContract('master', [], ['.github/ISSUE_TEMPLATE/'])]), false);
  expect("main allowing 'scripts/' FAILS", runExit('validate-branch-authority.mjs', [MAP, authorityContract('main', [], ['scripts/'])]), false);
  expect("main allowing 'owner-ops/' FAILS", runExit('validate-branch-authority.mjs', [MAP, authorityContract('main', [], ['owner-ops/'])]), false);
  expect("main allowing unknown root prefix FAILS", runExit('validate-branch-authority.mjs', [MAP, authorityContract('main', [], ['tools/'])]), false);
  expect("master allowing 'scripts/ai-ops/' PASSES", runExit('validate-branch-authority.mjs', [MAP, authorityContract('master', [], ['scripts/ai-ops/'])]), true);
  expect("master allowing 'owner-ops/ai-ops/' PASSES", runExit('validate-branch-authority.mjs', [MAP, authorityContract('master', [], ['owner-ops/ai-ops/'])]), true);
  expect("main allowing '.github/ISSUE_TEMPLATE/' PASSES", runExit('validate-branch-authority.mjs', [MAP, authorityContract('main', [], ['.github/ISSUE_TEMPLATE/'])]), true);
  expect("main exact '.github/pull_request_template.md' PASSES", runExit('validate-branch-authority.mjs', [MAP, authorityContract('main', ['.github/pull_request_template.md'], [])]), true);
  expect('example contract PASSES branch authority', runExit('validate-branch-authority.mjs', [MAP, EXAMPLE]), true);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`\nfixtures: ${pass} passed, ${fail} failed`);
if (fail) { console.error(`FAIL: ${failed.join('; ')}`); process.exit(1); }
console.log('PASS: all fixtures behaved as expected');
process.exit(0);
