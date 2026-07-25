# Claude Source Truth Review contract

## Identity

- Review task: `CBW-KZ-OKX-P0-C-SOURCE-TRUTH-REVIEW-004`
- Source research task: `CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1`
- Project: `CryptoBonusWorld`
- Country: Kazakhstan (`KZ`)
- Exchange: OKX (`okx`)
- Batch: `KZ-P0-C`
- Governing issue: `#33`
- Evidence PR: `#32`
- Evidence head: `1b7b477fd2efa4783b42cb8435b6ba7837951585`
- Review branch: `review/okx-kz-p0c-source-truth-004`
- Review base branch: `research-handoff/okx-kz-p0c-inline-v1`

## Reviewer role

Act as an independent adversarial reviewer. Verify whether the research package accurately represents its cited evidence. Do not act as the original researcher, importer, implementer or deployment agent.

## Mandatory reads

Read completely:

- GitHub Issue #33;
- PR #32 and its validation comment;
- Issue #28 and its handoff comment;
- every contract, protocol and state file in the research task root;
- all eleven files under `20-research-output/`.

Independently open material cited official sources where needed. Do not accept paraphrases without checking the source when the claim is decisive.

## Permitted writes

Create only:

- `SOURCE_TRUTH_REVIEW.json`
- `SOURCE_TRUTH_REVIEW.md`

in this `50-claude-review/` directory.

Do not alter this contract or `REVIEW_STATE.json`.

## Forbidden writes

Do not modify:

- `20-research-output/`;
- `00-contract/`;
- protocols;
- `TASK_STATE.json`;
- site code or production data;
- `main` or `master`;
- any ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 or deploy configuration.

## Required decisions

Review:

1. package integrity;
2. every source classification;
3. every claim;
4. every retained conflict;
5. product and payment-rail statuses;
6. overall `CONFLICTING / MEDIUM` conclusion;
7. `BLOCKED / HOLD_CONFLICTING` import readiness;
8. all-false authorization boundary.

Flag every unsupported, overstated, underqualified, stale or internally inconsistent item.

## Required outcome enum

Use exactly one:

- `ACCEPT_AS_RESEARCH_RECORD`
- `ACCEPT_WITH_CORRECTIONS_REQUIRED`
- `REJECT_RESEARCH_PACKAGE`

Acceptance as a research record does not authorize canonical import, production, ranking, CTA, promo, affiliate, publication or deployment.

## Delivery

Commit exactly the two required review files to the review branch. Do not merge either PR. Return the final review commit SHA and a concise validation summary.
