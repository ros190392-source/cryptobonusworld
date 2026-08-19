#!/usr/bin/env node
// LEGACY <-> UNIFIED PARITY PROOF for every migrated blocker (issue #366):
// Global Header Interaction and Public SEO Metadata (S2-03), Public Navigation
// Boundary and Public First Screen Budget (S2-04 batch 01), plus Contact Utility
// and Exchange Preview Family (S2-04 batch 02).
//
// The unified required gate executes each of them while the specialized
// path-filtered workflows stay in place, BYTE-IDENTICAL, and keep reporting
// independently. That is only a safe arrangement if the unified execution is
// genuinely EQUIVALENT to the legacy one. "Equivalent" is not a claim to be
// asserted in a PR body; it is proved here, on four axes:
//
//   1. COMMAND PARITY — the unified blocker runs exactly the legacy command
//      sequence, in the legacy order, with nothing dropped and nothing softened.
//      No reduction in commands, in the build requirement, in the browser smoke
//      matrix, in the SEO schema test, or in the indexability inventory.
//
//   2. CONDITION PARITY — every legacy step `if` is reproduced, PER GATE, read
//      off that gate's own legacy YAML. The gates genuinely disagree: four of
//      them guard the indexability inventory with `always() && steps.build
//      .outcome == 'success'` so it still runs when the step before it failed,
//      while cbw-contact-utility.yml leaves it unguarded so a failed smoke skips
//      it. Dropping the guard where it exists would be a silent narrowing;
//      inventing it where it does not would be a silent widening. Both are
//      caught here because the expectation is derived, never assumed.
//
//   3. RED/GREEN PARITY — the two jobs are SIMULATED over the complete
//      cross-product of per-step success/failure and proved to reach the same
//      conclusion in every reachable state. This is the axis that actually
//      matters for blocking authority, and it is the one prose cannot establish.
//
//   4. PUBLISHED-OUTCOME PARITY — a job conclusion is not what the aggregator
//      reads; the PUBLISHED outcome is. Each simulated run is therefore fed to
//      the real result emitter, and the published PASS / FAIL / NOT_APPLICABLE
//      is asserted. This is what rules out a job that goes red while still
//      publishing PASS, and a job that skipped everything while publishing one.
//
// It also proves the legacy workflows were NOT weakened by this stage: each is
// still present, still blocking, still triggered on pull_request to master, and
// still carries its own path filter.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import {
  GATES,
  GATE_IDS,
  gateCommands,
  legacyBlockingSteps,
  runSteps,
  terminalReportingStep,
} from './master-required-gate-gates.mjs';
import { evaluateGateResult } from './master-required-gate-gate-result.mjs';

const ROOT = resolve(process.cwd());
const UNIFIED_WORKFLOW = '.github/workflows/cbw-master-required-gate.yml';
// Any well-formed digest works here: this suite proves OUTCOME parity, and the
// digest's authenticity is the aggregator's job (proved by the contract test and
// the mutation suite against a forged chain). It is supplied only because the
// emitter refuses to publish anything at all without one.
const PARITY_DIGEST = '0'.repeat(64);

let checks = 0;
const failures = [];
function check(label, ok, detail = '') {
  checks += 1;
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

function loadWorkflow(path) {
  return yaml.load(readFileSync(resolve(ROOT, path), 'utf8'), { schema: yaml.CORE_SCHEMA });
}

const unified = loadWorkflow(UNIFIED_WORKFLOW);

// `runSteps` / `legacyBlockingSteps` / `terminalReportingStep` are imported from
// the registry rather than restated here: the workflow contract applies the same
// rule, and two copies of "what counts as blocking work" is exactly the kind of
// drift this suite exists to catch. `uses:` steps (checkout, setup-node) are
// infrastructure and are asserted separately by the workflow contract.

/**
 * Deterministic simulation of a GitHub Actions job over one failure-injection
 * vector.
 *
 * `conditionOf(step, state)` returns whether the step executes. `failures` is the
 * set of step keys that FAIL when they execute. Returns the job conclusion plus
 * every step outcome, in GitHub's own vocabulary.
 */
function simulate(steps, { conditionOf, failing }) {
  const outcomes = {};
  let jobFailed = false;
  for (const step of steps) {
    const runs = conditionOf(step, { jobFailed, outcomes });
    if (!runs) {
      outcomes[step.key] = 'skipped';
      continue;
    }
    if (failing.has(step.key)) {
      outcomes[step.key] = 'failure';
      jobFailed = true;
    } else {
      outcomes[step.key] = 'success';
    }
  }
  return { conclusion: jobFailed ? 'failure' : 'success', outcomes };
}

for (const gateId of GATE_IDS) {
  const gate = GATES[gateId];

  // --- 0. the legacy workflow is untouched and still blocking ----------------
  check(`legacy workflow "${gate.legacyWorkflow}" still exists`, existsSync(resolve(ROOT, gate.legacyWorkflow)));
  const legacy = loadWorkflow(gate.legacyWorkflow);
  const legacyTriggers = legacy?.on ?? legacy?.true;
  const legacyPr = legacyTriggers?.pull_request;
  check(`legacy "${gateId}" still triggers on pull_request`, Boolean(legacyPr));
  check(
    `legacy "${gateId}" still targets master`,
    Array.isArray(legacyPr?.branches) && legacyPr.branches.includes('master'),
    JSON.stringify(legacyPr?.branches),
  );
  // The legacy workflow keeps its own path filter. That filter is exactly why it
  // cannot be a required context on its own, and exactly why it was migrated —
  // but it must not be removed here, because this stage does not retire it.
  check(
    `legacy "${gateId}" still declares its own path filter (not retired by this stage)`,
    Array.isArray(legacyPr?.paths) && legacyPr.paths.length > 0,
    JSON.stringify(legacyPr?.paths),
  );
  const legacyJob = legacy?.jobs?.[gate.legacyJobId];
  check(`legacy job "${gate.legacyJobId}" still exists`, Boolean(legacyJob));
  check(`legacy job "${gate.legacyJobId}" is still blocking`, legacyJob?.['continue-on-error'] !== true);
  check(`legacy job "${gate.legacyJobId}" carries no job-level if`, !Object.prototype.hasOwnProperty.call(legacyJob ?? {}, 'if'));
  for (const step of Array.isArray(legacyJob?.steps) ? legacyJob.steps : []) {
    check(
      `legacy "${gateId}" step "${step?.name}" is still blocking`,
      step?.['continue-on-error'] !== true,
    );
  }

  // --- 0b. the terminal reporting step, if the registry declares one ---------
  //
  // S2-04 batch 02 migrated the first legacy job that ends in a non-blocking
  // reporting step (`cbw-exchange-preview-family.yml`'s `Summary`, which renders
  // a table into $GITHUB_STEP_SUMMARY and runs no repository command). Excluding
  // it from command parity is only legitimate if the exclusion is EARNED, so
  // both directions are proved here before the comparison below uses it:
  //
  //   * a gate declaring `legacyReportingStep: null` fails if a qualifying step
  //     appears — nothing can be quietly dropped from the blocking sequence;
  //   * a gate declaring a name fails if the step is missing, renamed, or stops
  //     qualifying (non-terminal, not `always()`, or running a real command).
  //
  // The predicate itself is fail-closed: a step that fails any of its four
  // structural tests is NOT recognised as reporting, stays in the blocking set,
  // and makes the command-parity assertion below fail loudly.
  const reportingStep = terminalReportingStep(legacyJob);
  const declaredReporting = gate.legacyReportingStep ?? null;
  check(
    declaredReporting === null
      ? `"${gateId}": the legacy job has NO terminal non-blocking reporting step, as the registry declares`
      : `"${gateId}": the legacy job's declared terminal reporting step "${declaredReporting}" is present and still qualifies`,
    (reportingStep === null ? null : String(reportingStep.name ?? '')) === declaredReporting,
    `registry=${JSON.stringify(declaredReporting)} legacy=${JSON.stringify(reportingStep?.name ?? null)}`,
  );
  if (declaredReporting !== null && reportingStep) {
    // Spelled out one property at a time so a reader can see WHY this step is
    // excluded, instead of trusting a single composite predicate.
    const allRunSteps = runSteps(legacyJob);
    check(
      `"${gateId}": the excluded reporting step is TERMINAL (no later step can observe it)`,
      allRunSteps[allRunSteps.length - 1] === reportingStep,
    );
    check(
      `"${gateId}": the excluded reporting step is exactly \`if: always()\` (it never changes what runs)`,
      String(reportingStep.if ?? '').trim() === 'always()',
      JSON.stringify(reportingStep.if ?? null),
    );
    check(
      `"${gateId}": the excluded reporting step only writes to \$GITHUB_STEP_SUMMARY`,
      String(reportingStep.run).includes('GITHUB_STEP_SUMMARY'),
    );
    check(
      `"${gateId}": the excluded reporting step invokes NO repository command`,
      !/(^|[\s;&|(`])(npm|node|npx|yarn|pnpm)([\s;&|)`]|$)/.test(String(reportingStep.run)),
      String(reportingStep.run).slice(0, 120),
    );
    // …and it must not be the only thing standing between the job and a pass:
    // the blocking sequence has to survive its removal with real work in it.
    check(
      `"${gateId}": excluding it leaves a non-empty blocking sequence`,
      legacyBlockingSteps(legacyJob).length > 0,
    );
  }

  // --- 1. COMMAND PARITY -----------------------------------------------------
  const legacyCommands = legacyBlockingSteps(legacyJob).map((step) => String(step.run).trim());
  const registryCommands = gateCommands(gateId);
  const unifiedJob = unified?.jobs?.[gate.jobId];
  check(`unified blocker job "${gate.jobId}" exists`, Boolean(unifiedJob));
  // The unified job also runs the result emitter, which has no legacy analogue.
  // It is excluded from the parity comparison and asserted separately by the
  // workflow contract, so parity is over BLOCKING WORK only.
  const emitterCommand = 'node scripts/ci/master-required-gate-gate-result.mjs';
  const unifiedCommands = runSteps(unifiedJob)
    .map((step) => String(step.run).trim())
    .filter((command) => command !== emitterCommand);

  check(
    `"${gateId}": the gate registry reproduces the legacy command sequence exactly`,
    JSON.stringify(registryCommands) === JSON.stringify(legacyCommands),
    `registry=${JSON.stringify(registryCommands)} legacy=${JSON.stringify(legacyCommands)}`,
  );
  check(
    `"${gateId}": the unified blocker runs the legacy command sequence exactly`,
    JSON.stringify(unifiedCommands) === JSON.stringify(legacyCommands),
    `unified=${JSON.stringify(unifiedCommands)} legacy=${JSON.stringify(legacyCommands)}`,
  );
  check(
    `"${gateId}": no legacy command was dropped`,
    legacyCommands.every((command) => unifiedCommands.includes(command)),
    legacyCommands.filter((command) => !unifiedCommands.includes(command)).join(' | '),
  );
  // Named explicitly so a reader can see the specific obligations are met rather
  // than inferring them from a sequence comparison.
  check(`"${gateId}": the production build requirement is preserved`, unifiedCommands.includes('npm run build'));
  check(`"${gateId}": clean dependency installation is preserved`, unifiedCommands.includes('npm ci'));
  // The indexability inventory is an obligation of the gates whose LEGACY job
  // runs it, and of exactly those. Asserting it unconditionally would be a false
  // requirement for a gate that never had it (and asserting nothing would let it
  // be dropped from a gate that did), so the obligation is READ OFF the legacy
  // workflow rather than assumed either way.
  const INDEXABILITY = 'node scripts/seo/site-indexability-inventory.mjs';
  check(
    legacyCommands.includes(INDEXABILITY)
      ? `"${gateId}": the indexability inventory is preserved`
      : `"${gateId}": no indexability inventory is invented where the legacy job has none`,
    unifiedCommands.includes(INDEXABILITY) === legacyCommands.includes(INDEXABILITY),
    `legacy=${legacyCommands.includes(INDEXABILITY)} unified=${unifiedCommands.includes(INDEXABILITY)}`,
  );
  // The gate's OWN hard-gate script — named by the registry, not guessed from
  // the command shape — must be run by both sides.
  const gateScriptCommand = `node ${gate.gateScript}`;
  check(
    `"${gateId}": the legacy job runs the registry's declared hard-gate script`,
    legacyCommands.includes(gateScriptCommand),
    `${gateScriptCommand} not in ${legacyCommands.join(' | ')}`,
  );
  check(
    `"${gateId}": the unified blocker runs the same hard-gate script`,
    unifiedCommands.includes(gateScriptCommand),
    `${gateScriptCommand} not in ${unifiedCommands.join(' | ')}`,
  );
  // A gate script is EXCLUSIVE to its gate. That exclusivity is what licenses
  // every other gate to treat it as inert, so it is proved here rather than
  // assumed by the registry that derives the inert sets from it.
  for (const otherId of GATE_IDS) {
    if (otherId === gateId) continue;
    check(
      `"${gateId}": its hard-gate script is not run by blocker "${otherId}"`,
      !gateCommands(otherId).includes(gateScriptCommand),
      gateCommands(otherId).join(' | '),
    );
  }

  // --- 2. CONDITION PARITY ---------------------------------------------------
  // Indexed against the BLOCKING steps, so a legacy job that ends in a proven
  // reporting step lines up with the registry's step list exactly.
  const legacyRunSteps = legacyBlockingSteps(legacyJob);
  for (const [index, declared] of gate.steps.entries()) {
    const legacyStep = legacyRunSteps[index];
    const legacyIf = Object.prototype.hasOwnProperty.call(legacyStep ?? {}, 'if')
      ? String(legacyStep.if).trim()
      : null;
    check(
      `"${gateId}": registry records the legacy \`if\` of step "${declared.id}" faithfully`,
      legacyIf === declared.legacyIf,
      `legacy=${JSON.stringify(legacyIf)} registry=${JSON.stringify(declared.legacyIf)}`,
    );
  }

  // --- 3. RED/GREEN PARITY ---------------------------------------------------
  //
  // Both jobs are simulated over the complete cross-product of per-step
  // success/failure. The unified job is simulated under applicability
  // APPLICABLE, which is the only state in which it does blocking work and
  // therefore the only state a legacy comparison is meaningful in.
  const keys = gate.steps.map((step) => step.id);
  const legacySimSteps = gate.steps.map((step) => ({ key: step.id, legacyIf: step.legacyIf }));
  const unifiedSimSteps = gate.steps.map((step) => ({ key: step.id, condition: step.condition }));

  // Legacy semantics: a step with no `if` runs only when nothing has failed yet;
  // the `always() && steps.build.outcome == 'success'` step runs whenever the
  // build succeeded, regardless of an intervening failure.
  const legacyCondition = (step, { jobFailed, outcomes }) => {
    if (step.legacyIf === null) return !jobFailed;
    if (step.legacyIf === "always() && steps.build.outcome == 'success'") {
      return outcomes.build === 'success';
    }
    throw new Error(`parity: unmodelled legacy condition ${JSON.stringify(step.legacyIf)}`);
  };
  // Unified semantics under APPLICABLE, read straight off the registry.
  const unifiedCondition = (step, { jobFailed, outcomes }) => {
    if (step.condition === 'applicability') return !jobFailed;
    if (step.condition === 'applicability-after-build') return outcomes.build === 'success';
    throw new Error(`parity: unmodelled unified condition ${JSON.stringify(step.condition)}`);
  };

  const total = 2 ** keys.length;
  let compared = 0;
  for (let mask = 0; mask < total; mask += 1) {
    const failing = new Set(keys.filter((_, index) => (mask >> index) & 1));
    const legacyRun = simulate(legacySimSteps, { conditionOf: legacyCondition, failing });
    const unifiedRun = simulate(unifiedSimSteps, { conditionOf: unifiedCondition, failing });
    compared += 1;
    check(
      `"${gateId}": red/green parity for failing={${[...failing].join(',') || 'none'}}`,
      legacyRun.conclusion === unifiedRun.conclusion,
      `legacy=${legacyRun.conclusion} unified=${unifiedRun.conclusion}`,
    );
    check(
      `"${gateId}": step-by-step outcome parity for failing={${[...failing].join(',') || 'none'}}`,
      JSON.stringify(legacyRun.outcomes) === JSON.stringify(unifiedRun.outcomes),
      `legacy=${JSON.stringify(legacyRun.outcomes)} unified=${JSON.stringify(unifiedRun.outcomes)}`,
    );
  }
  check(`"${gateId}": the parity simulation covered the full cross-product`, compared === total, `${compared}/${total}`);

  // A green legacy run must be green unified, and a red legacy run must be red
  // unified — stated as its own assertion so the direction of the guarantee is
  // explicit rather than implied by the equality above.
  const allGreen = simulate(unifiedSimSteps, { conditionOf: unifiedCondition, failing: new Set() });
  check(`"${gateId}": with nothing failing, the unified blocker is GREEN`, allGreen.conclusion === 'success');
  check(
    `"${gateId}": with nothing failing, every blocking step really executed`,
    keys.every((key) => allGreen.outcomes[key] === 'success'),
    JSON.stringify(allGreen.outcomes),
  );
  for (const key of keys) {
    const single = simulate(unifiedSimSteps, { conditionOf: unifiedCondition, failing: new Set([key]) });
    check(
      `"${gateId}": a failure in blocking step "${key}" makes the unified blocker RED`,
      single.conclusion === 'failure',
      JSON.stringify(single.outcomes),
    );
  }

  // --- 3b. the PUBLISHED OUTCOME, not merely the job conclusion ---------------
  //
  // Red/green parity above compares GitHub job conclusions. What the aggregator
  // actually consumes is the outcome this job PUBLISHES, so the simulation is
  // fed to the real emitter — no reimplementation — and the published value is
  // asserted for every failure vector. A job that went red while still
  // publishing PASS would satisfy every check above and none of these.
  const publish = (run, applicability) =>
    evaluateGateResult({
      gateId,
      applicability,
      digest: PARITY_DIGEST,
      stepOutcomes: gate.steps.map((step) => ({ key: step.id, name: step.command, outcome: run.outcomes[step.id] })),
    }).result;

  check(
    `"${gateId}": a fully successful APPLICABLE sequence publishes PASS`,
    publish(allGreen, 'APPLICABLE') === 'PASS',
    publish(allGreen, 'APPLICABLE'),
  );
  for (const key of keys) {
    const single = simulate(unifiedSimSteps, { conditionOf: unifiedCondition, failing: new Set([key]) });
    check(
      `"${gateId}": a failure in blocking step "${key}" publishes FAIL`,
      publish(single, 'APPLICABLE') === 'FAIL',
      publish(single, 'APPLICABLE'),
    );
  }
  // BUILD FAILURE PROPAGATION, stated on its own because it is the one step
  // whose failure also changes what runs after it. In the legacy job a failed
  // build means the hard-gate script never executes; the unified job must reach
  // the same place — the gate script does NOT run, and the blocker is FAIL, not
  // a NOT_APPLICABLE or a vacuous PASS.
  const buildFailed = simulate(unifiedSimSteps, { conditionOf: unifiedCondition, failing: new Set(['build']) });
  const legacyBuildFailed = simulate(legacySimSteps, { conditionOf: legacyCondition, failing: new Set(['build']) });
  const gateStepId = gate.steps.find((step) => step.command === `node ${gate.gateScript}`)?.id;
  check(`"${gateId}": the registry's hard-gate script has a declared step id`, Boolean(gateStepId), gate.gateScript);
  check(
    `"${gateId}": a failed build stops the hard-gate script in the LEGACY job`,
    legacyBuildFailed.outcomes[gateStepId] === 'skipped',
    JSON.stringify(legacyBuildFailed.outcomes),
  );
  check(
    `"${gateId}": a failed build stops the hard-gate script in the UNIFIED job too`,
    buildFailed.outcomes[gateStepId] === 'skipped',
    JSON.stringify(buildFailed.outcomes),
  );
  check(
    `"${gateId}": a failed build publishes FAIL (never a vacuous PASS or NOT_APPLICABLE)`,
    publish(buildFailed, 'APPLICABLE') === 'FAIL',
    publish(buildFailed, 'APPLICABLE'),
  );
  // GATE SCRIPT FAILURE — the whole point of the gate.
  const scriptFailed = simulate(unifiedSimSteps, { conditionOf: unifiedCondition, failing: new Set([gateStepId]) });
  check(
    `"${gateId}": a hard-gate script failure makes the unified blocker RED`,
    scriptFailed.conclusion === 'failure',
    JSON.stringify(scriptFailed.outcomes),
  );
  check(
    `"${gateId}": a hard-gate script failure publishes FAIL`,
    publish(scriptFailed, 'APPLICABLE') === 'FAIL',
    publish(scriptFailed, 'APPLICABLE'),
  );

  // --- 4. NOT_APPLICABLE has no legacy analogue and must skip everything ------
  const notApplicable = simulate(unifiedSimSteps, {
    conditionOf: () => false,
    failing: new Set(),
  });
  check(
    `"${gateId}": under NOT_APPLICABLE every blocking step is skipped`,
    keys.every((key) => notApplicable.outcomes[key] === 'skipped'),
    JSON.stringify(notApplicable.outcomes),
  );
  check(
    `"${gateId}": a NOT_APPLICABLE job that skipped everything publishes NOT_APPLICABLE`,
    publish(notApplicable, 'NOT_APPLICABLE') === 'NOT_APPLICABLE',
    publish(notApplicable, 'NOT_APPLICABLE'),
  );
  // …and the two halves cannot be mixed. A job that RAN its work cannot claim
  // irrelevance, and a job that skipped its work cannot claim a pass. Without
  // both directions, NOT_APPLICABLE would be a way to publish green for free.
  check(
    `"${gateId}": a job that RAN its work cannot publish NOT_APPLICABLE`,
    publish(allGreen, 'NOT_APPLICABLE') === 'FAIL',
    publish(allGreen, 'NOT_APPLICABLE'),
  );
  check(
    `"${gateId}": a job that SKIPPED its work cannot publish PASS`,
    publish(notApplicable, 'APPLICABLE') === 'FAIL',
    publish(notApplicable, 'APPLICABLE'),
  );
}

// The unified workflow itself must remain unfiltered, or the whole arrangement
// (an always-reporting required context) collapses.
const unifiedTriggers = unified?.on ?? unified?.true;
check(
  'the unified workflow declares NO pull_request path filter',
  !Object.prototype.hasOwnProperty.call(unifiedTriggers?.pull_request ?? {}, 'paths') &&
    !Object.prototype.hasOwnProperty.call(unifiedTriggers?.pull_request ?? {}, 'paths-ignore'),
);
// And it must never read another workflow's status: this gate owns its outcomes.
const unifiedText = readFileSync(resolve(ROOT, UNIFIED_WORKFLOW), 'utf8');
for (const forbidden of ['check-runs', 'statuses', 'workflow_run', 'gh api', 'actions/github-script']) {
  check(
    `the unified workflow does not query external check status ("${forbidden}")`,
    !unifiedText.includes(forbidden),
  );
}

if (failures.length) {
  console.error(`CBW MASTER REQUIRED GATE PARITY: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`CBW MASTER REQUIRED GATE PARITY: PASS (${checks}/${checks})`);
}
