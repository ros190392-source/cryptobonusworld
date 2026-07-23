# CBW AI + GitHub Delivery and Visual Reference Workflow — v1

- Task: CBW-GLOBAL-COUNTRY-LOCALE-SITE-ARCHITECTURE-V3-001 · corrected by owner review 002 (market-first URLs) · 2026-07-23
- Status: **ARCHITECTURE_V3_OWNER_APPROVED_COMMITTED** (owner-approved committed architecture authority — initial architecture commit `a3dea7e451d046d5f01515bf085962f6f92a9fa7` on branch `feat/cbw-global-site-architecture-v3`; implementation and production remain separately unauthorized)
- Companion: [CBW_AI_GITHUB_DELIVERY_AND_VISUAL_REFERENCE_WORKFLOW_v1.json](CBW_AI_GITHUB_DELIVERY_AND_VISUAL_REFERENCE_WORKFLOW_v1.json)

## 1. Roles

- **Owner** — the only decision authority: issues scoped tasks, approves visuals/architecture/
  content, holds every GO gate (commit, merge, publication, affiliate, deploy).
- **ChatGPT** — architecture, design direction, SEO strategy, art generation (country packs, design
  references), Deep Research (MI inputs), per-market-language translation passes (locked glossary), and
  independent review of Claude Code's PRs/reports. Produces approved task specs and visual references; never touches the repo.
- **Claude Code** — the only implementer: repository work in scoped worktrees/branches, prototypes,
  validation harnesses, screenshots, reports, status updates; commits/pushes only on explicit owner
  GO; never merges, publishes or deploys.
- **GitHub** — repository of record: branches, PRs, Actions (CI gates), review artifacts, history.

## 2. Delivery pipeline (binding chain)

```
Owner (intent)
→ ChatGPT architecture/design/SEO task shaping
→ approved task + visual references (handed to Claude Code as a scoped task)
→ Claude Code implementation (isolated worktree/branch; mock data; local validation)
→ owner GO → branch commit / push
→ PR (design/* or feat/* → never direct to master)
→ GitHub Actions (CI gate matrix)
→ fix loop (Claude Code addresses failures on the same branch)
→ ChatGPT review (PR diff + screenshots + validation report)
→ owner approval
→ merge (owner-gated; MERGE_TO_MASTER_AUTHORIZED)
→ optional production gate (data binding / publication / affiliate activation — each separate)
→ deploy (owner-gated) → post-deploy live QA → status update
```

## 3. Branch / worktree strategy

`master` protected (PR-only, green CI, owner approval). Branch namespaces: `feat/*` (implementation),
`design/*` or `feat/cbw-*-v{n}` (design prototypes), `arch/*` (architecture docs), `mi/*`
(market-intelligence data tasks), `hotfix/*`. One task = one branch = one scoped commit set; every
long-lived stream gets its own worktree (`C:\projects\CryptoBonusWorld-<stream>`), never sharing a
checkout; worktrees are created from a pinned baseline commit stated in the task and are never
reset/reused across streams. Uncommitted work never migrates between branches by hand.

## Branch authority (codified — verified two-branch model)

```
PRODUCTION_CODE_BRANCH:            master
CODE_DESIGN_ARCHITECTURE_PR_BASE:  master
WORKFLOW_BRANCH:                   main
GITHUB_DEFAULT_BRANCH:             main   (metadata only)
```

Rules: `master` is the production code and site-authority branch; code, design, architecture,
content and data PRs target `master`; `main` is reserved for GitHub Actions and
workflow-management files; workflows on `main` may check out `master` for actual site code;
`main` and `master` must remain separate — never merge `main` into `master` and never merge
`master` into `main`; GitHub default-branch metadata does not redefine production authority;
workflow-file changes require a separately scoped `main`-branch task. (Documentation only —
repository settings and branch contents unchanged; this architecture branch is not merged here.)

## 4. PR lifecycle

Open PR with: task ID, scope list (exact files), validation summary, screenshot links (handoff
artifacts), boundary confirmations (untouched areas). CI must be green; ChatGPT review comments
addressed or explicitly owner-waived; owner approval is the merge trigger; squash-merge with the
task's commit message convention; branch deleted after merge; status file updated in the same cycle.

## 5. GitHub Actions (workflow inventory — implementation separately authorized)

`ci-build` (install, typecheck, astro build) · `ci-route-audit` (noindex/sitemap/robots per route
class; `/__design/**` and `/go/**` policies) · `ci-link-audit` (no `/go/**`, affiliate or exchange
URLs in prototypes; internal links resolve) · `ci-boundary-audit` (no canonical-MI/staging imports
in design routes; `affiliateInfluencesRanking=false`; no production files touched by design PRs) ·
`ci-first-screen` (Playwright first-screen matrix on changed page families) · `ci-visual-regression`
(screenshot diff vs approved baselines) · `ci-seo-gates` (SEO01–SEO15) · `ci-locale-lint` (ICU
placeholders, glossary locks, coverage thresholds, market-language pair registry — enforces the
LOCALE01-LOCALE25 gates of the governance matrix; PageLocaleCoverage advancement gates each page variant) · `ci-schema-validate` (JSON-LD + registry/
manifest JSON schemas). Full pass/fail policy in the governance gate matrix.

## 6. Design-reference image workflow (binding)

```
ChatGPT-generated reference image (design direction / country art / page concept)
→ owner approval (explicit, per image or pack)
→ handoff to Claude Code (files + intent notes)
→ ingestion: owner-assets/site-design/references/{topic}/… (masters, untouched)
→ REFERENCE_MANIFEST.json entry: { referenceId, topic, files[], checksums, source: CHATGPT,
   ownerApproval: date, intendedUse, rightsNote, status: APPROVED|SUPERSEDED }
→ design-branch commit (owner-gated)
→ prototype implementation cites referenceId in its task report
```
Rules: **approved reference images never enter `public/**`** (references are working inputs, not
shippable assets; shippable derivatives require the separately authorized production-asset-export
task); unmanifested images may not be committed; superseded references stay archived. Country
visual packs follow the same chain with the COUNTRY_VISUAL_REGISTRY (country-visual standard §6).

## 7. Reporting conventions

Every Claude Code task ends with a structured report (scope, validation, git state, verdict,
recommended next task) and stops; owner GO is required between implement → commit → push → merge →
deploy stages; handoff artifacts (`_handoff/**`) stay untracked; the status system (governance doc)
is updated at task completion when authorized.
