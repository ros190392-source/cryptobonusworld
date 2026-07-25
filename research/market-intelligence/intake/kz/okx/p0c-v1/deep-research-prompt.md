# Deep Research Prompt — OKX × Kazakhstan (P0-C)

- **Task to run next:** `CBW-KZ-OKX-P0-C-DEEP-RESEARCH-002` (owner-gated, external tool)
- **Prepared by:** `CBW-KZ-OKX-P0-C-RESEARCH-INTAKE-001` · [Issue #21](https://github.com/ros190392-source/cryptobonusworld/issues/21)
- **Subject:** OKX (`okx`) × Kazakhstan (`KZ`, currency `KZT`) · batch `KZ-P0-C` · priority `P0`

You are conducting an **official-source-first, evidence-first** investigation of whether and how OKX serves Kazakhstan. Produce a deterministic evidence package for owner review. **You are authorized to research only.** You must not import, stage, canonicalize, rank, publish, activate a CTA/promo/affiliate, or deploy anything. Do not assign OKX an availability, KYC, registration, ranking, CTA, promo or eligibility status as a foregone conclusion — every determination must be earned from dated official evidence and may end as `UNKNOWN` or `CONFLICTING`.

## 1. Method and integrity rules (mandatory)
- **Official-source-first.** Prefer OKX legal/official surfaces and the Kazakhstan regulator (AFSA/AIFC) over any third party. Third-party sources are for discovery or contradiction context only and never override current official evidence.
- **Research languages: English, Russian and Kazakh.** Search and read official material in all three where it exists. **Output language: English.**
- **NO-PROXY, NO-TESTING.** No proxy, no VPN, no location spoofing, no account creation, no login, no registration, no KYC submission, no deposit, no trade, no referral-code submission, and no live financial transaction of any kind.
- **Separate current evidence from historical campaigns.** Date every source (published, effective, checked).
- **Do not over-infer:**
  - Absence from a restricted-country list is a *partial positive signal*, not proof of availability.
  - A visible KZT/P2P surface is a *product signal*, not proof of account or legal eligibility.
  - An AFSA warning is a *regulatory signal*, not by itself proof of technical unavailability.
  - The EU **OKX Europe Limited** MiCA CASP license (Malta MFSA, 2025-01-27) is an **EEA** fact and is **not** evidence about Kazakhstan.
  - Repository routes/codes/bonus figures are implementation facts, not eligibility evidence.
- **Distinguish three axes explicitly:** legal availability, local authorization, and technical reachability.

## 2. Required research questions (evidence-backed; do not flatten)
1. **Legal & contracting entity** — Which OKX legal entity serves Kazakhstan users? Which domain/app route? Are there Kazakhstan-specific entities, notices or terms? Are trading, fiat, cards, referral and promotions served by the same entity?
2. **Registration eligibility** — Can a Kazakhstan citizen register? A Kazakhstan resident? A foreign national resident in KZ? Are new registrations accepted? Minimum age? Excluded segments?
3. **KYC** — Is Kazakhstan KYC supported? Which Kazakhstan identity documents are accepted? Proof of address required? Citizenship vs residence handling? Which products/limits require KYC?
4. **Product availability (grade each separately)** — spot, margin, derivatives, copy trading, earn/staking, mobile application, P2P, KZT P2P, direct KZT deposit, direct KZT withdrawal, bank-card purchase, and any other Kazakhstan-relevant product.
5. **P2P and KZT rails** — Is KZT officially supported in P2P? Which USDT/KZT and other KZT markets exist? Which payment methods are officially listed? Do official direct KZT deposit and withdrawal rails exist? Are Kazakhstan-issued cards supported? Are provider/entity/jurisdiction restrictions disclosed?
6. **Cards and direct fiat** — Availability of card purchase and direct KZT deposit/withdrawal, with the responsible provider/entity.
7. **Fees and limits** relevant to Kazakhstan.
8. **Restricted-location terms** — Current restricted/prohibited-location terms and which official restricted-jurisdiction lists apply; are any products (e.g. derivatives) restricted separately?
9. **AFSA / AIFC status** — Any AFSA warning naming OKX; any OKX-related entry in the AFSA public register; official Kazakhstan/AIFC sources on digital-asset platform activity. Weigh Tier-A regulator vs Tier-A OKX disclosure with dated sources.
10. **Referral / affiliate compatibility** — Official referral-code entry flow; Kazakhstan compatibility of the global code; local KZ program; owning entity; registration-time entry requirement; existing-user exclusion.
11. **Conflicts, limitations, freshness and live-verification state** — Enumerate contradictions (including `cf-kz-okx-terms-vs-regulator`), evidence limitations, source freshness and live-verification gaps.

## 3. Source tiering
- **Tier A** — OKX legal terms, restricted/prohibited-location lists, KYC policy, Kazakhstan regulator (AFSA/AIFC) sources, any Kazakhstan-local OKX terms/notices.
- **Tier B** — official OKX product pages, help centre, P2P and fiat pages, referral and campaign terms, official announcements.
- **Tier C** — official app-store listings, reproducible official support responses, official social announcements with clear terms.
- **Tier D** — third-party context only; never sufficient alone for availability, ranking, CTA or promo.

## 4. Required output package (deterministic; for owner review only)
Produce a single package containing **at minimum** these files:

| File | Purpose |
|---|---|
| `research-run.json` | run metadata: subject, dates, languages, method, NO-PROXY attestation |
| `source-verification.json` | every source with URL, publisher, title, published/effective/checked dates, language, tier, confidence, limitations |
| `claim-verdicts.json` | each claim with statement, category, supported/contradicted source IDs, confidence, limitations, status |
| `conflict-resolution.json` | each conflict (incl. `cf-kz-okx-terms-vs-regulator`) with tier/recency weighing and RESOLVED or RETAINED-CONFLICTING outcome |
| `product-availability.json` | per-product status for the products in §2.4 (no flattening) |
| `payment-rails.json` | KZT/P2P/card/direct-fiat rails, methods, provider/entity/jurisdiction restrictions |
| `offer-eligibility-review.json` | referral/affiliate and promotion eligibility for Kazakhstan; separate referral rewards from campaign prize pools; never combine unrelated amounts |
| `schema-normalization-notes.json` | how findings map toward the MI cell/source schemas, without asserting an import |
| `import-readiness.json` | readiness gaps only; must keep `researchImport`/`canonicalImport`/production flags false |
| `source-truth-review-report.md` | narrative synthesis with a machine-readable recovery appendix |
| `MANIFEST.txt` | list of every file with SHA-256 hash and counts |

### Output constraints
- Every JSON file must parse; every ID unique; every cross-reference must resolve.
- Each source and claim carries: source URL, publisher, title, published/effective/checked dates, language, source tier, confidence, limitations, and exact support/contradiction relationships.
- Distinguish **platform availability / product availability / ranking eligibility / CTA eligibility / promo eligibility / publication eligibility** — never collapse them.
- Recommendation enum: `AVAILABLE`, `AVAILABLE_WITH_LIMITS`, `CONFLICTING`, `RESTRICTED`, `UNAVAILABLE`, `UNKNOWN`. Confidence enum: `HIGH`, `MEDIUM`, `LOW`.
- Default `liveVerificationState` = `NOT_LIVE_VERIFIED` (NO-PROXY).
- The AFSA-vs-terms conflict must be either resolved with a decisive higher-tier dated official source or explicitly retained as `CONFLICTING` with tiered dated provenance.

## 5. Authorization boundary of the Deep Research run
The Deep Research run authorizes **research only**. It does **not** authorize import, staging, canonical MI, production binding, ranking, CTA, promo or affiliate activation, publication, schema/legacy-GEO change, MIGRATION_5 or deploy. All such steps remain owner-gated and are out of scope for `CBW-KZ-OKX-P0-C-DEEP-RESEARCH-002`.
