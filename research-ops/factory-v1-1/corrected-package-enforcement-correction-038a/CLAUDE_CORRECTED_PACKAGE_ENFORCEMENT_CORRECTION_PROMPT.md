# Execution prompt — Corrected Package Enforcement 038A

Task: `CBW-RESEARCHOPS-SUBSCRIPTION-FACTORY-V1-1-CORRECTED-PACKAGE-ENFORCEMENT-038A`

Governing Issue: #107  
Umbrella authorization: #104  
Blocked correction: #106 / PR #69  
Approved base: `31bd0451c75d76f1da6c5e20818825f33b9d043d`

Read the frozen contract/state and current `stage.mjs`, `markers.mjs`, `evidence.mjs`, `validate.mjs`, `package.mjs`, correction template and fixtures before editing.

Modify only the five allowlisted implementation files. Implement generic strict corrected-package enforcement:

1. Atomic `CORRECTION_REQUIRED -> CORRECTED` adds `CORRECTION_STATE.json`, all eleven nested corrected package files, and `TASK_STATE.json`.
2. Reuse canonical package validation for the corrected directory.
3. Strict correction marker binds review, output inventory, applied corrections, manifest hash and all-false authorizations.
4. Corrected package is required and actively validated for the strict correction path and higher states.
5. Original package and review remain immutable.
6. Preserve legacy `CORRECTION_RESULT.json` readability only for historical compatibility; new transitions may not create it.
7. Add fail-closed fixtures; all previous 317 remain green.
8. Create one implementation commit and one recording commit with exactly two result files.

No PR #69 mutation before publication. No main/master/production/import/deploy action inside implementation.

Return only:

- `CORRECTED_PACKAGE_ENFORCEMENT_READY_FOR_OWNER_PUBLICATION`
- `CORRECTED_PACKAGE_ENFORCEMENT_BLOCKED`
