# Gold Page Operating System

**Version:** 1.0
**Created:** 2026-06-08
**Sprint:** Sprint 07
**Status:** ACTIVE — master production system for CBW English-first Gold Pages
**Branch:** `master`
**Owner:** Chief Project Owner (ROLE 0)

> This document is the single operating system for how CryptoBonusWorld builds professional,
> English-first Gold Pages for crypto exchanges — and how those pages later expand to other
> languages and GEOs. It sequences every role, gate, and data artifact into one pipeline. It sits
> beside the team structure (`CBW_PROJECT_OWNER_AND_TEAM_STRUCTURE.md`) and the War Room
> (`GOLD_PAGE_WAR_ROOM_AND_WEEKLY_TRAINING.md`) and binds together the Exchange Intelligence,
> Claim/Evidence Ledger, Source Registry, and Screenshot Factory subsystems.

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [The Gold Page Pipeline (18 stages)](#2-the-gold-page-pipeline)
3. [Stage Detail](#3-stage-detail)
4. [English-First Rule](#4-english-first-rule)
5. [Localization & GEO Expansion](#5-localization--geo-expansion)
6. [Subsystem Map](#6-subsystem-map)
7. [Hard Gates](#7-hard-gates)
8. [Governance Reference](#8-governance-reference)

---

## 1. Purpose

CBW produces money pages — exchange reviews and bonus pages whose accuracy directly drives
affiliate revenue and trust. A Gold Page is the highest production standard: search-first,
AI-answer-ready, evidence-backed, screenshot-supported, compliance-clean, and conversion-focused.

The Gold Page Operating System (GPOS) exists to make that standard **repeatable**. Without one
system, each page is rebuilt from memory, claims drift from evidence, screenshots go stale, and
localization guesses at offers. The GPOS turns Gold Page production into a deterministic pipeline
where every claim traces to a source, every screenshot traces to a job, and every stage has an
owner and a gate.

The GPOS is **English-first**: EN/global is the canonical master from which all other languages and
GEOs are localized — never blindly translated (see §4).

---

## 2. The Gold Page Pipeline

Eighteen stages, each owned by a role, each producing a named artifact. Stages block downstream
work until their gate passes.

```
 1. Exchange Intelligence Profile   → ROLE 37
 2. SERP / Intent Brief             → ROLE 1 + ROLE 2/14
 3. Page Architecture               → ROLE 1
 4. Claim / Evidence Ledger         → ROLE 4 + ROLE 16
 5. Source Registry                 → ROLE 4 + ROLE 37
 6. Screenshot Factory Job Matrix   → ROLE 38 (seeded by ROLE 37)
 7. Draft Content                   → ROLE 3
 8. Editorial Review                → ROLE 35
 9. Evidence Review                 → ROLE 4
10. Compliance Review               → ROLE 11
11. UX / CRO Review                 → ROLE 7 (+ ROLE 34)
12. Schema / AI Search Review       → ROLE 8 (+ ROLE 15)
13. Screenshot Approval             → ROLE 5 + ROLE 18 + ROLE 33 → ROLE 0
14. Build / Audit                   → ROLE 9 + ROLE 10
15. Owner Review                    → ROLE 0
16. Deploy                          → ROLE 10
17. Live QA                         → ROLE 9
18. Freshness Monitoring            → ROLE 13 + ROLE 25 + ROLE 37 + ROLE 38
```

---

## 3. Stage Detail

| # | Stage | Owner | Input | Output / Artifact | Gate |
|---|-------|-------|-------|-------------------|------|
| 1 | Exchange Intelligence Profile | ROLE 37 | exchanges.json, evidence, availability | `src/data/exchange-intelligence/{exchange}.json` | Profile current; affiliate + bonus + targets verified |
| 2 | SERP / Intent Brief | ROLE 1 + 2/14 | profile, GSC, SERP, PAA | `reports/{exchange}-chief-seo-architect-brief.md` | Intent map + keyword cluster approved |
| 3 | Page Architecture | ROLE 1 | brief | H1→H2→H3 blueprint, short-answer target, FAQ plan | Blueprint approved — blocks all build |
| 4 | Claim / Evidence Ledger | ROLE 4 + 16 | blueprint, evidence | Claim ledger (per `CLAIM_EVIDENCE_LEDGER_STANDARD.md`) | Every page claim has an entry |
| 5 | Source Registry | ROLE 4 + 37 | ledger, official pages | Source registry (per `SOURCE_REGISTRY_STANDARD.md`) | Every claim cites ≥1 P0–P2 source |
| 6 | Screenshot Factory Job Matrix | ROLE 38 | profile `screenshotTargets` | `src/data/screenshot-factory/jobs/{exchange}.json` | Jobs created per needed section |
| 7 | Draft Content | ROLE 3 | blueprint, ledger, screenshots | Drafted copy in `content-overrides.json` (proposed) | Follows blueprint; every claim traces to ledger |
| 8 | Editorial Review | ROLE 35 | draft | Edited copy; voice + E-E-A-T pass | No AI bloat; reads human |
| 9 | Evidence Review | ROLE 4 | draft + ledger | Verified claims; confidence scores | No claim asserted above its confidence |
| 10 | Compliance Review | ROLE 11 | draft + ledger | Compliance sign-off; required disclaimers | No banned wording; KYC/geo safe |
| 11 | UX / CRO Review | ROLE 7 (+34) | built preview | CTA/sticky/mobile sign-off | Affiliate links correct; no false urgency |
| 12 | Schema / AI Search Review | ROLE 8 (+15) | built HTML | Validated JSON-LD; AEO pass | No rejected screenshot paths; FAQ matches visible |
| 13 | Screenshot Approval | ROLE 5+18+33→0 | candidates in reports/ | Approved public assets | Ethics pass; owner approval; no private data |
| 14 | Build / Audit | ROLE 9 + 10 | full page | `npm run build` + audits | Build green; P1 audit = 0; grep checks clean |
| 15 | Owner Review | ROLE 0 | built page | Owner visual sign-off | Final approval of offers, screenshots, claims |
| 16 | Deploy | ROLE 10 | approved build | Live page + IndexNow | `SERVER_DONE`; no forbidden paths shipped |
| 17 | Live QA | ROLE 9 | production URL | Live verification report | HTTP 200; HTML claim checks pass |
| 18 | Freshness Monitoring | ROLE 13+25+37+38 | live page | Freshness flags; recapture/refresh queue | Stale claims/screenshots surfaced before expiry |

A Gold Page may move backward: a compliance or ethics flag at any later stage reverts the page to
the relevant earlier stage and re-runs its gate.

---

## 4. English-First Rule

**EN/global is the master base.** Every Gold Page is built first in English for a global audience.
This master is the canonical source of structure, claims, ledger, source registry, and screenshot
job matrix.

**Other languages are localized from structure, not blindly translated.** A localized page inherits
the EN master's architecture and claim *types*, but every concrete value must be re-verified for the
target language/GEO. A machine translation of the English page is never acceptable as a Gold Page.

**Each GEO must re-verify, before any localized page goes live:**
- **Offers** — bonus amount, currency, and campaign may differ by GEO
- **Availability** — the exchange may be restricted in the target country
- **P2P** — payment rails and fiat differ (PIX/BRL, Papara/TRY, Kaspi/KZT)
- **Payment methods** — card/bank availability is GEO-specific
- **Screenshots** — language + GEO variant must be captured fresh (Screenshot Factory job per locale)
- **Legal wording** — disclaimers, restriction notes, and regulator references are jurisdiction-specific

A localized claim that cannot be re-verified for its GEO is downgraded to cautious wording or omitted
— it never inherits the EN confidence by default.

---

## 5. Localization & GEO Expansion

| Step | Action | Owner |
|------|--------|-------|
| L1 | Clone EN master architecture (structure only) | ROLE 1 |
| L2 | Re-verify each claim for the target GEO; create localized ledger entries | ROLE 4 + 37 |
| L3 | Re-verify availability + restriction wording for the GEO | ROLE 11 + 36 |
| L4 | Create localized Screenshot Factory jobs (language × GEO) | ROLE 38 |
| L5 | Localize copy from structure (human, not machine-only) | ROLE 3 |
| L6 | GEO relevance + currency/payment-method check | ROLE 24 |
| L7 | Standard stages 8–18 of the pipeline | per §2 |

GEO priority order is set by ROLE 0 per the analytics/market opportunity. Pilot localization targets:
PT-BR/Brazil, RU/global, TR/Turkey (per Screenshot Factory Standard §8).

---

## 6. Subsystem Map

| Subsystem | Governing doc | Feeds the pipeline at |
|-----------|---------------|----------------------|
| Exchange Intelligence | `EXCHANGE_INTELLIGENCE_OWNER_ROLE.md` / `_PROFILE_STANDARD.md` | Stage 1, 5, 6 |
| Claim / Evidence Ledger | `CLAIM_EVIDENCE_LEDGER_STANDARD.md` | Stage 4, 7, 9, 10 |
| Source Registry | `SOURCE_REGISTRY_STANDARD.md` | Stage 5, 9 |
| Screenshot Factory | `MULTILINGUAL_SCREENSHOT_FACTORY_ROLE.md` / `_STANDARD.md` | Stage 6, 13, 18 |
| Authenticated Capture Flow | `AUTHENTICATED_SCREENSHOT_CAPTURE_FLOW.md` | Stage 13 (auth screenshots) |
| Screenshot file conventions | `SCREENSHOT_STANDARD.md` | Stage 13, 14 |
| Availability Watcher | `EXCHANGE_AVAILABILITY_AND_RESTRICTED_COUNTRIES_WATCHER.md` | Stage 10, 18 |

---

## 7. Hard Gates

These cannot be skipped for any Gold Page:

1. **No claim without a ledger entry** (Stage 4) — every factual statement traces to the Claim/Evidence Ledger.
2. **No ledger entry without a source** (Stage 5) — every claim cites ≥1 P0–P2 source in the Source Registry.
3. **No screenshot to `public/` without ethics + owner approval** (Stage 13) — ROLE 33 + ROLE 0.
4. **No deploy without build green + P1 audit = 0 + grep checks clean** (Stage 14).
5. **No localized page inheriting EN confidence** (Stage L2) — every GEO re-verifies.
6. **No affiliate link change without ROLE 0** — MEXC and Bybit links are IMMUTABLE.
7. **No autopublish** — intelligence profiles, ledgers, source registries, and factory data never auto-update public pages.

---

## 8. Governance Reference

| Document | Purpose |
|----------|---------|
| `CBW_PROJECT_OWNER_AND_TEAM_STRUCTURE.md` | Role definitions; supersedes role conflicts |
| `GOLD_PAGE_WAR_ROOM_AND_WEEKLY_TRAINING.md` | Specialist squad; weekly cadence |
| `CLAIM_EVIDENCE_LEDGER_STANDARD.md` | Claim tracking schema |
| `SOURCE_REGISTRY_STANDARD.md` | Source quality tiers + schema |
| `AUTHENTICATED_SCREENSHOT_CAPTURE_FLOW.md` | Safe auth capture flow + folders |
| `EXCHANGE_INTELLIGENCE_PROFILE_STANDARD.md` | Exchange profile schema |
| `MULTILINGUAL_SCREENSHOT_FACTORY_STANDARD.md` | Screenshot job/asset model |
| `SCREENSHOT_STANDARD.md` | File path / slot conventions |

---

*Document version 1.0 — 2026-06-08 — Sprint 07*
*Owner: Chief Project Owner (ROLE 0)*
*English-first master system for CBW Gold Page production*
