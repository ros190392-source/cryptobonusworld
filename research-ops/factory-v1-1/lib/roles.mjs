// ResearchOps Factory V1.1 — task-role capability profiles (V4-C1).
// Deterministic role derivation and exact capability per role. Roles constrain what a
// governed factory PR may change: a validation PR may create only its two result files
// and may NOT touch implementation/workflow/lineage; an implementation/correction PR
// may modify enumerated implementation paths plus exactly two result files; a closeout
// PR may create only closeout records. No whole-directory prefix authorization.

export const ROLE_IMPLEMENTATION = 'implementation';
export const ROLE_CORRECTION = 'correction';
export const ROLE_VALIDATION = 'validation';
export const ROLE_CLOSEOUT = 'closeout';

// Governed factory branch families -> role. Pattern-based (deterministic); the actual
// authorization additionally requires an owner-created governed record (see govrecord).
const ROLE_BRANCH_RES = [
  [/^feat\/researchops-(subscription-)?factory-v1-1(?:$|[/-])/, ROLE_IMPLEMENTATION],
  [/^correction\/researchops-(subscription-)?factory-v1-1(?:$|[/-])/, ROLE_CORRECTION],
  [/^validation\/researchops-(subscription-)?factory-v1-1(?:$|[/-])/, ROLE_VALIDATION],
  [/^closeout\/researchops-(subscription-)?factory-v1-1(?:$|[/-])/, ROLE_CLOSEOUT],
];

export function roleForBranch(headBranch) {
  const h = String(headBranch || '').trim();
  for (const [re, role] of ROLE_BRANCH_RES) if (re.test(h)) return role;
  return null;
}

// Exact capability for a role. `canModifyImplementation`: may change bin/lib/fixtures/
// schemas/templates/README and the factory workflow. `maxResultFiles`: the exact number
// of result records the task may create in its own result directory (setup files stay
// immutable and are never in this count).
export function capabilityForRole(role) {
  switch (role) {
    case ROLE_IMPLEMENTATION:
    case ROLE_CORRECTION:
      return { role, canModifyImplementation: true, canModifyWorkflow: true, maxResultFiles: 2 };
    case ROLE_VALIDATION:
      return { role, canModifyImplementation: false, canModifyWorkflow: false, maxResultFiles: 2 };
    case ROLE_CLOSEOUT:
      return { role, canModifyImplementation: false, canModifyWorkflow: false, maxResultFiles: 2 };
    default:
      return null;
  }
}

// A file under a task result directory is a SETUP file (owner-created, immutable after
// setup) if it is a contract, state or prompt record.
export function isSetupResultFile(basename) {
  return /(_CONTRACT\.md|_STATE\.json|_PROMPT\.md)$/.test(basename) || /^CLAUDE_.*\.md$/.test(basename);
}
