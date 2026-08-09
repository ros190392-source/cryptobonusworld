# Source Truth Review — OKX × Poland

Task: `CBW-PL-OKX-P0-C-DEEP-RESEARCH-003`  
Review task: `CBW-PL-OKX-P0-C-SOURCE-TRUTH-REVIEW-001`  
Evidence PR: #281  
Reviewed head: `2fd8e668df96ba5e10a0784549de33c9dc90bf1f`  
Reviewed: 2026-08-09

## Outcome

`ACCEPT_WITH_CORRECTIONS_REQUIRED`

The eleven-file package is structurally valid and its factual/product posture remains conservative. The required correction is provenance completeness, not a change to the research conclusion.

## Accepted research posture

- Core OKX Poland crypto services: candidate `AVAILABLE_WITH_LIMITS`, not blanket availability.
- Spot and staking: `AVAILABLE_WITH_LIMITS`.
- KYC/onboarding: conditional on documented identity/account requirements.
- PLN P2P: `PUBLICLY_LISTED_WITH_LIMITS`.
- EUR SEPA deposit/withdrawal: `SUPPORTED_WITH_LIMITS`.
- Direct PLN bank rail: `NOT_VERIFIED`.
- Investment-product layer: `AVAILABLE_WITH_LIMITS` with medium confidence and separate regime/account constraints.
- Exact Poland eligibility for CBW's global OKX referral URL/code: `UNDER_REVIEW`.
- Fixed current Poland reward/bonus amount: `UNDER_REVIEW`.

The KNF payment-services and investment-firm records remain separate evidence for separate entities/regimes. Neither is converted into a generic Poland crypto licence claim. PLN P2P remains separate from a direct PLN bank rail. Referral-program existence remains separate from CBW-specific Poland commercial eligibility.

## Required corrections

### CORR-001 — source provenance restoration

In the corrected `source-verification.json`, restore the contract-required provenance fields for all 17 source records while preserving the same source IDs, URLs and substantive evidence relationships:

- title;
- publisher;
- publication/update/checked dates;
- language;
- source tier/family;
- official-source status;
- confidence;
- verification status/method;
- limitations;
- exact supports/contradicts claim relationships;
- notes.

### CORR-002 — claim provenance restoration

In the corrected `claim-verdicts.json`, restore contract-required primary-evidence provenance for all 20 claims while preserving claim IDs, verdicts, confidence, source relationships and conclusions:

- primary evidence URL;
- publisher;
- title;
- dates;
- language;
- source tier;
- confidence;
- limitations;
- exact supported/contradicted source relationships.

## Correction boundary

Exactly CORR-001 and CORR-002. Do not change source URLs, claim verdicts, research conclusion, product/payment posture, referral posture, import readiness or any authorization flag except mechanically where needed to add missing provenance metadata.

## Authority boundary

All research import, staging, canonical import, product `master`, production, MarketProfile publication, ranking, CTA, promo, affiliate route, sitemap, indexability and deploy authorities remain false.
