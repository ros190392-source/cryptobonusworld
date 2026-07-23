# CBW AI Ops Foundation — v1

- Status: **AI_OPS_FOUNDATION_V1_PROPOSED** (advisory enforcement; no autonomous merge or deploy)
- Companion: [CBW_AI_OPS_FOUNDATION_v1.json](CBW_AI_OPS_FOUNDATION_v1.json)

## Purpose

Establish GitHub as the single shared source of project-task truth for CryptoBonusWorld and make
every AI-executed task a governed, machine-readable **task contract** with explicit scope, branch
authority, bounded repair, and owner-gated merge/deploy. Enforcement in V1 is **advisory** — the
system reports and blocks locally, but never merges or deploys on its own.

## Roles

- **Owner** — sole decision authority; holds every commit, merge, publication, affiliate and deploy gate.
- **ChatGPT** — product architect and task dispatcher; shapes contracts and reviews PRs; returns
  PASS / BLOCKED / REPAIR_REQUIRED. Never touches the repo, never receives secrets. See
  [CBW_CHATGPT_REVIEW_CONTRACT_v1.md](CBW_CHATGPT_REVIEW_CONTRACT_v1.md).
- **Claude Code** — the only executor; works inside one assigned worktree, changes only authorized
  paths, validates locally, commits and pushes normally, opens/updates one PR, never merges or
  deploys. See [CBW_CLAUDE_CODE_EXECUTION_CONTRACT_v1.md](CBW_CLAUDE_CODE_EXECUTION_CONTRACT_v1.md).
- **GitHub** — repository of record: branches, PRs, Issue Forms, control workflows, history.

## Branch authority (non-negotiable)

`master` is production/site/code/architecture/governance authority. `main` is the repository
default branch hosting Issue Forms, the PR template and manually dispatched control workflows.
**The branches are never merged wholesale in either direction and never rebased onto each other.**
Code/content/architecture PRs target `master`; default-branch template/workflow PRs target `main`.
See [CBW_BRANCH_AUTHORITY_MAP_v1.json](CBW_BRANCH_AUTHORITY_MAP_v1.json).

## Task contract

A task contract is JSON data only — it never carries executable shell commands and can never
authorize force-push, history rewrite, secret disclosure, automatic production deployment, or a
bypass of owner authorization. Required fields, enums and safety rules are defined in
[CBW_AI_TASK_CONTRACT_SCHEMA_v1.json](CBW_AI_TASK_CONTRACT_SCHEMA_v1.json); a worked example is in
[examples/CBW_AI_TASK_CONTRACT_EXAMPLE_v1.json](examples/CBW_AI_TASK_CONTRACT_EXAMPLE_v1.json).

## Workflow states

`DRAFT → READY → CLAIMED → IN_PROGRESS → PR_OPEN → (CI_FAILED → REPAIRING)* → OWNER_REVIEW →
APPROVED → MERGED → DEPLOY_READY → DEPLOYED`, with `BLOCKED` and `CANCELLED` reachable from most
states. Reaching `MERGED` requires explicit `ownerAuthorizations.merge`; reaching `DEPLOYED`
requires explicit `ownerAuthorizations.deploy` plus an owner-approved master SHA. No transition
infers merge or deploy authorization. See
[CBW_AI_WORKFLOW_STATE_MODEL_v1.json](CBW_AI_WORKFLOW_STATE_MODEL_v1.json).

## Controlled repair

At most **two** repair attempts, each on the same branch, inside the original scope, as a new
commit that preserves prior commits and reruns the failed checks. Repair is allowed only for
deterministic mechanical categories (formatting, lint, type/build errors, generated indexes,
internal links, schema validation, test-fixture corrections, narrow CI-config errors) and must
stop for owner review on architecture, production facts, bonus/affiliate/market/GEO/legal/security
matters, secrets, workflow-permission or branch-authority changes, deployment, scope expansion, or
deleting/weakening a failing test. Never auto-merges, never auto-deploys. See
[CBW_CONTROLLED_REPAIR_POLICY_v1.json](CBW_CONTROLLED_REPAIR_POLICY_v1.json).

## Local validators

- `scripts/ai-ops/validate-task-contract.mjs` — structure, types, enums, base/branch relationships,
  authorization booleans, prohibited authorizations, unsafe path forms; never executes contract input.
- `scripts/ai-ops/validate-scope.mjs` — changed files vs `exactPaths`/`allowedPrefixes`, rejecting
  absolute/traversal/forbidden paths.
- `scripts/ai-ops/validate-branch-authority.mjs` — base branch and changed paths vs the authority
  map; rejects cross-authority files and wholesale-merge contracts.
- `scripts/ai-ops/validate-ai-ops-foundation.mjs` — cross-checks all governance JSON and runs fixtures.
- `scripts/ai-ops/lib/path-policy.mjs` — shared, dependency-free path normalization/classification.
- `tests/ai-ops/run-fixtures.mjs` — asserts each fixture's expected PASS/FAIL.

Package scripts (added, existing scripts preserved): `ai-ops:validate`, `ai-ops:validate:contract`,
`ai-ops:validate:fixtures`, `ai-ops:validate:scope`, `ai-ops:validate:branch`.

## Advisory PR gate

`.github/workflows/cbw-pr-advisory-gate.yml` runs on PRs based on `master` with read-only
permissions (`contents: read`, `pull-requests: read`). It runs `npm ci`, `ai-ops:validate`,
`build`, and the existing safe affiliate/SEO checks, validates branch authority and (when a valid
contract path is declared) scope, and writes a step summary. Legacy PRs without a contract succeed
with an advisory warning. It never deploys, never writes repository contents, never uses
`pull_request_target`, and is not made a required check by this task.

## Not authorized by this foundation

Implementation, production binding, publication, affiliate activation, merge and deployment all
remain separately owner-gated. Installing this foundation grants none of them.
