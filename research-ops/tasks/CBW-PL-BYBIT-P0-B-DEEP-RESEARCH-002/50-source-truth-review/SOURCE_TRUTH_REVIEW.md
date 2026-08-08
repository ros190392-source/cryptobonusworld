# Bybit × Poland — independent Source Truth Review

Task: `CBW-PL-BYBIT-P0-B-DEEP-RESEARCH-002`  
Evidence PR: #279  
Reviewed evidence head: `8cc42c90a31eeb9c1472f9a1e34d895b00167be4`  
Reviewed: 2026-08-08

## Verdict

**ACCEPT_WITH_CORRECTIONS_REQUIRED — CORRECTION_REQUIRED**

The factual posture is conservative and supported: FMA authorisation is primary evidence for Bybit EU's MiCAR CASP service scope; Poland-facing PLN/BLIK and PLN-pair evidence supports a limited core-service candidate; optional products and referral binding remain separately gated.

The package is structurally valid, but two internal coherence defects must be corrected before validation.

## Independent factual checks

- **MiCAR authorisation — confirmed.** Austrian FMA directly identifies Bybit EU GmbH and its Article 63 authorised service scope.
- **EEA / country availability — correctly limited.** Bybit EU describes eligible EEA service while requiring actual country/product availability; blanket `available` would be too broad.
- **KYC — confirmed.** Standard Identity Verification is required for EEA users.
- **PLN — confirmed with limits.** Current Bybit EU documentation supports PLN+BLIK deposit and Poland-focused PLN pairs. Exact PLN withdrawal is not established by the captured FAQ.
- **Optional products — correctly gated.** Earn, Card, derivatives and current CBW referral binding are not authorised merely from the MiCAR core-service licence.

## Required correction CORR-001 — source→claim mapping

`source-verification.json` currently lists `CLM017` (Bybit Card eligibility) in `SRC009.supportsClaimIds`, but SRC009 is the PLN Trading Pairs announcement and does not support the Card claim.

Required correction:
- remove `CLM017` from `SRC009.supportsClaimIds`;
- keep `CLM009`;
- leave CLM017 bound only to its legitimate Bybit EU country/product sources.

## Required correction CORR-002 — report provenance

`source-truth-review-report.md` still mentions an expired zero-fee PLN top-up campaign even though the deduplicated canonical source/claim inventory no longer includes that campaign evidence.

Required correction:
- remove the zero-fee campaign statement from the corrected report;
- retain the sourced current Poland offers hub and the historical Poland Referral Marathon;
- do not otherwise change the research conclusion.

## Accepted research posture after those corrections

- Core MiCAR-authorised services — candidate **AVAILABLE_WITH_LIMITS**
- KYC — **MANDATORY**
- PLN+BLIK deposit — **SUPPORTED_WITH_LIMITS**
- PLN pairs — **SUPPORTED_WITH_LIMITS**
- PLN withdrawal — **NOT VERIFIED**
- Earn — **UNDER_REVIEW**
- Bybit Card — **UNDER_REVIEW**
- Derivatives/futures — **NOT VERIFIED**
- CBW referral binding to Bybit EU Poland — **UNDER_REVIEW**

## Authority boundary

No research import, canonical import, production change, ranking, CTA, promo, affiliate-route, publication, sitemap, indexability or deploy authority is granted. Correction is limited to `CORR-001` and `CORR-002`.
