#!/usr/bin/env node
// Producer/consumer contract audit for the master required gate (issue #366).
//
// Factored out as a PURE text-in function so that
// scripts/ci/master-required-gate-mutation-test.mjs can feed it deliberately
// mutated copies of the workflow and the classifier/validator sources and prove
// each mutation is actually caught. The real contract test feeds it the real
// files. There is no env-var "test mode" backdoor into the production contract
// test — the mutation harness never touches the real files.
//
// The defect this module exists to close: the previous contract only constrained
// steps that HAD an `if`. Nothing required the producer to exist. Renaming
// `id: classify` or deleting the classifier step entirely left the suite fully
// green while `steps.classify.outputs.material` resolved to '' at runtime,
// skipping the production build, header matrix and indexability inventory under
// a SUCCESS conclusion.

import yaml from 'js-yaml';

export const PRODUCER_STEP_ID = 'classify';
export const CLASSIFY_COMMAND =
  'node scripts/ci/master-required-gate-classify.mjs --emit-github-output';
export const VALIDATE_COMMAND = 'node scripts/ci/master-required-gate-validate-output.mjs';
export const BASE_SHA_EXPR = '${{ github.event.pull_request.base.sha }}';
export const HEAD_SHA_EXPR = '${{ github.event.pull_request.head.sha }}';
export const MATERIAL_OUTPUT_EXPR = '${{ steps.classify.outputs.material }}';
export const REASON_OUTPUT_EXPR = '${{ steps.classify.outputs.reason }}';
export const ALLOWED_STEP_IF = "steps.classify.outputs.material == 'true'";

// Heavy work that must never silently skip.
export const HEAVY_STEP_COMMANDS = Object.freeze([
  'npm run build',
  'scripts/ui/global-header-interaction-browser-smoke.mjs',
  'scripts/seo/site-indexability-inventory.mjs',
]);

// Returns [{ label, ok, detail }]. Callers fold these into their own totals.
export function auditProducerConsumerContract({ workflowText, classifierSource, validatorSource }) {
  const results = [];
  const check = (label, ok, detail = '') => results.push({ label, ok: Boolean(ok), detail });

  let doc = null;
  try {
    doc = yaml.load(workflowText, { schema: yaml.CORE_SCHEMA });
  } catch (error) {
    check('required workflow is parseable YAML', false, String(error.message));
    return results;
  }
  check('required workflow is parseable YAML', Boolean(doc));

  const jobIds = Object.keys(doc?.jobs ?? {});
  check('required workflow has exactly one job', jobIds.length === 1, jobIds.join(','));
  const job = doc?.jobs?.[jobIds[0]];
  const steps = Array.isArray(job?.steps) ? job.steps : [];
  check('required job declares steps', steps.length > 0);

  const runOf = (step) => String(step?.run ?? '').trim();

  // --- A. the producer must exist, exactly once, under the exact id ----------
  const producers = steps.filter((step) => step?.id === PRODUCER_STEP_ID);
  check(
    `exactly one step carries the producer id "${PRODUCER_STEP_ID}"`,
    producers.length === 1,
    `found ${producers.length}`,
  );
  const producer = producers[0];
  const producerIndex = steps.indexOf(producer);

  // A same-looking step NAME must not be able to substitute for the id. The id
  // is what `steps.<id>.outputs` binds to; the display name binds nothing.
  const commandRunners = steps.filter((step) => runOf(step) === CLASSIFY_COMMAND);
  check(
    'exactly one step runs the exact classifier command',
    commandRunners.length === 1,
    `found ${commandRunners.length}`,
  );
  check(
    'the step running the classifier command IS the step carrying the producer id',
    producers.length === 1 && commandRunners.length === 1 && producers[0] === commandRunners[0],
  );
  check(
    'producer step runs the exact classifier command',
    runOf(producer) === CLASSIFY_COMMAND,
    `actual=${runOf(producer)}`,
  );
  check('producer step is unconditional', !Object.prototype.hasOwnProperty.call(producer ?? {}, 'if'));
  check('producer step is not continue-on-error', producer?.['continue-on-error'] !== true);

  // --- B. exact BASE_SHA / HEAD_SHA wiring ----------------------------------
  const producerEnv = producer?.env ?? {};
  check(
    'producer BASE_SHA is bound exactly to the PR base sha',
    producerEnv.BASE_SHA === BASE_SHA_EXPR,
    `actual=${JSON.stringify(producerEnv.BASE_SHA)}`,
  );
  check(
    'producer HEAD_SHA is bound exactly to the PR head sha',
    producerEnv.HEAD_SHA === HEAD_SHA_EXPR,
    `actual=${JSON.stringify(producerEnv.HEAD_SHA)}`,
  );
  // Swapping the two would diff a range against itself (empty diff) or invert
  // it; both are caught above, but assert the swap explicitly so the failure
  // message names the real mistake.
  check(
    'producer BASE_SHA does not point at the head sha',
    producerEnv.BASE_SHA !== HEAD_SHA_EXPR,
  );
  check(
    'producer HEAD_SHA does not point at the base sha',
    producerEnv.HEAD_SHA !== BASE_SHA_EXPR,
  );

  // --- C. the unconditional validator ---------------------------------------
  const validators = steps.filter((step) => runOf(step) === VALIDATE_COMMAND);
  check(
    'exactly one step runs the exact classifier-output validator command',
    validators.length === 1,
    `found ${validators.length}`,
  );
  const validator = validators[0];
  const validatorIndex = steps.indexOf(validator);

  check(
    'validator step is UNCONDITIONAL (a conditional validator cannot fail closed)',
    Boolean(validator) && !Object.prototype.hasOwnProperty.call(validator, 'if'),
    `if=${JSON.stringify(validator?.if)}`,
  );
  check('validator step is not continue-on-error', validator?.['continue-on-error'] !== true);
  check(
    'validator runs immediately after the producer',
    producerIndex >= 0 && validatorIndex === producerIndex + 1,
    `producer=${producerIndex} validator=${validatorIndex}`,
  );
  check(
    'validator consumes the producer material output exactly',
    validator?.env?.CLASSIFIER_MATERIAL === MATERIAL_OUTPUT_EXPR,
    `actual=${JSON.stringify(validator?.env?.CLASSIFIER_MATERIAL)}`,
  );
  check(
    'validator consumes the producer reason output exactly',
    validator?.env?.CLASSIFIER_REASON === REASON_OUTPUT_EXPR,
    `actual=${JSON.stringify(validator?.env?.CLASSIFIER_REASON)}`,
  );

  // --- D. heavy consumers -----------------------------------------------------
  for (const command of HEAVY_STEP_COMMANDS) {
    const matches = steps.filter((step) => runOf(step).includes(command));
    check(`heavy step "${command}" exists exactly once`, matches.length === 1, `found ${matches.length}`);
    const heavy = matches[0];
    check(
      `heavy step "${command}" is gated on the exact validated expression`,
      String(heavy?.if ?? '').trim() === ALLOWED_STEP_IF,
      `actual=${JSON.stringify(heavy?.if)}`,
    );
    check(
      `heavy step "${command}" runs after the validator`,
      validatorIndex >= 0 && steps.indexOf(heavy) > validatorIndex,
    );
    check(`heavy step "${command}" is not continue-on-error`, heavy?.['continue-on-error'] !== true);
  }

  // --- E. every step-output reference in the job resolves to a real step ------
  // Catches a consumer repointed at a nonexistent id or a nonexistent output.
  const stepIds = new Set(steps.map((step) => step?.id).filter(Boolean));
  const referenced = [];
  const scan = (text) => {
    for (const match of String(text ?? '').matchAll(/steps\.([A-Za-z0-9_-]+)\.outputs\.([A-Za-z0-9_-]+)/g)) {
      referenced.push({ id: match[1], output: match[2] });
    }
  };
  for (const step of steps) {
    scan(step?.if);
    for (const value of Object.values(step?.env ?? {})) scan(value);
    scan(step?.run);
  }
  check('the job references at least one classifier step output', referenced.length > 0);
  for (const ref of referenced) {
    check(
      `step-output reference steps.${ref.id}.outputs.${ref.output} targets an existing step id`,
      stepIds.has(ref.id),
      `known ids: ${[...stepIds].join(',')}`,
    );
    check(
      `step-output reference steps.${ref.id}.outputs.${ref.output} targets the bound producer`,
      ref.id === PRODUCER_STEP_ID,
    );
    check(
      `step-output reference steps.${ref.id}.outputs.${ref.output} names an emitted output`,
      ref.output === 'material' || ref.output === 'reason',
    );
  }
  // No conditional step may depend on anything other than the validated output.
  for (const step of steps) {
    if (!Object.prototype.hasOwnProperty.call(step, 'if')) continue;
    check(
      `conditional step "${step.name ?? runOf(step)}" uses only the validated material condition`,
      String(step.if).trim() === ALLOWED_STEP_IF,
      `actual=${step.if}`,
    );
  }

  // --- F. the producer source actually emits the outputs ---------------------
  // Must match the APPEND to GITHUB_OUTPUT specifically. A loose
  // /material=\$\{result\.material\}/ also matches the human-readable
  // console.log line, so deleting the real emission would go undetected.
  check(
    'classifier source appends the material+reason pair to GITHUB_OUTPUT',
    /appendFileSync\(\s*outputFile\s*,\s*`material=\$\{result\.material\}\\nreason=\$\{result\.reason\}\\n`\s*\)/.test(
      String(classifierSource),
    ),
  );
  check(
    'classifier source fails closed when GITHUB_OUTPUT is unset',
    /GITHUB_OUTPUT is not set/.test(String(classifierSource)) &&
      /process\.exit\(1\)/.test(String(classifierSource)),
  );
  check(
    'classifier source writes the producer sidecar',
    /classifierResultFilePath\(\)/.test(String(classifierSource)),
  );
  check(
    'classifier source rejects a duplicate material= emission',
    /already carries a material= line/.test(String(classifierSource)),
  );

  // --- G. the validator source cannot be softened into tolerance -------------
  const validatorText = String(validatorSource);
  check(
    'validator compares the material output to the exact literal "true"',
    /material\s*!==\s*'true'/.test(validatorText),
  );
  check(
    'validator compares the material output to the exact literal "false"',
    /material\s*!==\s*'false'/.test(validatorText),
  );
  check(
    'validator never trims or case-folds the material value',
    !/material[^\n]*\.(trim|toLowerCase|toUpperCase)\(\)/.test(validatorText),
  );
  check(
    'validator requires the producer sidecar',
    /sidecar is missing/.test(validatorText),
  );
  check(
    'validator exits non-zero on invalid output',
    /process\.exit\(1\)/.test(validatorText),
  );

  return results;
}
