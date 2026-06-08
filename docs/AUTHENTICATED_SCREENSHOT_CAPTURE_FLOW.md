# Authenticated Screenshot Capture Flow

**Version:** 1.0
**Created:** 2026-06-08
**Sprint:** Sprint 07
**Status:** ACTIVE — safe flow for authenticated and sensitive screenshot capture
**Owner:** Chief Project Owner (ROLE 0)
**Primary roles:** ROLE 5 (Screenshot Director), ROLE 18 (Post-Production), ROLE 33 (Ethics/Privacy), ROLE 38 (Screenshot Factory Lead)

> This document defines the only sanctioned flow for capturing screenshots that require a logged-in
> session or show sensitive UI. It complements `MULTILINGUAL_SCREENSHOT_FACTORY_STANDARD.md`
> (`captureType: authenticated | owner_manual`) and is invoked at pipeline stage 13 of the Gold Page
> Operating System whenever an auth-gated screenshot is needed.

---

## 1. Scope

This flow applies to authenticated / sensitive captures:

- **KYC** — Verification Center / identification status (tier badges, NOT documents)
- **account limits** — deposit/withdrawal limit tables
- **Rewards Center** — bonus hub, task tiers, voucher list
- **email entered state** — registration with email typed but NOT submitted
- **app / account settings** — non-sensitive settings panels
- **payment examples** — illustrative card/bank/PIX method screens (NOT real account details)

It does NOT apply to public pages (use the standard public capture flow / `capture-public-p2p-screenshot.mjs`).

---

## 2. Absolute Rules

**Raw sensitive screenshots stay in `reports/`. Never publish raw.**

- **Crop preferred over blur.** When sensitive data can be excluded by cropping, crop it out entirely
  rather than blurring it — a crop cannot be reversed; a blur sometimes can.
- **Blur only after crop, if still needed.** If a sensitive element cannot be cropped away (it sits
  among content we must keep), blur it in the processed copy.
- **Forbidden in any capture (absolute — crop or do not capture):**
  - identity documents
  - selfies / liveness frames
  - verification codes
  - 2FA secrets / QR codes
  - balances
  - wallet / deposit / withdrawal addresses
  - payment account details (card numbers, IBANs, account names)
  - chats
- **Owner approval required before anything reaches `public/`** (ROLE 33 ethics pass + ROLE 0 approval).

If a screen cannot be made safe by cropping, it is not captured.

---

## 3. Folder Structure

```
reports/screenshots/{exchange}/{section}/raw/         # raw capture — sensitive — NEVER published, NEVER committed
reports/screenshots/{exchange}/{section}/processed/   # cropped + (if needed) blurred candidate for review
public/screenshots/{exchange}/{section}/              # approved asset ONLY — after ROLE 33 + ROLE 0
```

- `raw/` is gitignored (under `reports/`) and never leaves the machine.
- `processed/` holds the review candidate (sensitive data already cropped/blurred).
- `public/` receives the file only after the full approval gate.

---

## 4. The Flow

```
1. CAPTURE (raw)        ROLE 5 / owner   → reports/screenshots/{exchange}/{section}/raw/
   - authenticated session; capture the screen
   - owner_manual for the most sensitive steps (KYC, email verification, payment examples)

2. TRIAGE              ROLE 33           → confirm what is sensitive; decide crop vs blur
   - mark forbidden elements that must be removed

3. PROCESS             ROLE 18           → reports/screenshots/{exchange}/{section}/processed/
   - CROP out sensitive regions first (URL bar, OS chrome, PII, forbidden elements)
   - BLUR only residual sensitive elements that could not be cropped
   - convert/resize per SCREENSHOT_STANDARD (WebP, ≤1440px)

4. ETHICS REVIEW       ROLE 33           → pass/fail
   - verify zero forbidden elements remain (§2)
   - hard veto if any private data is visible

5. FACTORY REVIEW      ROLE 38           → quality, correctness, right section/language/GEO

6. OWNER APPROVAL      ROLE 0            → final publish authority

7. PROMOTE             ROLE 38 / 10      → public/screenshots/{exchange}/{section}/
   - only the processed, approved file is copied
   - raw/ is never promoted

8. REGISTER            ROLE 38           → asset registry + Claim Ledger screenshotEvidence link
```

A capture that fails any review returns to PROCESS (re-crop) or is rejected and archived
(`screenshot-factory/rejected/{exchange}.json`).

---

## 5. Per-Section Guidance

| Section | Capture type | Crop / mask guidance |
|---------|-------------|----------------------|
| KYC / Verification Center | owner_manual | Keep tier badges + "Verified" status + limits; CROP the entire Personal Information block (name, DOB, document, address, email); blur Account ID if it cannot be cropped |
| account limits | authenticated | Keep limit table; crop any balance/UID header |
| Rewards Center | authenticated | Keep task tiers + voucher structure; crop personal balances |
| email entered state | owner_manual | Email typed but NOT submitted; use a demo address; CROP the address or use an obviously-demo value; URL bar cropped |
| app / account settings | authenticated | Keep settings layout; crop email/phone/UID; never show 2FA secret/QR |
| payment examples | owner_manual | Illustrative method selection only; NEVER real card/bank/account details; stop before entering any payment data |

---

## 6. Relationship to Other Docs

- `MULTILINGUAL_SCREENSHOT_FACTORY_STANDARD.md` — defines `captureType` (`authenticated`, `owner_manual`); this doc is the *how* for those types.
- `SCREENSHOT_STANDARD.md` — file naming, WebP, size rules for the processed/public output.
- `GOLD_PAGE_OPERATING_SYSTEM.md` — invokes this flow at stage 13 for auth screenshots.
- `CLAIM_EVIDENCE_LEDGER_STANDARD.md` — an approved auth asset becomes P4 manual-tester evidence linked from a claim's `screenshotEvidence`.

---

## 7. No-Autopublish

No raw or processed screenshot moves to `public/` without ROLE 33 ethics review AND ROLE 0 approval.
No script copies from `raw/` or `processed/` to `public/` automatically. The `raw/` folder is never
committed.

---

*Document version 1.0 — 2026-06-08 — Sprint 07*
*Owner: Chief Project Owner (ROLE 0)*
*Roles: ROLE 5, ROLE 18, ROLE 33, ROLE 38*
*Governance reference: `docs/MULTILINGUAL_SCREENSHOT_FACTORY_STANDARD.md`; `docs/SCREENSHOT_STANDARD.md`; `docs/GOLD_PAGE_OPERATING_SYSTEM.md`*
