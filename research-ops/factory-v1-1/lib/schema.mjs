// ResearchOps Factory V1.1 — minimum structural/schema enforcement (C9).
// Deterministic, dependency-free explicit checks (no third-party validator).

import {
  isValidTaskId, isState, RESEARCH_FILES, OWNER_MERGE_KEY, FORBIDDEN_TRUE_AUTH_KEYS,
  validateIdentityValues, BRANCH_RE, deterministicBranch,
} from './model.mjs';

export const CANONICAL_AUTH_KEYS = [OWNER_MERGE_KEY, ...FORBIDDEN_TRUE_AUTH_KEYS];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmptyStr = (v) => typeof v === 'string' && v.length > 0;

// TASK_STATE.json structural shape.
export function validateTaskStateShape(ts) {
  const e = [];
  if (!isObj(ts)) return ['TASK_STATE.json is not an object'];
  const required = ['schemaVersion', 'factoryVersion', 'taskId', 'project', 'countryCode', 'exchangeId', 'batchId', 'priority', 'state', 'branch', 'authorizations', 'history'];
  for (const k of required) if (!(k in ts)) e.push(`TASK_STATE missing ${k}`);
  if ('taskId' in ts && !isValidTaskId(ts.taskId)) e.push(`TASK_STATE.taskId invalid: ${ts.taskId}`);
  if ('state' in ts && !isState(ts.state)) e.push(`TASK_STATE.state invalid: ${ts.state}`);
  if ('branch' in ts && !nonEmptyStr(ts.branch)) e.push('TASK_STATE.branch must be a non-empty string');
  // V2-C7 — identity grammar/types (not merely presence) and deterministic branch.
  for (const ge of validateIdentityValues(ts)) e.push(`TASK_STATE identity ${ge}`);
  if ('branch' in ts && nonEmptyStr(ts.branch)) {
    if (!BRANCH_RE.test(ts.branch)) e.push(`TASK_STATE.branch is not canonical grammar: ${ts.branch}`);
    else if (ts.branch !== deterministicBranch(ts)) e.push(`TASK_STATE.branch (${ts.branch}) is not deterministic from identity (${deterministicBranch(ts)})`);
  }
  if ('history' in ts && !Array.isArray(ts.history)) e.push('TASK_STATE.history must be an array');
  if (!isObj(ts.authorizations)) e.push('TASK_STATE.authorizations must be an object');
  else {
    for (const k of CANONICAL_AUTH_KEYS) {
      if (!(k in ts.authorizations)) e.push(`TASK_STATE.authorizations missing ${k}`);
      else if (typeof ts.authorizations[k] !== 'boolean') e.push(`TASK_STATE.authorizations.${k} must be boolean`);
    }
    // no unknown *Authorized keys set true
    for (const [k, v] of Object.entries(ts.authorizations)) {
      if (/Authorized$/.test(k) && !CANONICAL_AUTH_KEYS.includes(k) && v === true) e.push(`TASK_STATE.authorizations.${k} is an unknown authorization set true`);
    }
  }
  return e;
}

// 00-contract/IDENTITY.json structural + cross-consistency with TASK_STATE.
export function validateIdentityShape(identity, ts) {
  const e = [];
  if (!isObj(identity)) return ['IDENTITY.json is not an object'];
  const required = ['taskId', 'countryCode', 'countryName', 'exchangeId', 'exchangeName', 'batchId', 'priority', 'requiredResearchInventory'];
  for (const k of required) if (!(k in identity)) e.push(`IDENTITY missing ${k}`);
  if (ts) {
    for (const k of ['taskId', 'countryCode', 'exchangeId', 'batchId', 'priority']) {
      if (identity[k] !== ts[k]) e.push(`IDENTITY.${k} (${identity[k]}) != TASK_STATE.${k} (${ts[k]})`);
    }
  }
  // V2-C7 — validate IDENTITY grammar/types too (reject malformed-but-equal values).
  for (const ge of validateIdentityValues(identity)) e.push(`IDENTITY ${ge}`);
  const inv = identity.requiredResearchInventory;
  const invOk = Array.isArray(inv) && inv.length === RESEARCH_FILES.length && RESEARCH_FILES.every((f, i) => inv[i] === f);
  if (!invOk) e.push('IDENTITY.requiredResearchInventory does not equal the canonical eleven-file inventory');
  return e;
}

// 00-contract/GITHUB_PLAN.json structural shape.
export function validateGithubPlanShape(plan, ts) {
  const e = [];
  if (!isObj(plan)) return ['GITHUB_PLAN.json is not an object'];
  if (ts && plan.taskId !== ts.taskId) e.push(`GITHUB_PLAN.taskId (${plan.taskId}) != TASK_STATE.taskId (${ts.taskId})`);
  if (plan.model !== 'ONE_BRANCH_ONE_DRAFT_PR') e.push(`GITHUB_PLAN.model must be ONE_BRANCH_ONE_DRAFT_PR, got ${plan.model}`);
  if (plan.baseBranch !== 'main') e.push(`GITHUB_PLAN.baseBranch must be main, got ${plan.baseBranch}`);
  if (!nonEmptyStr(plan.taskBranch)) e.push('GITHUB_PLAN.taskBranch must be a non-empty string');
  else if (!BRANCH_RE.test(plan.taskBranch)) e.push(`GITHUB_PLAN.taskBranch is not canonical grammar: ${plan.taskBranch}`);
  if (!isObj(plan.pullRequest)) e.push('GITHUB_PLAN.pullRequest must be an object');
  else {
    if (plan.pullRequest.draft !== true) e.push('GITHUB_PLAN.pullRequest.draft must be true');
    if (plan.pullRequest.base !== 'main') e.push('GITHUB_PLAN.pullRequest.base must be main');
    if (plan.pullRequest.autoMerge !== false) e.push('GITHUB_PLAN.pullRequest.autoMerge must be false');
    // V2-C6 — pullRequest.head must equal the task branch.
    if (!nonEmptyStr(plan.pullRequest.head)) e.push('GITHUB_PLAN.pullRequest.head must be a non-empty string');
    else if (plan.pullRequest.head !== plan.taskBranch) e.push(`GITHUB_PLAN.pullRequest.head (${plan.pullRequest.head}) != taskBranch (${plan.taskBranch})`);
  }
  if (plan.mergeAuthorized !== false) e.push('GITHUB_PLAN.mergeAuthorized must be false');
  // V2-C6 — cross-bind TASK_STATE.branch == GITHUB_PLAN.taskBranch.
  if (ts && nonEmptyStr(plan.taskBranch) && plan.taskBranch !== ts.branch) {
    e.push(`GITHUB_PLAN.taskBranch (${plan.taskBranch}) != TASK_STATE.branch (${ts.branch})`);
  }
  return e;
}
