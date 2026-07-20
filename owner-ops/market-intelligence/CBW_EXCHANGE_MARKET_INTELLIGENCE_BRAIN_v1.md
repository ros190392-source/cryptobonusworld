# CryptoBonusWorld — Exchange Market Intelligence Brain v1

**Status:** Proposed owner authority
**Baseline:** July 2026
**Scope:** Restrictions, availability, fees, regulator events, source evidence, monitoring, decision outputs, ranking/CTA eligibility, and change history for ~200 exchanges across all supported countries.

---

## 1. Goal

Create one logical source of truth that can answer:

- Is exchange X available in country Y?
- Can a resident register and pass KYC?
- Which products are available?
- Which products are restricted?
- Is P2P available?
- Is local fiat/card/bank support available?
- Is the app available?
- Is the promo/CTA eligible?
- What fees apply?
- What official evidence supports the conclusion?
- When was the fact checked?
- Did anything change recently?
- What alternatives are available locally?

This system is the decision brain for:

- Homepage GEO rankings;
- Country Hubs;
- Country × Exchange Deep Passports;
- comparisons;
- restricted states;
- alternatives;
- monitoring;
- publication gates.

---

## 2. One logical brain, not one hand-edited mega-file

The owner wants one place where all restrictions can be queried.

Implement this as:

```text
source records
→ validated normalized cells
→ event/change ledger
→ generated compiled matrix
→ decision engine
→ page/ranking consumers
```

Recommended physical structure:

```text
data/market-intelligence/
  identities/
  sources/
  events/
  cells/
    by-exchange/
    by-country/
  fees/
  compiled/
    exchange-market-matrix.json
    exchange-market-index.json
    current-decisions.json
```

`exchange-market-matrix.json` is generated, never manually edited.

This gives one queryable master view without making one fragile 200×195 hand-maintained file.

---

## 3. Core dimensions

Every decision is keyed by:

```text
exchangeId
marketCountryCode
residentCountryCode
exchangeLegalEntity
product
userType
```

Important distinctions:

- IP location is not legal residence.
- Citizenship is not the same as residence.
- Exchange availability may depend on legal entity.
- A website loading does not prove registration eligibility.
- One product may be available while another is restricted.

---

## 4. Canonical statuses

```text
AVAILABLE
AVAILABLE_WITH_LIMITS
RESTRICTED
UNAVAILABLE
UNDER_REVIEW
CONFLICTING
UNKNOWN
STALE
```

### Product-level statuses

Track independently:

- registration;
- KYC;
- spot;
- derivatives;
- margin;
- options;
- P2P;
- local fiat deposit;
- bank transfer;
- card purchase;
- local fiat withdrawal;
- Earn/staking;
- loans;
- copy trading;
- bots;
- API;
- app availability;
- customer support;
- promo eligibility;
- CTA eligibility.

Do not collapse all of this into one yes/no field.

---

## 5. Canonical decision outputs

Each normalized country × exchange decision must output:

```text
overallAvailability
registrationStatus
productStatuses
rankingEligibility
ctaEligibility
promoEligibility
confidence
freshness
checkedDate
nextReviewDate
reasonCodes
limitations
sourceIds
conflictIds
alternativeExchangeIds
```

### Ranking eligibility

Eligible only when:

- status is `AVAILABLE` or approved `AVAILABLE_WITH_LIMITS`;
- confidence meets threshold;
- evidence is fresh enough;
- no unresolved critical conflict;
- no safety override;
- no affiliate influence.

### CTA eligibility

CTA is allowed only when:

- registration is eligible;
- the active product/offer is eligible;
- no restriction or unresolved critical conflict;
- affiliate route is authoritative;
- offer is not stale.

Restricted exchanges:

- no promo code;
- no commercial CTA;
- show alternatives.

---

## 6. Reason codes

Use machine-readable reasons:

```text
REGISTRATION_BLOCKED
NEW_USERS_BLOCKED
RESIDENTS_EXCLUDED
ENTITY_NOT_SERVING_MARKET
KYC_NOT_SUPPORTED
DERIVATIVES_PROHIBITED
P2P_UNAVAILABLE
LOCAL_FIAT_UNAVAILABLE
APP_NOT_AVAILABLE
SANCTIONS_RESTRICTION
REGULATOR_WARNING
REGULATOR_BAN
LICENSE_MISSING
LICENSE_LIMITED_SCOPE
TERMS_CONFLICT
SOURCE_CONFLICT
FEE_SOURCE_STALE
OFFER_NOT_LOCAL_VERIFIED
UNKNOWN_LIVE_STATE
```

Reason codes drive UI copy, monitoring, and alternatives.

---

## 7. Source hierarchy

### Tier A — Binding primary

- regulator notices;
- official licensing/registration databases;
- official sanctions sources;
- exchange terms;
- exchange restricted-jurisdiction pages;
- official support/help pages;
- official fee schedules;
- official product pages;
- official app-store listings;
- official exchange announcements.

### Tier B — Strong supporting

- official banks/payment rails;
- official payment-provider documentation;
- official court/government publications;
- audited/attested documents;
- exchange legal-entity filings.

### Tier C — Reputable news

Use for:

- event discovery;
- enforcement discovery;
- terms-change discovery;
- incident chronology.

News alone must not establish a critical availability decision when primary confirmation can be obtained.

### Tier D — Community

Use only for discovery and recurring usability signals.

Never use community posts alone to establish:

- legality;
- country availability;
- licensing;
- sanctions;
- restricted status;
- fees.

---

## 8. Evidence record

Every source record stores:

```text
sourceId
exchangeId
countryCode
productScope
claimType
url
sourceTier
publisher
title
publishedDate
updatedDate
retrievedDate
effectiveFrom
effectiveTo
language
contentHash
evidenceSummary
quotedClaim
captureType
status
```

Capture types:

```text
HTML
PDF
SCREENSHOT
API
DATASET
MANUAL_BROWSER
NEWS
```

Do not store long copyrighted text. Store short evidence excerpts and structured summaries.

---

## 9. Restriction event ledger

Every material change becomes an event:

```text
eventId
exchangeId
countryCode
eventType
productScope
detectedDate
effectiveDate
previousState
newState
sourceIds
confidence
reviewStatus
affectedCells
affectedPages
```

Event types:

```text
REGISTRATION_OPENED
REGISTRATION_CLOSED
PRODUCT_RESTRICTED
PRODUCT_RESTORED
LICENSE_GRANTED
LICENSE_REVOKED
REGULATOR_WARNING
REGULATOR_BAN
TERMS_CHANGED
FEE_CHANGED
P2P_CHANGED
FIAT_METHOD_CHANGED
APP_AVAILABILITY_CHANGED
OFFER_CHANGED
SANCTIONS_CHANGED
INCIDENT
```

The event ledger is append-only.

---

## 10. Fee intelligence

Fees are related but must not be mixed into a single misleading number.

Track:

- spot maker;
- spot taker;
- derivatives maker;
- derivatives taker;
- VIP tiers;
- deposit fee;
- withdrawal/network fee;
- card fee;
- bank fee;
- P2P platform fee;
- spread;
- third-party provider cost;
- inactivity/account fee;
- minimums;
- limits;
- source;
- checked date;
- market applicability.

Every fee fact has:

```text
feeType
value
unit
tier
market
product
effectiveDate
sourceId
checkedDate
freshness
```

---

## 11. Monitoring system

Separate monitors:

### M1 — Restricted regions and terms

Watch:

- terms;
- restricted jurisdictions;
- residency exclusions;
- product restrictions;
- legal-entity changes.

### M2 — Regulator and sanctions

Watch:

- regulator databases;
- warning lists;
- bans;
- license changes;
- enforcement;
- sanctions updates.

### M3 — Fees and limits

Watch:

- fee pages;
- VIP schedules;
- card/bank/P2P fees;
- withdrawal fees;
- limits.

### M4 — Product and local rails

Watch:

- P2P;
- local currency;
- cards;
- bank transfers;
- payment providers;
- apps.

### M5 — News event discovery

Watch reputable news for:

- new bans;
- enforcement;
- exits;
- market entries;
- major terms changes;
- incidents.

News creates a review task, not an automatic final decision.

---

## 12. Refresh policy

### Critical — 3 to 7 days

- registration;
- sanctions;
- regulator bans;
- new-user restrictions;
- derivatives;
- P2P;
- CTA eligibility;
- offer eligibility.

### High — 7 to 14 days

- local fiat;
- apps;
- cards/banks;
- fee changes;
- product access.

### Medium — 30 days

- support language;
- limits;
- noncritical product details.

### Slow — 90 days

- founding facts;
- static company profile;
- historical background.

A fact becomes `STALE` when its freshness window is exceeded.

---

## 13. Conflict handling

When official sources disagree:

```text
status = CONFLICTING
ctaEligibility = false
rankingEligibility = false
```

Store:

- conflicting source IDs;
- exact disagreement;
- most recent source;
- source authority comparison;
- manual review owner;
- next review date.

Never silently choose the commercially convenient source.

---

## 14. Deep Research package

Deep Research must return structured files:

```text
research-run.json
exchange-universe.json
country-exchange-cells.json
source-registry.json
claim-ledger.json
restriction-events.json
fee-records.json
conflicts.json
ranking-candidates.json
publication-blockers.json
monitoring-targets.json
research-report.md
```

The Markdown report summarizes the run. The JSON files drive the product.

---

## 15. Example country research output

For Nigeria:

```text
Top verified recommendations: 5
Other verified available: 10–20
Available with limits: N
Under review/conflicting: N
Restricted/unavailable: N
```

For every exchange:

- availability;
- product statuses;
- local fiat/P2P;
- fees;
- reason codes;
- checked date;
- confidence;
- source IDs;
- CTA eligibility;
- alternatives.

Do not invent findings in architecture prototypes.

---

## 16. Decision engine

Input:

```text
exchange identity
country profile
country × exchange cell
source registry
event ledger
fee records
offer registry
freshness policy
safety overrides
```

Output:

```text
homepage group
ranking eligibility
rank inputs
availability badge
CTA state
promo state
passport verdict
limitations
alternatives
recheck priority
```

The engine must be deterministic and testable.

---

## 17. Page behavior

### Homepage

- recommend only eligible exchanges;
- honest Top 5;
- other available below;
- limited below;
- under review below;
- restricted at end.

### Exchange page

Show:

```text
Available in Nigeria 🇳🇬
Available with limits in Türkiye 🇹🇷
Restricted in Canada 🇨🇦
```

Include checked date, confidence, reasons, products, and alternatives.

### Comparison

Compare the same active market.

Do not compare a market-eligible exchange against a restricted one as if both were equally available.

---

## 18. Automation boundary

Automation may:

- fetch approved public sources;
- detect content changes;
- calculate hashes;
- create proposed events;
- propose normalized cell changes;
- flag affected pages;
- generate a draft report or PR.

Automation may not:

- silently change ranking;
- publish;
- deploy;
- change affiliate facts;
- create legal conclusions;
- mark a restriction resolved;
- activate a CTA;
- overwrite owner-approved standards.

Lifecycle:

```text
monitor
→ detect
→ evidence capture
→ normalize
→ conflict check
→ proposed decision
→ council review
→ owner approval
→ repository update
→ preview QA
→ controlled publication
```

---

## 19. No-proxy rule

Do not depend on:

- VPN;
- residential proxy;
- account creation;
- KYC automation;
- bypassing regional controls.

Use:

- official regulator sources;
- exchange terms/help/product/fee pages;
- official apps;
- banks/payment rails;
- reputable news discovery;
- normal browser evidence;
- Deep Research.

If local live behavior cannot be verified:

```text
NOT_LIVE_VERIFIED
UNKNOWN
```

This does not block research, but it must remain visible.

---

## 20. Storage recommendation

Recommended source-of-truth files:

```text
schemas/market-intelligence/
  exchange-market-cell.schema.json
  market-source.schema.json
  restriction-event.schema.json
  fee-record.schema.json
  compiled-matrix.schema.json

data/market-intelligence/
  identities/
  sources/
  events/
  cells/
  fees/
  conflicts/
  compiled/

owner-ops/market-intelligence/
  CBW_EXCHANGE_MARKET_INTELLIGENCE_BRAIN_v1.md
  refresh-policy.json
  reason-codes.json
  source-authority-policy.json
```

---

## 21. Publication gates

Use G01–G13 plus:

```text
MI01 Source identity valid
MI02 Product-level status complete
MI03 Critical conflicts resolved or visible
MI04 Freshness valid
MI05 CTA eligibility validated
MI06 Ranking eligibility validated
MI07 Alternatives valid
MI08 Event history recorded
MI09 Fee applicability validated
MI10 Owner approval
```

---

## 22. Current implementation order

```text
MI0 Architecture standard
MI1 Schemas and reason codes
MI2 Source registry
MI3 Event ledger
MI4 Cell normalization
MI5 Compiled matrix generator
MI6 Decision engine
MI7 Deep Research importer
MI8 Monitoring prototype
MI9 First country pilot
MI10 Multi-country waves
MI11 Continuous change intelligence
```
