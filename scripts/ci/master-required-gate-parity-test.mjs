#!/usr/bin/env node
// LEGACY <-> UNIFIED PARITY PROOF for the two blockers migrated in S2-03
// (issue #366).
//
// S2-03 executes Global Header Interaction and Public SEO Metadata inside the
// unified required gate while the specialized path-filtered workflows stay in
// place and keep reporting independently. That is only a safe arrangement if the
// unified execution is genuinely EQUIVALENT to the legacy one. "Equivalent" is
// not a claim to be asserted in a PR body; it is proved here, on three axes:
//
//   1. COMMAND PARITY — the unified blocker runs exactly the legacy command
//      sequence, in the legacy order, with nothing dropped and nothing softened.
//      No reduction in commands, in the build requirement, in the browser smoke
//      matrix, in the SEO schema test, or in the indexability inventory.
//
//   2. CONDITION PARITY — every legacy step `if` is reproduced. The legacy
//      workflows guard the indexability inventory with
//      `always() && steps.build.outcome == 'success'` so it still runs, and can
//      still fail the job, when the step before it failed. Dropping that would
//      have been a silent narrowing.
//
//   3. RED/GREEN PARITY — the two jobs are SIMULATED over the complete
//      cross-product of per-step success/failure and proved to reach the same
//      conclusion in every reachable state. This is the axis that actually
//      matters for blocking authority, and it is the one prose cannot establish.
//
// It also proves the legacy workflows were NOT weakened by this stage: each is
// still present, still blocking, still triggered on pull_request to master, and
// still carries its own path filter.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { GATES, GATE_IDS, gateCommands } from './master-required-gate-gates.mjs';

const ROOT = resolve(process.cwd());
const UNIFIED_WORKFLOW = '.github/workflows/cbw-master-required-gate.yml';

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

// Only steps that execute a command count as blocking work. `uses:` steps
// (checkout, setup-node) are infrastructure and are asserted separately by the
// workflow contract.
const runSteps = (job) =>
  (Array.isArray(job?.steps) ? job.steps : []).filter((step) => typeof step?.run === 'string');

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

  // --- 1. COMMAND PARITY -----------------------------------------------------
  const legacyCommands = runSteps(legacyJob).map((step) => String(step.run).trim());
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
  check(
    `"${gateId}": the indexability inventory is preserved`,
    unifiedCommands.includes('node scripts/seo/site-indexability-inventory.mjs'),
  );
  check(
    `"${gateId}": the gate's own hard-gate script is preserved`,
    unifiedCommands.some((command) => command.startsWith('node scripts/') && !command.includes('site-indexability')),
    unifiedCommands.join(' | '),
  );

  // --- 2. CONDITION PARITY ---------------------------------------------------
  const legacyRunSteps = runSteps(legacyJob);
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
