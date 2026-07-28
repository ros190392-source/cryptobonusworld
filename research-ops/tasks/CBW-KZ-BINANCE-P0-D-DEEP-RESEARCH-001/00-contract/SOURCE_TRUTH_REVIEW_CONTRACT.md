# Source Truth Review contract — Binance × Kazakhstan

TASK: `CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001` · BATCH: `KZ-P0-D` · FACTORY v1.1

## Role

Independent adversarial reviewer. Verify whether the eleven-file research package accurately
represents its cited evidence. Do not act as the original researcher, importer or deployer.

## Mandatory reads

- the complete task contract under `00-contract/`;
- all eleven files under `20-research-output/`;
- any cited decisive official source (open it; do not rely on paraphrase).

## Required decisions

1. package integrity (inventory, JSON, manifest, IDs, cross-references);
2. every source classification and tier/confidence;
3. every claim (supported / underqualified / overstated / stale / unsupported);
4. every retained conflict;
5. product and payment-rail statuses;
6. overall recommendation and confidence;
7. import readiness;
8. all-false authorization boundary.

## Official-source checking

Open material cited sources first, NO-PROXY / NO-TESTING. Record any inaccessible source as a
limitation; never invent evidence.

## Required outputs (write into `50-source-truth-review/`)

- `SOURCE_TRUTH_REVIEW.json`;
- `SOURCE_TRUTH_REVIEW.md`.

## Outcome enum

Exactly one of: `ACCEPT_AS_RESEARCH_RECORD`, `ACCEPT_WITH_CORRECTIONS_REQUIRED`,
`REJECT_RESEARCH_PACKAGE`.

Acceptance as a research record does not authorize canonical import, production, ranking, CTA,
promo, affiliate, publication or deployment. Every authorization remains false.
