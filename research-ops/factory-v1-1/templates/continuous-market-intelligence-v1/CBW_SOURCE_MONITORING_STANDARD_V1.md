# CBW Source Monitoring Standard V1

> Architecture standard for dependency-based source monitoring. Non-production.
> Back to [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).
> Data structures: [source registry/monitoring model](../../schemas/continuous-market-intelligence-v1/CBW_SOURCE_REGISTRY_AND_MONITORING_MODEL_V1.json).

## 1. Source registry and tiers

Every source is registered with an identity and a **tier**: `TIER_0_OFFICIAL`, `TIER_1_REGULATOR`,
`TIER_2_REPUTABLE`, `TIER_3_COMMUNITY`, `TIER_4_UNVERIFIED`. Higher tiers override lower tiers in
conflict resolution. Regulator and official sources are `scope: MARKET` or cross-exchange as
appropriate.

## 2. Fetch modes

Supported fetch modes: `HTML`, `PDF`, `RSS`, `API`, `REGULATOR_REGISTER`. Fetching is honest and
identifiable (a truthful bot user-agent), uses conditional requests (ETag / If-Modified-Since), and
**MUST** respect robots, rate limits and `Retry-After`.

## 3. Snapshot and hash policy

Every fetch stores an immutable snapshot with a SHA-256 content hash and a timestamp in the evidence
object store. Unchanged content (`NOT_MODIFIED` / identical hash) does not create a new claim version.

## 4. Normalized extraction targets

Each source has a `ParserProfile` mapping raw content to normalized extraction targets tied to a claim
predicate (regulatory status, license, restriction, registration, KYC, product, payment, fee, limit,
security, affiliate offer).

## 5. Change classification and materiality

A detected content change is classified by materiality: `NONE`, `MINOR`, `MODERATE`, `MAJOR`,
`CRITICAL`. `MAJOR`/`CRITICAL` changes **MUST** emit a `ChangeEvent`
([change/impact model](../../schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json)).

## 6. Monitoring frequencies

Frequencies come from each source's `SchedulePolicy`: a base interval and a shorter critical interval,
with jitter. Examples: regulator register — base 14 days / critical 3 days; affiliate landing — base 3
days / critical 1 day. Freshness rechecks are additionally scheduled by claim
[freshness policy](../../schemas/continuous-market-intelligence-v1/CBW_CLAIM_EVIDENCE_FRESHNESS_MODEL_V1.json).

## 7. Dependency graph and fan-out

`SourceDependency` edges connect each source to the claims, market profiles and publication bindings
that depend on it. One changed source **MUST** fan out only to its dependents — this is what lets the
platform scale without full daily re-research.

## 8. Source removal, blocking, robots/ToS, rate limits

- A source with `robotsAllowed=false` or health `BLOCKED` **MUST NOT** be fetched.
- On HTTP 429 / `Retry-After`, the fetcher backs off; repeated blocks mark the source `BLOCKED` and
  raise an alert.
- Retired or duplicate sources are marked `RETIRED` with a pointer to the surviving source.

## 9. Duplicate source resolution

When two entries resolve to identical canonical content, keep the higher tier and retire the other;
evidence **MUST NOT** be double-counted.

## 10. Stale-source and unavailable-source handling

A source that is `UNAVAILABLE` beyond its failure threshold **MUST** mark its dependent claims for
freshness review — the platform **MUST NOT** silently keep a claim `FRESH` when its source can no
longer be observed.

## 11. Alert severities and escalation

Alerts use `INFO`, `WARNING`, `HIGH`, `CRITICAL`. `CRITICAL` alerts on regulator/official sources
escalate immediately and can trigger publication suppression on dependent critical claims.

## 12. Worked examples

1. **Global restricted list** (`TIER_0_OFFICIAL`): a new country added to a restricted list is a
   `CRITICAL` change → emits a ChangeEvent → fans out to that market profile's availability claim →
   publication suppression until re-verified.
2. **Kazakhstan regulator event** (`TIER_1_REGULATOR`): a register status change is `CRITICAL` → the
   `RegulatoryStatus` claim is contradicted → binding moves to `SUPPRESSED` pending owner review.
3. **Affiliate landing-page change** (`TIER_2_REPUTABLE`): an offer headline change is `MODERATE` →
   `OfferSnapshot` status `CHANGED` → CTA `UNDER_REVIEW` until re-captured
   ([affiliate standard](./CBW_AFFILIATE_OFFER_VERIFICATION_STANDARD_V1.md)).
