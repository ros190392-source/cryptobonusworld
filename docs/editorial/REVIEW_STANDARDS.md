# CryptoBonusWorld — Exchange Review Standards v1.0

**Status:** Active  
**Last updated:** May 2026  
**Scope:** Applies to all exchange review pages and editorial ratings

---

## Rating System

CryptoBonusWorld uses a 10-point editorial rating. **The rating is not automated** — it is an editorial judgment informed by objective criteria. Each criterion carries a maximum weight. The score is not a simple average.

### Rating Criteria (10 points total)

| Criterion | Max Points | Description |
|---|---|---|
| Bonus value | 2.5 | Absolute bonus size, reachability, and percentage achievable by average users |
| Bonus conditions | 2.0 | Clarity, fairness, and accessibility of conditions (KYC, deposit, volume) |
| Platform reputation | 2.0 | Age, regulatory standing, user base, security track record |
| Country availability | 1.5 | Geographic reach, no-KYC availability, payment method coverage |
| Ease of claiming | 1.5 | How many steps, how clear the process, mobile accessibility |
| Bonus uniqueness | 0.5 | Whether this exchange offers something others don't (e.g. copy trading bonus) |

### Score interpretation

| Score | Meaning |
|---|---|
| 9.5–10.0 | Exceptional — top-tier bonus with minimal friction and strong platform |
| 9.0–9.4 | Very strong — high-value bonus, minor limitations |
| 8.5–8.9 | Good — solid bonus, clear conditions, reputable platform |
| 8.0–8.4 | Above average — acceptable bonus with some notable limitations |
| 7.0–7.9 | Average — limited bonus or significant friction in claiming |
| Below 7.0 | Below average — only relevant for niche use cases (e.g. specific country/coin support) |

---

## Bonus Amount Verification Protocol

### Primary verification source

- Official exchange promotion page (e.g., `bybit.com/en/promo/global/welcome-gifts/`)
- Must be accessed directly — not via third-party aggregators
- Screenshot should be taken and stored with timestamp

### What to verify

1. **Maximum advertised amount** — the headline number (e.g., "30,000 USDT")
2. **Each bonus tier** — amount, trigger condition, and time limit
3. **KYC requirement** — is full verification required for any amount?
4. **Minimum deposit** — exact figure, not an approximation
5. **Trading volume requirement** — all tiers, not just the top
6. **Expiry** — days from registration to complete all tasks
7. **Geographic restrictions** — are any countries excluded?
8. **Code/link activation** — does a specific code or link apply the bonus?

### Verification cadence

| Event | Action |
|---|---|
| Initial listing | Full verification |
| Monthly | Re-verify bonus amounts and tier structure |
| Any exchange promotion announced | Immediate re-verification |
| Reader reports discrepancy | Priority re-verification within 48 hours |
| Verification fails | Set `verificationStatus: "needs-review"`, alert editorial team |

### Acceptable data staleness

- Bonus amounts: 30 days maximum
- KYC/deposit requirements: 60 days maximum
- Geographic availability: 60 days maximum
- Promo codes: 14 days maximum

---

## Editorial Note Standards

Each exchange page must include an `editorNote` in the exchange data. This is not marketing copy — it is a genuine editorial observation.

### What a good editor note includes

- One specific strength that distinguishes this exchange
- One genuine limitation or caveat
- Written in first-person editorial voice ("Our pick for...", "Worth noting that...")
- 40–80 words maximum

### Examples

**Good:**
> "Our top pick for traders who want the highest possible bonus with genuine trading intent. The 30,000 USDT headline is real but requires meaningful futures volume to reach the upper tiers — casual users should expect 200–500 USDT in practice. Web3 wallet and copy trading integrations are genuinely class-leading."

**Poor:**
> "Bybit is a great exchange with lots of features and a big bonus. Highly recommended for everyone."

---

## What We Do Not Rate

CryptoBonusWorld editorial ratings apply only to the exchange's bonus and onboarding experience. We explicitly do not rate:

- Trading performance or profitability potential
- Specific coins or tokens listed (beyond mentioning availability)
- Price predictions or market outlook
- Quality of customer support (unless it directly affects bonus claiming)
- Mobile app design aesthetics

---

## Conflict of Interest Policy

CryptoBonusWorld earns affiliate commissions from exchanges listed on the site. To maintain editorial independence:

1. **Affiliate rate does not influence rating** — a higher-paying exchange does not get a higher rating for that reason
2. **Disclosure is mandatory** — every page with an affiliate link displays the disclosure
3. **"Editor's Top Pick" selection** — based on editorial score and real user value, not commission rate
4. **Negative information is not suppressed** — if an exchange has a known issue (e.g., withdrawal delays, regulatory action), it is noted in the editorial note or cons section
5. **Non-listed exchanges** — we may reference competing products we don't have affiliate relationships with if it genuinely serves the user

---

## E-E-A-T Signals Embedded in Content

Every exchange review page is structured to demonstrate:

**Experience:**
- Specific, hands-on observations in the editor note
- Actual bonus tier data (not generic "up to X" phrasing)
- Concrete claiming steps based on direct platform interaction

**Expertise:**
- Correct crypto terminology throughout
- Understanding of fee structures, KYC requirements, bonus mechanics
- References to platform-specific features (copy trading, Web3 wallet, P2P)

**Authoritativeness:**
- Links to official exchange promotion pages as sources
- Methodology page explaining our scoring system
- Verification dates showing ongoing monitoring

**Trustworthiness:**
- Prominent affiliate disclosure
- Risk disclaimers on every monetised page
- Country restrictions clearly listed
- "Needs Review" status shown when data may be outdated
- Negative information included alongside positives

---

## Review Update Log

When updating exchange review data, log the change in the exchange's `changeLog` field in `exchanges.json`:

```json
{
  "date": "2026-05-20",
  "field": "bonusAmount",
  "oldValue": "500",
  "newValue": "1000",
  "source": "https://www.mexc.com/activity/new-user",
  "notes": "MEXC increased bonus cap from 500 to 1000 USDT"
}
```

This creates an audit trail that supports E-E-A-T signals and allows rollback if data is found to be incorrect.
