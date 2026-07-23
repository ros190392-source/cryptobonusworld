# CBW AI Ops Foundation V1 — Smoke 004

First governed end-to-end smoke test of AI Ops Foundation V1: GitHub Issue →
task contract → dedicated worktree/branch → two scoped files → PR to `master` →
advisory CI → independent ChatGPT review → STOP.

## 1. Task identity
- Task ID: `CBW-AI-OPS-FOUNDATION-V1-SMOKE-004`
- Project: CryptoBonusWorld · Stream: ai-ops · Risk: P2 · Type: governance
- Executor: CLAUDE_CODE · Reviewer: CHATGPT

## 2. GitHub Issue (source of truth)
- Issue #5: https://github.com/ros190392-source/cryptobonusworld/issues/5
- Title: `[TASK] CBW AI Ops Foundation V1 Smoke 004`

## 3. Issue state and source-of-truth confirmation
- Issue #5 state: **OPEN**; declared status **READY**.
- The live Issue was read first and reconciled with the execution prompt: no material
  conflict (task ID, base SHA, worktree, branch, two-file scope, authorizations all agree).
  The live Issue is treated as canonical.

## 4. Source repository verification
- Repository: `ros190392-source/cryptobonusworld`
- Source worktree: `C:\projects\CryptoBonusWorld` on `master`
- `origin/master` = `cfa08ef5dc3a327b8faed2fb7036b39f03a4e8bb`; `origin/main` = `0a96f691f4d5b32003cc6b9e80db30436384496b`
- PR #3 (master authority) and PR #4 (main authority) both MERGED.

## 5. Baseline SHA
- Base branch: `master` · Base SHA: `cfa08ef5dc3a327b8faed2fb7036b39f03a4e8bb`

## 6. Preserved untracked set
- Source tracked tree clean; **172** untracked paths preserved and identical to the baseline snapshot.

## 7. Worktree path
- `C:\projects\CryptoBonusWorld-ai-ops-smoke-004` (created from the exact base SHA; HEAD = `cfa08ef5…`).

## 8. Feature branch
- `feat/cbw-ai-ops-smoke-004`

## 9. Exact two-file scope
1. `owner-ops/ai-ops/tasks/CBW-AI-OPS-FOUNDATION-V1-SMOKE-004.json`
2. `owner-ops/ai-ops/smoke/CBW_AI_OPS_FOUNDATION_V1_SMOKE_004.md`

## 10. State progression
- READY (Issue #5) → **IN_PROGRESS** (this initial commit) → PR_OPEN (recorded after PR creation).
- No transition implies merge or deploy authorization.

## 11. Local validator results
- To be recorded from the dedicated worktree run: `ai-ops:validate`, `ai-ops:validate:fixtures`,
  `ai-ops:validate:contract`, scope validation, branch-authority (changed-file + contract mode), `git diff --check`.

## 12. Build result
- Recorded from the local `npm run build`.

## 13. Affiliate result
- Recorded from `npm run validate:affiliate`.

## 14. SEO result
- Recorded from `npm run seo:check`.

## 15. Pull request
- Title: `test(ai-ops): run foundation smoke 004`
- PR: **PENDING** (number/URL recorded after creation).

## 16. PR base/head
- Base: `master` · Head: `feat/cbw-ai-ops-smoke-004` (head SHA recorded after push/PR).

## 17. Canonical contract marker
- `Task contract path: `owner-ops/ai-ops/tasks/CBW-AI-OPS-FOUNDATION-V1-SMOKE-004.json``

## 18. First advisory workflow run
- Advisory CI: **PENDING** (run ID / URL / conclusion recorded after the first run).

## 19. Final advisory workflow result
- Recorded in the Claude final report (not re-committed here, to avoid a CI-recording loop).

## 20. Confirmations
- PR remains open (no merge performed); no deploy performed; production not contacted;
  the source worktree was not modified; no file changed outside the exact two-file scope.
