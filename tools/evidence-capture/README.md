# CBW Evidence Capture — v2

Captures real screenshots of exchange registration and promo pages as verifiable evidence for bonus code articles.

## When to use each mode

| Mode | Use when | Blocked by |
|---|---|---|
| `playwright` | Exchange allows headless browsers | Nothing (simple cases) |
| `real-chrome-cdp` | Exchange blocks headless Chromium (Akamai/Cloudflare) | Nothing — uses real Chrome |
| `android-adb` | Need proof from real mobile device | FLAG_SECURE (Samsung Knox) |

**Bybit requires `real-chrome-cdp` or `android-adb`** — Akamai blocks all headless Playwright sessions via HTTP/2 fingerprinting, including real Chrome/Edge launched headless.

---

## Usage

```bash
# Basic
node tools/evidence-capture/capture-evidence.mjs <exchange> <locale> [--mode=MODE] [options]

# Examples
node tools/evidence-capture/capture-evidence.mjs bybit global-en --mode=playwright
node tools/evidence-capture/capture-evidence.mjs bybit global-en --mode=real-chrome-cdp
node tools/evidence-capture/capture-evidence.mjs bybit global-en --mode=android-adb
node tools/evidence-capture/capture-evidence.mjs bybit global-en --mode=android-adb --unlock-delay=30

# Single viewport
node tools/evidence-capture/capture-evidence.mjs bybit global-en --mode=real-chrome-cdp --viewport=desktop-1440

# Config check only (no capture)
node tools/evidence-capture/capture-evidence.mjs bybit global-en --dry-run

# Custom CDP port
node tools/evidence-capture/capture-evidence.mjs bybit global-en --mode=real-chrome-cdp --cdp-port=9223
```

### Options

| Option | Default | Description |
|---|---|---|
| `--mode` | `playwright` | `playwright` / `real-chrome-cdp` / `android-adb` |
| `--viewport` | all configured | single viewport: `mobile-390`, `mobile-360`, `desktop-1440` |
| `--unlock-delay` | `25` | seconds to wait for phone unlock (ADB mode) |
| `--cdp-port` | `9222` | Chrome DevTools Protocol port (CDP mode) |
| `--dry-run` | off | print config and exit, no capture |

---

## Mode 1: playwright

Standard Playwright Chromium. Works for exchanges that do not block headless browsers.

**No setup required** — just run the command.

---

## Mode 2: real-chrome-cdp

Connects to a real Chrome instance running on your machine via Chrome DevTools Protocol. Bypasses headless detection because the browser is a genuine non-headless Chrome session.

### Setup

1. **Close all Chrome windows** (optional but cleaner — avoids tab conflicts)

2. **Launch Chrome with CDP enabled:**
   ```cmd
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir=C:\cbw-chrome-profile
   ```
   Or create a shortcut with this target.

3. **Verify Chrome is ready:**
   Open `http://127.0.0.1:9222/json/version` in another browser — you should see JSON.

4. **Run the capture:**
   ```bash
   node tools/evidence-capture/capture-evidence.mjs bybit global-en --mode=real-chrome-cdp
   ```

The script opens pages in your visible Chrome window. Do not click or type while it runs.

---

## Mode 3: android-adb

Captures a screenshot from a real Android phone via USB. Most authoritative evidence — shows exactly what a real user on a real mobile device sees.

### Setup

1. **Enable Developer Options:**
   Settings → About Phone → tap "Build Number" 7 times

2. **Enable USB Debugging:**
   Settings → Developer Options → USB Debugging → ON

3. **Install Android Platform Tools (ADB):**
   Download: https://developer.android.com/tools/releases/platform-tools
   Extract to `C:\tools\platform-tools\`

4. **Connect phone via USB** (data cable, not charge-only)

5. **Authorize the connection** — dialog appears on phone, tap "Allow":
   ```cmd
   C:\tools\platform-tools\adb.exe devices
   ```

6. **Run the capture:**
   ```bash
   node tools/evidence-capture/capture-evidence.mjs bybit global-en --mode=android-adb
   ```

### Samsung Knox / FLAG_SECURE

Samsung Galaxy + Chrome + financial/crypto pages triggers FLAG_SECURE. `screencap` returns a black image (~15-22 KB). This is Samsung Knox — independent of Chrome's "Content Protection" setting; disabling it does NOT help.

**Workaround:** when the script detects a black screencap, it prompts you to press **Power + Volume Down** on the phone to take a manual screenshot. The script then pulls only files created after a timestamp marker, so it will not accidentally import old screenshots from your gallery.

---

## URLs used

The script uses `partnerUrl` from `exchanges.config.json` as the primary URL. If that fails (e.g. redirect chain issues on ADB), it falls back to `observedFinalUrl`.

| Field | Bybit value |
|---|---|
| `partnerUrl` | `https://partner.bybit.com/b/CRYPTOBONUSW` |
| `observedFinalUrl` | `https://www.bybit.com/en/sign-up?affiliate_id=75062&group_id=1892311&group_type=1&ref_code=CRYPTOBONUSW` |
| `localRedirect` | `http://localhost:4322/go/bybit` |

The `localRedirect` is **not** used for capture — it is the on-site redirect URL only.

---

## Language modal detection

On first visit, Bybit may show a language/region selector. The script detects this via `language_modal_strings` in the config (`"Choose Your Language"`, `"Select Language"`, etc.) and logs it as a warning. In a future version the script will auto-dismiss the modal; for now, if you see the modal during a CDP capture, close it manually and re-run.

---

## Evidence folder structure

```
evidence/
  bybit/
    global-en/
      manifest.json            ← status of all captures for this exchange/locale
      raw/
        mobile-390/
          01-signup-page.png   ← unedited capture
          01-signup-page.html  ← page source snapshot
        mobile-360/
        desktop-1440/
      processed/
        mobile-390/            ← annotated (arrows, highlights) — added manually
        mobile-360/
        desktop-1440/
      report/
        playwright-*.json      ← per-run report
        android-adb-*.json
      _legacy-android-adb/     ← old test captures from v1
      _legacy-playwright/
      _legacy-real-chrome-cdp/

public/media/exchanges/bybit/evidence/global-en/
  ← site-ready files copied here after approval
```

### manifest.json

Tracks the state of every capture slot:

```json
{
  "mobile": { "raw": "evidence/…/raw/mobile-390/01-signup-page.png", "status": "manual_review" },
  "desktop": { "raw": null, "status": "pending" },
  "recommendation": "manual_review_needed",
  "approved_for_site": false
}
```

---

## Status values

| Status | Meaning |
|---|---|
| `match` | Promo code CRYPTOBONUSW found in rendered page HTML/text |
| `not_detected` | Sign-up page loaded but code not found |
| `field_visible_code_missing` | Referral/promo field visible, code not pre-filled |
| `captcha_or_blocked` | Cloudflare/captcha/bot detection triggered |
| `geo_blocked` | Exchange geo-restricted for this IP |
| `redirect_error` | Navigation error — page never loaded |
| `manual_review` | Page loaded (or gallery screenshot), requires human inspection |
| `error` | Script error (ADB not found, Chrome not running, etc.) |
| `pending` | Not yet captured |

---

## Adding a new exchange

Edit `exchanges.config.json`:

```json
{
  "mexc": {
    "name": "MEXC",
    "code": "mexc-bonus-code",
    "locales": {
      "global-en": {
        "partnerUrl": "https://www.mexc.com/register?inviteCode=mexc-bonus-code",
        "observedFinalUrl": "https://www.mexc.com/register?inviteCode=mexc-bonus-code",
        "localRedirect": "http://localhost:4322/go/mexc",
        "expectedFinalDomain": "mexc.com",
        "locale": "en-US",
        "country": "global",
        "acceptLanguage": "en-US,en;q=0.9",
        "viewports": ["mobile-390", "mobile-360", "desktop-1440"],
        "detection": {
          "codes": ["mexc-bonus-code"],
          "labels": ["Referral Code", "Promo Code", "Invitation Code", "Sign Up", "Register"],
          "english_strings": ["Email", "Create Account", "Sign Up"],
          "language_modal_strings": []
        }
      }
    }
  }
}
```

---

## Ethics and constraints

**Do NOT:**
- Inject promo codes into screenshots after capture
- Edit or composite screenshots
- Bypass or simulate captcha
- Create exchange accounts or submit registration forms
- Deploy captured evidence to the site without manual approval
- Reuse old screenshots from your device's gallery

**Site update gate:**
Captured evidence is stored in `evidence/` only. It does not automatically update any article page. Updating `src/pages/<exchange>/index.astro` requires a separate, manually approved task.

**Why this matters:**
Visitors trust that screenshots show what they will actually see. Faked or edited screenshots constitute misleading advertising, expose the site to legal liability, and destroy the credibility of the review. Every screenshot must be authentic, unedited, and captured without interacting with any form.

---

## Evidence types

Each exchange/locale has three independent evidence slots:

| Type | Purpose | Screenshot slug |
|---|---|---|
| `code` | Proves CRYPTOBONUSW appears in the referral/promo field | `01-signup-page.png` |
| `bonus` | Proves the bonus offer visible after opening the partner link | `02-bonus-offer-page.png` |
| `terms` | Optional — captures bonus tasks, conditions, and limits | `03-terms-page.png` |

All three are tracked in `manifest.json` under `evidence.code`, `evidence.bonus`, `evidence.terms`.

---

## Site claim vs. detected values

`manifest.json` contains a `site_claim` block — the structured source of truth for what the article claims:

```json
"site_claim": {
  "code": "CRYPTOBONUSW",
  "bonus_text": "Up to 30,000 USDT",
  "bonus_max_amount": 30000,
  "bonus_currency": "USDT",
  "valid_month": "June 2026"
}
```

The `match` block records whether detected evidence agrees with the claim:

```json
"match": {
  "code_match_status": "match | not_detected | field_visible_code_missing | manual_review | error",
  "bonus_match_status": "match | partial_match | mismatch | not_detected | manual_review | error",
  "overall_offer_status": "verified | partially_verified | needs_manual_review | mismatch | not_usable"
}
```

**Status rules:**

| code | bonus | overall_offer_status |
|---|---|---|
| match | match | verified |
| match | partial_match | partially_verified |
| match | not_detected | partially_verified |
| match | mismatch | mismatch |
| not_detected | any | needs_manual_review |

---

## Bonus detection terms (Bybit)

When reviewing or automating bonus evidence, look for:

- `30,000` / `30000`
- `USDT`
- `Welcome Gifts`
- `Welcome Bonus`
- `Rewards`
- `New User Rewards`
- `Deposit Bonus`
- `Get My Welcome Gifts`
- `Tasks`

**Partial match:** page shows "Get My Welcome Gifts" but no USDT amount → `bonus_match_status = partial_match`
**Full match:** page shows "Up to 30,000 USDT" or equivalent → `bonus_match_status = match`
**Mismatch:** page shows a different amount → `bonus_match_status = mismatch`

---

## Periodic recheck — planning notes

A daily/weekly checker (planned: `scripts/verify-bonus-capture.mjs`) must compare:

| Field | Check |
|---|---|
| `code_expected` vs `detected_code` | Exact string match |
| `site_claim.bonus_max_amount` vs `detected_bonus_amount` | Numeric match |
| `site_claim.bonus_currency` vs `detected_bonus_currency` | String match |
| `site_claim.bonus_text` vs `detected_bonus_text` | Fuzzy/substring match |
| `observedFinalUrl` domain | Still resolves to correct exchange |
| `language` | Still English for global-en |

**On mismatch, the checker must:**
1. Set `match.bonus_match_status = mismatch` (or relevant status)
2. Set `match.overall_offer_status = mismatch`
3. Update `match.last_checked`
4. Write alert to `reports/daily-bonus-watch-YYYY-MM-DD.md`
5. Send Telegram alert if `TELEGRAM_CHAT_ID` is set in `.env`

**The checker must NOT automatically:**
- Change visible bonus amount on the site
- Swap the article screenshot
- Change the active promo code
- Update CTA offer text

**Allowed automatic updates (no approval gate):**
- `match.last_checked`
- `match.code_match_status`
- `match.bonus_match_status`
- `match.overall_offer_status`
- Evidence report JSON files

**Requires manual approval before site update:**
- `approved_for_site = true`
- Site image copy (`public/media/...`)
- Article page content (`src/pages/<exchange>/index.astro`)
- CTA/bonus text visible to users

---

## Where to capture bonus evidence (Bybit)

The sign-up page (`01-signup-page.png`) shows "Get My Welcome Gifts" but typically does **not** show "30,000 USDT" — this is a partial match only.

To get full bonus evidence, capture one of these screens:

| Priority | Screen | URL / path | Shows amount? |
|---|---|---|---|
| ⭐⭐⭐ | Partner landing page | `https://partner.bybit.com/b/CRYPTOBONUSW` | Usually yes |
| ⭐⭐⭐ | Bybit Welcome Gifts page | After sign-up redirect → Rewards/Tasks | Yes — task list with amounts |
| ⭐⭐ | New User Bonus page | `bybit.com/en/bonus/` or rewards section | Yes |
| ⭐ | Sign-up page | Current `01-signup-page.png` | Only "Get My Welcome Gifts" — partial |

Capture rules:
- English UI required for global-en
- No private data
- No form submission
- No account creation
- Real device or real browser preferred (Bybit blocks headless)
