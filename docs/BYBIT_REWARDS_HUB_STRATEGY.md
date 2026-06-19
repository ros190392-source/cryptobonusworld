# Bybit Rewards Hub — CBW Evidence Strategy

**Created:** 2026-06-19  
**Status:** Approved  
**Applies to:** cryptobonusworld.com/bybit/

---

## The Problem with Rewards Hub Content

The Bybit Rewards Hub is:

- **Account-specific** — task lists vary per user depending on KYC status, deposit history, and trade volume
- **Region-specific** — some tasks are unavailable in certain countries
- **Time-limited** — tasks rotate on a weekly or monthly basis
- **Post-registration only** — the hub is only visible after creating and verifying a Bybit account

This makes the Rewards Hub fundamentally unsuitable for:
- Automated daily monitoring via account creation
- Static published screenshots (they become stale within days)
- Exact task-amount claims without verified current evidence

---

## What We DO Verify

| Claim | Verification method | Status |
|---|---|---|
| CRYPTOBONUSW code pre-fills at sign-up | Mobile screenshot (Samsung Galaxy S21+, ADB, June 2026) | ✅ Verified |
| "Up to 30,000 USDT" claim visible on partner landing | Desktop CDP capture (Chrome, bybit.com, June 2026) | ✅ Verified |
| KYC required to unlock most rewards | Official Bybit Help Center FAQ | ✅ Verified by source |
| Deposit tasks exist in welcome package | Official Bybit bonus page structure | ✅ Verified by source |
| Rewards may expire / require manual claim | Official Bybit bonus page T&Cs | ✅ Verified by source |
| Specific Rewards Hub task amounts (e.g. "$5 for first trade") | — | ❌ Not verified, not published |

---

## What We DO NOT Claim

- We do not publish specific Rewards Hub task amounts unless directly verified by manual screenshot evidence taken in the current month.
- We do not claim users will receive any specific dollar amount beyond "up to 30,000 USDT" as stated on the official Bybit partner landing page.
- We do not claim Rewards Hub tasks are identical across regions or accounts.

---

## How Manual Rewards Hub Evidence Works (If Provided)

If a real Bybit account holder provides Rewards Hub screenshots voluntarily:

1. Redact all personal data (name, email, UID, balance, etc.) before use.
2. Store RAW in `evidence/bybit/global-en/raw/rewards-hub/` with date prefix.
3. Annotate with CBW Annotation Standard v1 (gold #f7a600, Style C) if a specific field needs highlighting.
4. Update `manifest.json` under `evidence.rewards_hub`.
5. Set `approved_for_site: false` until explicit user approval.
6. Note capture date prominently in the article caption — Rewards Hub content expires.
7. Never imply the screenshot shows what every user will see.

---

## Why We Do Not Register New Accounts for Monitoring

- Bybit's Terms of Service restrict multi-account creation.
- Automated account creation may trigger fraud or KYC flags.
- Any account created for monitoring purposes would receive the new-user bonus, consuming a real promotional slot intended for genuine users.
- CAPTCHA and KYC steps cannot be automated without violating our ethics standards (see `tools/evidence-capture/README.md`).

---

## Approved Page Content Strategy

The Bybit page at cryptobonusworld.com/bybit/ uses this approach:

1. **Hero CTA** — links to `/go/bybit` (→ `partner.bybit.com/b/CRYPTOBONUSW`), verified June 2026.
2. **Evidence screenshot** — real mobile screenshot of sign-up page with CRYPTOBONUSW pre-filled, taken June 2026.
3. **Bonus verification table** — honest status per reward area. No invented task amounts.
4. **FAQ** — answers based on official Bybit Help Center content.
5. **No Rewards Hub task breakdown** — we note the hub exists, describe how it works structurally, and direct users to check it after registration.

---

## Periodic Review Cadence

| Item | Frequency | Method |
|---|---|---|
| Partner link resolves → CRYPTOBONUSW | Daily | `scripts/verify-bonus-capture.mjs` |
| Bybit fees | Daily | `tools/evidence-capture/check-bybit-fees.mjs` |
| "Up to 30,000 USDT" claim on landing page | Weekly | Desktop CDP capture, manual review |
| Evidence screenshots | Monthly | Manual re-capture if code or offer structure changes |
| Rewards Hub structure | On user report or major Bybit announcement | Manual investigation only |

---

## Related Files

- `evidence/bybit/global-en/manifest.json` — evidence registry
- `data/exchanges/bybit/fees.json` — fee monitoring data
- `tools/evidence-capture/check-bybit-fees.mjs` — fee monitoring script
- `tools/evidence-capture/annotate-evidence.mjs` — CBW Annotation Standard v1
- `tools/evidence-capture/README.md` — evidence ethics and capture rules
