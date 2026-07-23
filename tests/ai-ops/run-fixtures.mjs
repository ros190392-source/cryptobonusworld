#!/usr/bin/env node
// CBW AI Ops — fixture runner. Executes the validators against fixtures and
// asserts the expected PASS/FAIL outcome for each. Deterministic; exit 0 only
// when every fixture behaves as expected. No third-party dependencies.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SCRIPTS = join(ROOT, 'scripts', 'ai-ops');
const FIX = join(HERE, 'fixtures');
const MAP = join(ROOT, 'owner-ops', 'ai-ops', 'CBW_BRANCH_AUTHORITY_MAP_v1.json');

let pass = 0;
let fail = 0;
const failed = [];

// Run node <script> <args...>; return exit code (0 on success, else the code).
function runExit(script, args) {
  try {
    execFileSync(process.execPath, [join(SCRIPTS, script), ...args], { stdio: 'pipe' });
    return 0;
  } catch (e) {
    return typeof e.status === 'number' ? e.status : 1;
  }
}

function expect(name, actualExit, wantPass) {
  const ok = wantPass ? actualExit === 0 : actualExit !== 0;
  if (ok) { pass++; console.log(`  [PASS] ${name} (exit ${actualExit}, expected ${wantPass ? 'PASS' : 'FAIL'})`); }
  else { fail++; failed.push(name); console.log(`  [FAIL] ${name} (exit ${actualExit}, expected ${wantPass ? 'PASS' : 'FAIL'})`); }
}

console.log('CBW AI Ops fixtures');

// 1. task-contract validation
expect('valid-contract PASSES', runExit('validate-task-contract.mjs', [join(FIX, 'valid-contract.json')]), true);
expect('invalid-missing-field FAILS', runExit('validate-task-contract.mjs', [join(FIX, 'invalid-missing-field.json')]), false);
expect('invalid-authorization FAILS', runExit('validate-task-contract.mjs', [join(FIX, 'invalid-authorization.json')]), false);
expect('example-contract PASSES', runExit('validate-task-contract.mjs', [join(ROOT, 'owner-ops', 'ai-ops', 'examples', 'CBW_AI_TASK_CONTRACT_EXAMPLE_v1.json')]), true);

// 2. scope validation
expect('valid-changed-files PASSES scope', runExit('validate-scope.mjs', [join(FIX, 'valid-contract.json'), join(FIX, 'valid-changed-files.txt')]), true);
expect('invalid-changed-files FAILS scope', runExit('validate-scope.mjs', [join(FIX, 'valid-contract.json'), join(FIX, 'invalid-changed-files.txt')]), false);

// 3. branch authority — ephemeral changed lists in a temp dir (not repo paths)
const tmp = mkdtempSync(join(tmpdir(), 'cbw-aiops-'));
try {
  const mainInMaster = join(tmp, 'main-in-master.txt');
  writeFileSync(mainInMaster, '.github/ISSUE_TEMPLATE/cbw-task.yml\n.github/pull_request_template.md\n');
  expect('main-authority file in master PR FAILS', runExit('validate-branch-authority.mjs', [MAP, 'master', mainInMaster]), false);

  const masterInMain = join(tmp, 'master-in-main.txt');
  writeFileSync(masterInMain, 'src/pages/index.astro\nowner-ops/ai-ops/CBW_AI_OPS_FOUNDATION_v1.json\n');
  expect('master-authority file in main PR FAILS', runExit('validate-branch-authority.mjs', [MAP, 'main', masterInMain]), false);

  const masterOk = join(tmp, 'master-ok.txt');
  writeFileSync(masterOk, 'owner-ops/ai-ops/CBW_AI_OPS_FOUNDATION_v1.json\nscripts/ai-ops/validate-scope.mjs\n');
  expect('master-authority files in master PR PASS', runExit('validate-branch-authority.mjs', [MAP, 'master', masterOk]), true);

  const mainOk = join(tmp, 'main-ok.txt');
  writeFileSync(mainOk, '.github/ISSUE_TEMPLATE/cbw-task.yml\n.github/pull_request_template.md\n');
  expect('main-authority files in main PR PASS', runExit('validate-branch-authority.mjs', [MAP, 'main', mainOk]), true);

  // wholesale-merge contract rejection (contract that fails to forbid cross merges)
  const badMerge = join(tmp, 'bad-merge-contract.json');
  writeFileSync(badMerge, JSON.stringify({ baseBranch: 'master', authorizedScope: { exactPaths: [] }, forbiddenActions: [], wholesaleMerge: true }));
  expect('wholesale-merge contract FAILS', runExit('validate-branch-authority.mjs', [MAP, badMerge]), false);

  // example contract passes branch authority in contract mode
  expect('example contract PASSES branch authority', runExit('validate-branch-authority.mjs', [MAP, join(ROOT, 'owner-ops', 'ai-ops', 'examples', 'CBW_AI_TASK_CONTRACT_EXAMPLE_v1.json')]), true);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`\nfixtures: ${pass} passed, ${fail} failed`);
if (fail) { console.error(`FAIL: ${failed.join('; ')}`); process.exit(1); }
console.log('PASS: all fixtures behaved as expected');
process.exit(0);
