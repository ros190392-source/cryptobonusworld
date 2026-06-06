# CryptoBonusWorld — Exchange Availability & Restricted Countries Watcher

**Version:** 1.0
**Created:** 2026-06-06
**Sprint:** Sprint 05
**Status:** ACTIVE — governance document for exchange availability monitoring
**Owner:** ROLE 0 — Chief Project Owner
**Roles:** ROLE 36 (Watcher), ROLE 30 (Legal), ROLE 11 (Compliance), ROLE 25 (Freshness), ROLE 0 (Owner)

> Exchange availability claims — "Binance does not serve users in X, Y, Z" — are among the most
> legally sensitive and freshness-critical claims on any crypto affiliate site. A country added
> to a restricted list one month may not be reflected on pages that were written a year ago.
> This document defines the governance system, data model, monitoring logic, and safety gates
> that protect CryptoBonusWorld from publishing stale or unsupported availability claims.

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope — Exchanges Covered](#2-scope)
3. [Source Hierarchy](#3-source-hierarchy)
4. [Daily Watcher Logic](#4-daily-watcher-logic)
5. [No-Autopublish Rule](#5-no-autopublish-rule)
6. [Data Model](#6-data-model)
7. [Report Format](#7-report-format)
8. [Page Integration](#8-page-integration)
9. [Binance Pilot Plan](#9-binance-pilot-plan)
10. [Automation Schedule](#10-automation-schedule)
11. [QA / Safety Gates](#11-qa-safety-gates)
12. [Integration with War Room Roles](#12-war-room-integration)

---

## 1. Purpose

Availability and restricted-country claims are **freshness-sensitive legal assertions** — not
static editorial copy. They change without announcement, they carry compliance risk if wrong,
and they directly affect user trust and potential legal exposure.

The CryptoBonusWorld Availability Watcher exists to:

1. **Track official exchange sources** for restricted country and service availability changes.
2. **Detect changes** before they become stale claims on live pages.
3. **Alert the project owner** so a human with compliance authority can decide how to respond.
4. **Propose content update tasks** — never apply them autonomously.
5. **Maintain a dated, sourced baseline** so every country claim on any page can be traced to
   a specific official source and a specific verification date.

### Why this cannot be skipped

A page that says "Binance is available in Russia" when Binance has restricted Russian users is:
- A misleading claim under most affiliate program terms
- A potential compliance risk under GDPR / local ad standards
- A trust-destroying error when a user follows a referral link and finds they cannot register

The watcher closes this gap with a daily automated scan + human review + approval gate.

---

## 2. Scope — Exchanges Covered

### Phase 1 — Pilot (Binance)

| Exchange | Priority | Primary source URL category | Status |
|----------|----------|----------------------------|--------|
| Binance | P0 | Legal / Terms / Restricted Locations page | **PILOT** |

### Phase 2 — Expansion (after Pilot validated)

| Exchange | Priority | Notes |
|----------|----------|-------|
| Bybit | P1 | Official Terms of Service + Support FAQ |
| OKX | P1 | Official Legal / Compliance pages |
| MEXC | P1 | Official Terms + Support |
| Bitget | P2 | Terms of Service |
| BingX | P2 | Terms of Service |
| Gate.io | P2 | Terms / Legal Hub |
| KuCoin | P2 | Terms of Service + Restricted Users FAQ |
| HTX (Huobi) | P2 | Terms of Service + Compliance notices |
| CoinEx | P3 | Terms of Service |
| Phemex | P3 | Terms + Support FAQ |
| Bitunix | P3 | Terms |
| LBank | P3 | Terms |
| Coinbase | P3 | Different regulatory model — US-licensed, country-specific pages |

### Expansion trigger

Phase 2 begins when:
- Binance pilot runs successfully for ≥ 2 weeks
- Owner approves expansion to the next exchange
- Source URLs are verified manually per Section 9 protocol

---

## 3. Source Hierarchy

All claims about exchange availability **must be traced to a source in the hierarchy below**.
Lower priority sources may trigger a flag but never a content update on their own.

| Priority | Source type | Use |
|----------|-------------|-----|
| **P0** | Official exchange Legal / Terms of Service / Restricted Locations page | Single source of truth; required for any country claim |
| **P0** | Official exchange Support FAQ / Help Center article on restricted countries | Secondary confirmation; must agree with ToS |
| **P0** | Official exchange announcement about service availability changes | Authoritative for detected changes |
| **P1** | Official regulator notices (FCA, FinCEN, MAS, etc.) naming the exchange | Strong signal; triggers manual review and source escalation |
| **P2** | Reputable news: Reuters, Bloomberg, CoinDesk, Decrypt — regulatory action reporting | Signal only; requires P0 confirmation before content update |
| **P3** | Third-party country lists, Wikipedia, aggregators | Weak signal only; cannot be used as a content source |

### Source rules

- **P0 source required for every country claim** on any live page.
- If the P0 source is temporarily unavailable (503, redirect, paywalled), the watcher marks
  the snapshot as `source_unavailable` and creates a manual review task — it does NOT retain
  the previous list as confirmed.
- If a P0 source content changes, the watcher creates a change-detected report and a
  suggested content update task. The task requires ROLE 0 approval before implementation.
- **P3 sources may never appear in page copy or evidence fields.**

---

## 4. Daily Watcher Logic

The watcher runs once per day. Each run follows this sequence:

```
Step 1 — Fetch source URLs
  For each exchange in scope:
    - Fetch each registered P0 source URL
    - Save raw HTML snapshot to snapshots/{exchange}/YYYY-MM-DD/
    - Record HTTP status, redirect chain, final URL, content hash
    - If HTTP error: log source_unavailable, create alert

Step 2 — Extract availability claims
  Parse or summarise the fetched page content:
    - Extract country names / ISO codes mentioned as restricted or unavailable
    - Extract product restrictions (e.g. "P2P not available in X")
    - Extract wording of key availability statements
    - Record extraction confidence (high / medium / low / failed)

Step 3 — Compare with previous snapshot
  Load most recent previous successful snapshot:
    - Compare country list: new entries = country_added / removed entries = country_removed
    - Compare product restriction wording: wording_changed / product_restriction_changed
    - Compare content hash: if identical → no_change; if different → parse differences

Step 4 — Classify the run
  If no_change on all sources:
    - Report: low_priority
    - Log result only; no owner notification

  If any change detected:
    - Report: review_required
    - Create: reports/exchange-availability-watch-{YYYY-MM-DD}.md
    - Create: reports/exchange-availability-watch-{YYYY-MM-DD}.json
    - Notify owner (Telegram / email as configured)
    - Create suggested_task: content update proposal with source citation

  If source_unavailable:
    - Report: review_required
    - Do NOT confirm previous country list as still valid
    - Create alert for manual source re-check

Step 5 — Archive
  Move previous day snapshot to archive/
  Retain snapshots for 90 days minimum
```

### Change event types

| Event | Definition | Severity |
|-------|-----------|---------|
| `country_added` | A country newly appears in the restricted list | HIGH — compliance risk |
| `country_removed` | A country is removed from the restricted list (service restored) | MEDIUM — opportunity |
| `wording_changed` | Restriction wording changed without country list change | MEDIUM — legal review needed |
| `product_restriction_changed` | A specific product (e.g. P2P, spot, derivatives) restricted or restored in a region | HIGH |
| `source_unavailable` | Source URL returned error or redirect to unrelated page | HIGH — cannot confirm list |
| `no_change` | Content hash identical to previous snapshot | LOW — logged only |

---

## 5. No-Autopublish Rule

The availability watcher **is a monitoring and alerting system only**.

It **must not**:
- Directly edit `src/data/exchanges.json`
- Directly edit `src/data/evidence/*.json`
- Directly edit any exchange page copy
- Directly modify `src/data/exchange-availability/*.json` without approval
- Publish a page update based solely on a detected change

It **may**:
- Create reports in `reports/`
- Create suggested task documents
- Update `src/data/exchange-availability/*.json` **only after ROLE 0 explicit approval**
  recorded in a named sprint task
- Notify the project owner via configured channels

### Approval chain for content updates

```
Watcher detects change
    ↓
Change report created in reports/
    ↓
ROLE 30 (Legal / Terms Watcher) reviews source citation
    ↓
ROLE 11 (Compliance / Risk Lead) assesses risk level
    ↓
ROLE 25 (Freshness / Update Editor) identifies affected pages
    ↓
ROLE 0 (Chief Project Owner) approves specific content update tasks
    ↓
Sprint task created → standard pipeline → build → QA → deploy
```

No step in this chain can be skipped. The watcher cannot bypass ROLE 0 approval.

---

## 6. Data Model

### File location

```
src/data/exchange-availability/{exchange}.json
```

Example: `src/data/exchange-availability/binance.json`

### Schema

```json
{
  "exchange": "binance",
  "lastChecked": "2026-06-06",
  "lastCheckStatus": "confirmed | source_unavailable | change_detected | pending_manual_review",
  "sourceUrls": [
    {
      "url": "https://www.binance.com/en/legal/restricted-locations",
      "priority": "P0",
      "lastFetched": "2026-06-06",
      "httpStatus": 200,
      "contentHashShort": "a3f7...",
      "notes": ""
    }
  ],
  "restrictedCountries": {
    "status": "manual_review_required | confirmed | unverified",
    "confidence": "high | medium | low",
    "lastManualReview": "2026-06-06",
    "reviewedBy": "ROLE 0",
    "list": [
      {
        "country": "",
        "isoCode": "",
        "restriction": "full | partial | product_specific",
        "sourceUrl": "",
        "sourceDate": "",
        "notes": ""
      }
    ]
  },
  "partialRestrictions": {
    "status": "manual_review_required | confirmed | unverified",
    "list": []
  },
  "productRestrictions": {
    "status": "manual_review_required | confirmed | unverified",
    "list": [
      {
        "product": "P2P | spot | derivatives | staking | earn | NFT",
        "affectedRegions": [],
        "notes": ""
      }
    ]
  },
  "geoNotes": "",
  "manualReviewRequired": true,
  "changedSinceLastCheck": false,
  "lastChangeSummary": "",
  "pageIntegration": {
    "exchangePage": true,
    "bonusPage": false,
    "faqBlock": true,
    "riskDisclaimerBlock": true,
    "countryPages": []
  }
}
```

### Field rules

| Field | Rule |
|-------|------|
| `lastChecked` | Updated every successful watcher run, even if `no_change` |
| `confidence` | `high` requires at least one confirmed P0 source fetch; `low` means extraction was ambiguous |
| `manualReviewRequired` | Set to `true` by watcher whenever `source_unavailable` or `change_detected`; cleared only by ROLE 0 |
| `changedSinceLastCheck` | `true` until ROLE 0 reviews and either approves a content update or marks as reviewed-no-action |
| `list[].sourceUrl` | Must be a real P0 URL — never a P3 aggregator |
| `list[].sourceDate` | Date the source content was captured, not the date of the restriction |

### Creating the data file

`src/data/exchange-availability/binance.json` must **not** be created with guessed content.
It is created only after:
1. The Binance pilot (Section 9) is approved by ROLE 0
2. A manual source review is completed
3. ROLE 0 approves the initial baseline

Until then, the file does not exist.

---

## 7. Report Format

### Markdown report

```
reports/exchange-availability-watch-YYYY-MM-DD.md
```

Sections:
1. **Run summary** — date, exchanges checked, overall status
2. **Source status** — for each source URL: HTTP status, hash, redirect chain
3. **Current extracted list** — countries/products as parsed from source today
4. **Previous confirmed list** — last approved baseline
5. **Changes detected** — type, evidence, quote from source
6. **Confidence assessment** — extraction method, ambiguity notes
7. **Recommended page sections to review** — which pages reference availability
8. **Suggested content update task** (if change detected) — proposed wording, requires ROLE 0 sign-off
9. **Owner decisions needed** — specific yes/no questions for ROLE 0

### JSON report

```
reports/exchange-availability-watch-YYYY-MM-DD.json
```

```json
{
  "runDate": "2026-06-06",
  "exchangesChecked": ["binance"],
  "overallStatus": "no_change | review_required | source_unavailable | alert",
  "results": [
    {
      "exchange": "binance",
      "status": "no_change | change_detected | source_unavailable",
      "sourcesChecked": 2,
      "sourcesAvailable": 2,
      "changesDetected": [],
      "confidence": "high | medium | low",
      "suggestedTaskCreated": false,
      "ownerDecisionRequired": false
    }
  ],
  "alertsSent": false,
  "nextRunScheduled": "2026-06-07"
}
```

---

## 8. Page Integration

Availability data from `src/data/exchange-availability/binance.json` feeds:

| Page / Block | Integration point | Trigger |
|-------------|------------------|---------|
| Exchange page — Key Facts table | "Countries restricted" field | `restrictedCountries.list` confirmed |
| Exchange page — Risk / Disclaimer block | Availability warning text | `manualReviewRequired: false` + confidence high |
| Exchange page — FAQ block | "Is Binance available in [country]?" answers | Source-confirmed list available |
| Bonus page | "Not available in: ..." note | Derived from exchange availability |
| Future country pages (`/best-exchanges-for/[country]/`) | Exchange inclusion/exclusion | Country-level availability confirmed |
| Schema `description` / `knowsAbout` | Optional geo notes | High-confidence confirmed data only |

### Integration rules

- **No country is added to a restricted list on any page without ROLE 0 approval + source citation.**
- **No country is removed from a restricted list without ROLE 0 approval + source confirmation.**
- **Confidence must be `high` before availability data appears in page copy.**
- **A `manualReviewRequired: true` flag blocks data from rendering on pages** until cleared.

---

## 9. Binance Pilot Plan

### Objective

Establish the first confirmed baseline for Binance restricted countries from official sources,
then begin daily automated monitoring.

### Phase 0 — Source identification (manual, pre-pilot)

The following source URL categories are known to exist for Binance. **They must be manually
reviewed by ROLE 0 or a trusted reviewer before any automated fetch begins.** URLs below are
categories, not confirmed-live links — verification is step 1.

| Source category | Expected URL pattern | Priority |
|----------------|---------------------|---------|
| Restricted Locations legal page | `binance.com/en/legal/restricted-locations` | P0 |
| Help Center FAQ on restricted countries | `binance.com/en/support/faq/...` | P0 |
| Service Terms of Use | `binance.com/en/terms` | P0 |
| Official announcements on legal updates | `binance.com/en/support/announcement/...` | P0 |

**Do not assume content from any of these URLs.** The watcher's first task is to fetch
and display the live content for ROLE 0 review — not to report a country list from memory.

### Phase 1 — Manual source review (requires ROLE 0 action)

1. Owner or designated reviewer visits each source URL category
2. Confirms: URL is live, content is the intended legal page, not a redirect or 404
3. Records confirmed live URL in `reports/binance-availability-watcher-plan.json`
4. Reviews the current restricted country list (as of today's date)
5. Records the list in the pilot plan — this becomes the first baseline

**Owner approval gate:** ROLE 0 must sign off on the initial baseline before it is written
to `src/data/exchange-availability/binance.json`.

### Phase 2 — Baseline creation

After ROLE 0 approves the initial baseline:
- `src/data/exchange-availability/binance.json` is created with confirmed data
- `confidence: "high"`, `manualReviewRequired: false`
- `lastManualReview: {date}`, `reviewedBy: "ROLE 0"`

### Phase 3 — Automated daily monitoring begins

- Watcher fetches source URLs daily
- Compares against baseline
- Reports changes to ROLE 0
- Updates baseline only on ROLE 0 approval

### Phase 4 — Page integration

After ≥ 7 days of stable monitoring with no false positives:
- Availability data integrated into Binance exchange page Key Facts table
- FAQ answers updated with source citation and `lastChecked` date
- Risk/disclaimer block added if applicable

### Pilot success criteria

| Criterion | Target |
|-----------|--------|
| Source URLs confirmed live | ≥ 2 P0 sources |
| Baseline created and approved | ROLE 0 sign-off |
| Watcher runs without errors | 7 consecutive days |
| False positive rate | 0 in first 7 days |
| Page integration | ROLE 0 approved |

---

## 10. Automation Schedule

### Daily run

| Parameter | Value |
|-----------|-------|
| Frequency | Once per day |
| Recommended time | 06:00 UTC (before editorial day begins) |
| Configuration | Defined in `automation/config/availability-watcher.json` (Sprint 06+) |
| Run location | VPS server or CI job (to be configured Sprint 06) |

### Run outcome routing

| Outcome | Action | Owner notification |
|---------|--------|------------------|
| `no_change` on all sources | Log result to `reports/` | No — low-priority log only |
| `change_detected` on any source | Create review report + suggested task | **Yes — immediate alert** |
| `source_unavailable` on any P0 source | Create alert report | **Yes — immediate alert** |
| `extraction_failed` (parse error) | Log error + skip day | **Yes — alert** |

### Notification channels (to be configured)

- Telegram bot message to owner (using existing `telegram_command_bot.py` infrastructure)
- Log file: `logs/availability-watcher-runs.jsonl`
- No email integration in Sprint 05 scope

---

## 11. QA / Safety Gates

| Gate | Rule |
|------|------|
| **Source citation required** | No country claim on any page without a confirmed P0 source URL recorded in `exchange-availability/{exchange}.json` |
| **Confidence gate** | Country claims only render on pages if `confidence: "high"` and `manualReviewRequired: false` |
| **ROLE 0 approval** | Any update to a live page's availability claim requires explicit ROLE 0 approval in a named sprint task |
| **No memory claims** | The watcher must not use knowledge from model training as a source — only live fetched content |
| **No P3-only claims** | Third-party lists (Wikipedia, aggregators) cannot be the sole source for any page claim |
| **Stale baseline block** | If `lastChecked` is > 7 days old (watcher missed runs), a freshness warning is created; page availability blocks are flagged for manual review |
| **Legal wording gate** | Any change to restriction wording that could affect legal compliance (not just country list) triggers ROLE 11 review before page update |
| **No auto-creation of data file** | `src/data/exchange-availability/binance.json` must not be created or updated by automated tools without ROLE 0 sign-off |

---

## 12. Integration with War Room Roles

### Role assignments for exchange availability monitoring

| Role | Responsibility |
|------|---------------|
| **ROLE 36** — Exchange Availability / Restricted Countries Watcher | Owns the monitoring system; runs daily checks; creates reports and suggested tasks; does not publish |
| **ROLE 30** — Legal / Terms Watcher | Reviews source citations; flags legal wording changes; escalates regulator notices |
| **ROLE 11** — Compliance / Risk Lead | Assesses risk level of detected changes; approves risk wording on pages |
| **ROLE 25** — Freshness / Update Editor | Identifies affected pages when availability changes; creates refresh tasks |
| **ROLE 0** — Chief Project Owner | Final approval for all page updates; approves baseline creation; approves data file creation |

### Weekly training integration

Every Monday domain scan (Section 4 of `GOLD_PAGE_WAR_ROOM_AND_WEEKLY_TRAINING.md`) includes:

| Specialist | Monday check |
|-----------|-------------|
| ROLE 36 | Review last 7 daily availability watcher reports; flag any `review_required` runs not yet actioned |
| ROLE 30 | Check official exchange terms pages for wording updates; check affiliate program policy pages |
| ROLE 11 | Check regulatory news for enforcement actions naming monitored exchanges |
| ROLE 25 | Identify pages with availability claims older than 30 days without a `lastChecked` update |

### Governance reference

| Document | Purpose |
|----------|---------|
| `docs/EXCHANGE_AVAILABILITY_AND_RESTRICTED_COUNTRIES_WATCHER.md` | **This file** — full governance, data model, watcher logic |
| `src/data/exchange-availability/binance.json` | Live data — created only after ROLE 0 pilot approval |
| `reports/exchange-availability-watch-YYYY-MM-DD.md` | Daily run reports |
| `reports/binance-availability-watcher-plan.md` | Binance pilot plan (Sprint 05) |
| `docs/GOLD_PAGE_WAR_ROOM_AND_WEEKLY_TRAINING.md` | ROLE 36 definition; weekly training integration |
| `docs/SCREENSHOT_STANDARD.md` | Screenshot rules for any availability evidence captures |

---

*Document version 1.0 — 2026-06-06 — CryptoBonusWorld Sprint 05*
*Owner: Chief Project Owner (ROLE 0)*
*Next review: After Binance pilot Phase 2 (baseline approval)*
