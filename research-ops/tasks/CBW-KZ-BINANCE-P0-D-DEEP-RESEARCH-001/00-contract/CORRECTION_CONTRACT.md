# Correction contract — Binance × Kazakhstan

TASK: `CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001` · BATCH: `KZ-P0-D` · FACTORY v1.1

## When this stage runs

Only when the Source Truth Review returns `ACCEPT_WITH_CORRECTIONS_REQUIRED`.

## Immutability

The research package under `20-research-output/` and the review under `50-source-truth-review/`
are immutable for this stage. Do not edit them. Produce the corrected package only under
`60-correction/20-corrected-output/`.

## Rules

- Apply exactly the corrections required by the review — no more, no fewer.
- Verify any replacement official URL without login, proxy, VPN or account testing.
- Never invent missing evidence.
- Preserve the overall recommendation, confidence and import-readiness unless the review
  explicitly requires a change.
- Recompute `MANIFEST.txt` from canonical UTF-8/LF bytes.
- Keep every authorization false.

## Output

Exactly eleven corrected files under `60-correction/20-corrected-output/` plus a
`CORRECTION_STATE.json` recording the corrections applied and the preserved result.
No canonical import, production change or deploy is authorized.
