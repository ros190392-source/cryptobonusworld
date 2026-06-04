# Screenshot Coverage Matrix

**Version:** 1.0  
**Created:** 2026-06-04  
**Task:** SCREENS-01  
**Status:** APPROVED — governing reference for all screenshot capture operations  
**Branch:** `master`

> This document is the authoritative governance reference for all screenshot captures on
> CryptoBonusWorld.com. Every capture operation must comply with the rules defined here.
> It separates public (unauthenticated) captures from authenticated captures and defines
> safety, masking, and destination rules for each category.

---

## 1. Core Safety Rules

These rules apply globally and cannot be overridden by any individual task:

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| SR-01 | **API keys are FORBIDDEN** — never capture any page showing API key values, partial keys, or key management UI | Hard block |
| SR-02 | **Withdrawal page is FORBIDDEN** — never capture pages with withdrawal address input, confirmation, or QR codes | Hard block |
| SR-03 | **Personal deposit addresses are FORBIDDEN** — never capture crypto wallet addresses or QR codes generated for a user's account | Hard block |
| SR-04 | **Personal identity documents are FORBIDDEN** — never capture government IDs, selfies, or document upload screens | Hard block |
| SR-05 | **Financial balances must be masked** — any screenshot showing a real account balance must have balance values blurred/redacted before review | Masking required |
| SR-06 | **UID / account ID must be masked** — internal account identifiers must be redacted | Masking required |
| SR-07 | **Email and phone must be masked** — partial or full contact info visible in any authenticated screenshot must be blurred | Masking required |
| SR-08 | **Authenticated screenshots go to `reports/` first** — never publish directly to `public/` without owner review | Process gate |
| SR-09 | **No real-money actions** — capture script must never click financial buttons (Deposit, Withdraw, Buy, Transfer) | Hard block |
| SR-10 | **Dedicated browser profile** — authenticated captures use a dedicated Playwright browser profile, never the owner's personal profile | Process gate |
| SR-11 | **Low-balance accounts only** — screenshot accounts must hold the minimum balance required for page access (< $50 equivalent) | Account rule |
| SR-12 | **Public pages preferred** — always use a public URL when the same information is available without login | Priority rule |

---

## 2. Capture Method Definitions

| Method | Description | Auth required | Risk |
|--------|-------------|---------------|------|
| `public_playwright` | Headless Playwright visiting a public URL (no login) | No | Low |
| `authenticated_playwright` | Playwright using a saved session/cookies in a dedicated capture profile | Yes | Medium–High |
| `manual_owner_upload` | Owner captures manually and uploads to repo after review | Yes | High (reviewed) |
| `app_store_scrape` | Screen from Apple/Google App Store listing page | No | None |
| `not_applicable` | Feature does not exist on this exchange | — | None |
| `forbidden` | Must never be captured | — | Forbidden |

---

## 3. Category Governance Matrix

### 3.1 Public Categories (no login required)

| Category | Auth Required | Capture Method | Priority | Risk Level | Personal Data Risk | Masking Required | Publish After Review | Evidence Destination |
|----------|--------------|----------------|----------|------------|-------------------|-----------------|---------------------|---------------------|
| `registration` | ❌ No | `public_playwright` | **P0** | Low | None | No | Yes | `public/screenshots/{exchange}/registration/` |
| `bonus_referral_landing` | ❌ No | `public_playwright` | **P0** | Low | None | No | Yes | `public/screenshots/{exchange}/bonus_referral_landing/` |
| `fees` | ❌ No | `public_playwright` | **P1** | Low | None | No | Yes | `public/screenshots/{exchange}/fees/` |
| `proof_of_reserves` | ❌ No | `public_playwright` | **P1** | Low | None | No | Yes | `public/screenshots/{exchange}/proof_of_reserves/` |
| `spot` | ❌ No | `public_playwright` | **P1** | Low | None | No | Yes | `public/screenshots/{exchange}/spot/` |
| `futures` | ❌ No | `public_playwright` | **P1** | Low | None | No | Yes | `public/screenshots/{exchange}/futures/` |
| `p2p` | ❌ No | `public_playwright` | **P1** | Low | None | No | Yes | `public/screenshots/{exchange}/p2p/` |
| `mobile_app` | ❌ No | `app_store_scrape` | **P2** | None | None | No | Yes | `public/screenshots/{exchange}/mobile_app/` |
| `withdrawal_limits` *(public page only)* | ❌ No | `public_playwright` | **P2** | Low | None | No | Yes | `public/screenshots/{exchange}/withdrawal_limits/` |

**Notes on public categories:**
- `registration`: Use the affiliate referral URL (same as bonus verification captures). Captures the sign-up form + any bonus landing panel. No login, no form submission.
- `bonus_referral_landing`: The pre-auth referral landing page. Identical to or an alias of `registration` for most exchanges. Captures the bonus claim text visible before signing up.
- `fees`: All major exchanges publish a public fee schedule page. Capture the fee table rows.
- `proof_of_reserves`: Public transparency pages (OKX, Bybit, Binance all have these). No auth needed.
- `spot` / `futures`: Public read-only chart views. Do not interact with order placement.
- `p2p`: Public marketplace listing. Do not show logged-in counterparty details.
- `withdrawal_limits`: **Only capture the public documentation page** listing tier limits. Never capture the authenticated withdrawal form.

---

### 3.2 Authenticated Categories

| Category | Auth Required | Capture Method | Priority | Risk Level | Personal Data Risk | Masking Required | Masking Targets | Publish After Review | Evidence Destination |
|----------|--------------|----------------|----------|------------|-------------------|-----------------|-----------------|---------------------|---------------------|
| `bonus` *(bonus center/rewards hub)* | ✅ Yes | `authenticated_playwright` | **P1** | Medium | Low | Yes | UID, email fragment | Yes (after masking + review) | `reports/screenshots-staged/{exchange}/bonus/` → `public/` |
| `deposit` *(methods only, no addresses)* | ✅ Yes | `authenticated_playwright` | **P1** | Medium | Low | Yes | Any wallet address shown, QR codes | Yes (after masking) | `reports/screenshots-staged/{exchange}/deposit/` → `public/` |
| `kyc` *(status page only)* | ✅ Yes | `manual_owner_upload` | **P2** | High | High | Yes | Name, ID number, selfie, document images, email | Yes (after masking + review) | `reports/screenshots-staged/{exchange}/kyc/` → `public/` |
| `security_overview` | ✅ Yes | `manual_owner_upload` | **P2** | High | High | Yes | Email, phone number, UID, device names, login IP | Yes (after masking + review) | `reports/screenshots-staged/{exchange}/security/` → `public/` |
| `account_dashboard` | ✅ Yes | `manual_owner_upload` | **P3** | High | High | Yes | ALL balance values, UID, email, PnL values | Yes (after masking + review) | `reports/screenshots-staged/{exchange}/dashboard/` → `public/` |

**Notes on authenticated categories:**
- `bonus` (bonus center / rewards hub): Shows available tasks, earned vouchers, progress bars. Mask any UID or partial email visible in the header. Actual task amounts are editorial-relevant and may be shown.
- `deposit` (methods): **Shows payment method options only** — bank transfer, card, SEPA etc. The script must scroll PAST any crypto deposit address section or blur any wallet address/QR code. The goal is to show "what deposit methods does this exchange accept" — not the user's personal deposit address.
- `kyc` (verification status): Shows which verification tiers are completed. Mask the account holder's actual name, document type details, and any document preview. Showing "Level 2 verified — identity confirmed" status badge is OK.
- `security_overview`: Shows 2FA enabled/disabled, login device list, withdrawal whitelist. Mask email address, phone number (even partial), UID, and device names. The goal is to show "what security options does this exchange offer."
- `account_dashboard`: Shows portfolio overview. **Mask ALL balance values** (individual asset amounts and total portfolio value). The goal is to show the UI layout — not actual holdings.

---

### 3.3 Forbidden Categories

| Category | Reason | Override Possible |
|----------|--------|-------------------|
| `api_keys` | Shows actual or partial API key strings — absolute security risk | ❌ Never |
| `withdrawal_page` (form) | Shows user wallet address inputs, financial confirmation dialogs | ❌ Never |
| `personal_deposit_addresses` | Crypto wallet addresses are permanent and sensitive financial data | ❌ Never |
| `identity_documents` | Government ID, passport, selfie — protected personal data | ❌ Never |
| `login_credentials` | Password fields, 2FA code input — obvious security risk | ❌ Never |
| `order_confirmation` | Confirms actual trades — irreversible financial action pages | ❌ Never |
| `support_tickets` | May contain account-specific personal data | ❌ Never |

---

## 4. Masking Rules by Data Type

| Data Type | Masking Method | Tool |
|-----------|---------------|------|
| Account balance (any currency) | Blur box covering full value | CSS overlay / manual blur |
| UID / Account ID | Blur box | CSS overlay / manual blur |
| Email address | Blur box (even partial: `j***@g***`) | CSS overlay / manual blur |
| Phone number | Blur box (even `+7 *** *** **00`) | CSS overlay / manual blur |
| Crypto wallet address | Blur box — entire address + QR code | CSS overlay / manual blur |
| Device name / IP address | Blur box | CSS overlay / manual blur |
| Personal name | Blur box | CSS overlay / manual blur |
| API key (partial or full) | ENTIRE PAGE forbidden — do not capture | Hard block |
| Government ID / face | ENTIRE PAGE forbidden — do not capture | Hard block |

**Masking workflow:**
1. Capture screenshot to `reports/screenshots-staged/{exchange}/{category}/`
2. Open in image editor or apply CSS blur overlay
3. Export masked version to same directory with suffix `-masked`
4. Owner reviews masked version
5. If approved: copy to `public/screenshots/{exchange}/{category}/`
6. Never publish the unmasked version

---

## 5. Authenticated Browser Profile Strategy

### 5.1 Profile Structure

A dedicated browser profile per exchange must be used. **Never use the owner's personal browser.**

```
.auth/
  sessions/
    bybit-screenshot-session.json     ← Playwright storageState
    mexc-screenshot-session.json
    okx-screenshot-session.json
    binance-screenshot-session.json
    ...
```

The `.auth/` directory is already gitignored. Session files are stored locally only.

### 5.2 Account Requirements

Each screenshot account must:
- Be a **dedicated low-balance account** used only for screenshots
- Hold < $50 equivalent (enough to access authenticated pages, not enough for real trading)
- Have **KYC completed at minimum tier** to access bonus center / deposit methods
- Use a **dedicated email address** (not the owner's personal email)
- Have **2FA enabled** (Authenticator app, not SMS — more reliable for automation)
- Never be used for actual trading or financial transactions

### 5.3 Session Capture Flow

```bash
# One-time: log in manually and save session
npx playwright codegen --save-storage .auth/sessions/{exchange}-screenshot-session.json {exchange_url}

# Subsequent captures reuse saved session (no manual login)
node scripts/capture-authenticated-screenshot.mjs \
  --exchange {exchange} \
  --category bonus \
  --session .auth/sessions/{exchange}-screenshot-session.json
```

Sessions expire periodically — re-capture required approximately every 7–30 days depending on the exchange.

---

## 6. URL Patterns by Category and Exchange

| Category | URL Pattern | Notes |
|----------|-------------|-------|
| `registration` | Exchange affiliate URL (see `affiliateLinks.default`) | Use T09A/T09B capture script |
| `bonus_referral_landing` | Same as registration | Pre-auth bonus landing |
| `fees` | Exchange official fee page (see `evidence.sources.fees.url`) | Public page |
| `proof_of_reserves` | Exchange PoR page (see `evidence.sources.proof_of_reserves.url`) | Public page |
| `spot` | `https://{exchange}/trade/{BTC-USDT}` or equivalent | Public read-only chart |
| `futures` | `https://{exchange}/trade-market/futures/` or equivalent | Public read-only chart |
| `p2p` | Exchange P2P marketplace URL (see `evidence.sources.p2p.url`) | Public marketplace listing |
| `mobile_app` | App Store / Google Play listing URL | Public store page |
| `bonus` | Post-login: `/earn`, `/rewards`, `/bonus-center`, `/tasks` | Auth required |
| `deposit` | Post-login: `/deposit`, `/asset/deposit` | Auth required — scroll past addresses |
| `kyc` | Post-login: `/verify`, `/kyc`, `/account/verification` | Auth required — mask personal data |

---

## 7. Exchange-Level Capture Priority

Priority ranking for which exchanges to capture first, based on:
1. Current EMS score (higher EMS = more evidence value from screenshots)
2. Traffic / affiliate importance
3. Missing screenshot slots

| Priority | Exchange | Missing Screenshots | EMS | Why First |
|----------|----------|--------------------|----|-----------|
| **#1** | OKX | 10/10 | 70 | P1 affiliate, now publish-safe, 0 screenshots |
| **#2** | MEXC | 10/10 | 71 | P1 affiliate, now publish-safe, 0 screenshots |
| **#3** | Bitget | 10/10 | 66 | P1 affiliate, 0 screenshots |
| **#4** | Binance | 2/10 | 71 | P1, missing bonus + KYC slots |
| **#5** | Bybit | 3/10 | 73 | Gold standard, missing 3 slots |
| **#6** | BingX | 10/10 | 65 | P2, 0 screenshots |
| **#7** | KuCoin | 10/10 | 68 | P2, 0 screenshots |
| **#8** | Gate.io | 10/10 | 67 | P2, 0 screenshots |

---

## 8. Evidence Destination Rules

| Source type | Initial destination | Final destination | Condition |
|-------------|--------------------|--------------------|-----------|
| Public playwright capture | `reports/manual-evidence/{slug}-screenshot-*.webp` | `public/screenshots/{slug}/{category}/` | Owner review |
| Authenticated playwright capture | `reports/screenshots-staged/{slug}/{category}/` | `public/screenshots/{slug}/{category}/` | Masking + owner approval |
| Manual owner upload (unmasked) | `reports/screenshots-staged/{slug}/{category}/{name}-raw.webp` | ❌ Never publish raw | Must be masked first |
| Manual owner upload (masked) | `reports/screenshots-staged/{slug}/{category}/{name}-masked.webp` | `public/screenshots/{slug}/{category}/` | Owner approval |
| App Store screenshot | `reports/screenshots-staged/{slug}/mobile_app/` | `public/screenshots/{slug}/mobile_app/` | Review for accuracy |

**Never:**
- Copy unmasked authenticated screenshots to `public/`
- Auto-publish any screenshot from `reports/` without an explicit owner approval step
- Include screenshots in git if they contain unmasked personal data

---

## 9. Canonical Screenshot Filenames

```
/public/screenshots/{exchange}/{category}/{geo}-{device}-{yyyy-mm}.webp

Examples:
  /public/screenshots/okx/registration/global-desktop-2026-06.webp
  /public/screenshots/mexc/bonus/global-desktop-2026-06.webp
  /public/screenshots/bybit/deposit/global-desktop-2026-06.webp
```

- `{geo}`: `global` (default), `eu`, `us`, `asia`
- `{device}`: `desktop` (1440×900), `mobile` (390×844 — iPhone 14 viewport)
- `{yyyy-mm}`: Year-month of capture (for freshness tracking)

---

## 10. Implementation Roadmap

| Phase | Scope | Method | Status |
|-------|-------|--------|--------|
| **Phase 1** | Public registration + bonus landing (all 14 exchanges) | `public_playwright` (T09A/T09B script) | In progress — MEXC ✅ OKX ✅ |
| **Phase 2** | Public fees + proof_of_reserves + spot + p2p (P1 exchanges) | `public_playwright` (new script) | Pending |
| **Phase 3** | Authenticated bonus center (P1 exchanges) | `authenticated_playwright` (new script) | Pending |
| **Phase 4** | Authenticated deposit methods (masked, P1 exchanges) | `authenticated_playwright` + masking | Pending |
| **Phase 5** | KYC status + security overview (manual owner upload) | `manual_owner_upload` | Pending |
| **Phase 6** | Account dashboard (masked, all exchanges) | `manual_owner_upload` | Pending |
| **Phase 7** | Mobile app screenshots (App Store) | `app_store_scrape` | Pending |

---

*This document is the canonical reference. Any script, task, or workflow that captures screenshots must link back to this matrix and comply with its rules.*
