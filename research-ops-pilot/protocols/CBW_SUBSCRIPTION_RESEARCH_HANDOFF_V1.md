# CBW Subscription Research Handoff Protocol V1

## Canonical transfer object

`CBW_HANDOFF_ENVELOPE_V1`

A ChatGPT subscription Deep Research task is not complete and must not return PASS until the complete exact contents of every required output file are present inline in the research conversation.

A downloadable ZIP is optional and non-canonical. It may never be the only transferable artifact.

## Envelope format

```text
BEGIN CBW_HANDOFF_ENVELOPE_V1
TASK-ID: <task-id>
PROJECT: CryptoBonusWorld
COUNTRY: <country-code>
EXCHANGE: <exchange-slug>
BATCH: <batch-id>
FILE-COUNT: 11

BEGIN FILE: <filename>
CONTENT-TYPE: <media-type>
SHA-256: <sha256 of exact canonical file content>
BYTE-SIZE: <UTF-8 byte count>

<complete exact file content>
END FILE: <filename>

...repeat for all eleven files...

PACKAGE-STATUS: COMPLETE_INLINE_HANDOFF
ALL-AUTHORIZATIONS-FALSE: true
END CBW_HANDOFF_ENVELOPE_V1
```

## Canonicalization

- encoding: UTF-8 without BOM;
- line endings: LF;
- byte size and SHA-256 cover file content only;
- envelope markers and headers are excluded from file hashes;
- no ellipses, placeholders, omitted arrays or shortened content;
- all JSON must parse;
- all IDs must be unique;
- all cross-references must resolve.

## Required files

1. `research-run.json`
2. `source-verification.json`
3. `claim-verdicts.json`
4. `conflict-resolution.json`
5. `product-availability.json`
6. `payment-rails.json`
7. `offer-eligibility-review.json`
8. `schema-normalization-notes.json`
9. `import-readiness.json`
10. `source-truth-review-report.md`
11. `MANIFEST.txt`

## Valid terminal states

- `PASS` only with a complete valid envelope;
- `BLOCKED — HANDOFF_ENVELOPE_MISSING` when no complete envelope can be emitted;
- `BLOCKED — HANDOFF_FILE_INCOMPLETE` for omitted or truncated content;
- `BLOCKED — HANDOFF_HASH_MISMATCH` for invalid size/hash;
- `BLOCKED — HANDOFF_JSON_INVALID` for invalid JSON;
- `BLOCKED — HANDOFF_AUTHORIZATION_VIOLATION` when any forbidden authorization is true.

## Same-chat publication command

After the complete envelope appears, the owner sends:

`Publish the complete CBW_HANDOFF_ENVELOPE_V1 to the prepared GitHub handoff branch. Do not reconstruct, summarize or rerun the research.`

The assistant must parse and validate the envelope, write the exact eleven files to the prepared branch, update `TASK_STATE.json`, update the draft PR and stop before merge/import/production/deploy.

## Authorization floor

Research import, staging import, canonical import, production, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 and deploy remain false until separate owner approval.
