#!/usr/bin/env node
// Deterministic validator for the master blocking-portfolio contract
// (issue #366, Stage 2 / S2-02).
//
// Proves, offline and without invoking GitHub, that
// scripts/ci/master-blocking-portfolio.json is a TRUE statement about the
// workflows currently tracked in this repository:
//
//   * the machine-readable file parses strictly, declares EXACTLY the allowed
//     root keys, pins the one supported schemaVersion, and carries no unknown
//     fields on any entry;
//   * every discovered job's pull_request semantics are PROVABLE — an unmodelled
//     trigger, job-level `if` or `continue-on-error` fails the audit outright and
//     cannot be synchronised away by editing the snapshot;
//   * every entry points at a workflow file and job that still exist;
//   * workflow name / job id / visible check context still match the YAML;
//   * blocking vs advisory semantics have not silently drifted;
//   * the recorded path-filter state matches the YAML;
//   * portfolio ids are unique, and a duplicate claimed stable context is only
//     tolerated with an explicit written justification;
//   * classification and migrationState come from closed vocabularies;
//   * every discovered blocking-capable PR job is represented;
//   * no BLOCKING entry has silently disappeared or been softened.
//
// Fails closed: an unparseable workflow, an unmodelled job-level `if`, an empty
// scan or a malformed portfolio file is a FAILURE, never a skipped check.
//
// This validator is INVENTORY-ONLY. It never edits a workflow, never changes
// branch protection and never migrates gate logic.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { auditPortfolio, summarizeUnresolvedDependencies } from './master-blocking-portfolio-contract.mjs';

const ROOT = resolve(process.cwd());
export const PORTFOLIO_PATH = 'scripts/ci/master-blocking-portfolio.json';

export function loadWorkflowFiles() {
  const listed = execFileSync('git', ['ls-files', '-z', '.github/workflows'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  }).split('\0');
  if (listed[listed.length - 1] === '') listed.pop();
  const files = [];
  for (const path of listed) {
    if (!path.endsWith('.yml') && !path.endsWith('.yaml')) continue;
    files.push({ path, text: readFileSync(resolve(ROOT, path), 'utf8') });
  }
  return files;
}

export function loadPackageScripts() {
  return JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).scripts ?? {};
}

// Every path git tracks. This is the ONLY universe the bounded dependency
// closure resolves against, so an untracked scratch file can never become a
// declared dependency and a deleted file can never stay one.
export function loadRepoFiles() {
  const listed = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 256,
  }).split('\0');
  if (listed[listed.length - 1] === '') listed.pop();
  return listed;
}

// Reader for the dependency closure. Returns null (never throws) so an
// unreadable executed dependency becomes an explicit DEPENDENCY_UNREADABLE gap
// rather than an exception that aborts the audit.
export function makeRepoReader() {
  const cache = new Map();
  return (path) => {
    if (cache.has(path)) return cache.get(path);
    let text = null;
    try {
      text = readFileSync(resolve(ROOT, path), 'utf8');
    } catch {
      text = null;
    }
    cache.set(path, text);
    return text;
  };
}

export function runValidator() {
  const files = loadWorkflowFiles();
  if (files.length === 0) {
    return [{ label: 'workflow inventory is non-empty', ok: false, detail: 'git ls-files returned no workflows' }];
  }
  return auditPortfolio({
    portfolioText: readFileSync(resolve(ROOT, PORTFOLIO_PATH), 'utf8'),
    files,
    packageScripts: loadPackageScripts(),
    exists: (path) => existsSync(resolve(ROOT, path)),
    repoFiles: loadRepoFiles(),
    readFile: makeRepoReader(),
  });
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]).endsWith('master-blocking-portfolio-validator.mjs');
if (invokedDirectly) {
  let results;
  try {
    results = runValidator();
  } catch (error) {
    console.error(`CBW MASTER BLOCKING PORTFOLIO: FAIL (validator could not run)\n - ${error.message}`);
    process.exit(1);
  }
  const failures = results.filter((result) => !result.ok);
  if (failures.length) {
    console.error(`CBW MASTER BLOCKING PORTFOLIO: FAIL (${failures.length}/${results.length})`);
    for (const failure of failures) {
      console.error(` - ${failure.detail ? `${failure.label}: ${failure.detail}` : failure.label}`);
    }
    process.exit(1);
  }
  console.log(`CBW MASTER BLOCKING PORTFOLIO: PASS (${results.length}/${results.length})`);
  // Reproducible metrics, printed from the SAME code that defines them, so a
  // number quoted in a report or a PR body can always be regenerated with one
  // command instead of being restated as prose. See
  // `summarizeUnresolvedDependencies` for the exact definition of each term.
  const metrics = summarizeUnresolvedDependencies(JSON.parse(readFileSync(resolve(ROOT, PORTFOLIO_PATH), 'utf8')));
  console.log(
    `CBW MASTER BLOCKING PORTFOLIO METRICS: unresolvedRows=${metrics.unresolvedRows} ` +
      `distinctOriginReasonFacts=${metrics.distinctOriginReasonFacts} ` +
      `distinctReasons=${metrics.distinctReasons} distinctOrigins=${metrics.distinctOrigins}`,
  );
}
