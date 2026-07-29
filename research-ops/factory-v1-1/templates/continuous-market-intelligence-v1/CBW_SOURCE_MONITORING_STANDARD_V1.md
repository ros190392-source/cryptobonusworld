# CBW Source Monitoring Standard V1

> Architecture standard for dependency-based source monitoring. Non-production. **Owner Audit
> Correction 026:** complete sub-day SLA matrix; claim-type source authority; separate source-health
> vocabulary. Back to [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).
> Data structures: [source registry/monitoring model](../../schemas/continuous-market-intelligence-v1/CBW_SOURCE_REGISTRY_AND_MONITORING_MODEL_V1.json).

## 1. Source registry and families

Sources are registered with a **family**: `OFFICIAL_PRIMARY`, `REGULATOR_LEGAL`, `OFFICIAL_PARTNER`,
`REPUTABLE_SECONDARY`, `COMMUNITY_SIGNAL`. Families classify sources; **authority is claim-type
specific** (section 5), not a universal tier ranking.

## 2. Fetch modes

`HTML`, `PDF`, `RSS`, `API`, `REGULATOR_REGISTER`. Fetching is honest and identifiable, uses
conditional requests (ETag / If-Modified-Since), and **MUST** respect robots, rate limits and
`Retry-After`. No proxy, no identity spoofing, no credential submission.

## 3. Snapshot and hash policy

Every fetch stores an immutable snapshot with a SHA-256 content hash and timestamp in the evidence
object store. Identical hash → no new claim version.

## 4. Change classification and materiality

Changes are classified `NONE`, `MINOR`, `MODERATE`, `MAJOR`, `CRITICAL`. `MAJOR`/`CRITICAL` **MUST**
emit a `ChangeEvent`
([change/impact model](../../schemas/continuous-market-intelligence-v1/CBW_CHANGE_EVENT_AND_IMPACT_MODEL_V1.json)).

## 5. Claim-type source authority

Conflict resolution uses a **predicate-specific** authority matrix (see the claim/evidence model):
regulator/legal sources govern legal/regulatory claims; official exchange documents govern
product/fee/KYC claims; the supplying bank/provider governs its payment rail; security incidents need
official notice plus independent reporting; market context uses reputable secondary sources; community
reports are leads until corroborated. There is **no** universal "higher tier always wins" rule. All
evidence is retained; an unresolved critical conflict yields task outcome `CONFLICT_UNRESOLVED`.

## 6. Monitoring SLA matrix (sub-day supported)

Intervals are ISO-8601 durations (e.g. `PT1H`, `PT6H`, `P3D`); overrides per source allowed.

| Category | Default | Critical |
| --- | --- | --- |
| Outage / security incident feeds | `PT1H` | `PT1H` + event-driven alert |
| Restricted-country lists | `P1D` | `PT6H` after incident/regulatory alert |
| Affiliate redirect | `PT12H` (6–24h) | `PT6H` after failure/change |
| Affiliate landing / terms | `P1D` | `PT6H`–`PT12H` after change |
| P2P / payment rails | `P1D` | `PT6H`–`PT12H` after incident |
| Product availability | `P3D` | `P1D` |
| Fees / limits | `P2D` (1–3d) | `P1D` after detected change |
| KYC | `P7D` | `P1D` after terms/compliance change |
| License register | `P7D` | `P1D` during review/event |
| Regulator news | `P1D` | event / RSS polling as available |
| Historical facts | `P30D` / event-driven | event-driven |

## 7. Dependency graph and fan-out

`SourceDependency` edges connect each source to dependent claims, market profiles and publication
bindings; one changed source fans out only to its dependents.

## 8. Robots/ToS, rate limits, blocking

A source with `robotsAllowed=false` or health `BLOCKED` **MUST NOT** be fetched. On 429/`Retry-After`
the fetcher backs off; repeated blocks mark it `BLOCKED` and alert.

## 9. Source health and unavailability

Health uses `HEALTHY`, `DEGRADED`, `UNAVAILABLE`, `BLOCKED`, `RETIRED`. A source `UNAVAILABLE` beyond
its threshold **MUST** mark dependent claims for freshness review and may yield task outcome
`SOURCE_UNAVAILABLE`; it **MUST NOT** silently keep a claim `FRESH`.

## 10. Duplicate source resolution

Two entries resolving to identical content → keep the correct claim-type authority family, retire the
other with a pointer; evidence is never double-counted.

## 11. Alert severities and escalation

`INFO`, `WARNING`, `HIGH`, `CRITICAL`. `CRITICAL` alerts on official/regulator sources escalate
immediately and can trigger publication suppression on dependent critical claims.

## 12. Worked examples

Global restricted list (`OFFICIAL_PRIMARY`, `CRITICAL`); Kazakhstan regulator register event
(`REGULATOR_LEGAL`, `CRITICAL`); affiliate landing/terms change (`REPUTABLE_SECONDARY`, `MODERATE` →
offer `UNDER_REVIEW`, CTA `UNDER_REVIEW`); outage/security feed (`OFFICIAL_PRIMARY`, `CRITICAL`,
hourly); P2P/payment-rail incident (`OFFICIAL_PARTNER`, `MAJOR`).
