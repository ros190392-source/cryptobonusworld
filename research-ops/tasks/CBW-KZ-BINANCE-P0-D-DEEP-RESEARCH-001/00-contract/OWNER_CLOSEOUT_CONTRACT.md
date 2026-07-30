# Owner closeout contract — Binance × Kazakhstan

TASK: `CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001` · BATCH: `KZ-P0-D` · FACTORY v1.1

## Purpose

Record the owner's decision to close out the validated research record and, if approved, to
authorize exactly one controlled merge of the research record into control-plane `main`.

## Preconditions

- state is `OWNER_CLOSEOUT_REQUIRED`;
- validation outcome is `VALIDATED_FOR_RESEARCH_RECORD_CLOSEOUT` or
  `VALIDATED_WITH_NONBLOCKING_NOTES`;
- every prior stage is immutable and byte-identical.

## Owner receipt

To authorize the merge, the owner provides an `OWNER_CLOSEOUT_RECEIPT.json` under `80-closeout/`:

```json
{
  "authorizationType": "RESEARCH_RECORD_MERGE_TO_MAIN",
  "taskId": "CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001",
  "targetBranch": "main",
  "authorizations": { "researchRecordMergeToMainAuthorized": true }
}
```

The receipt may authorize ONLY the research-record merge to `main`. It must never authorize
`master`, research/staging/canonical import, production change or binding, ranking, CTA, promo,
affiliate route, publication, sitemap, indexability, MIGRATION_5 or deploy. Any such flag set
true makes the receipt invalid and blocks the merge.

## Boundary

Even with a valid receipt, this closeout authorizes only one merge of the immutable research
record to `main`. It grants no production or activation authority of any kind.
