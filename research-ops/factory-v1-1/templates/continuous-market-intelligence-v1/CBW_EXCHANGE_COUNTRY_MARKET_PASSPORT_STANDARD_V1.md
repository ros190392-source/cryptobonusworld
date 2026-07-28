# CBW Exchange × Country Market Passport Standard V1

> Architecture standard. Defines the complete `Exchange × Country` market passport. Non-production.
> Back to [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).

Normative terms **MUST**, **MUST NOT**, **SHOULD**, **MAY** apply. Field-level structures are defined
in [the data schema](../../schemas/continuous-market-intelligence-v1/CBW_MARKET_INTELLIGENCE_DATA_SCHEMA_V1.json)
and [the claim/evidence/freshness model](../../schemas/continuous-market-intelligence-v1/CBW_CLAIM_EVIDENCE_FRESHNESS_MODEL_V1.json).

## 1. Global exchange core vs country market profile

- **Exchange core (GLOBAL ownership)** owns worldwide facts: legal entities, leadership, global
  history, proof-of-reserves posture and global security incidents. Stored **once**.
- **Country market profile (MARKET ownership)** owns country-scoped facts: legal availability, local
  authorization, warnings, registration, KYC, per-product availability, payment rails, fees, limits,
  restrictions and the local affiliate offer.
- A market profile **MUST NOT** duplicate global facts; it references the exchange core. Global
  records **MUST NOT** absorb market-specific facts.

## 2. Required passport sections

Every passport **MUST** define, each backed by a `Claim` with confidence, freshness, limitations and
effective dates:

1. **Legal entities, leadership, global history** (core).
2. **Country legal availability**, local authorization status and official warnings.
3. **Registration and KYC** (levels, documents, conditional eligibility).
4. **Per-product availability** (`SPOT`, `MARGIN`, `FUTURES`, `OPTIONS`, `EARN`, `P2P`, `CARD`, `CONVERT`, `STAKING`).
5. **P2P and direct fiat / payment rails** (type, direction, currency, status).
6. **Fees and limits as timestamped snapshots** (never a single mutable "current" value).
7. **Security incidents, proof-of-reserves and outages**.
8. **Restrictions and sanctions**.
9. **Affiliate / referral offer status** (see [affiliate standard](./CBW_AFFILIATE_OFFER_VERIFICATION_STANDARD_V1.md)).

## 3. Confidence, freshness, limitations

- Each claim carries `confidence` (`HIGH`/`MEDIUM`/`LOW`/`UNVERIFIED`) and `freshnessState`
  (`FRESH`/`AGING`/`STALE`/`EXPIRED`).
- A `LOW` or `UNVERIFIED` claim **MUST** state its `limitations`.
- Critical claims (regulatory, security, sanctions, restrictions) that become `STALE`/`EXPIRED`
  **MUST** trigger the publication-suppression rules in section 8.

## 4. Public presentation surfaces

- **Public market-facts table:** required vs optional fields (section 6), each cell bound to a claim
  and showing a freshness/evidence indicator.
- **Direct answer block:** a short, answer-first summary of the single most-asked question for the
  market (e.g. "Is <exchange> available in <country>?"), bound to the governing claim.
- **Market timeline:** ordered history events with dates and evidence.
- **Source methodology and visible change history:** how facts were gathered and when they changed.
- **Compact Top-10 card contract:** see section 7.

## 5. Required vs optional fields

- **Required (MUST be present or explicitly `UNKNOWN` with limitations):** market status, legal
  availability, registration eligibility, KYC level, at least one payment rail assessment, restriction
  summary, affiliate offer status, overall confidence, freshness state.
- **Optional (MAY be omitted when no evidence exists):** granular fee snapshots, individual product
  rows beyond the core set, historical outages older than the retention window.

## 6. Fees and limits as snapshots

Fee and limit values **MUST** be stored as `FeeSnapshot` / `LimitSnapshot` rows with `observedAt` and
an evidence claim. The passport renders the latest snapshot with its capture date and **MUST NOT**
present a fee as a permanent guarantee.

## 7. Compact Top-10 card contract

The compact card used in country Top-10 lists **MUST** contain exactly these claim-bound fields and
nothing unbound:

| Card field | Bound to |
| --- | --- |
| Exchange name + logo | Exchange core identity |
| Availability badge | market `RegulatoryStatus` / market status claim |
| KYC badge | `KycRequirement` claim |
| Top payment rail | highest-confidence `PaymentRail` claim |
| Offer label ("up to …") | affiliate `OfferSnapshot` (L2+ only) |
| Freshness indicator | market profile `freshnessState` |
| CTA | affiliate `CTAState` (owner-gated) |

Ranking position and Top-10 membership are **owner-gated** (`RankingSnapshot.ownerApprovedRankingChange`)
and **MUST NOT** be changed autonomously. Full card typography lives in
[the SEO standard](./CBW_SEO_QUICK_ANSWER_AND_SEARCH_INTENT_STANDARD_V1.md).

## 8. Publication suppression rules

A passport surface **MUST** suppress or degrade a claim when any hold:

- the claim is critical and `STALE`/`EXPIRED`;
- an `OPEN` conflict exists on the claim;
- the claim has no non-contradicted supporting evidence (confidence would exceed `LOW`);
- the affiliate offer is `BROKEN_LINK`, `SUSPENDED` or `GEO_RESTRICTED` (CTA suppressed).

Suppression replaces the value with an explicit "under review" state rather than showing a stale or
unsupported critical fact. Suppression bindings are defined in
[the publication binding model](../../schemas/continuous-market-intelligence-v1/CBW_PUBLICATION_BINDING_MODEL_V1.json).

## 9. Scaling to new countries

A new market profile reuses the exchange core and adds only country-scoped claims plus
source-dependency edges. See [source monitoring](./CBW_SOURCE_MONITORING_STANDARD_V1.md) and the
[implementation roadmap](./CBW_IMPLEMENTATION_ROADMAP_V1.md).
