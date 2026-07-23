#!/usr/bin/env node
// CBW AI Ops — branch-authority validator (dependency-free, deterministic).
//
// Verifies a proposed base branch and its changed paths against the branch
// authority map: a master-targeted PR may not change main-owned paths, a
// main-targeted PR may not change master-owned paths, and no contract may
// request a wholesale main<->master merge. Exit 0 = PASS, non-zero = FAIL.
//
// Usage:
//   node scripts/ai-ops/validate-branch-authority.mjs <map.json> <master|main> <changed-files.txt>
//   node scripts/ai-ops/validate-branch-authority.mjs <map.json> <contract.json>

import { readFileSync } from 'node:fs';
import { toPosix, underPrefix, unsafePathReason } from './lib/path-policy.mjs';

function classify(path, map) {
  const master = map.authorities.master;
  const main = map.authorities.main;
  const shared = (map.sharedExisting && map.sharedExisting.paths) || [];
  const inMaster = (master.ownedPaths || []).map(toPosix).includes(path) ||
    (master.ownedPrefixes || []).map(toPosix).some((pre) => underPrefix(path, pre));
  const inMain = (main.ownedPaths || []).map(toPosix).includes(path) ||
    (main.ownedPrefixes || []).map(toPosix).some((pre) => underPrefix(path, pre)) ||
    shared.map(toPosix).includes(path);
  if (inMaster && inMain) return 'CONFLICT';
  if (inMaster) return 'MASTER_OWNED';
  if (inMain) return 'MAIN_OWNED';
  return 'UNCLASSIFIED';
}

function checkPaths(map, base, changed) {
  const errors = [];
  for (const raw of changed) {
    const reason = unsafePathReason(raw);
    if (reason) { errors.push(`unsafe path "${raw}": ${reason}`); continue; }
    const path = toPosix(raw).replace(/^\.\//, '');
    const cls = classify(path, map);
    if (cls === 'CONFLICT') errors.push(`${path}: ambiguous authority (matches both master and main)`);
    else if (base === 'master' && cls === 'MAIN_OWNED') errors.push(`${path}: main-authority file cannot change in a master PR`);
    else if (base === 'main' && cls === 'MASTER_OWNED') errors.push(`${path}: master-authority file cannot change in a main PR`);
    else console.log(`  [ok ] ${cls.padEnd(13)} ${path}`);
  }
  return errors;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('usage: validate-branch-authority.mjs <map.json> <master|main> <changed.txt> | <map.json> <contract.json>');
    process.exit(2);
  }
  const map = JSON.parse(readFileSync(args[0], 'utf8'));
  if (!map.authorities || !map.authorities.master || !map.authorities.main) {
    console.error('FAIL: invalid branch authority map');
    process.exit(1);
  }

  let base, changed;
  let errors = [];

  if (args.length === 2 && args[1].endsWith('.json')) {
    // contract mode
    const c = JSON.parse(readFileSync(args[1], 'utf8'));
    base = c.baseBranch;
    if (!['master', 'main'].includes(base)) errors.push(`contract baseBranch invalid: ${base}`);
    changed = (c.authorizedScope && c.authorizedScope.exactPaths) || [];
    // wholesale-merge rejection
    const fa = Array.isArray(c.forbiddenActions) ? c.forbiddenActions : [];
    for (const tok of ['merge-main-into-master', 'merge-master-into-main']) {
      if (!fa.includes(tok)) errors.push(`contract must forbid "${tok}"`);
    }
    if (c.wholesaleMerge === true || c.mergeAcrossAuthorities === true) errors.push('contract requests a wholesale main<->master merge (forbidden)');
  } else {
    base = args[1];
    if (!['master', 'main'].includes(base)) { console.error(`FAIL: base must be master|main, got ${base}`); process.exit(1); }
    changed = readFileSync(args[2], 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  }

  errors = errors.concat(checkPaths(map, base, changed));

  if (errors.length) {
    console.error(`FAIL: branch-authority violations (base=${base})`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`PASS: branch authority holds for base=${base} (${changed.length} path(s))`);
  process.exit(0);
}

main();
