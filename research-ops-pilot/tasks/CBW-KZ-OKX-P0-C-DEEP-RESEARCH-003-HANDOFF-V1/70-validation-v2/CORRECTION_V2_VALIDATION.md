# Corrected Package v2 — Independent Validation

- **Validation task:** `CBW-KZ-OKX-P0-C-CORRECTION-V2-VALIDATION-006`
- **Correction task:** `CBW-KZ-OKX-P0-C-RESEARCH-CORRECTION-V2-005`
- **Governing issue:** #38 · **Validation PR:** #39 · **Correction PR:** #37 · **Review PR:** #35 · **Evidence PR:** #32
- **Validated correction commit:** `5dd0d14ed2bf984d0adba2e73a803b9c6b5b0215`
- **Evidence head:** `1b7b477fd2efa4783b42cb8435b6ba7837951585` · **Review head:** `15d6367bc56162bf7584c3011cd4db545091a724`
- **Validated at:** 2026-07-25 · **Role:** Independent Corrected Research Package Validator

## Executive outcome

**`VALIDATED_WITH_NONBLOCKING_NOTES`.**

The corrected v2 package is complete, internally consistent, and faithfully applies all six Source Truth Review 004 corrections while preserving the immutable v1 package and review layer byte-for-byte. Package integrity, manifest hashes, inventory, JSON parsing, ID uniqueness, cross-references, diff boundary, preserved result and the all-false authorization boundary all pass. One nonblocking traceability note remains (`correctedPackageCommitSha = null` in `CORRECTION_STATE.json`), which does not create ambiguity about which package was validated. The package is eligible for **research-record closeout** on the control-plane `main` branch.

**No canonical import or production authorization is granted by this validation.**

## Package integrity

- Exactly **11** flat files under `60-correction-v2/20-corrected-output/`: **9** JSON, **1** Markdown, **1** MANIFEST.
- **9/9** JSON parse.
- No symlinks, no executable files, no hidden payloads, no path traversal.
- All authorization objects (`research-run.json`, `import-readiness.json`, `offer-eligibility-review.json`, MANIFEST boundary) are **all-false**.

## Manifest verification

Independently recomputed every `MANIFEST.txt` byte size and SHA-256 from canonical UTF-8/LF bytes (the stored git blobs): **all 10 hashed files match exactly** (byte size and hash). The Windows `autocrlf` working-tree copy is CRLF and thus one byte-per-line larger; canonical LF is authoritative and matches — not a defect.

## Six-correction matrix

| # | Correction | Required | Observed | Result |
|---|---|---|---|---|
| 1 | Spot | `prod-spot` = CONFLICTING / LOW; no availability inferred from restricted-list absence, app listing or generic platform availability | CONFLICTING / LOW; schema note `corr-1-spot` confirms no direct KZ spot source and spot cannot exceed the CONFLICTING registration gate | **PASS** |
| 2 | KZT P2P URL | `src-okx-p2p-kzt.url` = `https://www.okx.com/ru/p2p-markets/kzt/buy-usdt`; resolves; official; KZT P2P surface; no lawful-eligibility claim from visibility | URL matches; independently opened — official okx.com KZT/USDT P2P surface renders (not 404); eligibility caveat present | **PASS** |
| 3 | AFSA register observation | `clm-kz-reviewed-register-pages-no-obvious-okx` = LOW; explicitly non-executed, non-definitive, not primary RESTRICTED basis | LOW; limitations state observation-only, no executed query, not a definitive negative, not the primary basis for RESTRICTED | **PASS** |
| 4 | P2P confidence split | prod-p2p / prod-kzt-p2p / rail-kzt-p2p / conflict outcome = AVAILABLE_WITH_LIMITS / MEDIUM; surface-existence claim stays HIGH | all four MEDIUM (status AWL); `clm-kz-kzt-p2p-live` = HIGH; surface vs eligibility clearly separated | **PASS** |
| 5 | Crypto transfer | `rail-crypto-transfer` = UNKNOWN / LOW; generic note not presented as KZ availability | UNKNOWN / LOW; generic platform note retained, not KZ-specific availability | **PASS** |
| 6 | AFSA date | Exact 2026-04-29 not asserted as reconfirmed; substance retained; source date null or qualified; no invented date | source date `null`; date removed from claim text; substance retained; limitation records the date was not independently confirmed | **PASS** |

## Immutable-layer verification

- **v1** (`20-research-output/`) — **byte-identical** between the initial correction HEAD `238c793…` and the correction head `5dd0d14…` (0 diffs).
- **Review** (`50-claude-review/`) — **byte-identical** across the same range (0 diffs).
- **Diff boundary** — the correction commit changes **exactly 12 files**: the 11 corrected output files plus `60-correction-v2/CORRECTION_STATE.json`. `CORRECTION_CONTRACT.md` was **not** modified.

## Official URL checks

- **`https://www.okx.com/ru/p2p-markets/kzt/buy-usdt`** — resolves as an official OKX KZT/USDT P2P market surface (title "Из KZT в USDT: купите USDT за KZT…"), not HTTP 404. Checked without login, proxy, VPN or account testing. Surface resolution does **not** prove lawful Kazakhstan eligibility.
- **AFSA warning page** — names OKX among unlicensed digital-asset platforms (substance confirmed); **no publication date is displayed** and 2026-04-29 is not visible, corroborating Correction 6.

## Preserved result

Recommendation **`CONFLICTING`**, confidence **`MEDIUM`**; platform availability **`AVAILABLE_WITH_LIMITS`**, local authorization **`RESTRICTED`**, technical reachability **`AVAILABLE_WITH_LIMITS`**, offer eligibility **`UNKNOWN`**; `liveVerificationState` **`NOT_LIVE_VERIFIED`**; import readiness **`BLOCKED`**; ops recommendation **`HOLD_CONFLICTING`**. No availability upgrade detected. Every authorization remains **false**.

## Nonblocking notes

1. `CORRECTION_STATE.json` records `correctedPackageCommitSha = null`. Treated as a **nonblocking traceability note**: the validated correction commit is unambiguously `5dd0d14ed2bf984d0adba2e73a803b9c6b5b0215`, established independently by the diff boundary (`238c793…5dd0d14` = exactly the 12 files), the `research-run.json` correction object (correct evidence and review SHAs), and the MANIFEST byte/hash match. The field was expected to remain null until after the correction commit and creates no ambiguity about which package was validated.
2. `prod-spot` retains its indirect-signal claim references as evidence inputs, but its status is correctly `CONFLICTING` and asserts no availability — consistent with Correction 1, not a defect.

## Blocking findings

**None.**

## Closeout eligibility

The corrected v2 package is **eligible for research-record closeout** (`CBW-KZ-OKX-P0-C-RESEARCH-RECORD-CLOSEOUT-007`) on the control-plane `main` branch, subject to owner decision.

## Authorization statement

This validation grants **no** production or activation authorization. Even a successful outcome authorizes only research-record closeout; it does **not** authorize canonical import, production change, production binding, ranking, CTA, promo, affiliate route change, publication, sitemap, indexability, MIGRATION_5 or deployment. Every authorization remains **false** and owner-gated.
