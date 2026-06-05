# Screenshot Standard
**Project:** CryptoBonusWorld  
**Version:** 1.0  
**Created:** 2026-06-05  
**Sprint:** 03  
**Status:** ACTIVE — governing reference for all screenshot operations

---

## 1. Primary Standard — New Screenshots

All new screenshots must follow this path format:

```
public/screenshots/{exchange}/{slot}/{scope}-{device}-{YYYY-MM}.webp
```

### Examples

```
public/screenshots/binance/registration/global-desktop-2026-06.webp
public/screenshots/bybit/kyc/global-desktop-2026-06.webp
public/screenshots/okx/bonus/eu-desktop-2026-06.webp
public/screenshots/mexc/fees/global-desktop-2026-06.webp
public/screenshots/bitget/registration/global-mobile-2026-06.webp
```

### Field Definitions

| Field | Description | Allowed values |
|-------|-------------|----------------|
| `{exchange}` | Exchange slug | `binance`, `bybit`, `okx`, `mexc`, `bitget`, etc. |
| `{slot}` | Content category | See Slot Registry below |
| `{scope}` | Geographic / audience variant | `global`, `eu`, `ru`, `cis`, `us`, `local` |
| `{device}` | Capture device type | `desktop`, `mobile` |
| `{YYYY-MM}` | Capture date (year-month) | `2026-06`, `2026-07`, etc. |
| Format | Always WebP | `.webp` — no JPG, no PNG for new captures |

---

## 2. Slot Registry

| Slot | Category | Gallery label | Capture type |
|------|----------|---------------|--------------|
| `registration` | Registration page (public) | "Registration" | Public |
| `kyc` | KYC verification flow | "KYC flow" | Authenticated (manual) |
| `bonus` | Bonus / rewards page | "Bonus page" | Public |
| `bonus_referral_landing` | Affiliate landing page | "Bonus landing" | Public (affiliate URL) |
| `fees` | Fee schedule page | "Fees" | Public |
| `deposit` | Deposit page (post-login) | "Deposit" | Authenticated (manual) |
| `p2p` | P2P trading interface | "P2P" | Public or authenticated |
| `spot` | Spot trading page | "Spot trading" | Public |
| `futures` | Futures / derivatives page | "Futures" | Public |
| `proof_of_reserves` | Proof of Reserves page | "Proof of reserves" | Public |
| `mobile_app` | Mobile app screenshot | "Mobile app" | App Store / manual |
| `security` | Security settings page | *(future)* | Authenticated (manual) |
| `withdrawal` | Withdrawal page | **FORBIDDEN** — SR-02 | Hard block |

**Prohibited slots:** Never capture `withdrawal`, `api_keys`, `wallet_address`, `balance`, `personal_documents`.  
See `docs/SCREENSHOT_COVERAGE_MATRIX.md` for full safety matrix.

---

## 3. Evidence Registry Rules

Every screenshot shown to users **must be registered** in the exchange's evidence file:

```
src/data/evidence/{exchange}.json → screenshots.{slot}
```

### Registry Entry Format

```json
"{slot}": {
  "status": "available",
  "path": "/screenshots/{exchange}/{slot}/{scope}-{device}-{YYYY-MM}.webp",
  "capturedAt": "YYYY-MM",
  "geo": "GLOBAL",
  "device": "desktop",
  "notes": "Optional editorial note"
}
```

### Status Values

| Status | Meaning | Gallery renders? |
|--------|---------|-----------------|
| `available` | File on disk, verified, safe to show | ✅ Yes |
| `needs_manual_capture` | Slot exists but screenshot not yet taken | ❌ No |
| `not_applicable` | Feature does not exist on this exchange | ❌ No |
| `outdated` | Screenshot is stale (>3 months old) | ❌ No |
| `archived` | Replaced by newer capture | ❌ No |

**Rule:** Only `status: "available"` entries render in the `ScreenshotGallery` on exchange review pages. All other statuses suppress the slot.

### Path Rule

- `path` must start with `/screenshots/`
- `path` must point to a file that physically exists in `public/`
- No relative paths, no `/media/walkthroughs/` paths

---

## 4. Gallery Display Rules

The `ScreenshotGallery` component renders on `/exchanges/{slug}/` pages when at least one screenshot has `status: "available"`.

```
src/pages/exchanges/[slug].astro → ScreenshotGallery
```

**Filter applied at build time:**
- `entry.status === 'available'` AND
- `entry.path !== null` AND
- `entry.path.startsWith('/screenshots/')`

Only qualifying entries render. Pages with zero qualifying entries render no gallery section (no empty block).

---

## 5. Walkthrough Screenshot Rules

Walkthrough steps use `WalkthroughStepImage.astro`. Rules:

| Condition | Behavior |
|-----------|----------|
| `src` provided + real file exists | Show real screenshot |
| `screenshotStatus: 'not_applicable'` | Omit slot entirely |
| `screenshotStatus` set + no `src` | Render `ScreenshotPlaceholder` (compact, no user-visible empty block) |
| No `screenshotStatus` and no `src` | **Suppress entirely** (no placeholder, no block) |

**Policy:** Large "Screenshot in preparation" blocks must never render to users. The suppression logic in `WalkthroughStepImage.astro` (line ~109) was added in Sprint 03 to enforce this.

---

## 6. Legacy Policy — Bybit Walkthrough Screenshots

**Location:** `public/media/walkthroughs/bybit/`

These screenshots are used by the Bybit walkthrough flows in `exchange-walkthroughs.ts`:
- `bybit-step-*.webp` (registration flow)
- `bybit-kyc-*.webp` (KYC flow)
- `bybit-dep-*.webp` (deposit flow)
- `bybit-p2p-*.webp` (P2P flow)
- `bybit-fut-*.webp` (futures flow)
- `bybit-spot-*.webp` (spot flow)

**Status:** LEGACY KEEP — these files are actively referenced in walkthroughs and must not be deleted or renamed.

**Migration plan:** When Bybit walkthrough is refreshed with new screenshots, the new files should go to `public/screenshots/bybit/{slot}/global-desktop-{YYYY-MM}.webp`. The legacy `/media/walkthroughs/bybit/` files can then be archived. This migration is deferred until walkthrough content refresh (post Sprint 03).

**Legacy JPG files in `media/walkthroughs/bybit/`:** `.jpg` files in this directory are the source originals kept for reference alongside their `.webp` companions. Do not delete them — they are the source-of-truth for the walkthrough images.

---

## 7. Orphan File Policy

An orphan file is one that exists on disk but is not registered in any evidence file and is not referenced in `exchange-walkthroughs.ts`.

### Classified Orphans (Sprint 03)

| File | Classification | Action |
|------|---------------|--------|
| `public/screenshots/bybit/bonus/global-desktop-2026-06.jpg` | **Archive candidate** | Keep for now; the `.webp` version is registered as `bonus: available`. The `.jpg` is a legacy source file. Do not register. Do not delete yet. |
| `public/screenshots/okx/bonus_referral_landing/global-desktop-2026-06.webp` | **Archive candidate** | OKX bonus_referral_landing content was intentionally moved to the `bonus` slot (already `available`). This file is redundant. Do not register. Do not delete yet. |
| `public/media/walkthroughs/mexc/1.png` | **Orphan — never used** | Single unexplained PNG in MEXC walkthrough directory. Not referenced in `exchange-walkthroughs.ts`. No walkthrough flow exists for MEXC. Document and archive when cleanup sprint runs. |
| `public/media/walkthroughs/bybit/CryptoBonusWorld.com - Идея сайта для бонусов.html` (+ `_files/`) | **Archive candidate — wrong directory** | This is a saved Claude.ai conversation export (site design ideas), not a screenshot. It should not be in `public/media/walkthroughs/`. Safe to move to a non-public location or delete. Does NOT affect any rendered page. |
| `public/screenshots/_archive/bybit/*.jpg` and `*.webp` (130+ files) | **Pre-classified archive** | Already in `_archive/` subdirectory. Not referenced anywhere. Not served to users. Keep as source material archive. Do not migrate. |

### Future Orphan Handling

When a new cleanup sprint runs:
1. Export list of all files in `public/screenshots/` and `public/media/walkthroughs/`
2. Cross-reference against evidence registry and `exchange-walkthroughs.ts`
3. Files not referenced anywhere → move to `public/screenshots/_archive/{exchange}/`
4. Update this document

---

## 8. What NOT to Commit

| Item | Rule |
|------|------|
| Real account screenshots (authenticated, unmasked) | **NEVER** — go to `reports/authenticated-screenshots/` first |
| Screenshots showing balances, emails, UIDs, phone numbers | **NEVER** without masking |
| JPG files as new captures | **NEVER** — always convert to WebP before committing |
| Files with spaces or special characters in filenames | **NEVER** — use `-` separators only |
| Screenshots not following `{scope}-{device}-{YYYY-MM}.webp` naming | **NEVER** for new captures |
| Files in `public/media/walkthroughs/` (except Bybit legacy keep) | **AVOID** — use `public/screenshots/` for all new captures |

---

## 9. Adding a New Screenshot — Checklist

1. ✅ Capture as WebP (convert if necessary)
2. ✅ Name: `{scope}-{device}-{YYYY-MM}.webp`
3. ✅ Place at: `public/screenshots/{exchange}/{slot}/`
4. ✅ Register in `src/data/evidence/{exchange}.json` with `status: "available"`
5. ✅ Verify `path` starts with `/screenshots/` and file physically exists
6. ✅ Run `npm run audit:screenshots` — CI errors must be 0
7. ✅ Run `npm run build` — 207 pages, 0 errors
8. ✅ Verify screenshot appears in gallery on `/exchanges/{slug}/` page
9. ✅ Commit evidence file and screenshot together

---

## 10. Future Migration Plan

| Task | Priority | Trigger |
|------|----------|---------|
| Register `okx/bonus_referral_landing` if a distinct affiliate landing page screenshot is captured (different from current `okx/bonus`) | P3 | When OKX affiliate landing page is recaptured |
| Migrate Bybit walkthrough to new standard (`public/screenshots/bybit/{slot}/`) | P2 | When Bybit walkthrough content is refreshed |
| Delete `public/media/walkthroughs/mexc/1.png` | P3 | Any cleanup sprint |
| Move `public/media/walkthroughs/bybit/CryptoBonusWorld.com - Идея сайта...` to non-public location | P2 | Next cleanup sprint |
| Archive `public/screenshots/bybit/bonus/global-desktop-2026-06.jpg` | P3 | After next Bybit bonus screenshot refresh |
| Populate `bonus_referral_landing` for MEXC, Bitget (high-value exchanges) | P2 | When screenshots are captured |

---

## 11. Governance Reference

| Document | Purpose |
|----------|---------|
| `docs/SCREENSHOT_STANDARD.md` | **This file** — naming, slots, policy |
| `docs/SCREENSHOT_COVERAGE_MATRIX.md` | Safety matrix, capture methods, forbidden slots |
| `docs/screenshot-style-guide.md` | Visual standards, crop guidelines, annotations |
| `docs/screenshot-checklist.md` | Per-capture QA checklist |
| `src/data/evidence/{exchange}.json` | Registry source of truth per exchange |
| `scripts/audit-screenshot-registry.mjs` | CI enforcement script |

---

*Document created: 2026-06-05 | Sprint 03 | CryptoBonusWorld Screenshot Standardization*
