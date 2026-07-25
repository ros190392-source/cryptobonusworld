# Start prompt — OKX × Kazakhstan with inline handoff

TASK:
`CBW-KZ-OKX-P0-C-DEEP-RESEARCH-003-HANDOFF-V1`

PROJECT:
`CryptoBonusWorld`

COUNTRY:
Kazakhstan (`KZ`)

EXCHANGE:
OKX (`okx`)

BATCH:
`KZ-P0-C`

MODE:
Official-source-first, evidence-first, NO-PROXY, NO-TESTING.

## Inputs

Use the following six items already available in ChatGPT File Library:

1. `MANIFEST.txt`
2. `CBW_KZ_OKX_P0C_RESEARCH_QUEUE_v1.json`
3. `CBW_KZ_OKX_P0C_RESEARCH_QUEUE_v1.md`
4. `deep-research-prompt.md`
5. `source-seed-inventory.json`
6. `repository-context-report.md`

First validate the identity, hashes, byte sizes and six-file inventory declared by `MANIFEST.txt`.

If identity or integrity differs, stop with:

`INPUT PACKAGE MISMATCH`

The input materials are research leads and repository context only. They contain zero research conclusions and zero eligibility statuses.

## Research scope

Conduct the complete official-source-first investigation required by `deep-research-prompt.md`.

Research languages: English, Russian, Kazakh.
Output language: English.

Do not use a VPN, proxy, location spoofing, account creation, login, registration attempt, KYC submission, payment, deposit, trade, referral-code submission or financial transaction.

Distinguish:

- legal availability;
- local authorization;
- technical reachability;
- registration eligibility;
- KYC eligibility;
- per-product availability;
- P2P/KZT and direct fiat rails;
- referral/offer eligibility;
- ranking/CTA/promo/publication eligibility.

Do not infer availability merely because Kazakhstan is absent from a restricted list.
Do not infer legal eligibility from visible KZT/P2P surfaces.
Do not infer complete technical unavailability from an AFSA warning alone.
Do not use EEA/MiCA licensing as Kazakhstan evidence.
Do not use repository affiliate routes, promo codes or bonus figures as eligibility evidence.

## Required outputs

Produce exactly these eleven complete files:

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

Every JSON file must parse. Every ID must be unique. Every cross-reference must resolve. Every source and claim must carry the required URLs, publisher/title/date/language/tier/confidence/limitations and support/contradiction relationships.

## Mandatory no-download handoff

Do not return PASS and do not end the research with only a narrative report or downloadable ZIP.

Before the final summary, emit one complete inline envelope following `CBW_HANDOFF_ENVELOPE_V1` from:

`research-ops-pilot/protocols/CBW_SUBSCRIPTION_RESEARCH_HANDOFF_V1.md`

The envelope must contain the exact complete UTF-8/LF contents of all eleven files, with per-file SHA-256 and byte size.

No ellipses, placeholders, shortened arrays, omitted files or summary substitutes.

If the complete envelope cannot be produced, return exactly:

`BLOCKED — HANDOFF_ENVELOPE_MISSING`

A ZIP may be generated only as an optional convenience copy. It is not the canonical handoff.

## Authorization boundary

Keep all research import, staging, canonical, production, production binding, ranking, CTA, promo, affiliate, publication, sitemap, indexability, MIGRATION_5 and deploy authorizations false.

Do not mutate any repository during the research run.
Do not proceed to another exchange.

After the envelope is fully present, stop. The owner will send a separate same-chat instruction to publish it to the prepared GitHub receiver branch.
