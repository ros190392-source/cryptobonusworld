#!/usr/bin/env node
// Deterministic ENFORCEMENT-READINESS evaluation for the master blocking
// portfolio (issue #366, Stage 2 / S2-02).
//
// THIS IS NOT THE INTEGRITY VALIDATOR. The two answer different questions and
// are deliberately separate commands:
//
//   npm run ci:master-portfolio:validate   INTEGRITY
//       "Is scripts/ci/master-blocking-portfolio.json a TRUE statement about the
//        workflows in this repository today?" A faithfully recorded
//        DEPENDENCY_UNRESOLVABLE fact is DATA for that question. Integrity is
//        expected to PASS on the current baseline.
//
//   npm run ci:master-portfolio:readiness  ENFORCEMENT READINESS (this file)
//       "May this portfolio be used as BLOCKING ENFORCEMENT AUTHORITY?" Here an
//        unresolved dependency inside blocking authority is disqualifying,
//        because the enforcement decision would rest on a dependency surface
//        nobody has proven. Readiness is expected to FAIL (NOT_READY) on the
//        current baseline, and that non-zero exit is the CORRECT result — it is
//        not a build failure and not a contract failure.
//
// AUTHORITY RULE: a passing integrity audit confers no branch-protection, merge
// or deploy authority. Only a PASSING readiness evaluation may be cited as
// enforcement authority, and it is required only at later migration /
// protection-activation stages. This command changes nothing: it never edits a
// workflow, never touches branch protection and never migrates gate logic.
//
// Exit code: 0 => READY, 1 => NOT_READY (or integrity not established).
// `--json` prints the whole machine-readable result instead of the report.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AUTHORITY_RULE,
  ENFORCEMENT_BLOCKING_GAP_CODES,
  evaluateEnforcementReadiness,
  summarizeUnresolvedDependencies,
} from './master-blocking-portfolio-contract.mjs';
import { runValidator, PORTFOLIO_PATH } from './master-blocking-portfolio-validator.mjs';

const ROOT = resolve(process.cwd());

/**
 * Readiness over the live snapshot, gated on integrity.
 *
 * Readiness over an UNTRUTHFUL snapshot would be meaningless — the unresolved
 * rows it counts are exactly the rows integrity proves are faithful — so a
 * failing integrity audit forces NOT_READY rather than producing a verdict from
 * unverified data.
 */
export function runReadiness() {
  const portfolio = JSON.parse(readFileSync(resolve(ROOT, PORTFOLIO_PATH), 'utf8'));
  const integrityResults = runValidator();
  const integrityFailures = integrityResults.filter((result) => !result.ok);
  const integrityValid = integrityFailures.length === 0;
  const readiness = evaluateEnforcementReadiness(portfolio);
  const blockers = [...readiness.blockers];
  if (!integrityValid) {
    blockers.unshift(
      `portfolio integrity is not established (${integrityFailures.length}/${integrityResults.length} integrity checks failed) — readiness cannot be evaluated from an unverified snapshot`,
    );
  }
  return {
    ...readiness,
    integrityValid,
    integrityChecks: integrityResults.length,
    integrityFailures: integrityFailures.length,
    enforcementReady: integrityValid && readiness.enforcementReady,
    enforcementAuthority: integrityValid && readiness.enforcementReady ? 'ELIGIBLE' : 'NONE',
    blockers,
    enforcementBlockingGapCodes: [...ENFORCEMENT_BLOCKING_GAP_CODES],
    authorityRule: AUTHORITY_RULE.statement,
    portfolioMetrics: summarizeUnresolvedDependencies(portfolio),
  };
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]).endsWith('master-blocking-portfolio-readiness.mjs');
if (invokedDirectly) {
  let result;
  try {
    result = runReadiness();
  } catch (error) {
    console.error(`CBW MASTER PORTFOLIO ENFORCEMENT READINESS: NOT_READY (evaluation could not run)\n - ${error.message}`);
    process.exit(1);
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.enforcementReady ? 0 : 1);
  }

  const verdict = result.enforcementReady ? 'READY' : 'NOT_READY';
  console.log(`CBW MASTER PORTFOLIO ENFORCEMENT READINESS: ${verdict}`);
  // The single machine-readable authority line. Both facts are always printed
  // together so no reader can quote integrity success as enforcement authority.
  console.log(
    `CBW MASTER PORTFOLIO AUTHORITY: integrityValid=${result.integrityValid} ` +
      `enforcementReady=${result.enforcementReady} enforcementAuthority=${result.enforcementAuthority}`,
  );
  console.log(
    `CBW MASTER PORTFOLIO READINESS METRICS: unresolvedBlockingRows=${result.unresolvedBlockingRows} ` +
      `affectedBlockingEntries=${result.affectedBlockingEntries} ` +
      `blockingAuthorityEntries=${result.blockingAuthorityEntries} ` +
      `stage2MigrationCandidates=${result.stage2MigrationCandidates} ` +
      `outsideAuthorityUnresolvedRows=${result.outsideBlockingAuthority.unresolvedRows} ` +
      `portfolioUnresolvedRows=${result.portfolioMetrics.unresolvedRows}`,
  );

  for (const blocker of result.blockers) console.log(` ! ${blocker}`);

  if (result.affected.length) {
    console.log(`\nAFFECTED BLOCKING ENTRIES (${result.affected.length}):`);
    for (const entry of result.affected) {
      console.log(
        ` - ${entry.entryId} [${entry.classification}/${entry.migrationState}` +
          `${entry.stage2MigrationCandidate ? '/stage2-candidate' : ''}] ` +
          `${entry.workflowFile}#${entry.jobId} "${entry.checkContext}" — ${entry.unresolvedRows} unresolved row(s)`,
      );
    }
  }

  if (result.rows.length) {
    console.log(`\nUNRESOLVED BLOCKING ROWS (${result.rows.length}):`);
    for (const row of result.rows) {
      console.log(` - ${row.entryId} :: ${row.code} :: ${row.detail}`);
    }
    console.log(`\nREASON SUMMARY (${result.reasonSummary.length} distinct reasons):`);
    for (const bucket of result.reasonSummary) {
      console.log(` - rows=${bucket.rows} entries=${bucket.entries} :: ${bucket.reason}`);
    }
    console.log(`\nORIGIN SUMMARY (${result.originSummary.length} distinct origins):`);
    for (const bucket of result.originSummary) {
      console.log(` - rows=${bucket.rows} entries=${bucket.entries} :: ${bucket.origin || '(no origin recorded)'}`);
    }
  }

  const outside = result.outsideBlockingAuthority;
  console.log(
    `\nOUTSIDE BLOCKING AUTHORITY (does NOT affect this verdict): ` +
      `${outside.unresolvedRows} unresolved row(s) across ${outside.entries} entry(ies) ` +
      `${JSON.stringify(outside.byClassification)}`,
  );

  console.log(`\nAUTHORITY RULE: ${result.authorityRule}`);
  process.exit(result.enforcementReady ? 0 : 1);
}
