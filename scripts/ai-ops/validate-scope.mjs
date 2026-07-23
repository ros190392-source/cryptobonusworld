#!/usr/bin/env node
// CBW AI Ops — changed-file scope validator (dependency-free, deterministic).
//
// Compares a list of changed repository-relative paths against a task
// contract's authorizedScope. Rejects absolute paths, traversal, forbidden
// paths/prefixes and anything outside exactPaths/allowedPrefixes.
// Exit 0 = PASS, non-zero = FAIL.
//
// Usage: node scripts/ai-ops/validate-scope.mjs <contract.json> <changed-files.txt>

import { readFileSync } from 'node:fs';
import { classifyChanged } from './lib/path-policy.mjs';

function readLines(file) {
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
}

function main() {
  const [contractFile, changedFile] = process.argv.slice(2);
  if (!contractFile || !changedFile) {
    console.error('usage: validate-scope.mjs <contract.json> <changed-files.txt>');
    process.exit(2);
  }

  let contract;
  try {
    contract = JSON.parse(readFileSync(contractFile, 'utf8'));
  } catch (e) {
    console.error(`FAIL: cannot parse contract JSON: ${e.message}`);
    process.exit(1);
  }
  if (!contract.authorizedScope || typeof contract.authorizedScope !== 'object') {
    console.error('FAIL: contract has no authorizedScope object');
    process.exit(1);
  }

  const changed = readLines(changedFile);
  if (changed.length === 0) {
    console.log('PASS: no changed files to check');
    process.exit(0);
  }

  const { ok, results } = classifyChanged(changed, contract.authorizedScope);
  const bad = results.filter((r) => r.status !== 'IN_EXACT' && r.status !== 'IN_PREFIX');

  for (const r of results) {
    const flag = (r.status === 'IN_EXACT' || r.status === 'IN_PREFIX') ? 'ok ' : 'BAD';
    console.log(`  [${flag}] ${r.status.padEnd(12)} ${r.path} — ${r.reason}`);
  }

  if (!ok) {
    console.error(`FAIL: ${bad.length} out-of-scope/forbidden/unsafe path(s) for task ${contract.taskId || '(unknown)'}`);
    process.exit(1);
  }
  console.log(`PASS: all ${changed.length} changed path(s) within authorized scope of ${contract.taskId || '(unknown)'}`);
  process.exit(0);
}

main();
