#!/usr/bin/env node
// CBW AI Ops — task-contract validator (dependency-free, deterministic).
//
// Parses ONE task-contract JSON file and checks structure, types, enums,
// branch/base relationships, authorization booleans and unsafe path forms.
// Never executes any command found in the contract. Exit 0 = PASS, non-zero = FAIL.
//
// Usage: node scripts/ai-ops/validate-task-contract.mjs <contract.json>

import { readFileSync } from 'node:fs';
import { unsafePathReason, findDuplicates, toPosix } from './lib/path-policy.mjs';

const TASK_ID_RE = /^CBW-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}(?:-[A-Z0-9]+)?$/;
const STATES = ['DRAFT','READY','CLAIMED','IN_PROGRESS','PR_OPEN','CI_FAILED','REPAIRING','OWNER_REVIEW','APPROVED','MERGED','DEPLOY_READY','DEPLOYED','BLOCKED','CANCELLED'];
const STREAMS = ['design','architecture','market-intelligence','production','locale','security','ai-ops'];
const RISKS = ['P0','P1','P2','P3'];
const TASK_TYPES = ['feature','bugfix','docs','governance','research','reconciliation','closeout','review','ai-ops'];
const BASE_BRANCHES = ['master','main'];
const REQUIRED = ['schemaVersion','taskId','project','title','stream','riskLevel','taskType','status','repository','baseBranch','baseSha','worktreePath','featureBranch','executor','reviewer','authorizedScope','requiredChecks','stopConditions','ownerAuthorizations','repairPolicy','forbiddenActions','expectedOutputs','finalReportRequirements'];
const SCOPE_FIELDS = ['exactPaths','allowedPrefixes','forbiddenPaths','forbiddenPrefixes'];
const OWNER_AUTH_FIELDS = ['implementation','merge','deploy','productionBinding','publication','affiliateActivation'];
const REPAIR_FIELDS = ['enabled','maxAttempts','allowedCategories','prohibitedCategories'];
const PROHIBITED_REPAIR = ['architecture-decision','production-fact','bonus-or-referral-value','affiliate-url','market-availability','geo-eligibility','legal-or-regulatory-claim','security-incident','secret','workflow-permission-change','branch-authority-change','production-deployment','scope-expansion','delete-or-weaken-failing-test'];
const REQUIRED_FORBIDDEN_TOKENS = ['force-push','history-rewrite','secret-disclosure','automatic-production-deployment','bypass-owner-authorization'];
const SHELL_COMMAND_KEYS = ['command','cmd','run','exec','shell','script','bash','sh','powershell'];
const DANGEROUS_FLAGS = ['allowForcePush','allowHistoryRewrite','allowSecretDisclosure','autoDeploy','autoMerge','bypassOwner','bypassOwnerAuthorization'];

const errors = [];
const err = (m) => errors.push(m);

function isStrArray(v) { return Array.isArray(v) && v.every((x) => typeof x === 'string'); }

function scanForShellKeys(obj, path = '') {
  if (obj === null || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    const kp = path ? `${path}.${k}` : k;
    if (SHELL_COMMAND_KEYS.includes(k)) err(`embedded shell-command field is forbidden: "${kp}"`);
    if (DANGEROUS_FLAGS.includes(k) && v) err(`dangerous authorization flag set truthy: "${kp}"`);
    if (v && typeof v === 'object') scanForShellKeys(v, kp);
  }
}

function validatePaths(list, label) {
  if (!isStrArray(list)) { err(`${label} must be a string[]`); return; }
  for (const p of list) {
    const r = unsafePathReason(p);
    if (r) err(`${label} entry "${p}" is unsafe: ${r}`);
  }
  const dups = findDuplicates(list);
  if (dups.length) err(`${label} has duplicate entries: ${dups.join(', ')}`);
}

function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: validate-task-contract.mjs <contract.json>'); process.exit(2); }

  let c;
  try {
    c = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`FAIL: cannot parse JSON: ${e.message}`);
    process.exit(1);
  }

  // required fields
  for (const f of REQUIRED) if (!(f in c)) err(`missing required field: ${f}`);

  if (typeof c.taskId === 'string' && !TASK_ID_RE.test(c.taskId)) err(`taskId "${c.taskId}" does not match ${TASK_ID_RE}`);
  if (c.project !== 'CryptoBonusWorld') err(`project must be "CryptoBonusWorld"`);
  if (!STREAMS.includes(c.stream)) err(`invalid stream: ${c.stream}`);
  if (!RISKS.includes(c.riskLevel)) err(`invalid riskLevel: ${c.riskLevel}`);
  if (!TASK_TYPES.includes(c.taskType)) err(`invalid taskType: ${c.taskType}`);
  if (!STATES.includes(c.status)) err(`invalid status: ${c.status}`);
  if (!BASE_BRANCHES.includes(c.baseBranch)) err(`invalid baseBranch: ${c.baseBranch}`);
  if (typeof c.baseSha !== 'string' || !/^[0-9a-f]{40}$/.test(c.baseSha)) err(`baseSha must be a 40-char hex string`);
  if (c.executor !== 'CLAUDE_CODE') err(`executor must be CLAUDE_CODE`);
  if (!['CHATGPT','OWNER'].includes(c.reviewer)) err(`invalid reviewer: ${c.reviewer}`);

  // featureBranch must not be an authority branch
  if (typeof c.featureBranch !== 'string' || ['master','main'].includes(c.featureBranch)) err(`featureBranch must be a dedicated feature branch (not master/main)`);

  // authorizedScope
  if (c.authorizedScope && typeof c.authorizedScope === 'object') {
    for (const f of SCOPE_FIELDS) if (!(f in c.authorizedScope)) err(`authorizedScope missing: ${f}`);
    for (const f of SCOPE_FIELDS) validatePaths(c.authorizedScope[f] || [], `authorizedScope.${f}`);
    // no path both authorized and forbidden
    const authorized = new Set([...(c.authorizedScope.exactPaths||[]).map(toPosix)]);
    const forbidden = new Set((c.authorizedScope.forbiddenPaths||[]).map(toPosix));
    for (const p of authorized) if (forbidden.has(p)) err(`path is both authorized and forbidden: ${p}`);
    for (const pre of (c.authorizedScope.allowedPrefixes||[]).map(toPosix)) {
      if ((c.authorizedScope.forbiddenPrefixes||[]).map(toPosix).includes(pre)) err(`prefix is both allowed and forbidden: ${pre}`);
    }
  } else err('authorizedScope must be an object');

  // requiredChecks / stopConditions / expectedOutputs / finalReportRequirements
  if (!isStrArray(c.requiredChecks) || c.requiredChecks.length === 0) err('requiredChecks must be a non-empty string[]');
  if (!isStrArray(c.stopConditions) || c.stopConditions.length === 0) err('stopConditions must be a non-empty string[]');
  if (!isStrArray(c.expectedOutputs)) err('expectedOutputs must be a string[]');
  if (!isStrArray(c.finalReportRequirements)) err('finalReportRequirements must be a string[]');

  // ownerAuthorizations
  if (c.ownerAuthorizations && typeof c.ownerAuthorizations === 'object') {
    for (const f of OWNER_AUTH_FIELDS) {
      if (!(f in c.ownerAuthorizations)) err(`ownerAuthorizations missing: ${f}`);
      else if (typeof c.ownerAuthorizations[f] !== 'boolean') err(`ownerAuthorizations.${f} must be boolean`);
    }
    if (c.ownerAuthorizations.deploy === true && !c.ownerApprovedDeploySha) {
      err('ownerAuthorizations.deploy=true requires an ownerApprovedDeploySha field');
    }
  } else err('ownerAuthorizations must be an object');

  // repairPolicy
  if (c.repairPolicy && typeof c.repairPolicy === 'object') {
    for (const f of REPAIR_FIELDS) if (!(f in c.repairPolicy)) err(`repairPolicy missing: ${f}`);
    if (typeof c.repairPolicy.enabled !== 'boolean') err('repairPolicy.enabled must be boolean');
    if (!Number.isInteger(c.repairPolicy.maxAttempts) || c.repairPolicy.maxAttempts < 0 || c.repairPolicy.maxAttempts > 2) err('repairPolicy.maxAttempts must be an integer 0..2');
    if (!isStrArray(c.repairPolicy.allowedCategories)) err('repairPolicy.allowedCategories must be a string[]');
    if (!isStrArray(c.repairPolicy.prohibitedCategories)) err('repairPolicy.prohibitedCategories must be a string[]');
    if (isStrArray(c.repairPolicy.allowedCategories) && isStrArray(c.repairPolicy.prohibitedCategories)) {
      const inter = c.repairPolicy.allowedCategories.filter((x) => c.repairPolicy.prohibitedCategories.includes(x));
      if (inter.length) err(`repairPolicy allowed/prohibited overlap: ${inter.join(', ')}`);
      const missing = PROHIBITED_REPAIR.filter((x) => !c.repairPolicy.prohibitedCategories.includes(x));
      if (missing.length) err(`repairPolicy.prohibitedCategories must include: ${missing.join(', ')}`);
    }
  } else err('repairPolicy must be an object');

  // forbiddenActions must list the required forbidden tokens
  if (isStrArray(c.forbiddenActions)) {
    const missing = REQUIRED_FORBIDDEN_TOKENS.filter((t) => !c.forbiddenActions.includes(t));
    if (missing.length) err(`forbiddenActions must include: ${missing.join(', ')}`);
  } else err('forbiddenActions must be a string[]');

  // no embedded shell commands / dangerous flags anywhere
  scanForShellKeys(c);

  if (errors.length) {
    console.error(`FAIL: ${file}`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`PASS: ${file} (task ${c.taskId}, base ${c.baseBranch})`);
  process.exit(0);
}

main();
