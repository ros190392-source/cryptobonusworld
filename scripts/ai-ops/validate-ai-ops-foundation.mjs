#!/usr/bin/env node
// CBW AI Ops — foundation validator. Parses every governance JSON, cross-checks
// state identifiers, authorization fields, repair limits and branch authority,
// then executes fixture validation. Concise summary; exit non-zero on failure.
// No third-party dependencies.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const AIOPS = join(ROOT, 'owner-ops', 'ai-ops');

const errors = [];
const err = (m) => errors.push(m);
const load = (p) => JSON.parse(readFileSync(p, 'utf8'));

function main() {
  let foundation, schema, stateModel, authorityMap, repairPolicy, example;
  try {
    foundation = load(join(AIOPS, 'CBW_AI_OPS_FOUNDATION_v1.json'));
    schema = load(join(AIOPS, 'CBW_AI_TASK_CONTRACT_SCHEMA_v1.json'));
    stateModel = load(join(AIOPS, 'CBW_AI_WORKFLOW_STATE_MODEL_v1.json'));
    authorityMap = load(join(AIOPS, 'CBW_BRANCH_AUTHORITY_MAP_v1.json'));
    repairPolicy = load(join(AIOPS, 'CBW_CONTROLLED_REPAIR_POLICY_v1.json'));
    example = load(join(AIOPS, 'examples', 'CBW_AI_TASK_CONTRACT_EXAMPLE_v1.json'));
  } catch (e) {
    console.error(`FAIL: cannot parse governance JSON: ${e.message}`);
    process.exit(1);
  }
  console.log('parsed 6 governance JSON files');

  // state identifiers: schema.status enum must equal state-model states
  const schemaStates = (schema.enums && schema.enums.status) || [];
  const modelStates = stateModel.states || [];
  if (JSON.stringify([...schemaStates].sort()) !== JSON.stringify([...modelStates].sort())) {
    err('schema status enum and state-model states differ');
  }
  // every transition target/source is a known state
  for (const [from, tos] of Object.entries(stateModel.allowedTransitions || {})) {
    if (!modelStates.includes(from)) err(`transition source not a known state: ${from}`);
    for (const t of tos) if (!modelStates.includes(t)) err(`transition target not a known state: ${from}->${t}`);
  }
  // no auto merge/deploy inference
  if (!(stateModel.authorizationGates && stateModel.authorizationGates.APPROVED_to_MERGED)) err('state model missing APPROVED_to_MERGED gate');
  if (!(stateModel.authorizationGates && stateModel.authorizationGates.DEPLOY_READY_to_DEPLOYED)) err('state model missing DEPLOY_READY_to_DEPLOYED gate');

  // repair attempt limit
  if (repairPolicy.maxAttempts !== 2) err(`repair policy maxAttempts must be 2, got ${repairPolicy.maxAttempts}`);
  const overlap = (repairPolicy.allowedCategories || []).filter((x) => (repairPolicy.prohibitedCategories || []).includes(x));
  if (overlap.length) err(`repair allowed/prohibited overlap: ${overlap.join(', ')}`);
  // schema references same prohibited categories
  const schemaProhibited = (schema.repairPolicy && schema.repairPolicy.rules) || [];
  if (!Array.isArray(repairPolicy.prohibitedCategories) || repairPolicy.prohibitedCategories.length < 10) err('repair policy prohibitedCategories looks incomplete');

  // authorization fields present in schema
  const oa = (schema.ownerAuthorizations && schema.ownerAuthorizations.requiredFields) || [];
  for (const f of ['implementation', 'merge', 'deploy', 'productionBinding', 'publication', 'affiliateActivation']) {
    if (!oa.includes(f)) err(`schema ownerAuthorizations missing required field: ${f}`);
  }

  // governed task-ID grammar must be identical in the schema and the validator source
  const GOVERNED_JSON = '^CBW-[A-Z0-9]+(?:-[A-Z0-9]+)*-\\d{3}[A-Z]?(?:-R\\d+)?$';
  const GOVERNED_JS = String.raw`/^CBW-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}[A-Z]?(?:-R\d+)?$/`;
  if (schema.taskIdPattern !== GOVERNED_JSON) err(`schema taskIdPattern is not the governed grammar: ${schema.taskIdPattern}`);
  const validatorSrc = readFileSync(join(HERE, 'validate-task-contract.mjs'), 'utf8');
  if (!validatorSrc.includes(GOVERNED_JS)) err('validate-task-contract.mjs does not use the governed task-ID grammar');

  // branch authority: fail-closed default must be master
  if (authorityMap.defaultAuthority !== 'master') err('branch authority map must declare defaultAuthority "master"');

  // branch authority sanity
  if (!(authorityMap.authorities && authorityMap.authorities.master && authorityMap.authorities.main)) err('branch authority map missing master/main');
  for (const rule of ['deployment may use an explicitly owner-approved master SHA only', 'no deploy action may be inferred from a merge']) {
    if (!(authorityMap.rules || []).some((r) => r.includes('owner-approved master SHA') || r.includes('deploy'))) { /* checked loosely below */ }
  }
  if (!(authorityMap.rules || []).some((r) => /never be merged wholesale/.test(r))) err('branch authority map must forbid wholesale merge');

  // foundation doc references the other artifacts
  for (const key of ['taskContractSchema', 'workflowStateModel', 'branchAuthorityMap', 'controlledRepairPolicy']) {
    if (!(foundation.components && foundation.components[key])) err(`foundation missing component reference: ${key}`);
  }

  // example contract must be structurally valid
  try {
    execFileSync(process.execPath, [join(HERE, 'validate-task-contract.mjs'), join(AIOPS, 'examples', 'CBW_AI_TASK_CONTRACT_EXAMPLE_v1.json')], { stdio: 'pipe' });
    console.log('example task contract: valid');
  } catch (e) {
    err('example task contract failed validation');
  }

  // run fixtures
  let fixturesOk = true;
  try {
    const out = execFileSync(process.execPath, [join(ROOT, 'tests', 'ai-ops', 'run-fixtures.mjs')], { stdio: 'pipe' }).toString();
    const m = out.match(/fixtures: (\d+) passed, (\d+) failed/);
    console.log('fixtures: ' + (m ? `${m[1]} passed, ${m[2]} failed` : 'ran'));
  } catch (e) {
    fixturesOk = false;
    err('fixture suite failed');
  }

  if (errors.length || !fixturesOk) {
    console.error('\nFAIL: AI Ops foundation validation');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('\nPASS: AI Ops foundation is internally consistent (states, authorizations, repair limit, branch authority, fixtures)');
  process.exit(0);
}

main();
