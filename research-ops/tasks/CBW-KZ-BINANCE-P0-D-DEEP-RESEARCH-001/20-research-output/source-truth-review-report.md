# Source Truth Review Report

## Scope and checked date

This review covers Binance × Kazakhstan public-source research checked on 2026-07-29 under an official-source-first, no-login, no-account-testing workflow. The package was rebuilt after a hash-mismatch rejection and after explicit Issue #84 deficiency corrections.

## What was corrected in this rerun

The corrected package now adds or normalizes all fields requested in the rejection notice:

- every source record now contains `officialSource`, publication/update date fields or explicit `null`, `checkedDate`, `confidence`, `limitations`, `supportsClaimIds`, `contradictsClaimIds`, `sourceTier`, and `sourceFamily`;
- every material claim now contains `scope`, normalized predicate/value, `verdict`, `confidence`, `verificationState`, effective dates or explicit `null`, a freshness/recheck field, `limitations`, `supportedSourceIds`, and `contradictedSourceIds`;
- the product matrix now includes separate records for staking, copy trading, Launchpad, NFT, Binance Card, and institutional/corporate services;
- search-intent clusters, quick-answer candidates, monitoring policies, and the dated timeline are embedded in `research-run.json`;
- snippet-only records were downgraded from fully verified treatment to clearly partial/snippet-only states.

## Source-truth hierarchy used

This package did not use a universal "highest tier always wins" rule. Instead:

- AFSA/AIFC public registers, AFSA FAQ pages, AIFC legal materials, and Kazakhstan government pages were treated as the strongest sources for licence, legal-route, and regulator-side restriction claims.
- Official Binance support, help, fee, product, and announcement pages were treated as strongest for operational product, KYC, fee, and payment-rail claims.
- GitHub Issue #84 remained the strongest source for the task boundary, authorization floor, owner-input absence, and inline handoff rules.
- Search snippets from official Binance URLs were retained only where the direct current page no longer rendered the underlying content during checking. Those records were explicitly downgraded instead of being treated as fully direct evidence.

## Highest-confidence findings

The strongest current Kazakhstan-specific findings are:

1. BN KZ Technologies Limited is present in the AFSA public register as an active entity, with public registration date 2021-10-07.
2. The current AFSA licence shown in the public register is AFSA-A-LA-2024-0028 effective from 2024-09-25.
3. The current register scope includes Operating a Digital Asset Trading Facility together with additional regulated activities such as dealing, advising, arranging, money services, and custody.
4. AFSA's public FAQ states regulated P2P is permitted on licensed AIFC exchanges and launched in March 2024.
5. Binance publicly documents KZT rails through Freedom Bank and KZT cash withdrawal to Kazakhstan-issued Mastercard cards.
6. Public Kazakhstan-facing Binance surfaces and the app support-region list were reachable on the checked date.

These findings have direct public-register, direct regulator, or direct Binance-support evidence and are suitable for higher-confidence downstream use, provided separation rules are preserved.

## Findings that require caution

Several important items are real but should only be used with caveats:

### Snippet-only Kazakhstan product history

Some Binance Kazakhstan announcement URLs now render generic shells or redirect to generic announcement hubs. Official search results still preserve meaningful snippets for:

- Binance Pay launch in Kazakhstan;
- AlatauCityBank QR integration for Binance Pay;
- March 2025 Kazakhstan product expansion mentioning options, futures copy trading, and derivatives;
- a Kazakhstan-localized historical Launchpad announcement path;
- the 2026 Binance NFT migration/shutdown announcement;
- the November 2025 Binance Wallet full-suite rollout in Kazakhstan.

Those records remain useful discovery-grade official evidence, but they are no longer treated as fully direct page evidence. The relevant sources and claims were downgraded to partial/snippet-only verification states.

### Product visibility is not universal resident eligibility

Kazakhstan-facing public surfaces show futures, copy trading, Simple Earn, Binance Pay, KZT rails, and other products. That does not prove that every Kazakhstan resident, every account type, or every sub-jurisdiction can access every feature under every condition. The package therefore separates:

- technical reachability;
- local authorization;
- public sign-up visibility;
- KYC requirements;
- product surface visibility;
- local payment-rail visibility;
- Kazakhstan-specific legal route;
- offer visibility;
- offer eligibility.

### Referral visibility is not referral eligibility

A public referral offer page is visible and advertises specific value propositions. However:

- the reviewed public note set lists some countries that are restricted from parts of the referral program;
- Kazakhstan was not affirmatively confirmed in those notes;
- no owner-approved CryptoBonusWorld Binance campaign URL or code was supplied;
- account-level verification is prohibited in this task.

For that reason the offer review remains under `UNDER_REVIEW` and below `L3_TERMS_ELIGIBLE`.

## Conflict handling

The main conflicts were not true contradictions between sources so much as scope mismatches:

- AFSA register wording versus visible derivatives surfaces;
- technical reachability versus legal authorization;
- visible referral landing page versus unresolved Kazakhstan eligibility;
- Kazakhstan card cash-out rails versus unconfirmed Binance Card issuance eligibility;
- regulator-side limits versus Binance operational how-to pages;
- direct-page evidence versus snippet-only surviving evidence.

Each of these was resolved in `conflict-resolution.json` without collapsing distinct layers of truth.

## Timeline-use guidance

The timeline intentionally mixes global and Kazakhstan events but labels the area of each event. For downstream use:

- global trust/risk cards should draw from the global events;
- Kazakhstan market-passport chronology should draw from the Kazakhstan-labelled events;
- month-only dates from regulator FAQs should remain month-level or clearly caveated if rendered into prose.

## Monitoring guidance

The monitoring plan should be treated as mandatory if this research is later used for any page, card, ranking, or CTA decision. The most sensitive categories are:

- AFSA register/licence changes;
- Kazakhstan product announcements and payment rails;
- restricted-country and affiliate/referral rule changes;
- fee schedules and retail-limit changes;
- outages, PoR posture changes, or security events.

Referral monitoring should run on a tighter cadence than historical-fact rechecks.

## Final truth-status summary

The corrected package supports the following high-level reading:

- Binance has a current, public, AFSA-licensed Kazakhstan entity with an active licence.
- Kazakhstan-facing public product and payment surfaces are meaningfully developed.
- KZT rails and P2P are materially evidenced.
- Some high-interest product-history items are only partially preserved through official snippets and are marked that way.
- Binance Card eligibility for Kazakhstan is not affirmatively confirmed by the reviewed public card pages.
- Kazakhstan-specific referral eligibility for the visible public offer is not affirmatively confirmed.
- No CBW-specific Binance campaign could be verified because the required owner-approved campaign input was absent.

That is the source-truth position reflected across all eleven files in this corrected inline handoff.
