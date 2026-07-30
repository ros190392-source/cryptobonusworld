# Source Truth Review — Binance × Kazakhstan

**Task:** `CBW-KZ-BINANCE-P0-D-DEEP-RESEARCH-001`  
**Review:** `CBW-KZ-BINANCE-P0-D-SOURCE-TRUTH-REVIEW-034-RESUME-037`  
**Reviewed evidence head:** `f7945aaef65616e2a40b5766822d276fc523da2d`  
**Reviewed:** 2026-07-29  
**Outcome:** `ACCEPT_WITH_CORRECTIONS_REQUIRED`  
**Lifecycle marker:** `SOURCE_TRUTH_REVIEWED`

## Executive decision

The eleven-file package is accepted as a research record **with corrections required**. Package integrity, manifest/hash evidence, identifiers and cross-references pass. The core Kazakhstan conclusions are strong: BN KZ Technologies Limited is active, AFSA licence `AFSA-A-LA-2024-0028` is active, public Kazakhstan-facing Binance surfaces exist, and the package correctly separates technical reachability, legal authorization and account-level eligibility.

The package is not ready for canonical import or production use. Several dynamic product and payment-rail statuses are stronger than the underlying evidence. The most important omission is that the current AFSA licence explicitly lists **Future and Option** as permitted investment types; the package currently treats derivatives scope as more ambiguous than the register supports, while simultaneously relying too strongly on a snippet saying products were available “for all users.”

## Integrity

- 11/11 required package files present.
- 9/9 JSON files parse.
- 71 unique sources, 48 unique claims, 6 conflicts, 23 products and 9 payment rails.
- Manifest/hash/byte evidence passes on canonical UTF-8/LF.
- Cross-references resolve.
- Every authorization remains false.

## Independently confirmed decisive evidence

1. The AFSA public register confirms active BN KZ Technologies Limited and active licence `AFSA-A-LA-2024-0028` from 2024-09-25.
2. The licence lists the package’s regulated activities and also states: `Permitted types of Investments: Future and Option`.
3. AFSA states that regulated P2P is permitted only on AIFC-licensed DATFs and is subject to KYC/AML and approved-bank controls.
4. AFSA’s current FAQ separates technical access from lawful licensed operation.
5. Kazakhstan P2P pages are publicly reachable, but payment-method pages alone do not prove live offers, both trading directions or account eligibility.
6. The AIFC market-entry article used for `SRC066` is directly accessible; the package’s search-excerpt limitation is no longer accurate.

## Required corrections

### R037-C01 — Licence scope and derivatives

Targets: `SRC012`, `CLM012`, `CLM029`, `CLM030`, `CNF001`, `PRD003`, `PRD004`.

Add the current AFSA register statement that permitted investment types include **Future and Option**. Reframe the unresolved issue as account-level appropriateness, KYC/compliance and eligibility—not absence of licence scope.

### R037-C02 — Universal eligibility wording

Targets: `SRC039`, `CLM030`, `PRD003`, `PRD004`, `PRD012`.

Remove or explicitly downgrade “for all users.” The snippet is a dated expansion signal and cannot establish current universal eligibility.

### R037-C03 — Current fiat-rail status

Targets: `SRC027`–`SRC029`, `CLM022`, `PRD007`, `PRD008`, `RAIL003`, `RAIL004`.

Retain the official guides as documented operational history. Change current statuses to `CURRENT_OPERATIONAL_AVAILABILITY_NOT_INDEPENDENTLY_CONFIRMED` unless a live current provider/rail surface is separately verified.

### R037-C04 — P2P method surfaces

Targets: `SRC031`–`SRC033`, `CLM024`, `RAIL006`–`RAIL008`.

Treat these URLs as payment-method surface evidence only. Do not infer active offers, both buy/sell directions or resident eligibility.

### R037-C05 — AIFC source classification

Targets: `SRC066`, `CLM008`.

The AIFC page is directly accessible. Remove the search-excerpt limitation and align verification state and confidence with direct official-page evidence.

### R037-C06 — Binance licence disclosure wording

Targets: `SRC020`, `SRC057`, `CLM013`.

Separate Binance public footer wording—commonly platform operation and custody—from the broader activity list in the AFSA register. Do not state that Binance pages repeat every registered activity unless the cited page does so.

### R037-C07 — Snippet-only current status

Targets: `SRC034`, `SRC035`, `SRC046`, `SRC047`, `SRC071`, related claims/products and `RAIL009`.

Keep snippets as historical or monitoring evidence. They must not establish strong current operational or account-eligibility status.

### R037-C08 — Dynamic limits and offer terms

Targets: `SRC018`, `SRC053`–`SRC055`, `CLM026`, `CLM040`–`CLM042`.

Keep limits, referral maxima and conditions explicitly dated and dynamic. No Kazakhstan or CBW campaign eligibility may be inferred without affirmative current evidence.

## Product and rail conclusions

- Spot, margin, futures, options, copy trading and other products may be described as publicly surfaced, not universally available.
- Futures and options have a stronger current licence-scope signal than the package records, but user eligibility still needs account-level controls.
- Freedom Bank and Mastercard guides are valid official documentation; current operational status remains unconfirmed.
- KZT P2P is a visible surface with a regulated route. Named payment-method URLs do not prove active offers or both directions.
- Binance Pay and Wallet Kazakhstan claims remain snippet-limited and should be `UNDER_REVIEW` for current availability.
- The referral offer remains `UNDER_REVIEW`; Kazakhstan and CBW-specific campaign eligibility are unconfirmed.

## Final recommendation

Accept the package into the governed research record only after the append-only correction layer addresses the eight items above. Do not rewrite the captured package in place. Do not authorize import, ranking, CTA, promo, affiliate binding, publication, sitemap, indexability, `master`, production or deployment.

All authorizations remain false.
