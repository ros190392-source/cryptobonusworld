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
    'classifier source rejects a duplicate material= emission',
    /already carries a material= line/.test(String(classifierSource)),
  );

  // --- F2. the producer actually PERFORMS the sidecar write -------------------
  //
  // Reviewed LOW: the previous assertion was `/classifierResultFilePath\(\)/`,
  // an identifier search satisfied by the import line and the function
  // definition. A mutation that deleted ONLY the writeFileSync statement — the
  // one operation the entire producer/consumer binding rests on — survived it.
  // The producer would then emit step outputs with no sidecar behind them, and
  // the validator's "sidecar is missing" rule would fire on every legitimate run
  // instead of only on a vanished producer, which is the kind of always-red
  // signal that gets "fixed" by softening the validator.
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

  // --- F3. RUNNER_TEMP is required, with no process-global temp fallback ------
  //
  // Reviewed LOW: `process.env.RUNNER_TEMP || tmpdir()`. A fallback lets the
  // producer and the validator resolve to DIFFERENT directories (binding
  // vacuous) or to a shared, non-job-scoped directory where a leftover file can
  // impersonate a producer that never ran. Both are fail-open.
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
    /export function resolveRunIdentity/.test(classifierText) &&
      /is missing or empty/.test(classifierText),
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
  // The validator must resolve the sidecar through the SAME fail-closed helper
  // as the producer. A private path expression here would silently unbind the
  // two halves, and a swallowed resolution error would turn "RUNNER_TEMP is
  // unusable" into "no sidecar found" — a different failure with the same exit
  // code today, but one that a future `sidecarRaw ?? {}` would make green.
  check(
    'validator resolves the sidecar via the shared fail-closed helper',
    /classifierResultFilePath\(\)/.test(validatorText),
  );
  check(
    'validator does not fall back to a process-global temp directory',
    !/\btmpdir\b/.test(validatorText),
  );
  // BOTH resolution failures — the sidecar path and the run identity — must be
  // surfaced. Swallowing either one converts a hard "this runtime is not the one
  // the gate was proven against" into a soft "no sidecar found", which a later
  // tolerance change could turn green.
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

  // --- G2. JSON parse success is not conflated with the parsed value ---------
  //
  // Reviewed MEDIUM: one variable served as both the parsed sidecar and the
  // parse-failure sentinel, so a sidecar of literal `null` parsed successfully,
  // matched the `!== null` sentinel guard, and skipped every downstream check.
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

  // --- G3. material/reason are validated as a PAIR --------------------------
  //
  // Reviewed MEDIUM: independent per-field vocabularies accepted every
  // contradictory cross-product, including `material=false` alongside
  // `material-path-changed` — a MATERIAL change reported as non-material.
  // Structural, not an identifier search — the same lesson as the sidecar write.
  // `isConsistentClassification` appears in the import line and in the sibling
  // sidecar check, so `/isConsistentClassification\(/` stays true even after the
  // step-output consistency test is replaced with `false`. The CALL SITES are
  // therefore extracted and their arguments inspected.
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
  check(
    'validator reports a contradictory pair as an error',
    /contradicts/.test(validatorText),
  );
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

  // --- H. the validator step is wired with this run's head SHA ---------------
  check(
    'validator step receives the exact PR head sha for staleness binding',
    validator?.env?.HEAD_SHA === HEAD_SHA_EXPR,
    `actual=${JSON.stringify(validator?.env?.HEAD_SHA)}`,
  );

  return results;
}
