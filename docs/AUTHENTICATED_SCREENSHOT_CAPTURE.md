# Authenticated Screenshot Capture

**Version:** 1.0
**Created:** 2026-06-04
**Governs:** `scripts/capture-authenticated-screenshot.mjs`
**Parent governance:** `docs/SCREENSHOT_COVERAGE_MATRIX.md`

---

## Purpose

Some exchange pages that are useful for editorial evidence — bonus centers, VIP fee tiers, KYC status badges, deposit method menus — are only visible after login. This document defines how CryptoBonusWorld captures those pages safely, without exposing personal account data, performing financial actions, or relying on the owner's personal browser session.

The capture script (`capture-authenticated-screenshot.mjs`) uses Playwright with a dedicated per-exchange browser profile stored locally. The owner logs in once using `--setup`, and subsequent `--live` runs reuse the saved profile. All output goes to a staging directory (`reports/authenticated-screenshots/`) for manual review before anything reaches `public/`.

---

## Safety Design

### Why Not Personal Chrome

The owner's personal Chrome profile contains active sessions for all exchanges used for real trading. Using it would risk:

- Accidental capture of real balances, transaction history, or API keys
- Session interference if the capture script navigates away from a sensitive page
- No isolation between "editorial screenshot account" and "real trading account"

The capture script uses a separate Playwright browser profile stored in `.playwright-profiles/{exchange}/`. This profile is:

- Tied to a dedicated low-balance screenshot account (not the owner's trading account)
- Never used for real financial transactions
- Isolated from the owner's personal browser data

### Allowed Actions

The script may:

- Navigate to an authenticated page using a saved browser profile
- Scroll vertically to reveal content
- Wait for page elements to load
- Dismiss safe popup elements (cookie banners, "not now" modals) by matching known safe text
- Apply CSS masking (blur) to personal data selectors before taking the screenshot
- Save the screenshot to the `reports/authenticated-screenshots/` staging area

### Forbidden Actions

The script must never:

- Click Deposit, Withdraw, Buy, Sell, Trade, Transfer, or any financial action button
- Submit any form
- Navigate to a domain not in the exchange's `ALLOWED_DOMAINS` list
- Capture any page in `FORBIDDEN_CATEGORIES` (hard block — the script exits with an error)
- Auto-publish any file to `public/` — all output stays in `reports/`
- Accept new terms, grant new permissions, or change account settings

---

## Browser Profile Storage

Each exchange gets a dedicated Playwright persistent browser profile directory:

```
.playwright-profiles/
  binance/          ← Playwright persistent context for Binance
  bybit/
  okx/
  mexc/
  bitget/
```

These directories contain browser state (cookies, localStorage, IndexedDB) for the screenshot account session. They are gitignored and stored locally only.

The `.auth/` directory (used for older Playwright `storageState` JSON files) and all `storageState*.json` / `cookies*.json` files are also gitignored.

**Never commit any of these files.** Session credentials in git are a security incident.

---

## Initial Setup

Before the first `--live` capture for any exchange, you must log in to the dedicated screenshot account and save the session to the Playwright profile. This is a one-time (or periodic) manual step.

### Step-by-step: Binance example

1. **Ensure the screenshot account exists.** Use a dedicated low-balance account for Binance — not your main trading account. The account must have KYC completed at the minimum tier required to view bonus center and deposit methods.

2. **Run setup mode.** This opens a headed Chromium browser at the Binance login URL:

   ```bash
   npm run screenshots:auth-login
   # or directly:
   node scripts/capture-authenticated-screenshot.mjs --setup --exchange binance
   ```

   The command `npm run capture:auth:setup:binance` is the canonical shorthand (add this to `package.json` if not present):

   ```bash
   node scripts/capture-authenticated-screenshot.mjs --setup --exchange binance
   ```

3. **Log in manually.** In the headed browser window, log in to the Binance screenshot account. Complete 2FA if prompted. Do not navigate to any sensitive pages (API keys, withdrawal).

4. **Close the browser.** Once logged in and the dashboard is visible, close the browser window. Playwright saves the session to `.playwright-profiles/binance/`.

5. **Verify the profile was saved:**

   ```
   .playwright-profiles/binance/   ← should now exist and contain browser data
   ```

6. **Repeat for each exchange** (bybit, okx, mexc, bitget).

Sessions expire. If a `--live` run detects a login redirect, re-run `--setup` for that exchange.

---

## Capturing Screenshots

### Dry run (default — no browser launched)

Running the script with no flags prints all categories, risk levels, and example commands:

```bash
node scripts/capture-authenticated-screenshot.mjs
```

### Live capture

All of the following flags are required together. This is intentional — no single flag accidentally triggers a live capture:

```bash
node scripts/capture-authenticated-screenshot.mjs \
  --live \
  --confirm-live \
  --exchange binance \
  --category bonus_center \
  --url https://www.binance.com/en/my/rewards
```

| Flag | Required | Purpose |
|------|----------|---------|
| `--live` | Yes | Enables live capture mode |
| `--confirm-live` | Yes | Second confirmation required alongside `--live` |
| `--exchange <slug>` | Yes | Target exchange (must be in allowed list) |
| `--category <cat>` | Yes | Target category (must be in allowed list) |
| `--url <url>` | Yes | Exact post-login URL to capture |
| `--verbose` | No | Print debug output |

### Output

Each successful capture writes two files to the staging area:

```
reports/authenticated-screenshots/{exchange}/{category}/{YYYY-MM-DD}.webp
reports/authenticated-screenshots/{exchange}/{category}/{YYYY-MM-DD}.json
```

The JSON sidecar records the exchange, category, URL captured, risk level, masking selectors applied, Playwright version, and `manualReviewRequired: true`. It is the paper trail for the review step.

If a file already exists for today's date, the script appends `-2`, `-3`, etc.

---

## Allowed Categories

All 13 allowed categories, with risk levels and masking requirements:

| Category | Description | Risk Level | Masking Required | Notes |
|----------|-------------|-----------|-----------------|-------|
| `rewards_center` | Exchange rewards hub — task lists, points balance | Low | UID, email fragment | Task amounts are editorial-relevant and may be shown |
| `bonus_center` | Bonus dashboard — vouchers, progress bars | Low | UID, email fragment | Alias of rewards_center on some exchanges |
| `task_center` | Mission/task center — earn criteria, completion status | Low | UID, email fragment | Do not show claimed amounts if they identify the account |
| `referral_center` | Referral program panel — tier, referred count | Low | UID, referral code, email | Mask personal referral codes |
| `fees_vip` | VIP/maker-taker fee schedule for logged-in tier | Low | UID, email fragment | Shows current fee tier — editorial value is the tier table |
| `kyc_status` | KYC verification level badge — tier completed | Medium | Name, document type, any document preview | Show status badge only — not document details |
| `security_overview` | 2FA status, device list, withdrawal whitelist | Medium | Email, phone, UID, device names, IP addresses | Shows what security options exist — not personal config |
| `account_dashboard` | Portfolio overview — asset list and layout | Medium | ALL balance values, UID, email, PnL values | Goal is UI layout — mask every numerical balance |
| `p2p_logged_in` | P2P marketplace (logged-in view) | Medium | UID, counterparty details, order amounts | Public listings only — mask any personal order data |
| `spot_logged_in` | Spot trading interface (logged-in view) | Medium | UID, email, any order history | Read-only chart/order book — do not interact with order form |
| `futures_logged_in` | Futures interface (logged-in view) | Medium | UID, email, position details, margin balance | Read-only — mask all position/balance data |
| `deposit_methods` | Deposit method menu — bank transfer, card, SEPA options | High | ALL wallet addresses, ALL QR codes | Scroll past or mask any generated crypto address section |
| `withdrawal_page` | Withdrawal page — method list (not confirmation) | High | ALL address fields, ALL amounts, ALL QR codes | Shows method options only — never the confirmation step |

---

## Forbidden Actions List

These are hard-blocked at the script level. The script will refuse to proceed and exit with an error.

**Forbidden categories** — the script exits if `--category` matches any of these:

| Forbidden Category | Reason |
|-------------------|--------|
| `api_keys` | Shows actual or partial API key strings — permanent credential exposure risk |
| `order_confirmation` | Confirms a real trade — irreversible financial action page |
| `withdrawal_confirmation` | Withdrawal address + amount confirmation — irreversible financial action |
| `security_change_confirmation` | Security setting change confirmation — account modification action |
| `password_change` | Password fields — obvious credential exposure risk |
| `2fa_setup` | 2FA seed/QR code — permanent credential exposure risk |
| `identity_documents` | Government ID, passport scan, selfie — protected personal data, never publishable |

**Forbidden button text** — the script detects and logs these but never clicks them:

Any button or link matching (case-insensitive): `deposit`, `withdraw`, `buy`, `sell`, `trade`, `transfer`, `confirm`, `submit`, `sign up`, `register`, `create account`, `api`, `login`, `log in`, `continue`, `get started`, `join now`, `open account`, `accept`, `allow`.

Detection is logged to the JSON sidecar as `forbiddenButtonsDetected` — it does not block the capture but is flagged for reviewer attention.

---

## Masking Strategy

Masking is **mandatory** for all authenticated screenshots. The capture script applies a two-phase approach automatically before saving any screenshot.

### Phase 1 — CSS Blur (semantic selectors)

A `<style>` block is injected applying `filter: blur(10px)` to elements whose class names signal personal data. Broad selectors are intentional — over-masking is acceptable, under-masking is not.

Masked selectors include: `[class*="email"]`, `[class*="phone"]`, `[class*="uid"]`, `[class*="balance"]`, `[class*="wallet-address"]`, `[class*="qr"]`, `canvas`, and 30+ more. QR codes receive an additional solid `#1a1a1a` overlay.

### Phase 2 — JavaScript Text-Node Scanning

The script walks all DOM text nodes and replaces sensitive values using the official masking formats:

| Data Type | Format | Example |
|-----------|--------|---------|
| First / last / full name | First letter + bullets | `A•••••` |
| Email | `first@domain` → partial mask | `r••••@••••.com` |
| Phone number | Keep last 2 digits | `+•• ••• ••• ••12` |
| UID / Account ID (8+ digits) | Keep last 2 digits | `UID: ••••••42` |
| Balance / asset amount | Completely hidden | `••••• USDT` |
| Wallet address (0x hex, bc1, Tron T…) | First 4 + last 4 | `0x12••••••••••••••••89A` |
| QR code | Solid dark overlay | (not visible) |
| API key / security key | Hidden completely | `••••••••••••••••` |
| Anti-phishing code | Hidden completely | `••••••` |
| KYC name / document number | Hidden completely | `••••••` |
| IP address / device name / session | Hidden completely | `••••••` |

### Publishing Gate

**`publishCandidate` is always `false` for authenticated screenshots.**

No authenticated screenshot can be moved to `public/` until:
1. ✅ Masking verified by owner (no unmasked personal data visible)
2. ✅ Owner explicitly approves
3. ✅ Metadata updated: `publishCandidate: true`

### Post-capture manual check (image editor)

If an automated mask missed a value (exchange-specific rendering may bypass DOM scanning):

1. Open `.webp` from `reports/authenticated-screenshots/{exchange}/{category}/`
2. Apply manual blur box over any unmasked sensitive data
3. Export as `{date}-reviewed.webp` in the same directory
4. Original file stays in `reports/` — **never published raw**

---

## Screenshot Review Workflow

All authenticated screenshots require explicit owner approval before use. The review gate is mandatory and cannot be skipped.

```
Capture
  |
  v
reports/authenticated-screenshots/{exchange}/{category}/{date}.webp
reports/authenticated-screenshots/{exchange}/{category}/{date}.json
  |
  v
[REVIEW] Owner opens .webp — checks for any unmasked personal data
  |
  +-- Personal data visible? --> Apply manual blur --> save as {date}-masked.webp
  |
  +-- No personal data visible? --> Approve as-is
  |
  v
[APPROVE] Copy approved file to:
  public/screenshots/{exchange}/{category}/{geo}-{device}-{yyyy-mm}.webp
  |
  v
[REGISTER] Update evidence registry with new screenshot path
```

**Rules:**

- Never copy an unmasked file directly from `reports/` to `public/`
- Never auto-publish — the copy step requires a deliberate manual action by the owner
- The `.json` sidecar must be retained in `reports/` as the audit record
- If the reviewer rejects a capture (wrong page, wrong content, cannot be safely masked), delete both `.webp` and `.json` from staging and recapture

---

## Session Management

### Session lifespan

Exchange sessions expire. Typical expiry windows:

| Exchange | Approximate Session Lifespan |
|----------|----------------------------|
| Binance | 7–14 days |
| Bybit | 14–30 days |
| OKX | 7–30 days |
| MEXC | 14–30 days |
| Bitget | 14–30 days |

If the `--live` run detects a login redirect (the script logs `session expired` or `login redirect detected`), the session for that exchange must be refreshed.

### Refreshing a session

Re-run `--setup` for the affected exchange:

```bash
node scripts/capture-authenticated-screenshot.mjs --setup --exchange binance
```

Log in again in the headed browser. Close the browser. The profile is updated.

### Low-balance account requirements

Each screenshot account must:

- Be a **dedicated account** used only for editorial screenshot capture — never for real trading
- Hold **less than $50 equivalent** (enough to access authenticated pages, not enough to matter if compromised)
- Have **KYC at the minimum tier** required to access bonus center and deposit methods
- Use a **dedicated email address** separate from the owner's personal email
- Have **2FA enabled** via an authenticator app (not SMS — more reliable for non-interactive use)
- Never be used for deposits, withdrawals, or trades

---

## .gitignore Requirements

The following patterns must be present in `.gitignore` to prevent credentials and session data from being committed:

```gitignore
# Screenshot harvester — session auth, raw captures, manual captures
.auth/
_raw-screenshots/
_manual-screenshots/
*.har
storageState*.json
cookies*.json

# Generated editorial reports — regenerated on demand, not tracked
reports/
```

The `.playwright-profiles/` directory (used by `capture-authenticated-screenshot.mjs`) must also be gitignored. Verify it is present:

```gitignore
# Playwright persistent browser profiles — contain session credentials
.playwright-profiles/
```

If `.playwright-profiles/` is not in `.gitignore`, add it before running `--setup` for the first time. Never run `git add .` or `git add -A` without confirming these directories are excluded.

---

## Quick Reference

```
# Show all categories, risk levels, example commands (no browser launched)
node scripts/capture-authenticated-screenshot.mjs

# Set up session for an exchange (opens headed browser — log in manually)
node scripts/capture-authenticated-screenshot.mjs --setup --exchange binance
node scripts/capture-authenticated-screenshot.mjs --setup --exchange bybit
node scripts/capture-authenticated-screenshot.mjs --setup --exchange okx
node scripts/capture-authenticated-screenshot.mjs --setup --exchange mexc
node scripts/capture-authenticated-screenshot.mjs --setup --exchange bitget

# Live capture (all 4 flags required)
node scripts/capture-authenticated-screenshot.mjs \
  --live --confirm-live \
  --exchange binance \
  --category bonus_center \
  --url https://www.binance.com/en/my/rewards

# Check output
ls reports/authenticated-screenshots/binance/bonus_center/

# After review — copy approved screenshot to public
# (manual step — no script, deliberate owner action)
cp reports/authenticated-screenshots/binance/bonus_center/2026-06-04-masked.webp \
   public/screenshots/binance/bonus/global-desktop-2026-06.webp
```

| Command Pattern | Purpose |
|----------------|---------|
| `node ... (no flags)` | Dry run — print plan only |
| `--setup --exchange <s>` | One-time login to save session |
| `--live --confirm-live --exchange <s> --category <c> --url <u>` | Live capture to staging |
| `--verbose` | Add debug output to any mode |

**Output location:** `reports/authenticated-screenshots/{exchange}/{category}/`
**Never auto-publish:** copy to `public/` only after manual owner review and masking.

---

*For the full category governance matrix and public capture rules, see `docs/SCREENSHOT_COVERAGE_MATRIX.md`.*
*For visual annotation and image export standards, see `docs/screenshot-style-guide.md`.*
