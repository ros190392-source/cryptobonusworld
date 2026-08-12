#!/usr/bin/env node
// Producer/consumer + DAG contract audit for the master required gate
// (issue #366).
//
// Factored out as a PURE text-in function so that
// scripts/ci/master-required-gate-mutation-test.mjs can feed it deliberately
// mutated copies of the workflow and of every gate source and prove each mutation
// is actually caught. The real contract test feeds it the real files. There is no
// env-var "test mode" backdoor into the production contract test — the mutation
// harness never touches the real files.
//
// S2-01 DEFECT THIS MODULE ORIGINALLY CLOSED: the contract only constrained steps
// that HAD an `if`. Nothing required the producer to exist, so renaming
// `id: classify` or deleting the classifier step left the suite fully green while
// `steps.classify.outputs.material` resolved to '' at runtime.
//
// S2-03 DEFECT CLASS IT NOW ALSO CLOSES: the same fail-open shape one level up,
// in a multi-job DAG. A `needs` edge dropped, a job renamed, `if: always()`
// removed from the aggregator, a blocker result output deleted, or `skipped`
// accepted as a pass — each of those silently removes blocking coverage while the
// stable required context still reports SUCCESS. Every one of them is now a
// structural assertion here, and every one has a mutation proving it is bound.

import yaml from 'js-yaml';
import {
  ACCEPTED_GATE_OUTCOMES,
  CLASSIFY_JOB_ID,
  FINAL_CHECK_CONTEXT,
  FINAL_JOB_ID,
  GATES,
  GATE_IDS,
  STEP_CONDITIONS,
  gateCommands,
  stepConditionExpression,
} from './master-required-gate-gates.mjs';

export const PRODUCER_STEP_ID = 'classify';
export const APPLICABILITY_STEP_ID = 'applicability';
export const GATE_RESULT_STEP_ID = 'gate-result';
export const CLASSIFY_COMMAND =
  'node scripts/ci/master-required-gate-classify.mjs --emit-github-output';
export const VALIDATE_COMMAND = 'node scripts/ci/master-required-gate-validate-output.mjs';
export const APPLICABILITY_COMMAND =
  'node scripts/ci/master-required-gate-applicability.mjs --emit-github-output';
export const VALIDATE_APPLICABILITY_COMMAND =
  'node scripts/ci/master-required-gate-validate-applicability.mjs';
export const GATE_RESULT_COMMAND = 'node scripts/ci/master-required-gate-gate-result.mjs';
export const AGGREGATE_COMMAND = 'node scripts/ci/master-required-gate-aggregate.mjs';
export const BASE_SHA_EXPR = '${{ github.event.pull_request.base.sha }}';
export const HEAD_SHA_EXPR = '${{ github.event.pull_request.head.sha }}';
export const MATERIAL_OUTPUT_EXPR = '${{ steps.classify.outputs.material }}';
export const REASON_OUTPUT_EXPR = '${{ steps.classify.outputs.reason }}';
export const APPLICABILITY_OUTPUT_EXPR = '${{ steps.applicability.outputs.applicability }}';
export const APPLICABILITY_DIGEST_EXPR = '${{ steps.applicability.outputs.digest }}';
export const FINAL_JOB_IF = 'always()';

// The two self-proving suites plus the parity proof that must run on EVERY gate
// run, unconditionally, before any classification is trusted.
export const UNCONDITIONAL_SUITE_COMMANDS = Object.freeze([
  'node scripts/ci/master-required-gate-contract-test.mjs',
  'node scripts/ci/master-required-gate-classifier-fixture-test.mjs',
  'node scripts/ci/master-required-gate-mutation-test.mjs',
  'node scripts/ci/master-required-gate-parity-test.mjs',
]);

// Extracts every top-level `fnName(...)` call expression from JS source text,
// balanced-paren aware, as raw text.
//
// Why not a regex: the sidecar-write contract below must prove the classifier
// ACTUALLY PERFORMS the write — that a `writeFileSync` call exists whose
// destination argument is `classifierResultFilePath()` and whose payload
// argument carries the classification. A regex for the identifier
// `classifierResultFilePath()` alone is satisfied by the import statement and
// by the function's own definition, so deleting only the write STATEMENT left
// the previous contract fully green (the reviewed LOW). Extracting the call and
// inspecting its arguments cannot be satisfied by a mere mention.
//
// A call site is only recognised when `fnName` is not preceded by an identifier
// character, so `appendFileSync(` never matches a search for `FileSync(`.
export function extractCallExpressions(source, fnName) {
  const text = String(source ?? '');
  const needle = `${fnName}(`;
  const calls = [];
  let index = text.indexOf(needle);
  while (index !== -1) {
    const preceding = index === 0 ? '' : text[index - 1];
    if (!/[A-Za-z0-9_$.]/.test(preceding)) {
      let depth = 0;
      let end = -1;
      for (let cursor = index + needle.length - 1; cursor < text.length; cursor += 1) {
        const character = text[cursor];
        if (character === '(') depth += 1;
        else if (character === ')') {
          depth -= 1;
          if (depth === 0) {
            end = cursor;
            break;
          }
        }
      }
      if (end !== -1) calls.push(text.slice(index, end + 1));
    }
    index = text.indexOf(needle, index + needle.length);
  }
  return calls;
}

// Heavy work that must never silently skip. Derived from the registry so a gate
// added there without a workflow step is a contract failure, not a silent gap.
export const HEAVY_STEP_COMMANDS = Object.freeze(
  GATE_IDS.flatMap((gateId) => gateCommands(gateId).filter((command) => command !== 'npm ci')),
);

const runOf = (step) => String(step?.run ?? '').trim();
const hasIf = (node) => Object.prototype.hasOwnProperty.call(node ?? {}, 'if');
const needsOf = (job) => (job?.needs ? (Array.isArray(job.needs) ? job.needs : [job.needs]) : []);

/**
 * Returns [{ label, ok, detail }]. Callers fold these into their own totals.
 *
 * Every source is optional at the call site only so the mutation harness can
 * override exactly one of them; a MISSING source is treated as an empty string
 * and every rule about it therefore fails, which is the fail-closed direction.
 */
export function auditProducerConsumerContract({
  workflowText,
  classifierSource,
  validatorSource,
  gatesSource = '',
  applicabilitySource = '',
  applicabilityValidatorSource = '',
  gateResultSource = '',
  aggregateSource = '',
}) {
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

  // ===========================================================================
  // A. THE DAG SHAPE
  // ===========================================================================
  const jobs = doc?.jobs ?? {};
  const jobIds = Object.keys(jobs);
  const expectedJobIds = [CLASSIFY_JOB_ID, ...GATE_IDS.map((gateId) => GATES[gateId].jobId), FINAL_JOB_ID];
  check(
    'required workflow declares EXACTLY the expected DAG jobs',
    JSON.stringify([...jobIds].sort()) === JSON.stringify([...expectedJobIds].sort()),
    `actual=${jobIds.join(',')} expected=${expectedJobIds.join(',')}`,
  );

  // THE STABLE CONTEXT. Exactly one job may carry the required name, and it must
  // be the final aggregator — not a blocker, not the classifier. A rename that
  // moved the name onto any other job would silently repoint branch protection at
  // a job that proves far less.
  const namedFinal = jobIds.filter((id) => jobs[id]?.name === FINAL_CHECK_CONTEXT);
  check(
    `exactly one job carries the stable check context "${FINAL_CHECK_CONTEXT}"`,
    namedFinal.length === 1,
    `found ${namedFinal.length}: ${namedFinal.join(',')}`,
  );
  check(
    `the job carrying "${FINAL_CHECK_CONTEXT}" is the final aggregator job id "${FINAL_JOB_ID}"`,
    namedFinal.length === 1 && namedFinal[0] === FINAL_JOB_ID,
    namedFinal.join(','),
  );
  // Every OTHER job must carry a DIFFERENT visible name, or two contexts collide.
  for (const id of jobIds) {
    if (id === FINAL_JOB_ID) continue;
    check(
      `job "${id}" does not claim the stable required context name`,
      jobs[id]?.name !== FINAL_CHECK_CONTEXT,
      String(jobs[id]?.name),
    );
    check(`job "${id}" declares an explicit visible name`, typeof jobs[id]?.name === 'string' && jobs[id].name.length > 0);
  }
  for (const id of jobIds) {
    check(`job "${id}" declares no matrix (a check context must not fan out)`, !jobs[id]?.strategy);
    check(`job "${id}" is not continue-on-error`, jobs[id]?.['continue-on-error'] !== true);
    check(`job "${id}" declares a timeout`, typeof jobs[id]?.['timeout-minutes'] === 'number');
  }

  const finalJob = jobs[FINAL_JOB_ID];
  // `if: always()` is the ONLY thing that keeps the stable context reporting when
  // an upstream job failed or was skipped. Without it the aggregator is skipped,
  // reports no conclusion, and branch protection waits forever.
  check(
    `the final job carries \`if: ${FINAL_JOB_IF}\` (always reporting)`,
    String(finalJob?.if ?? '').trim() === FINAL_JOB_IF,
    `actual=${JSON.stringify(finalJob?.if)}`,
  );
  const finalNeeds = needsOf(finalJob);
  check(
    'the final job depends on the classifier AND on every registered blocker',
    JSON.stringify([...finalNeeds].sort()) ===
      JSON.stringify([CLASSIFY_JOB_ID, ...GATE_IDS.map((gateId) => GATES[gateId].jobId)].sort()),
    `actual=${JSON.stringify(finalNeeds)}`,
  );
  for (const gateId of GATE_IDS) {
    check(
      `the final job has a \`needs\` edge on blocker "${GATES[gateId].jobId}"`,
      finalNeeds.includes(GATES[gateId].jobId),
      `needs=${finalNeeds.join(',')}`,
    );
  }

  const classifyJob = jobs[CLASSIFY_JOB_ID];
  check('the classifier job carries no job-level `if`', !hasIf(classifyJob));
  check('the classifier job has no `needs` (it is the DAG root)', needsOf(classifyJob).length === 0);

  for (const gateId of GATE_IDS) {
    const gate = GATES[gateId];
    const job = jobs[gate.jobId];
    // NO job-level `if`. A path-irrelevant blocker must still INSTANTIATE and
    // publish a deterministic outcome. A job-level `if` would make it `skipped`,
    // and `skipped` is exactly what GitHub also reports for an upstream failure
    // and for an `if` that resolved to the empty string — indistinguishable, and
    // therefore never acceptable as evidence.
    check(
      `blocker job "${gate.jobId}" carries NO job-level \`if\` (it must always instantiate)`,
      !hasIf(job),
      `actual=${JSON.stringify(job?.if)}`,
    );
    check(
      `blocker job "${gate.jobId}" depends on the classifier`,
      JSON.stringify(needsOf(job)) === JSON.stringify([CLASSIFY_JOB_ID]),
      `actual=${JSON.stringify(job?.needs)}`,
    );
    check(
      `blocker job "${gate.jobId}" declares the registry's visible name`,
      job?.name === gate.jobName,
      `actual=${JSON.stringify(job?.name)}`,
    );
  }

  // Global step hygiene across the whole DAG.
  for (const id of jobIds) {
    for (const step of Array.isArray(jobs[id]?.steps) ? jobs[id].steps : []) {
      const label = `${id}/${step?.name ?? step?.uses ?? runOf(step)}`;
      check(`step "${label}" is not continue-on-error`, step?.['continue-on-error'] !== true);
      if (typeof step?.run === 'string') {
        check(
          `step "${label}" does not swallow failures`,
          !/\|\|\s*(true|exit\s+0|:)\b/.test(step.run) && !/set\s+\+e/.test(step.run),
          step.run,
        );
      }
    }
  }

  // ===========================================================================
  // B. THE CLASSIFIER JOB — materiality producer/validator (S2-01, preserved)
  // ===========================================================================
  const steps = Array.isArray(classifyJob?.steps) ? classifyJob.steps : [];
  check('classifier job declares steps', steps.length > 0);

  // --- B0. the self-proving suites run unconditionally ------------------------
  for (const command of UNCONDITIONAL_SUITE_COMMANDS) {
    const matches = steps.filter((step) => runOf(step) === command);
    check(`self-proving suite "${command}" runs exactly once`, matches.length === 1, `found ${matches.length}`);
    check(`self-proving suite "${command}" is UNCONDITIONAL`, matches.length === 1 && !hasIf(matches[0]));
  }

  // --- B1. the producer must exist, exactly once, under the exact id ----------
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
  check('producer step is unconditional', !hasIf(producer ?? {}));
  check('producer step is not continue-on-error', producer?.['continue-on-error'] !== true);

  // --- B2. exact BASE_SHA / HEAD_SHA wiring ----------------------------------
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
  check('producer BASE_SHA does not point at the head sha', producerEnv.BASE_SHA !== HEAD_SHA_EXPR);
  check('producer HEAD_SHA does not point at the base sha', producerEnv.HEAD_SHA !== BASE_SHA_EXPR);

  // --- B3. the unconditional materiality validator ---------------------------
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
    Boolean(validator) && !hasIf(validator),
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
  check(
    'validator step receives the exact PR head sha for staleness binding',
    validator?.env?.HEAD_SHA === HEAD_SHA_EXPR,
    `actual=${JSON.stringify(validator?.env?.HEAD_SHA)}`,
  );

  // --- B4. the applicability producer + its unconditional validator ----------
  const applicabilityProducers = steps.filter((step) => step?.id === APPLICABILITY_STEP_ID);
  check(
    `exactly one step carries the applicability producer id "${APPLICABILITY_STEP_ID}"`,
    applicabilityProducers.length === 1,
    `found ${applicabilityProducers.length}`,
  );
  const applicabilityProducer = applicabilityProducers[0];
  const applicabilityIndex = steps.indexOf(applicabilityProducer);
  const applicabilityRunners = steps.filter((step) => runOf(step) === APPLICABILITY_COMMAND);
  check(
    'exactly one step runs the exact applicability producer command',
    applicabilityRunners.length === 1,
    `found ${applicabilityRunners.length}`,
  );
  check(
    'the step running the applicability command IS the step carrying the applicability producer id',
    applicabilityProducers.length === 1 &&
      applicabilityRunners.length === 1 &&
      applicabilityProducers[0] === applicabilityRunners[0],
  );
  check('applicability producer step is unconditional', Boolean(applicabilityProducer) && !hasIf(applicabilityProducer));
  check(
    'applicability producer BASE_SHA is bound exactly to the PR base sha',
    applicabilityProducer?.env?.BASE_SHA === BASE_SHA_EXPR,
    `actual=${JSON.stringify(applicabilityProducer?.env?.BASE_SHA)}`,
  );
  check(
    'applicability producer HEAD_SHA is bound exactly to the PR head sha',
    applicabilityProducer?.env?.HEAD_SHA === HEAD_SHA_EXPR,
    `actual=${JSON.stringify(applicabilityProducer?.env?.HEAD_SHA)}`,
  );
  check(
    'the applicability producer runs AFTER the materiality classification is validated',
    applicabilityIndex > validatorIndex && validatorIndex >= 0,
    `validator=${validatorIndex} applicability=${applicabilityIndex}`,
  );

  const applicabilityValidators = steps.filter((step) => runOf(step) === VALIDATE_APPLICABILITY_COMMAND);
  check(
    'exactly one step runs the exact applicability validator command',
    applicabilityValidators.length === 1,
    `found ${applicabilityValidators.length}`,
  );
  const applicabilityValidator = applicabilityValidators[0];
  const applicabilityValidatorIndex = steps.indexOf(applicabilityValidator);
  check(
    'applicability validator step is UNCONDITIONAL',
    Boolean(applicabilityValidator) && !hasIf(applicabilityValidator),
    `if=${JSON.stringify(applicabilityValidator?.if)}`,
  );
  check(
    'applicability validator runs immediately after the applicability producer',
    applicabilityIndex >= 0 && applicabilityValidatorIndex === applicabilityIndex + 1,
    `producer=${applicabilityIndex} validator=${applicabilityValidatorIndex}`,
  );
  const applicabilityValidatorEnv = applicabilityValidator?.env ?? {};
  check(
    'applicability validator consumes the producer decision exactly',
    applicabilityValidatorEnv.APPLICABILITY_JSON === APPLICABILITY_OUTPUT_EXPR,
    `actual=${JSON.stringify(applicabilityValidatorEnv.APPLICABILITY_JSON)}`,
  );
  check(
    'applicability validator consumes the producer digest exactly',
    applicabilityValidatorEnv.APPLICABILITY_DIGEST === APPLICABILITY_DIGEST_EXPR,
    `actual=${JSON.stringify(applicabilityValidatorEnv.APPLICABILITY_DIGEST)}`,
  );
  check(
    'applicability validator cross-checks the materiality output',
    applicabilityValidatorEnv.CLASSIFIER_MATERIAL === MATERIAL_OUTPUT_EXPR,
    `actual=${JSON.stringify(applicabilityValidatorEnv.CLASSIFIER_MATERIAL)}`,
  );
  check(
    'applicability validator receives the exact PR head sha for staleness binding',
    applicabilityValidatorEnv.HEAD_SHA === HEAD_SHA_EXPR,
    `actual=${JSON.stringify(applicabilityValidatorEnv.HEAD_SHA)}`,
  );
  for (const gateId of GATE_IDS) {
    const gate = GATES[gateId];
    check(
      `applicability validator re-checks the per-gate convenience output for "${gateId}"`,
      applicabilityValidatorEnv[gate.applicabilityEnv] === `\${{ steps.${APPLICABILITY_STEP_ID}.outputs.${gate.outputName} }}`,
      `actual=${JSON.stringify(applicabilityValidatorEnv[gate.applicabilityEnv])}`,
    );
  }

  // --- B5. the classifier job's OUTPUTS are what the DAG consumes ------------
  const classifyOutputs = classifyJob?.outputs ?? {};
  const expectedClassifyOutputs = {
    material: MATERIAL_OUTPUT_EXPR,
    reason: REASON_OUTPUT_EXPR,
    applicability: APPLICABILITY_OUTPUT_EXPR,
    digest: APPLICABILITY_DIGEST_EXPR,
  };
  for (const gateId of GATE_IDS) {
    expectedClassifyOutputs[GATES[gateId].outputName] =
      `\${{ steps.${APPLICABILITY_STEP_ID}.outputs.${GATES[gateId].outputName} }}`;
  }
  for (const [name, expression] of Object.entries(expectedClassifyOutputs)) {
    check(
      `classifier job publishes output "${name}" bound to its producer step`,
      classifyOutputs[name] === expression,
      `actual=${JSON.stringify(classifyOutputs[name])}`,
    );
  }
  check(
    'classifier job publishes no unexpected outputs',
    JSON.stringify(Object.keys(classifyOutputs).sort()) ===
      JSON.stringify(Object.keys(expectedClassifyOutputs).sort()),
    Object.keys(classifyOutputs).join(','),
  );

  // --- B6. every step-output reference in the classifier job resolves --------
  const stepIds = new Set(steps.map((step) => step?.id).filter(Boolean));
  const KNOWN_STEP_OUTPUTS = {
    [PRODUCER_STEP_ID]: ['material', 'reason'],
    [APPLICABILITY_STEP_ID]: ['applicability', 'digest', ...GATE_IDS.map((gateId) => GATES[gateId].outputName)],
  };
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
  for (const value of Object.values(classifyOutputs)) scan(value);
  check('the classifier job references at least one producer step output', referenced.length > 0);
  for (const ref of referenced) {
    check(
      `step-output reference steps.${ref.id}.outputs.${ref.output} targets an existing step id`,
      stepIds.has(ref.id),
      `known ids: ${[...stepIds].join(',')}`,
    );
    check(
      `step-output reference steps.${ref.id}.outputs.${ref.output} targets a bound producer`,
      Object.prototype.hasOwnProperty.call(KNOWN_STEP_OUTPUTS, ref.id),
      `bound producers: ${Object.keys(KNOWN_STEP_OUTPUTS).join(',')}`,
    );
    check(
      `step-output reference steps.${ref.id}.outputs.${ref.output} names an emitted output`,
      (KNOWN_STEP_OUTPUTS[ref.id] ?? []).includes(ref.output),
      `emitted: ${(KNOWN_STEP_OUTPUTS[ref.id] ?? []).join(',')}`,
    );
  }
  // No step in the classifier job may be conditional at all: every step there is
  // either a self-proving suite, a producer, or a validator.
  for (const step of steps) {
    check(
      `classifier-job step "${step?.name ?? runOf(step)}" is unconditional`,
      !hasIf(step),
      `actual=${JSON.stringify(step?.if)}`,
    );
  }

  // ===========================================================================
  // C. THE BLOCKER JOBS
  // ===========================================================================
  for (const gateId of GATE_IDS) {
    const gate = GATES[gateId];
    const job = jobs[gate.jobId];
    const jobSteps = Array.isArray(job?.steps) ? job.steps : [];

    // Exact PR head, no persisted credentials.
    const checkout = jobSteps.find((step) => String(step?.uses ?? '').startsWith('actions/checkout'));
    check(`blocker "${gateId}" checks out explicitly`, Boolean(checkout));
    check(
      `blocker "${gateId}" checks out the EXACT PR head sha`,
      String(checkout?.with?.ref ?? '') === HEAD_SHA_EXPR,
      `actual=${JSON.stringify(checkout?.with?.ref)}`,
    );
    check(
      `blocker "${gateId}" checkout does not persist credentials`,
      checkout?.with?.['persist-credentials'] === false,
    );
    const setupNode = jobSteps.find((step) => String(step?.uses ?? '').startsWith('actions/setup-node'));
    check(`blocker "${gateId}" sets up Node`, Boolean(setupNode));
    check(
      `blocker "${gateId}" pins Node 20`,
      String(setupNode?.with?.['node-version']) === '20',
      `actual=${JSON.stringify(setupNode?.with?.['node-version'])}`,
    );
    check(`blocker "${gateId}" checkout is unconditional`, Boolean(checkout) && !hasIf(checkout));
    check(`blocker "${gateId}" node setup is unconditional`, Boolean(setupNode) && !hasIf(setupNode));

    // The declared blocking sequence, in order, with the exact ids and the exact
    // conditions. This is where "no reduction in commands" is enforced.
    let previousIndex = -1;
    for (const declared of gate.steps) {
      check(
        `blocker "${gateId}" step condition kind "${declared.condition}" is in the closed set`,
        STEP_CONDITIONS.includes(declared.condition),
        declared.condition,
      );
      const matches = jobSteps.filter((step) => runOf(step) === declared.command);
      check(
        `blocker "${gateId}" runs "${declared.command}" exactly once`,
        matches.length === 1,
        `found ${matches.length}`,
      );
      const step = matches[0];
      const index = jobSteps.indexOf(step);
      check(
        `blocker "${gateId}" step "${declared.command}" carries the bound id "${declared.id}"`,
        step?.id === declared.id,
        `actual=${JSON.stringify(step?.id)}`,
      );
      check(
        `blocker "${gateId}" step "${declared.command}" is gated on the exact derived condition`,
        String(step?.if ?? '').trim() === stepConditionExpression(gateId, declared.condition),
        `actual=${JSON.stringify(step?.if)} expected=${JSON.stringify(stepConditionExpression(gateId, declared.condition))}`,
      );
      check(
        `blocker "${gateId}" step "${declared.command}" keeps the declared order`,
        index > previousIndex,
        `index=${index} previous=${previousIndex}`,
      );
      check(
        `blocker "${gateId}" step "${declared.command}" is not continue-on-error`,
        step?.['continue-on-error'] !== true,
      );
      previousIndex = index;
    }

    // The UNCONDITIONAL result emitter, last.
    const emitters = jobSteps.filter((step) => runOf(step) === GATE_RESULT_COMMAND);
    check(`blocker "${gateId}" runs the result emitter exactly once`, emitters.length === 1, `found ${emitters.length}`);
    const emitter = emitters[0];
    const emitterIndex = jobSteps.indexOf(emitter);
    check(
      `blocker "${gateId}" result emitter carries the bound id "${GATE_RESULT_STEP_ID}"`,
      emitter?.id === GATE_RESULT_STEP_ID,
      `actual=${JSON.stringify(emitter?.id)}`,
    );
    check(
      `blocker "${gateId}" result emitter is UNCONDITIONAL`,
      Boolean(emitter) && !hasIf(emitter),
      `if=${JSON.stringify(emitter?.if)}`,
    );
    check(
      `blocker "${gateId}" result emitter is the LAST step`,
      emitterIndex === jobSteps.length - 1,
      `index=${emitterIndex} of ${jobSteps.length}`,
    );
    check(
      `blocker "${gateId}" result emitter runs after every declared blocking step`,
      emitterIndex > previousIndex,
    );
    const emitterEnv = emitter?.env ?? {};
    check(
      `blocker "${gateId}" result emitter declares its own gate id`,
      emitterEnv.GATE_ID === gateId,
      `actual=${JSON.stringify(emitterEnv.GATE_ID)}`,
    );
    check(
      `blocker "${gateId}" result emitter reads the validated applicability from the classifier job`,
      emitterEnv.GATE_APPLICABILITY === `\${{ needs.${CLASSIFY_JOB_ID}.outputs.${gate.outputName} }}`,
      `actual=${JSON.stringify(emitterEnv.GATE_APPLICABILITY)}`,
    );
    check(
      `blocker "${gateId}" result emitter carries the classifier evidence digest`,
      emitterEnv.APPLICABILITY_DIGEST === `\${{ needs.${CLASSIFY_JOB_ID}.outputs.digest }}`,
      `actual=${JSON.stringify(emitterEnv.APPLICABILITY_DIGEST)}`,
    );
    // The emitter must be handed the outcome of EVERY declared blocking step. A
    // step outcome quietly dropped here is exactly how a deleted blocking step
    // would go unnoticed: the emitter would have nothing to notice.
    const outcomeText = String(emitterEnv.STEP_OUTCOMES ?? '');
    for (const declared of gate.steps) {
      check(
        `blocker "${gateId}" result emitter observes the outcome of step "${declared.id}"`,
        outcomeText.includes(`\${{ steps.${declared.id}.outcome }}`),
        outcomeText.slice(0, 200),
      );
      check(
        `blocker "${gateId}" result emitter names the command of step "${declared.id}"`,
        outcomeText.includes(declared.command),
      );
    }
    const observedOutcomes = [...outcomeText.matchAll(/steps\.([A-Za-z0-9_-]+)\.outcome/g)].map((m) => m[1]);
    check(
      `blocker "${gateId}" result emitter observes EXACTLY the declared blocking steps`,
      JSON.stringify(observedOutcomes) === JSON.stringify(gate.steps.map((step) => step.id)),
      `actual=${JSON.stringify(observedOutcomes)}`,
    );

    // The job outputs the aggregator consumes.
    const outputs = job?.outputs ?? {};
    check(
      `blocker "${gateId}" publishes its result output bound to the emitter step`,
      outputs.result === `\${{ steps.${GATE_RESULT_STEP_ID}.outputs.result }}`,
      `actual=${JSON.stringify(outputs.result)}`,
    );
    check(
      `blocker "${gateId}" publishes its evidence output bound to the emitter step`,
      outputs.evidence === `\${{ steps.${GATE_RESULT_STEP_ID}.outputs.evidence }}`,
      `actual=${JSON.stringify(outputs.evidence)}`,
    );

    // Nothing else in the blocker job may be conditional on anything but the
    // derived applicability conditions.
    const allowedConditions = new Set(gate.steps.map((step) => stepConditionExpression(gateId, step.condition)));
    for (const step of jobSteps) {
      if (!hasIf(step)) continue;
      check(
        `blocker "${gateId}" conditional step "${step?.name ?? runOf(step)}" uses only a derived applicability condition`,
        allowedConditions.has(String(step.if).trim()),
        `actual=${JSON.stringify(step.if)}`,
      );
    }
  }

  // ===========================================================================
  // D. THE AGGREGATOR JOB
  // ===========================================================================
  const finalSteps = Array.isArray(finalJob?.steps) ? finalJob.steps : [];
  const aggregators = finalSteps.filter((step) => runOf(step) === AGGREGATE_COMMAND);
  check('the final job runs the aggregator exactly once', aggregators.length === 1, `found ${aggregators.length}`);
  const aggregator = aggregators[0];
  check(
    'the aggregator step is UNCONDITIONAL inside the always-running final job',
    Boolean(aggregator) && !hasIf(aggregator),
    `if=${JSON.stringify(aggregator?.if)}`,
  );
  check(
    'the aggregator step is not continue-on-error',
    aggregator?.['continue-on-error'] !== true,
  );
  // The aggregator must be able to report even when dependency installation is
  // what broke, so the final job never installs.
  check(
    'the final job never runs `npm ci` (it must report even when installation fails)',
    !finalSteps.some((step) => /\bnpm ci\b/.test(runOf(step))),
  );
  check(
    'the final job runs no blocking work of its own',
    !finalSteps.some((step) => HEAVY_STEP_COMMANDS.some((command) => runOf(step).includes(command))),
  );
  const aggregatorEnv = aggregator?.env ?? {};
  check(
    'the aggregator receives the classifier JOB RESULT (a failed classifier cannot be hidden)',
    aggregatorEnv.CLASSIFY_JOB_RESULT === `\${{ needs.${CLASSIFY_JOB_ID}.result }}`,
    `actual=${JSON.stringify(aggregatorEnv.CLASSIFY_JOB_RESULT)}`,
  );
  check(
    'the aggregator receives the classifier materiality output',
    aggregatorEnv.CLASSIFIER_MATERIAL === `\${{ needs.${CLASSIFY_JOB_ID}.outputs.material }}`,
    `actual=${JSON.stringify(aggregatorEnv.CLASSIFIER_MATERIAL)}`,
  );
  check(
    'the aggregator receives the classifier applicability decision',
    aggregatorEnv.APPLICABILITY_JSON === `\${{ needs.${CLASSIFY_JOB_ID}.outputs.applicability }}`,
    `actual=${JSON.stringify(aggregatorEnv.APPLICABILITY_JSON)}`,
  );
  check(
    'the aggregator receives the classifier evidence digest',
    aggregatorEnv.APPLICABILITY_DIGEST === `\${{ needs.${CLASSIFY_JOB_ID}.outputs.digest }}`,
    `actual=${JSON.stringify(aggregatorEnv.APPLICABILITY_DIGEST)}`,
  );
  for (const gateId of GATE_IDS) {
    const gate = GATES[gateId];
    check(
      `the aggregator receives blocker "${gateId}" JOB RESULT`,
      aggregatorEnv[gate.jobResultEnv] === `\${{ needs.${gate.jobId}.result }}`,
      `actual=${JSON.stringify(aggregatorEnv[gate.jobResultEnv])}`,
    );
    check(
      `the aggregator receives blocker "${gateId}" published result`,
      aggregatorEnv[gate.resultEnv] === `\${{ needs.${gate.jobId}.outputs.result }}`,
      `actual=${JSON.stringify(aggregatorEnv[gate.resultEnv])}`,
    );
    check(
      `the aggregator receives blocker "${gateId}" evidence`,
      aggregatorEnv[gate.evidenceEnv] === `\${{ needs.${gate.jobId}.outputs.evidence }}`,
      `actual=${JSON.stringify(aggregatorEnv[gate.evidenceEnv])}`,
    );
  }
  // Every `needs.<job>.…` reference anywhere in the workflow must name a job that
  // is actually depended upon by the referencing job — otherwise it resolves to
  // the empty string at runtime and silently reads as "nothing went wrong".
  for (const id of jobIds) {
    const jobText = JSON.stringify(jobs[id] ?? {});
    const declaredNeeds = new Set(needsOf(jobs[id]));
    for (const match of jobText.matchAll(/needs\.([A-Za-z0-9_-]+)\./g)) {
      check(
        `job "${id}" references needs.${match[1]} and declares it as a dependency`,
        declaredNeeds.has(match[1]),
        `declared: ${[...declaredNeeds].join(',')}`,
      );
    }
  }

  // ===========================================================================
  // E. THE CLASSIFIER SOURCE (S2-01, preserved verbatim)
  // ===========================================================================
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
    'classifier source rejects a duplicate material= emission',
    /already carries a material= line/.test(String(classifierSource)),
  );

  // --- E2. the producer actually PERFORMS the sidecar write -------------------
  //
  // Reviewed LOW: the previous assertion was `/classifierResultFilePath\(\)/`,
  // an identifier search satisfied by the import line and the function
  // definition. A mutation that deleted ONLY the writeFileSync statement — the
  // one operation the entire producer/consumer binding rests on — survived it.
  //
  // The binding is now proved structurally: exactly one writeFileSync call whose
  // FIRST argument is the resolved sidecar path and whose payload argument
  // serializes the classification result.
  const classifierText = String(classifierSource);
  const writeCalls = extractCallExpressions(classifierText, 'writeFileSync');
  const sidecarWrites = writeCalls.filter((call) =>
    /^writeFileSync\(\s*classifierResultFilePath\(\)\s*,/.test(call),
  );
  check(
    'classifier performs exactly ONE writeFileSync whose destination is classifierResultFilePath()',
    sidecarWrites.length === 1,
    `writeFileSync calls=${writeCalls.length} sidecar writes=${sidecarWrites.length}`,
  );
  const sidecarWrite = sidecarWrites[0] ?? '';
  check(
    'the sidecar write serializes the classification as JSON',
    /JSON\.stringify\(/.test(sidecarWrite),
    sidecarWrite.slice(0, 120),
  );
  check(
    'the sidecar write carries the classification material value',
    /\bmaterial:\s*result\.material\b/.test(sidecarWrite),
    sidecarWrite.slice(0, 200),
  );
  check(
    'the sidecar write carries the classification reason value',
    /\breason:\s*result\.reason\b/.test(sidecarWrite),
    sidecarWrite.slice(0, 200),
  );
  // Run identity is what makes a STALE sidecar detectable; without it a leftover
  // file whose classification happens to agree passes every other rule.
  for (const field of ['headSha', 'runId', 'runAttempt']) {
    check(
      `the sidecar write stamps the run identity field "${field}"`,
      new RegExp(`\\b${field}:\\s*identity\\.${field}\\b`).test(sidecarWrite),
      sidecarWrite.slice(0, 240),
    );
  }
  check(
    'the producer resolves the run identity before writing the sidecar',
    /resolveRunIdentity\(\)/.test(classifierText) &&
      classifierText.indexOf('resolveRunIdentity()') < classifierText.indexOf(sidecarWrite),
  );

  // --- E3. RUNNER_TEMP is required, with no process-global temp fallback ------
  const classifierCode = classifierText
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');
  check(
    'classifier does not import os.tmpdir',
    !/\btmpdir\b/.test(classifierCode),
    'the sidecar directory must be RUNNER_TEMP only',
  );
  check(
    'classifier never falls back when RUNNER_TEMP is unset',
    !/RUNNER_TEMP\s*(\|\||\?\?)/.test(classifierCode),
  );
  check(
    'classifier fails closed on a missing RUNNER_TEMP',
    /RUNNER_TEMP is not set/.test(classifierText) && /throw new Error\(/.test(classifierCode),
  );
  check('classifier fails closed on an empty RUNNER_TEMP', /RUNNER_TEMP is empty/.test(classifierText));
  check(
    'classifier fails closed on a malformed/unusable RUNNER_TEMP',
    /isAbsolute\(runnerTemp\)/.test(classifierCode) && /statSync\(runnerTemp\)/.test(classifierCode),
  );
  check(
    'classifier fails closed when the gate run cannot be identified',
    /export function resolveRunIdentity/.test(classifierText) && /is missing or empty/.test(classifierText),
  );

  // ===========================================================================
  // F. THE MATERIALITY VALIDATOR SOURCE (S2-01, preserved verbatim)
  // ===========================================================================
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
  check('validator requires the producer sidecar', /sidecar is missing/.test(validatorText));
  check('validator exits non-zero on invalid output', /process\.exit\(1\)/.test(validatorText));
  check(
    'validator resolves the sidecar via the shared fail-closed helper',
    /classifierResultFilePath\(\)/.test(validatorText),
  );
  check(
    'validator does not fall back to a process-global temp directory',
    !/\btmpdir\b/.test(validatorText),
  );
  const surfacedResolutionFailures = (
    validatorText.match(/catch \(error\) \{\s*errors\.push\(String\(error\.message\)\);?\s*\}/g) ?? []
  ).length;
  check(
    'validator surfaces BOTH the sidecar-path and run-identity resolution failures',
    surfacedResolutionFailures === 2,
    `found ${surfacedResolutionFailures}`,
  );
  check(
    'validator rejects a STALE sidecar from another run/attempt/head',
    /sidecar is STALE/.test(validatorText) && /resolveRunIdentity\(\)/.test(validatorText),
  );
  check(
    'validator tracks JSON parse SUCCESS separately from the parsed value',
    /parseOk\s*=\s*true/.test(validatorText) && /if \(parseOk/.test(validatorText),
  );
  check(
    'validator never uses null as the JSON parse-failure sentinel',
    !/if \(sidecar !== null\)/.test(validatorText),
  );
  check(
    'validator requires the parsed sidecar to be a non-null, non-array object',
    /typeof parsed !== 'object'/.test(validatorText) &&
      /parsed === null/.test(validatorText) &&
      /Array\.isArray\(parsed\)/.test(validatorText) &&
      /must be a JSON object/.test(validatorText),
  );
  const consistencyCalls = extractCallExpressions(validatorText, 'isConsistentClassification');
  check(
    'validator makes exactly two pair-consistency calls (step outputs and sidecar)',
    consistencyCalls.length === 2,
    `found ${consistencyCalls.length}: ${consistencyCalls.join(' | ')}`,
  );
  check(
    'validator checks the STEP OUTPUT pair for consistency',
    consistencyCalls.some((call) => /^isConsistentClassification\(\s*material\s*,\s*reason\s*\)$/.test(call)),
    consistencyCalls.join(' | '),
  );
  check(
    'validator checks the SIDECAR pair for consistency',
    consistencyCalls.some((call) =>
      /^isConsistentClassification\(\s*String\(sidecar\.material\)\s*,\s*sidecar\.reason\s*\)$/.test(call),
    ),
    consistencyCalls.join(' | '),
  );
  check('validator reports a contradictory pair as an error', /contradicts/.test(validatorText));
  check(
    'validator enforces pair consistency on the sidecar as well as the step outputs',
    /contradicts its own/.test(validatorText),
  );
  check(
    'classifier declares the reason -> materiality mapping as the single source of truth',
    /export const REASON_MATERIALITY = Object\.freeze\(\{/.test(classifierText),
  );
  check(
    'classifier derives the reason vocabulary from that mapping, never by hand',
    /VALID_REASONS = Object\.freeze\(Object\.keys\(REASON_MATERIALITY\)\)/.test(classifierText),
  );
  check(
    'the reason -> materiality mapping pins both fail-closed reasons to MATERIAL',
    /'unresolved-or-empty-change-set':\s*true/.test(classifierText) &&
      /'material-path-changed':\s*true/.test(classifierText) &&
      /'only-allowlisted-non-material-paths':\s*false/.test(classifierText),
  );
  check(
    'validator compares run identity against its OWN environment, not the sidecar',
    /sidecar\[field\] !== expectedIdentity\[field\]/.test(validatorText),
  );

  // ===========================================================================
  // G. THE S2-03 SOURCES
  // ===========================================================================
  const gatesText = String(gatesSource);
  check(
    'the gate registry derives its universally-inert paths from the S2-01 allowlist',
    /UNIVERSALLY_INERT_PATHS = Object\.freeze\(\[\.\.\.NON_MATERIAL_PATHS\]\)/.test(gatesText),
  );
  check(
    'the gate registry pins reason -> applicability as the single source of truth',
    /export const APPLICABILITY_REASONS = Object\.freeze\(\{/.test(gatesText) &&
      /'unresolved-or-empty-change-set':\s*'APPLICABLE'/.test(gatesText) &&
      /'relevant-path-changed':\s*'APPLICABLE'/.test(gatesText) &&
      /'only-gate-irrelevant-paths':\s*'NOT_APPLICABLE'/.test(gatesText),
  );
  check(
    'the gate registry derives its reason vocabulary from that mapping, never by hand',
    /VALID_APPLICABILITY_REASONS = Object\.freeze\(Object\.keys\(APPLICABILITY_REASONS\)\)/.test(gatesText),
  );
  check(
    'the applicability model treats an unresolved or empty change set as APPLICABLE',
    /!Array\.isArray\(paths\) \|\| paths\.length === 0/.test(gatesText) &&
      /reason: 'unresolved-or-empty-change-set'/.test(gatesText),
  );
  check(
    'the applicability model treats an unnormalizable path as RELEVANT',
    /normalized === null \|\| !inert\.has\(normalized\)/.test(gatesText),
  );
  check(
    'the accepted outcome vocabulary excludes FAIL',
    JSON.stringify([...ACCEPTED_GATE_OUTCOMES]) === JSON.stringify(['PASS', 'NOT_APPLICABLE']),
    JSON.stringify([...ACCEPTED_GATE_OUTCOMES]),
  );

  const applicabilityText = String(applicabilitySource);
  const applicabilityWrites = extractCallExpressions(applicabilityText, 'writeFileSync').filter((call) =>
    /^writeFileSync\(\s*applicabilityResultFilePath\(\)\s*,/.test(call),
  );
  check(
    'the applicability producer performs exactly ONE writeFileSync to applicabilityResultFilePath()',
    applicabilityWrites.length === 1,
    `found ${applicabilityWrites.length}`,
  );
  const applicabilityWrite = applicabilityWrites[0] ?? '';
  for (const field of ['headSha', 'runId', 'runAttempt']) {
    check(
      `the applicability sidecar write stamps the run identity field "${field}"`,
      new RegExp(`\\b${field}:\\s*identity\\.${field}\\b`).test(applicabilityWrite),
      applicabilityWrite.slice(0, 240),
    );
  }
  check(
    'the applicability sidecar write carries the evidence digest',
    /\bdigest,/.test(applicabilityWrite) || /\bdigest:\s*digest\b/.test(applicabilityWrite),
    applicabilityWrite.slice(0, 240),
  );
  check(
    'the applicability producer resolves changed paths from the exact base..head range',
    /resolveChangedPaths\(baseSha, headSha\)/.test(applicabilityText),
  );
  check(
    'the applicability producer fails closed when GITHUB_OUTPUT is unset',
    /GITHUB_OUTPUT is not set/.test(applicabilityText),
  );
  check(
    'the applicability producer rejects a duplicate emission',
    /already carries an applicability= line/.test(applicabilityText),
  );
  check(
    'the applicability producer does not fall back to a process-global temp directory',
    !/\btmpdir\b/.test(applicabilityText),
  );

  const applicabilityValidatorText = String(applicabilityValidatorSource);
  check(
    'the applicability validator rejects a missing decision',
    /the producer step did not run/.test(applicabilityValidatorText),
  );
  check(
    'the applicability validator rejects a STALE sidecar',
    /sidecar is STALE/.test(applicabilityValidatorText),
  );
  check(
    'the applicability validator recomputes the evidence digest rather than trusting it',
    /applicabilityDigest\(parsed, expectedIdentity\)/.test(applicabilityValidatorText),
  );
  check(
    'the applicability validator requires the gate set to be exactly the registry set',
    /the registry declares/.test(applicabilityValidatorText),
  );
  check(
    'the applicability validator cross-checks materiality',
    /checkApplicabilityMaterialityConsistency\(/.test(applicabilityValidatorText),
  );
  check(
    'the applicability validator exits non-zero on an invalid decision',
    /process\.exit\(1\)/.test(applicabilityValidatorText),
  );

  const gateResultText = String(gateResultSource);
  check(
    'the result emitter requires literal `success` for every step of an APPLICABLE gate',
    /REQUIRED_OUTCOME_WHEN_APPLICABLE = 'success'/.test(gateResultText),
  );
  check(
    'the result emitter requires literal `skipped` for every step of a NOT_APPLICABLE gate',
    /REQUIRED_OUTCOME_WHEN_NOT_APPLICABLE = 'skipped'/.test(gateResultText),
  );
  check(
    'the result emitter rejects an applicability outside the closed vocabulary',
    /APPLICABILITY_VALUES\.includes\(applicability\)/.test(gateResultText),
  );
  check(
    'the result emitter proves the job ran every declared blocking command',
    /stepOutcomes\.length !== declared/.test(gateResultText),
  );
  check(
    'the result emitter requires the evidence digest',
    /evidence digest is missing/.test(gateResultText),
  );

  const aggregateText = String(aggregateSource);
  check(
    'the aggregator accepts exactly one job result value',
    /REQUIRED_JOB_RESULT = 'success'/.test(aggregateText),
  );
  check(
    'the aggregator rejects a classifier job that did not succeed',
    /classifyResult !== REQUIRED_JOB_RESULT/.test(aggregateText),
  );
  check(
    'the aggregator rejects a blocker job that did not succeed (skipped and cancelled included)',
    /jobResult !== REQUIRED_JOB_RESULT/.test(aggregateText),
  );
  check(
    'the aggregator never treats `skipped` as a pass',
    !/skipped'\s*(\)|\|\|)\s*return/.test(aggregateText) && /skipped are all rejected/.test(aggregateText),
  );
  check(
    'the aggregator rejects a result outside the closed outcome vocabulary',
    /GATE_OUTCOMES\.includes\(result\)/.test(aggregateText),
  );
  check(
    'the aggregator accepts only PASS and NOT_APPLICABLE',
    /ACCEPTED_GATE_OUTCOMES\.includes\(result\)/.test(aggregateText),
  );
  check(
    'the aggregator fails when an expected blocker produced no result at all',
    /produced NO result at all/.test(aggregateText),
  );
  check(
    'the aggregator requires NOT_APPLICABLE to be backed by the classifier decision',
    /result === 'NOT_APPLICABLE' && decided !== 'NOT_APPLICABLE'/.test(aggregateText),
  );
  check(
    'the aggregator requires PASS to be backed by an APPLICABLE decision',
    /result === 'PASS' && decided !== 'APPLICABLE'/.test(aggregateText),
  );
  check(
    'the aggregator requires the blocker evidence digest to match the classifier digest',
    /evidence\.digest !== digest/.test(aggregateText),
  );
  // The AGGREGATION LOOP specifically, not merely the identifier: `GATE_IDS` is
  // iterated in main() too, so an identifier search stays satisfied after the
  // loop that matters is repointed at "whatever results happened to arrive" —
  // which is exactly how a removed blocker stops being expected.
  check(
    'the aggregator iterates the closed registry, not whatever results happen to arrive',
    /for \(const gateId of GATE_IDS\) \{\s*\n\s*const observed = gates\?\.\[gateId\];/.test(aggregateText),
  );
  check(
    'the aggregator rejects a result for an unregistered gate',
    /unregistered gate/.test(aggregateText),
  );
  check(
    'the aggregator exits non-zero when aggregation fails',
    /process\.exit\(1\)/.test(aggregateText),
  );

  return results;
}
