#!/usr/bin/env node
// ResearchOps Subscription Factory V1.1 — canonical CLI.
// Runs directly with Node 20 and built-in modules only:
//   node research-ops/factory-v1-1/bin/researchops.mjs <create|validate|status> [flags]
// Exit 0 = success/valid, non-zero = failure/invalid. Fail-closed.

import { writeCanonical, writeJson, ensureDir, exists } from '../lib/util.mjs';
import { parseArgs } from '../lib/args.mjs';
import { createTask } from '../lib/create.mjs';
import { validateTask } from '../lib/validate.mjs';
import { statusTask } from '../lib/status.mjs';
import { join } from 'node:path';

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
      '--tasks-dir': { required: false, aliasKey: 'tasksDir' },
      '--created-at': { required: false, aliasKey: 'createdAt' },
    },
  });
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
      '--task-prefix': { required: false, aliasKey: 'taskPrefix' },
      '--report-dir': { required: false, aliasKey: 'reportDir' },
    },
    booleans: new Set(['--require-package', '--json']),
  });
  const report = validateTask(a.taskDir, a);
  if (a['require-package'] === undefined) { /* no-op */ }
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
    booleans: new Set(['--json']),
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

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log('usage: researchops <create|validate|status> [flags]');
    process.exit(cmd ? 0 : 2);
  }
  try {
    if (cmd === 'create') return cmdCreate(rest);
    if (cmd === 'validate') return cmdValidate(rest);
    if (cmd === 'status') return cmdStatus(rest);
    die(`unknown command: ${cmd}`, 2);
  } catch (e) {
    die(e.message, 2);
  }
}

main();
