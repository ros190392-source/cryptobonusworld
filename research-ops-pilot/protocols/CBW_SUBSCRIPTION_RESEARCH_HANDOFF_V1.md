# CBW Subscription Research Handoff Protocol V1

## Purpose

Prevent loss of governed Deep Research output when ChatGPT subscription research produces a narrative report or downloadable ZIP that is not later accessible for direct GitHub publication.

The canonical transfer object is no longer the ZIP. It is an inline, complete, machine-readable chat envelope produced before the research task is declared complete.

## Required protocol identifier

`CBW_HANDOFF_ENVELOPE_V1`

## Completion rule

A subscription Deep Research task is not `PASS` and not complete until its final response contains the complete handoff envelope with every required file in full.

A ZIP may also be generated, but it is only a convenience copy. ZIP availability is never the sole acceptance condition.

## Envelope format

The final research response must contain exactly one envelope using this structure:

```text
BEGIN CBW_HANDOFF_ENVELOPE_V1
TASK-ID: <task-id>
PROJECT: CryptoBonusWorld
COUNTRY: <country-code>
EXCHANGE: <exchange-slug>
BATCH: <batch-id>
FILE-COUNT: 11

BEGIN FILE: research-run.json
CONTENT-TYPE: application/json
SHA-256: <sha256 of exact UTF-8 content>
BYTE-SIZE: <UTF-8 byte count>

<complete file content>
END FILE: research-run.json

...repeat for every required file...

BEGIN FILE: MANIFEST.txt
CONTENT-TYPE: text/plain
SHA-256: <sha256 of exact UTF-8 content>
BYTE-SIZE: <UTF-8 byte count>

<complete manifest content>
END FILE: MANIFEST.txt

PACKAGE-STATUS: COMPLETE_INLINE_HANDOFF
ALL-AUTHORIZATIONS-FALSE: true
END CBW_HANDOFF_ENVELOPE_V1
```

## Required file inventory

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

## Exact-content requirements

- Every file must be present in full.
- No ellipses, placeholders, omitted arrays or narrative substitutes.
- All JSON must be valid JSON.
- File content begins after the blank line following `BYTE-SIZE` and ends immediately before the matching `END FILE` marker.
- UTF-8 without BOM is the canonical encoding.
- Line endings are LF for hashing and publication.
- Hash and byte size are calculated from canonical UTF-8/LF file content only, excluding envelope markers and headers.
- `MANIFEST.txt` must list hashes and byte sizes for the ten non-manifest files.

## Authorization floor

Every research package must preserve all of these as false unless a later owner decision in a separate task explicitly changes them:

- research import;
- staging import;
- canonical import;
- production change;
- production binding;
- ranking;
- CTA;
- promo;
- affiliate route;
- publication;
- sitemap;
- indexability;
- MIGRATION_5;
- deploy.

## Publishing step

After the envelope appears in the research conversation, the owner sends one instruction in the same conversation:

`Publish the complete CBW_HANDOFF_ENVELOPE_V1 to its prepared GitHub handoff branch. Do not reconstruct, summarize or rerun the research.`

The publishing assistant must:

1. parse the envelope from the conversation;
2. verify task identity and exact file count;
3. normalize line endings to LF only if the envelope declares LF canonicalization;
4. verify every declared byte size and SHA-256;
5. parse all JSON files;
6. verify IDs and cross-references;
7. create the eleven files on the prepared branch;
8. update task state with publication commit SHA;
9. open or update a draft PR;
10. stop before merge, import, production or deploy.

## Failure states

- Missing envelope: `HANDOFF_ENVELOPE_MISSING`
- Incomplete file: `HANDOFF_FILE_INCOMPLETE`
- Hash mismatch: `HANDOFF_HASH_MISMATCH`
- Invalid JSON: `HANDOFF_JSON_INVALID`
- Identity mismatch: `PROJECT_TASK_MISMATCH`
- Authorization violation: `HANDOFF_AUTHORIZATION_VIOLATION`
- Exact source result unavailable: `SOURCE_RESULT_CONTENT_UNAVAILABLE`

No failure state permits reconstruction from the narrative summary.

## Research prompt requirement

Every future CBW subscription Deep Research prompt must include this stop condition:

```text
Do not return PASS and do not end the task with only a narrative report or downloadable ZIP. Before the final report, emit the complete CBW_HANDOFF_ENVELOPE_V1 containing the exact full contents of all required output files. If the full inline envelope cannot be produced, return BLOCKED with HANDOFF_ENVELOPE_MISSING.
```

## Pilot result

The historical `CBW-KZ-OKX-P0-C-DEEP-RESEARCH-002` run returned a narrative report and reported ZIP metadata, but the exact eleven source files were unavailable for later direct publication. Its transfer state is therefore `SOURCE_RESULT_CONTENT_UNAVAILABLE`; it is not eligible for canonical import.

The next execution must use a new task/version and this protocol from the beginning.
