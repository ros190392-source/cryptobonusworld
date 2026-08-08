# Validation contract — Bybit × Poland

TASK: `CBW-PL-BYBIT-P0-B-DEEP-RESEARCH-002` · BATCH: `PL-P0-B` · FACTORY v1.1

## Role

Independent validator. Deterministically verify the (corrected, if applicable) package and the
integrity of the immutable earlier stages. This is not new research and not an import.

## Required checks

- exact eleven-file inventory in the active output stage;
- 9/9 JSON parse;
- MANIFEST byte sizes and SHA-256 on canonical UTF-8/LF bytes;
- unique source / claim / conflict / product / rail IDs;
- every source and claim cross-reference resolves;
- earlier stages byte-identical (immutability);
- append-only changed-file boundary against the task base ref;
- every authorization false unless a valid owner research-record merge receipt is presented;
- no executable payload, symlink, hidden payload or path traversal.

Run the factory validator:

```text
node research-ops/factory-v1-1/bin/researchops.mjs validate --task-dir <this task>
```

## Output (write into `70-validation/`)

- `CORRECTION_V2_VALIDATION.json` (or `VALIDATION.json`);
- `CORRECTION_V2_VALIDATION.md` (or `VALIDATION.md`).

## Outcome enum

`VALIDATED_FOR_RESEARCH_RECORD_CLOSEOUT`, `VALIDATED_WITH_NONBLOCKING_NOTES`,
`VALIDATION_BLOCKED`. A successful validation authorizes only owner closeout; it never
authorizes canonical import, production or deploy.
