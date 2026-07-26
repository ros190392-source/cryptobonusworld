# Factory V1.1 independent validation contract

## Identity

- Validation task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-VALIDATION-009`
- Governing Issue: `#45`
- Implementation task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-008`
- Implementation Issue: `#43`
- Implementation PR: `#44`
- Validated implementation head: `02997bb63be39012015486ecf55da707a3738f6b`
- Implementation base: `main@04157b9dfb140918a8569a5026da747b429e5ed3`
- Protected production-authority branch: `master@998fcedd7d9febbec5b130d4765dfeaafc40960b`

## Role

Act as an independent adversarial validator. Do not repair implementation defects in this task. Prove or disprove the factory's safety claims through executable probes and source inspection.

## Mandatory scope

Execute Issue #45 completely, including the required probes for:

- `--require-package` plumbing;
- state-to-evidence consistency;
- workflow fail-closed behavior;
- append-only changed-file enforcement;
- task-root deletion;
- `--tasks-dir` path escape;
- schema enforcement;
- authorization escape resistance;
- generated task completeness;
- status semantics;
- package-validator depth;
- workflow permissions and side effects.

Do not rely only on the existing 24/0 fixture suite or the successful advisory workflow.

## Write boundary

The validation branch already contains this contract, `VALIDATION_STATE.json`, and `CLAUDE_VALIDATION_PROMPT.md`.

Create exactly these two additional files:

- `FACTORY_VALIDATION.json`
- `FACTORY_VALIDATION.md`

inside this directory.

Do not modify any pre-existing file, implementation source, workflow, governance file, completed research record, `main`, or `master`.

## Outcome enum

Use exactly one:

- `VALIDATED_FOR_OWNER_MERGE_REVIEW`
- `VALIDATED_WITH_CORRECTIONS_REQUIRED`
- `VALIDATION_BLOCKED`

A broken forced-package flag, fail-open workflow discovery, unsafe canonical CLI path escape, or state/artifact combination that passes validation is not a clean PASS.

## Safety

- no merge;
- no deploy;
- no real Binance task/issue/branch/PR;
- no canonical or production action;
- all production and activation authorizations remain false.
