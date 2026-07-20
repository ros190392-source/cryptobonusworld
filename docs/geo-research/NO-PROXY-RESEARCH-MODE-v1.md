# CBW GEO — No-Proxy Research Mode — v1

**Status:** Owner decision record · documentation only (no schema, config, route, page, or research-data change)
**Date:** 2026-07-20
**Applies to:** the GEO Exchange Research System (`docs/geo-research/`), Kazakhstan pilot, and every future GEO.
**Related:** [STANDARDS-RECONCILIATION-v1.md](STANDARDS-RECONCILIATION-v1.md) · [GEO_EXCHANGE_RESEARCH_SYSTEM.md](GEO_EXCHANGE_RESEARCH_SYSTEM.md) · [IMPLEMENTATION_PLAN_V1.md](IMPLEMENTATION_PLAN_V1.md)

---

## 1. Decision and scope

CryptoBonusWorld is abandoning proxy, VPN and IP-specific GEO verification for now.

- **All GEO research currently operates in NO-PROXY mode.**
- This applies to **Kazakhstan and every future GEO**, with no exception.
- **Proxy / IP verification is deferred indefinitely** until a separate, explicit owner decision reverses this.
- **The absence of a proxy must not block the whole research run.** A run may progress, score (from official evidence) and reach a preview through every non-live phase; only the specific live-IP checks are deferred.

No residential proxy, mobile proxy, VPN farm, country-IP rotation, automated local-account creation, or bypass of regional restrictions may be **required** by the GEO research pipeline.

---

## 2. Allowed research methods

- Official regulator and government sources.
- Official exchange terms of service / user agreements.
- Official restricted-country / prohibited-country lists.
- Official KYC, fees, P2P, app and support pages.
- Public local-language pages (kk / ru / etc.).
- Official app stores (public listing pages).
- Official financial registers (e.g. AFSA public register, NBK registers).
- Banks and payment providers (official pages).
- Reputable datasets and research.
- Normal browser research (no location spoofing).
- ChatGPT Deep Research (investigation only; never publishes).
- Manual browser capture **without** location spoofing.

---

## 3. Prohibited methods

- Residential proxies.
- Mobile proxies.
- VPN country switching.
- Proxy farms / country-IP rotation.
- Automated account creation.
- Automated KYC attempts.
- Bypassing regional restrictions of any kind.
- **Claiming a local-IP test occurred when it did not.**

---

## 4. Verification-mode taxonomy

A documentation terminology layer only. **This does not modify `schemas/geo/**` enums or `config/geo/**`** — it is vocabulary for research memos, passports prose, and future reconciliation.

- **OFFICIAL_SOURCE_VERIFIED** — confirmed by a primary official source (regulator, register, or the exchange's own current terms/pages).
- **PUBLIC_UI_VERIFIED** — confirmed by publicly reachable UI content without any location spoofing or account.
- **APP_STORE_VERIFIED** — confirmed via an official app-store listing page.
- **SECONDARY_SOURCE_SUPPORTED** — supported only by reputable secondary sources (Tier C/B); never sufficient alone for a critical claim.
- **NOT_LIVE_VERIFIED** — deliberately not tested from within the country; a disclosure state, not a failure.
- **UNKNOWN** — no sufficient evidence of any kind.
- **CONFLICTING_EVIDENCE** — credible sources disagree; unresolved until new evidence.

Mapping to existing enums (`schemas/geo/*`) is left to a future owner-approved reconciliation task; today these labels live only in prose and planning.

---

## 5. Availability rule

A country-exchange relationship **may be evaluated without a local IP** when sufficient official evidence exists.

Missing local-IP verification:

- **may reduce confidence** (reflected in the confidence axis / disclosure);
- **must be disclosed** on any surface that states availability;
- **does not automatically force UNKNOWN** — an official-source conclusion stands on its own tier;
- **does not automatically block ranking**;
- **does block** any claim of the form "live-tested from Kazakhstan" (or any country).

---

## 6. Ranking rule

- Ranking **may use official-source evidence** as its basis.
- **No artificial padding** — only genuinely eligible exchanges receive a rank; N may be smaller than the target.
- **No affiliate influence** — affiliate value contributes zero ranking points.
- **Unresolved critical regulatory conflicts remain ineligible** for recommendation / first place.
- **Live verification is optional enrichment, not a mandatory gate.**
- **Confidence must reflect evidence limitations** — a NO-PROXY conclusion carries an honest, lower confidence than a live-verified one would.

---

## 7. CTA rule

A GEO CTA may be enabled **only when all** of the following hold:

- a commercial route already exists in production (an existing `/go/{exchange}` route);
- official GEO eligibility is supported by evidence;
- no regulatory or terms conflict exists;
- owner approval is present.

**No proxy test is required** to enable a CTA. However, **missing official GEO eligibility keeps the CTA disabled** — NO-PROXY mode lowers the verification bar to "official-source supported," it does not remove it.

---

## 8. Content wording rules

**Allowed:**

- "Verified from official sources"
- "According to the exchange's current terms"
- "Live access was not independently tested"
- "Availability may vary"

**Forbidden** (unless genuinely verified under a future approved method):

- "Tested from Kazakhstan"
- "Confirmed using a Kazakhstan IP"
- "Guaranteed to work"
- "Available everywhere in Kazakhstan"

---

## 9. Kazakhstan impact

- **`PROXY_KZ` is no longer an owner action** — provisioning it is removed from the pending owner-decision list.
- **Proxy-dependent tasks move to `DEFERRED_NO_PROXY`** in planning language (planning term only; the tracked
  task file is unchanged by this document): `kz-t03` (live availability), `kz-t11` (affiliate validator from KZ),
  and the live portions of `kz-t07` (KZT P2P snapshots).
- **Existing unknown facts remain unknown** — the 8 entries in
  `research/geo/kazakhstan/evidence/unknowns.json` stay as they are; nothing is upgraded by fiat.
- **Phase 2 official-source research continues** (KYC docs, affiliate-GEO terms, NBK register, app-store listings).
- **Kazakhstan remains the active pilot.**
- **MEXC / OKX conflicts remain unresolved** (`cf-kz-mexc-terms-vs-regulator`, `cf-kz-okx-terms-vs-regulator`);
  NO-PROXY mode does not resolve them — it means they are resolved (or left CONFLICTING_EVIDENCE) via official
  sources + owner ruling, not via a live test.
- **Bitget remains restricted** based on existing official evidence (own ToS prohibition + AFSA warning;
  `kz-bitget-not-available-003`).
- **No ranking or score is invented.**

---

## 10. Future GEO rule

Every future country research run must:

- **default to NO-PROXY**;
- **build an official-source authority map** first (regulator, register, central bank, official exchange pages);
- **disclose non-live verification** wherever availability is stated;
- **preserve uncertainty** (UNKNOWN / CONFLICTING_EVIDENCE / NOT_LIVE_VERIFIED remain visible);
- **never block the entire market study** solely because local-IP testing is unavailable.

---

## 11. Relationship to authoritative contracts

- `schemas/geo/**` and `config/geo/**` **remain machine-authoritative**.
- **This document does not modify any enum or gate.** The taxonomy in §4 and the rules in §5–§8 are a
  terminology/policy layer only.
- A later **owner-approved task** may reconcile the configs and the deterministic evaluator's behavior with this
  mode (e.g. how `successful_live_verification` in `config/geo/scoring/confidence.json` and the live-oriented
  freshness windows in `config/geo/freshness.json` are treated when live testing is deferred).
- **Production pages, routes, affiliate facts and rankings remain frozen** (see §Frozen systems in the handoff).

---

## 12. Next implementation sequence

1. Commit this decision record.
2. Perform a **read-only impact audit** of existing Kazakhstan tasks and gates under NO-PROXY mode
   (which gates become reachable via official sources; which stay deferred).
3. Complete **Kazakhstan official-source Deep Research** (Phase 2 remainder: KYC docs, affiliate-GEO terms,
   NBK register, app-store listings).
4. **Normalize** results into schema-valid ledger entries.
5. Build a **deterministic evaluator compatible with NO-PROXY mode** (scores/gates from official evidence;
   live verification treated as optional enrichment, not a hard gate).
6. Create a **noindex preview** (no indexable route).
7. **Owner review before publication.**

Each step is a separate, owner-approved task.

---

*Decision record only. Authorizes no code, schema, config, route, affiliate, or page change. Supersedes the
prior "provision PROXY_KZ" owner action for GEO research until a future owner decision reverses this.
Date: 2026-07-20.*
