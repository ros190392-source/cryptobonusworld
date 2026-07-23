#!/usr/bin/env node
// CBW AI Ops — branch-authority validator (dependency-free, deterministic).
//
// Fail-closed: the default authority is master, so any path that is not
// explicitly main-owned (or shared control-plane) classifies as MASTER_DEFAULT.
// A main PR changing a MASTER_DEFAULT path fails; nothing passes as an
// unclassified path. In contract mode, both exactPaths and allowedPrefixes are
// authority-checked (a prefix may not reach into the opposite authority).
// Exit 0 = PASS, non-zero = FAIL.
//
// Usage:
//   node validate-branch-authority.mjs <map.json> <master|main> <changed-files.txt>
//   node validate-branch-authority.mjs <map.json> <contract.json>

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
  if (inMain) return 'MAIN_OWNED';
  if (inMaster) return 'MASTER_OWNED';
  return 'MASTER_DEFAULT'; // defaultAuthority = master (fail-closed)
}

// Reason an allowed prefix violates authority for the given base, else null.
function prefixAuthorityError(ap, base, map) {
  const master = map.authorities.master;
  const main = map.authorities.main;
  const shared = (map.sharedExisting && map.sharedExisting.paths) || [];
  const oppositePaths = (base === 'master'
    ? [...(main.ownedPaths || []), ...shared]
    : [...(master.ownedPaths || [])]).map(toPosix);
  const oppositePrefixes = (base === 'master'
    ? (main.ownedPrefixes || [])
    : (master.ownedPrefixes || [])).map(toPosix);

  for (const p of oppositePaths) {
    if (underPrefix(p, ap)) return `allowed prefix "${ap}" would include opposite-authority path "${p}"`;
  }
  for (const pre of oppositePrefixes) {
    if (underPrefix(pre, ap) || underPrefix(ap, pre)) return `allowed prefix "${ap}" overlaps opposite-authority prefix "${pre}"`;
  }
  const cls = classify(ap, map);
  if (base === 'master' && cls === 'MAIN_OWNED') return `allowed prefix "${ap}" is inside main authority`;
  if (base === 'main' && (cls === 'MASTER_OWNED' || cls === 'MASTER_DEFAULT')) return `allowed prefix "${ap}" is inside master authority (default-authority=master)`;
  return null;
}

function checkChanged(map, base, changed) {
  const errors = [];
  for (const raw of changed) {
    const reason = unsafePathReason(raw);
    if (reason) { errors.push(`unsafe path "${raw}": ${reason}`); continue; }
    const path = toPosix(raw).replace(/^\.\//, '');
    const cls = classify(path, map);
    if (cls === 'CONFLICT') errors.push(`${path}: ambiguous authority (matches both master and main)`);
    else if (base === 'master' && cls === 'MAIN_OWNED') errors.push(`${path}: main-authority file cannot change in a master PR`);
    else if (base === 'main' && (cls === 'MASTER_OWNED' || cls === 'MASTER_DEFAULT')) errors.push(`${path}: ${cls === 'MASTER_DEFAULT' ? 'unclassified path defaults to master and' : 'master-authority file'} cannot change in a main PR`);
    else console.log(`  [ok ] ${cls.padEnd(14)} ${path}`);
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
  if (map.defaultAuthority !== 'master') {
    console.error('FAIL: branch authority map must declare defaultAuthority "master"');
    process.exit(1);
  }

  let base, errors = [];

  if (args.length === 2 && args[1].endsWith('.json')) {
    const c = JSON.parse(readFileSync(args[1], 'utf8'));
    base = c.baseBranch;
    if (!['master', 'main'].includes(base)) errors.push(`contract baseBranch invalid: ${base}`);
    const scope = c.authorizedScope || {};
    // exactPaths authority
    errors = errors.concat(checkChanged(map, base, (scope.exactPaths || [])));
    // allowedPrefixes authority
    for (const ap of (scope.allowedPrefixes || [])) {
      const reason = unsafePathReason(ap);
      if (reason) { errors.push(`allowed prefix "${ap}" unsafe: ${reason}`); continue; }
      const e = base ? prefixAuthorityError(toPosix(ap).replace(/^\.\//, ''), base, map) : null;
      if (e) errors.push(e); else console.log(`  [ok ] allowedPrefix   ${ap}`);
    }
    const fa = Array.isArray(c.forbiddenActions) ? c.forbiddenActions : [];
    for (const tok of ['merge-main-into-master', 'merge-master-into-main']) {
      if (!fa.includes(tok)) errors.push(`contract must forbid "${tok}"`);
    }
    if (c.wholesaleMerge === true || c.mergeAcrossAuthorities === true) errors.push('contract requests a wholesale main<->master merge (forbidden)');
  } else {
    base = args[1];
    if (!['master', 'main'].includes(base)) { console.error(`FAIL: base must be master|main, got ${base}`); process.exit(1); }
    const changed = readFileSync(args[2], 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    errors = errors.concat(checkChanged(map, base, changed));
  }

  if (errors.length) {
    console.error(`FAIL: branch-authority violations (base=${base})`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`PASS: branch authority holds for base=${base}`);
  process.exit(0);
}

main();
