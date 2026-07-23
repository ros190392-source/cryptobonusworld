#!/usr/bin/env node
// CBW AI Ops — task-contract validator (dependency-free, deterministic).
//
// Parses ONE task-contract JSON file and checks structure, types, enums,
// governed task-ID grammar, base/branch/SHA relationships, authorization
// booleans, deploy gating, repair-policy consistency and scope consistency.
// Never executes any command found in the contract. Exit 0 = PASS, non-zero = FAIL.
//
// Usage: node scripts/ai-ops/validate-task-contract.mjs <contract.json>

import { readFileSync } from 'node:fs';
import { unsafePathReason, findDuplicates, toPosix, underPrefix } from './lib/path-policy.mjs';

// Governed CBW task-ID grammar (kept in sync with the schema and the repair workflow).
export const TASK_ID_RE = /^CBW-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}[A-Z]?(?:-R\d+)?$/;

const STATES = ['DRAFT','READY','CLAIMED','IN_PROGRESS','PR_OPEN','CI_FAILED','REPAIRING','OWNER_REVIEW','APPROVED','MERGED','DEPLOY_READY','DEPLOYED','BLOCKED','CANCELLED'];
const STREAMS = ['design','architecture','market-intelligence','production','locale','security','ai-ops'];
const RISKS = ['P0','P1','P2','P3'];
const TASK_TYPES = ['feature','bugfix','docs','governance','research','reconciliation','closeout','review','ai-ops'];
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

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';
const isSingleLine = (v) => typeof v === 'string' && !/[\r\n]/.test(v);
const has40LowerHex = (v) => typeof v === 'string' && /^[0-9a-f]{40}$/.test(v);

function isStrArrayNonEmptyEntries(v) {
  return Array.isArray(v) && v.length > 0 && v.every((x) => isNonEmptyString(x) && isSingleLine(x));
}

// Regex-based git branch-form check (the repair workflow additionally uses
// git check-ref-format). Rejects master/main, control/whitespace and malformed refs.
function gitBranchInvalidReason(b) {
  if (!isNonEmptyString(b)) return 'empty';
  if (b === 'master' || b === 'main') return 'is an authority branch';
  if ([...b].some((ch) => { const x = ch.charCodeAt(0); return x < 0x20 || x === 0x7f; })) return 'control character';
  if (/\s/.test(b)) return 'whitespace';
  if (!/^[A-Za-z0-9._\/-]+$/.test(b)) return 'illegal characters';
  if (b.startsWith('/') || b.endsWith('/')) return 'leading/trailing slash';
  if (b.startsWith('-')) return 'leading dash';
  if (b.includes('//') || b.includes('..')) return 'double slash or ..';
  if (b.includes('@{')) return '@{ sequence';
  if (b.endsWith('.') || b.endsWith('.lock')) return 'ends with . or .lock';
  if (b.split('/').some((seg) => seg.startsWith('.'))) return 'segment starts with .';
  if (b.startsWith('origin/')) return 'begins with origin/';
  return null;
}

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
  if (!Array.isArray(list)) { err(`${label} must be an array`); return; }
  for (const p of list) {
    if (!isNonEmptyString(p)) { err(`${label} has an empty/non-string entry`); continue; }
    const r = unsafePathReason(p);
    if (r) err(`${label} entry "${p}" is unsafe: ${r}`);
  }
  const dups = findDuplicates(list.filter((x) => typeof x === 'string'));
  if (dups.length) err(`${label} has normalized duplicate entries: ${dups.join(', ')}`);
}

function validateScopeConsistency(scope) {
  const exact = (scope.exactPaths || []).filter((x) => typeof x === 'string').map(toPosix);
  const allowed = (scope.allowedPrefixes || []).filter((x) => typeof x === 'string').map(toPosix);
  const fPaths = (scope.forbiddenPaths || []).filter((x) => typeof x === 'string').map(toPosix);
  const fPrefixes = (scope.forbiddenPrefixes || []).filter((x) => typeof x === 'string').map(toPosix);

  for (const p of exact) {
    if (fPaths.includes(p)) err(`exact authorized path is also forbidden: ${p}`);
    if (fPrefixes.some((pre) => underPrefix(p, pre))) err(`exact authorized path is under a forbidden prefix: ${p}`);
  }
  for (const ap of allowed) {
    if (fPrefixes.some((fp) => underPrefix(ap, fp) || underPrefix(fp, ap))) err(`allowed prefix overlaps a forbidden prefix: ${ap}`);
    for (const fpath of fPaths) if (underPrefix(fpath, ap)) err(`allowed prefix "${ap}" would include forbidden exact path "${fpath}"`);
  }
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

  for (const f of REQUIRED) if (!(f in c)) err(`missing required field: ${f}`);

  if (c.schemaVersion !== '1.0.0') err('schemaVersion must be exactly "1.0.0"');
  if (!isNonEmptyString(c.taskId) || !TASK_ID_RE.test(c.taskId)) err(`taskId "${c.taskId}" does not match ${TASK_ID_RE}`);
  if (c.project !== 'CryptoBonusWorld') err('project must be "CryptoBonusWorld"');
  if (!isNonEmptyString(c.title) || !isSingleLine(c.title)) err('title must be a non-empty single-line string');
  if (c.repository !== 'ros190392-source/cryptobonusworld') err('repository must be "ros190392-source/cryptobonusworld"');
  if (!STREAMS.includes(c.stream)) err(`invalid stream: ${c.stream}`);
  if (!RISKS.includes(c.riskLevel)) err(`invalid riskLevel: ${c.riskLevel}`);
  if (!TASK_TYPES.includes(c.taskType)) err(`invalid taskType: ${c.taskType}`);
  if (!STATES.includes(c.status)) err(`invalid status: ${c.status}`);
  if (!['master', 'main'].includes(c.baseBranch)) err(`invalid baseBranch: ${c.baseBranch}`);
  if (!has40LowerHex(c.baseSha)) err('baseSha must be exactly 40 lowercase hex characters');
  if (!isNonEmptyString(c.worktreePath) || /[\0\r\n]/.test(c.worktreePath) || !/^[A-Za-z]:[\\/]/.test(c.worktreePath)) {
    err('worktreePath must be a non-empty absolute Windows path with no NUL/CR/LF');
  }
  const branchReason = gitBranchInvalidReason(c.featureBranch);
  if (branchReason) err(`featureBranch invalid: ${branchReason}`);
  if (c.executor !== 'CLAUDE_CODE') err('executor must be CLAUDE_CODE');
  if (!['CHATGPT', 'OWNER'].includes(c.reviewer)) err(`invalid reviewer: ${c.reviewer}`);

  for (const [f, v] of [['requiredChecks', c.requiredChecks], ['stopConditions', c.stopConditions], ['forbiddenActions', c.forbiddenActions], ['expectedOutputs', c.expectedOutputs], ['finalReportRequirements', c.finalReportRequirements]]) {
    if (!isStrArrayNonEmptyEntries(v)) err(`${f} must be a non-empty array of non-empty single-line strings`);
  }

  if (c.authorizedScope && typeof c.authorizedScope === 'object') {
    for (const f of SCOPE_FIELDS) if (!(f in c.authorizedScope)) err(`authorizedScope missing: ${f}`);
    for (const f of SCOPE_FIELDS) validatePaths(c.authorizedScope[f] || [], `authorizedScope.${f}`);
    validateScopeConsistency(c.authorizedScope);
  } else err('authorizedScope must be an object');

  if (c.ownerAuthorizations && typeof c.ownerAuthorizations === 'object') {
    for (const f of OWNER_AUTH_FIELDS) {
      if (!(f in c.ownerAuthorizations)) err(`ownerAuthorizations missing: ${f}`);
      else if (typeof c.ownerAuthorizations[f] !== 'boolean') err(`ownerAuthorizations.${f} must be boolean`);
    }
    if (c.ownerAuthorizations.deploy === true) {
      if (c.baseBranch !== 'master') err('deploy authorization requires baseBranch master');
      if (!has40LowerHex(c.ownerApprovedDeploySha)) err('deploy authorization requires ownerApprovedDeploySha of exactly 40 lowercase hex characters');
    }
  } else err('ownerAuthorizations must be an object');

  if (c.repairPolicy && typeof c.repairPolicy === 'object') {
    for (const f of REPAIR_FIELDS) if (!(f in c.repairPolicy)) err(`repairPolicy missing: ${f}`);
    const rp = c.repairPolicy;
    if (typeof rp.enabled !== 'boolean') err('repairPolicy.enabled must be boolean');
    if (!Number.isInteger(rp.maxAttempts)) err('repairPolicy.maxAttempts must be an integer');
    else if (rp.enabled === false && rp.maxAttempts !== 0) err('repairPolicy.enabled=false requires maxAttempts=0');
    else if (rp.enabled === true && !(rp.maxAttempts === 1 || rp.maxAttempts === 2)) err('repairPolicy.enabled=true requires maxAttempts 1 or 2');
    if (!Array.isArray(rp.allowedCategories)) err('repairPolicy.allowedCategories must be an array');
    if (!Array.isArray(rp.prohibitedCategories)) err('repairPolicy.prohibitedCategories must be an array');
    if (Array.isArray(rp.allowedCategories) && Array.isArray(rp.prohibitedCategories)) {
      const inter = rp.allowedCategories.filter((x) => rp.prohibitedCategories.includes(x));
      if (inter.length) err(`repairPolicy allowed/prohibited overlap: ${inter.join(', ')}`);
      const missing = PROHIBITED_REPAIR.filter((x) => !rp.prohibitedCategories.includes(x));
      if (missing.length) err(`repairPolicy.prohibitedCategories must include: ${missing.join(', ')}`);
    }
  } else err('repairPolicy must be an object');

  if (isStrArrayNonEmptyEntries(c.forbiddenActions)) {
    const missing = REQUIRED_FORBIDDEN_TOKENS.filter((t) => !c.forbiddenActions.includes(t));
    if (missing.length) err(`forbiddenActions must include: ${missing.join(', ')}`);
  }

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
