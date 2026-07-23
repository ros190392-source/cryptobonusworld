# CBW CI, QA, Status and Owner Gate Matrix — v1

- Task: CBW-GLOBAL-COUNTRY-LOCALE-SITE-ARCHITECTURE-V3-001 · corrected by owner reviews 002 (market-first URLs; LOCALE01-15) and 003 (extensible matrix; LOCALE16-25) · 2026-07-23
- Status: **ARCHITECTURE_V3_OWNER_APPROVED_COMMITTED** (owner-approved committed architecture authority — initial architecture commit `a3dea7e451d046d5f01515bf085962f6f92a9fa7` on branch `feat/cbw-global-site-architecture-v3`; implementation and production remain separately unauthorized)
- Companion: [CBW_CI_QA_STATUS_AND_OWNER_GATE_MATRIX_v1.json](CBW_CI_QA_STATUS_AND_OWNER_GATE_MATRIX_v1.json)

## 1. CI gate matrix (per PR class)

| Gate | Design/prototype PR | Architecture/docs PR | Data (MI) PR | Production PR |
|---|---|---|---|---|
| ci-build | required | required | required | required |
| ci-route-audit | required | n/a | n/a | required |
| ci-link-audit | required | required (docs links) | n/a | required |
| ci-boundary-audit | required | required | required | required |
| ci-first-screen | required (changed families) | n/a | n/a | required |
| ci-visual-regression | required vs baselines | n/a | n/a | required |
| ci-seo-gates | prototype subset (SEO01/04/05) | n/a | n/a | full SEO01–SEO15 |
| ci-locale-lint | when locale files touched | n/a | n/a | required for LIVE locales |
| ci-schema-validate | manifests touched | required (JSON pairs) | required (MI schemas) | required |

Failure policy: any required gate red blocks merge; fixes land on the same branch; waivers are
owner-only and recorded in the PR.


## 1b. Locale gates (LOCALE01–LOCALE15 — owner review 002; enforced by ci-locale-lint + ci-seo-gates)

| Gate | Rule |
|---|---|
| LOCALE01 | Country and language are stored as separate fields (countryCode/countrySlug + languageCode/localeTag); the URL prefix is derived, never a single authoritative locale variable. |
| LOCALE02 | Every routed market-language pair exists in the locale availability matrix registry (no Cartesian-product routes). |
| LOCALE03 | Full translation coverage (UI, header/footer, body, metadata, schema, glossary review) before a pair goes LIVE. |
| LOCALE04 | No mixed-language indexable page. |
| LOCALE05 | Language switch preserves route identity, country, slugs, safe query parameters and anchor. |
| LOCALE06 | Country switch targets only supported (matrix) pairs; falls back to the market default language with a visible notice. |
| LOCALE07 | `html lang` matches the page's localeTag (e.g. `ru-KZ`). |
| LOCALE08 | Canonical is self-referencing on every market-language page. |
| LOCALE09 | Hreflang is reciprocal and complete across all LIVE siblings. |
| LOCALE10 | x-default follows the approved rule (market clusters → the market's English variant; global clusters → global EN). |
| LOCALE11 | Sitemap contains LIVE pairs only. |
| LOCALE12 | Internal links stay inside the current market-language namespace. |
| LOCALE13 | MI facts are byte-identical across language siblings of the same market page. |
| LOCALE14 | Country artwork identity is identical across language siblings (one CountryVisualProfile per country). |
| LOCALE15 | No IP/browser-based hard redirects. |
| LOCALE16 | Market-level language support does not imply page-level translation (PageLocaleCoverage is separate). |
| LOCALE17 | Ukrainian language code is `uk`; `ua` is forbidden as languageCode. |
| LOCALE18 | Only LIVE PageLocaleCoverage variants enter hreflang, sitemap and production switchers. |
| LOCALE19 | Country-switch fallback is explicit and visible to the user (mandatory notice). |
| LOCALE20 | No unsupported market-language URL silently serves another language. |
| LOCALE21 | Exactly one `marketDefault` language exists per market. |
| LOCALE22 | Exactly one `xDefaultTarget` exists per market. |
| LOCALE23 | x-default points to the LIVE market-default page sibling. |
| LOCALE24 | English fallback does not automatically make English the market default. |
| LOCALE25 | All language siblings of a market use the same CountryVisualProfile identity. |

`ci-seo-gates` and `ci-locale-lint` fail a PR on any LOCALE01-LOCALE25 violation for the touched
routes; the matrix in §1 includes these gates wherever `ci-seo-gates`/`ci-locale-lint` apply.

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

## 2. QA and release gates

- **QA-1 local validation** (Claude Code harness: first-screen matrix, state clamps, logo gates,
  a11y, link audit) — before any owner review.
- **QA-2 owner visual review** — screenshots + live preview; explicit APPROVE.
- **QA-3 CI matrix** — per §1 on the PR.
- **QA-4 ChatGPT review** — independent pass over diff/report/screenshots.
- **QA-5 pre-release** (production PRs only): data-binding audit (approved adapters only),
  publication-gate check (G01–G13 + MI01–MI10 + SEO12), rollback plan noted.
- **QA-6 post-deploy live QA** — smoke of migrated routes, CWV sample, state spot-checks; results
  into the status system.

## 3. Screenshot & visual-regression process

Every prototype/production-visual task produces a named screenshot set under `_handoff/**`
(untracked working artifacts). On owner APPROVE, the approved set is promoted by an explicit task
into versioned baselines at `owner-assets/qa/visual-baselines/{surface}/{version}/` (committed).
`ci-visual-regression` diffs PR screenshots against the approved baseline (per-surface thresholds;
any diff above threshold requires owner re-approval and a new baseline version). Baselines are
never overwritten silently; superseded baselines stay archived.

## 4. Status and observability system

Files (to be created by the first authorized status task, then continuously maintained):

- `owner-ops/status/CBW_CURRENT_PROJECT_STATE.md` — human view.
- `owner-ops/status/CBW_CURRENT_PROJECT_STATE.json` — machine view. Exact schema:

```json
{
  "updatedAt": "ISO datetime",
  "updatedBy": "CLAUDE_CODE | OWNER",
  "updateTrigger": "task id",
  "streams": [{
    "streamId": "design|architecture|market-intelligence|production|locale",
    "activeWorktree": "path", "activeBranch": "name", "head": "sha",
    "currentTask": "id|null", "lastCompletedTask": "id",
    "state": "IDLE|IN_PROGRESS|AWAITING_OWNER|BLOCKED",
    "uncommittedScope": ["paths"], "notes": "short"
  }],
  "pendingOwnerDecisions": [{ "id": "string", "question": "string", "blockedTasks": ["ids"] }],
  "authorizationFlags": { "…": "current global flag values" },
  "lastDeploy": { "date": "ISO", "scope": "string" }
}
```

Update responsibility: **Claude Code updates both files at every task completion, owner GO, or
block event** (when a status-update is part of the authorized task scope); the owner may edit
decisions directly; CI validates the JSON against its schema; the MD is regenerated from the JSON
(never hand-drifted). Observability additions: every task report links its handoff artifacts;
PRs link validation logs; the status JSON is the single "where are we" answer.

## 5. Owner-decision gates (catalog)

`OWNER_GO_COMMIT` (per task) · `OWNER_GO_PUSH` (usually with commit) · `OWNER_APPROVE_VISUAL`
(per prototype/artwork) · `OWNER_APPROVE_ARCHITECTURE` (per authority doc) ·
`COUNTRY_ART_GENERATION_AUTHORIZED` (per batch) · `PAGE_IMPLEMENTATION_AUTHORIZED` (per family) ·
`PRODUCTION_ASSET_EXPORT_AUTHORIZED` (per asset set) · `PRODUCTION_DATA_BINDING_AUTHORIZED`
(per family) · `PUBLICATION_AUTHORIZED` (per country/pair/locale scope) ·
`AFFILIATE_ACTIVATION_AUTHORIZED` (per surface) · `MERGE_TO_MASTER_AUTHORIZED` (per PR) ·
`DEPLOY_AUTHORIZED` (per release). Defaults: everything false until explicitly granted; grants are
scoped and non-transferable; every grant is recorded in the status system.

## 6. Current authorization state (this package)

`ARCHITECTURE_DESIGN_AUTHORIZED: true` — all others false (`COUNTRY_ART_GENERATION_AUTHORIZED`,
`PAGE_IMPLEMENTATION_AUTHORIZED`, `PRODUCTION_ASSET_EXPORT_AUTHORIZED`,
`PRODUCTION_DATA_BINDING_AUTHORIZED`, `AFFILIATE_ACTIVATION_AUTHORIZED`,
`MERGE_TO_MASTER_AUTHORIZED`, `PUBLICATION_AUTHORIZED`, `DEPLOY_AUTHORIZED`).
