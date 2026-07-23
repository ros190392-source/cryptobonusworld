<!-- CBW governed pull-request template. Fill every section. Never paste secrets. -->

## Task
- **Task ID:**
- **Linked issue:** #
- **Base branch:** <!-- master | main -->
- **Base SHA:**
- **Head branch:**
- **Executor:** CLAUDE_CODE

## Scope
- **Exact changed-file scope:** <!-- list every changed path -->
- **Task-contract path:** <!-- repository-relative path, or "legacy PR (no contract)" -->

## Validation results
- **ai-ops:validate:**
- **build:**
- **security result (deploy code / secrets):**
- **affiliate impact:** <!-- none / describe -->
- **factual / evidence impact:** <!-- none / describe -->
- **production impact:** <!-- none / describe -->

## Repair
- **Repair attempts used (max 2):**
- **Failure categories addressed:**

## Authorization flags
- [ ] implementation authorized
- [ ] merge authorized (separate owner decision)
- [ ] deploy authorized (owner-approved master SHA)
- [ ] production binding authorized
- [ ] publication authorized
- [ ] affiliate activation authorized

## Explicit confirmations
- [ ] **No merge performed** by this PR's author.
- [ ] **No deployment performed.**
- [ ] **No secret included** (no password, private key, recovery code, API secret or session cookie).
- [ ] `main` and `master` were not merged into each other.

## Owner decision
<!-- Reserved for the owner: APPROVE / REQUEST CHANGES / BLOCK, and merge/deploy authorization. -->
