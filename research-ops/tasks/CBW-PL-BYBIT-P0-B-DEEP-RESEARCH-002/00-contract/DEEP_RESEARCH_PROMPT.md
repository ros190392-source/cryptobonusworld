# Deep Research start prompt — Bybit × Poland

TASK: `CBW-PL-BYBIT-P0-B-DEEP-RESEARCH-002`
PROJECT: CryptoBonusWorld
COUNTRY: Poland (`PL`)
EXCHANGE: Bybit (`bybit`)
BATCH: `PL-P0-B` · PRIORITY: `P0`
FACTORY: ResearchOps Subscription Factory v1.1
GENERATED: 2026-08-08

## Mode

Official-source-first, evidence-first, NO-PROXY, NO-TESTING. No VPN, location spoofing,
account creation, login, registration attempt, KYC submission, payment, deposit, trade,
referral-code submission or financial transaction.

Research languages: English, Russian, and the primary local language of Poland where official sources exist.
Output language: English.

## Separation rules

Distinguish, and never collapse:

- legal availability;
- local authorization;
- technical reachability;
- registration eligibility;
- KYC eligibility;
- per-product availability;
- P2P / local-currency and direct fiat rails;
- referral / offer eligibility;
- ranking / CTA / promo / publication eligibility.

Do not infer availability from absence in a restricted list. Do not infer legal eligibility
from a visible local-currency P2P surface. Do not infer complete technical unavailability from
a regulator warning alone. Do not use EEA/MiCA or other foreign licensing as Poland evidence.
Repository routes, promo codes and bonus figures are not eligibility evidence.

## Required output — exactly eleven files

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

Every JSON file must parse. Every ID must be unique. Every cross-reference must resolve.
Each source and claim must carry URL, publisher, title, dates, language, source tier,
confidence, limitations and exact support/contradiction relationships.

## Mandatory inline handoff

Do not return PASS with only a narrative summary or a downloadable ZIP. Before the final
summary, emit one complete inline `CBW_HANDOFF_ENVELOPE_V1` (see
`research-ops-pilot/protocols/CBW_SUBSCRIPTION_RESEARCH_HANDOFF_V1.md`) containing the exact
UTF-8/LF contents of all eleven files, each with its SHA-256 and byte size. No ellipses,
placeholders, shortened arrays or omitted files. If the complete envelope cannot be produced,
return exactly `BLOCKED — HANDOFF_ENVELOPE_MISSING`.

## Authorization boundary

Keep every research import, staging, canonical, production, production-binding, ranking, CTA,
promo, affiliate, publication, sitemap, indexability, MIGRATION_5 and deploy authorization
false. Do not mutate any repository during the research run. Do not proceed to another exchange.
