# KYC & Access Claims Editorial Policy

**Version:** 1.0
**Created:** 2026-06-04
**Sprint:** Sprint 03
**Status:** ACTIVE — applies to all 14 exchange pages
**Owner decision required:** YES — owner must approve before applying to pages

---

## 1. Why This Policy Exists

KYC and access claims are uniquely high-risk content on a crypto exchange review site.

**What can go wrong:**
- A user reads "trade without KYC" → registers → gets blocked when trying to withdraw
- A user reads "works for Russia" → registers → discovers their account is restricted
- A user reads "P2P available" without geo or payment method details → finds RUB not supported
- A user reads "withdraw without verification" → transfers crypto in → cannot withdraw

These are not abstract risks. They create real user harm and serious reputational damage to the site.

**Additional compliance risk:**
- Stating an exchange "works for" a sanctioned region without current evidence may constitute facilitation of sanctions evasion under some interpretations
- Stating "no KYC required" when KYC can be demanded at any time misrepresents exchange terms

---

## 2. Claim Taxonomy

### A. Account / Registration
| Field | Description |
|-------|-------------|
| `registration_without_kyc` | Can a user create an account without providing ID documents? |
| `email_only_registration` | Is email the only requirement for signup? |
| `phone_required` | Is a phone number required at registration? |
| `identity_required_at_signup` | Is identity verification required before account activation? |

### B. Trading Access
| Field | Description |
|-------|-------------|
| `spot_without_kyc` | Can spot trading begin before KYC? |
| `futures_without_kyc` | Can futures trading begin before KYC? |
| `margin_without_kyc` | Can margin trading begin before KYC? |
| `copy_trading_without_kyc` | Can copy trading be accessed before KYC? |
| `earn_without_kyc` | Can earn/staking products be accessed before KYC? |

### C. Money Movement
| Field | Description |
|-------|-------------|
| `crypto_deposit_without_kyc` | Can crypto be deposited before KYC? |
| `fiat_deposit_without_kyc` | Can fiat be deposited before KYC? |
| `crypto_withdrawal_without_kyc` | Can crypto be withdrawn before full KYC? |
| `withdrawal_limit_without_kyc` | What is the maximum crypto withdrawal without KYC (USDT equivalent per day)? |
| `fiat_withdrawal_without_kyc` | Can fiat be withdrawn before KYC? |

### D. P2P
| Field | Description |
|-------|-------------|
| `p2p_without_kyc` | Is P2P trading accessible before KYC? |
| `p2p_fiat_methods_available` | What fiat payment methods are supported in P2P? |
| `p2p_country_restrictions` | Which countries are restricted from P2P? |
| `p2p_rub_available` | Is Russian ruble (RUB) available as a P2P payment currency? |
| `p2p_uah_available` | Is Ukrainian hryvnia (UAH) available? |
| `p2p_try_available` | Is Turkish lira (TRY) available? |
| `p2p_inr_available` | Is Indian rupee (INR) available? |

### E. Geo / Restrictions
| Field | Description |
|-------|-------------|
| `supported_countries` | Countries where the exchange explicitly operates |
| `restricted_countries` | Countries explicitly blocked from using the exchange |
| `russia_access` | Current status for Russian users (not a marketing claim — factual access status) |
| `ukraine_access` | Current status for Ukrainian users |
| `eu_access` | Current status for EU users |
| `usa_access` | Current status for US users |
| `sanctions_restrictions` | Is the exchange subject to international sanctions restrictions on users? |
| `vpn_policy` | Does the exchange's ToS prohibit VPN use? |

### F. Verification Levels
| Field | Description |
|-------|-------------|
| `basic_kyc_required` | When does Basic/Level 1 KYC become required? |
| `advanced_kyc_required` | When does Advanced/Level 2 KYC become required? |
| `proof_of_address_required` | Is proof of address required and at what level? |
| `source_of_funds_required` | Is source of funds declaration required? |
| `enhanced_due_diligence_possible` | Can the exchange request enhanced verification at any time? |

### G. Risk Triggers (Time-Delayed KYC)
| Field | Description |
|-------|-------------|
| `kyc_on_suspicious_activity` | Can KYC be demanded following suspicious activity flag? |
| `kyc_on_high_volume` | Can KYC be demanded when trading volume exceeds threshold? |
| `kyc_on_withdrawal_attempt` | Can KYC be demanded at first withdrawal? |
| `kyc_country_triggered` | Can KYC be demanded based on detected country/geo? |

---

## 3. Forbidden Phrases

The following phrases are **PROHIBITED** on all exchange pages without exact, dated, geo-specific, Tier-1-sourced evidence. Publishing these phrases without evidence constitutes a misleading_risk claim.

| Forbidden Phrase | Why Prohibited |
|-----------------|---------------|
| "No KYC exchange" | Almost no exchange allows full withdrawal without KYC |
| "Trade without verification" | Trading without KYC is often limited; full claim is misleading |
| "Withdraw without KYC" | No major exchange allows unlimited withdrawal without any verification |
| "P2P without KYC" | P2P often has separate KYC requirements by country |
| "Works for Russians" / "доступно для России" | Requires current, geo-specific evidence; high regulatory risk |
| "Anonymous trading" | No licensed exchange offers anonymous trading in 2026 |
| "Unlimited without KYC" | No exchange offers unlimited activity without verification |
| "No verification needed" | Deliberately vague; misleads users expecting no future KYC requests |
| "Works without documents" | Same risk as above |

---

## 4. Safe Wording Standards

### 4.1 Replacing KYC-Free Claims

**Instead of:** "Trade without KYC"
**Use:** "Spot trading may be accessible before full identity verification — check current limits on the official exchange help center"

**Instead of:** "No verification needed"
**Use:** "Basic account functions may be available before KYC, but withdrawal and fiat access require identity verification"

**Instead of:** "Withdraw without KYC"
**Use:** "A daily withdrawal limit of [AMOUNT] may be available before identity verification — verified on [DATE]. Check current limits before registering."

**Instead of:** "P2P without KYC"
**Use:** "P2P trading may require separate verification steps depending on payment method and country"

### 4.2 Template Phrases (Approved)

```
"часть функций может быть доступна без полной KYC-верификации"
(some features may be available before full KYC verification)

"условия зависят от страны, продукта, лимитов и политики биржи"
(conditions depend on country, product, limits, and exchange policy)

"вывод средств, P2P, фиатные операции и фьючерсы могут требовать дополнительной проверки"
(withdrawal, P2P, fiat operations, and futures may require additional verification)

"проверено на дату: YYYY-MM-DD — перед регистрацией проверьте актуальные условия"
(verified on YYYY-MM-DD — check current conditions before registering)

"биржа может запросить верификацию в любой момент на основании активности аккаунта или требований регулятора"
(the exchange may request verification at any time based on account activity or regulatory requirements)
```

### 4.3 Russia / Geo Access Claims

**NEVER PUBLISH:** "Exchange works for Russia" / "Exchange available for Russian users"
without ALL of the following:
1. Official restricted countries page reviewed (Tier 1)
2. Russia not on restricted list (confirmed)
3. Date of verification ≤ 14 days ago
4. No recent news of Russia-related exchange restriction

**Safe wording if evidence is older than 14 days:**
"Availability for Russian users — please check current terms on the official exchange website before registering"

---

## 5. Required Evidence Fields Per Exchange

Before any KYC claim appears on a published page, the exchange evidence file must contain a structured `kyc_policy` block with these required fields:

```json
"kyc_policy": {
  "registration_without_kyc": true,
  "spot_without_kyc": true,
  "futures_without_kyc": false,
  "p2p_without_kyc": false,
  "crypto_deposit_without_kyc": true,
  "crypto_withdrawal_without_kyc": true,
  "withdrawal_limit_no_kyc_usdt_day": 10000,
  "withdrawal_limit_no_kyc_note": "10,000 USDT equivalent per day per exchange policy",
  "fiat_withdrawal_without_kyc": false,
  "geo_restrictions_apply": true,
  "geo_notes": "US restricted; Russia access unconfirmed as of last check",
  "enhanced_due_diligence_possible": true,
  "kyc_on_withdrawal_attempt": false,
  "kyc_on_suspicious_activity": true,
  "last_checked": "2026-06-04",
  "source_url": "https://exchange.com/help/kyc-guide",
  "source_tier": 1,
  "confidenceScore": 0.80,
  "conflictStatus": "ok",
  "manualReviewRequired": false
}
```

**All fields must be present.** Fields that are unknown must be `null` with `manualReviewRequired: true`.

---

## 6. Publication Trust Tiers

| Tier | Criteria | Page Treatment |
|------|----------|----------------|
| **VERIFIED** | confidenceScore ≥ 0.85, conflictStatus: ok, lastChecked ≤ 30 days | Display specific claim with verification date |
| **CHECKED** | confidenceScore ≥ 0.70, conflictStatus: ok, lastChecked ≤ 60 days | Display with "verified on {date}" qualifier |
| **OUTDATED** | confidenceScore < 0.70 OR lastChecked > 60 days | Safe-wording fallback only; no specific claim |
| **UNVERIFIED** | conflictStatus: unverified OR manualReviewRequired: true | Do NOT display KYC-specific claims |
| **MISLEADING_RISK** | Any misleading_risk status | Safe-wording fallback only; flag for editorial review |

---

## 7. Misleading Risk Classification Rules

A claim must be classified `misleading_risk` if any of the following is true:

1. The claim says "no KYC" but evidence only confirms registration without KYC (trading/withdrawal status unknown)
2. The claim says "trade without KYC" but only a deposit page screenshot exists
3. The claim says "withdraw without KYC" without an exact, current withdrawal limit
4. The claim says "P2P available" without country and payment method confirmation
5. The claim says "works for Russia" without ≤14-day verified official restriction page check
6. The claim mentions an exact limit (e.g. "10,000 USDT/day") but the source is older than 60 days
7. The claim ignores that time-delayed KYC (on suspicious activity, high volume, first withdrawal) can be triggered
8. The claim was derived from a Tier 3 source (blog, forum, "no KYC exchanges" list)
9. The exchange was founded less than 3 years ago and KYC policy has not been manually verified

---

## 8. Exchange-Specific KYC Risk Summary

| Exchange | KYC Model | No-KYC Withdrawal Limit | Risk Level |
|----------|-----------|------------------------|------------|
| Binance | Required for all withdrawal | 0 (no withdrawal without KYC) | 🟢 Low — KYC required, clear |
| Bybit | Required for withdrawal | 0 USDT/day (confirmed 0.76) | 🟢 Low — clearly KYC required |
| OKX | Required for full access | Not in schema | 🟡 Medium — limit unknown |
| MEXC | Not required for basic trading | 10 BTC/day (0.76) | 🟡 Medium — limit needs re-verify |
| Bitget | Required for withdrawals | Not in schema | 🟡 Medium — limit unknown |
| Bitunix | Claimed not required — **UNVERIFIED** | Not in schema | 🔴 HIGH — do not publish no-KYC claim |
| BingX | Required for fiat | Not in schema | 🟡 Medium — crypto limit unknown |
| Coinbase | Mandatory for all | 0 (mandatory KYC) | 🟢 Low — strongest KYC policy |
| KuCoin | Not required for trading | 1 BTC/day (0.76) | 🟡 Medium — limit needs re-verify |
| Gate.io | Required for full access | Not in schema | 🟡 Medium — limit unknown |
| HTX | Required for withdrawals | Not in schema | 🟡 Medium — limit unknown |
| CoinEx | Not required for trading | ~10,000 USDT/day (source notes, no field) | 🟡 Medium — no structured field |
| Phemex | Not required for basic trading | Not in schema | 🟡 Medium — limit unknown |
| LBank | Required for full withdrawal | Not in schema | 🟡 Medium — limit unknown |

---

## 9. Owner Approval Required

This policy must be explicitly approved by the site owner before:
- Any KYC-related copy is added to or changed on exchange pages
- Any `kyc_policy` blocks are added to evidence files
- Any "no KYC" style feature is highlighted in bonus/exchange pages

**Approval prompt template:**
```
OWNER DECISION: APPROVE KYC POLICY v1.0
I approve the KYC_ACCESS_CLAIMS_POLICY.md v1.0 for use on CryptoBonusWorld.com.
I understand:
1. The forbidden phrases list applies to all 14 exchange pages
2. The safe wording alternatives will replace any currently published forbidden phrases
3. The required evidence schema (kyc_policy block) will be added to evidence files before KYC claims go live
4. Bitunix's unverified kyc_required: false claim will use safe-wording fallback until manually verified
```

---

*Policy version 1.0 — effective Sprint 03 start*
*For amendments, create new version and re-approve*
