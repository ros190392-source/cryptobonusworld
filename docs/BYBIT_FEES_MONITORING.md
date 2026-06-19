# Bybit Fee Rate Monitoring

**Last updated:** 2026-06-19  
**Status:** `verified_official_fee_page`  
**Canonical source:** https://www.bybit.com/en/announcement-info/fee-rate

---

## Verified fee values (2026-06-19)

| Market | Maker | Taker | Raw DOM cell |
|---|---|---|---|
| Spot | 0.1% | 0.1% | `0.1000 %/0.1000 %` |
| Perpetual & Futures | 0.02% | 0.055% | `0.0200 %/0.0550 %` |
| Options | 0.02% | 0.03% | `0.0200 %/0.0300 %` |

---

## Why direct fetch does not work

The Bybit fee rate page (`/en/announcement-info/fee-rate`) is a **Next.js SPA**. The fee table is populated entirely client-side:

1. The server returns a 37 KB HTML skeleton — no fee values in the markup.
2. `__NEXT_DATA__` contains only i18n label keys (`makerFee`, `takerFee` as translation strings), not rate values.
3. Fee values are fetched at runtime by the React component (`chunk 3175-7f5960f25b48e2a8.js`) via the internal endpoint `/x-api/s1/loyalty-program/get-vip-detail`.
4. That endpoint is **Akamai WAF-protected** — it returns HTTP 403 Access Denied to any direct curl/PowerShell/Node request that lacks a valid browser session fingerprint and cookies.
5. No public Bybit API endpoint (`v5/market/fee-rate`, `v5/account/fee-rate`, etc.) provides maker/taker fee rates without authentication.

**Conclusion:** Static HTTP fetch cannot extract fee values from this page. A real browser is required.

---

## Canonical extraction method: Real Chrome CDP

The only reliable non-authenticated method is **Playwright connected to a real Chrome browser via CDP**:

1. Chrome must be running with `--remote-debugging-port=9222`.
2. Playwright connects via `chromium.connectOverCDP('http://127.0.0.1:9222')`.
3. The page is navigated to the fee rate URL.
4. Each tab (Spot / Perpetual & Futures / Options) is clicked with selector fallbacks.
5. `page.waitForFunction()` polls `querySelectorAll('table td')` until cells populate (up to 25 s timeout).
6. Cell text is extracted directly from the DOM: format is `"0.1000 %/0.1000 %"` (4 decimal places + space before %).
7. Values are normalised for comparison: `"0.1000 %"` → `"0.1%"`.

### Run commands

```bash
# Source discovery (finds best accessible URL, tests all candidates)
node tools/evidence-capture/discover-bybit-fee-source.mjs --runner=local-chrome --cdp-port=9222

# Full fee check with evidence capture
node tools/evidence-capture/check-bybit-fees.mjs --runner=local-chrome --cdp-port=9222

# Per-tab CDP cell extraction (canonical)
node tools/evidence-capture/parse-bybit-fee-cells.mjs --cdp-port=9222
```

### Launch Chrome for CDP

```powershell
Start-Process -FilePath "chrome.exe" -ArgumentList "--remote-debugging-port=9222 --user-data-dir=C:\cbw-chrome-profile"
```

---

## Strict rules — no exceptions

| Rule | Reason |
|---|---|
| No login | All fee values are public non-VIP rates |
| No account creation | Not needed |
| No captcha bypass | Page loads without captcha for anonymous users |
| No competitor data | Only bybit.com / official Bybit API domains |
| No third-party fee pages | CoinGecko, CoinMarketCap, etc. are not authoritative |
| No automatic production copy changes | Fee changes require manual approval |

---

## Alert and approval workflow

If a monitoring run detects values that differ from the verified baseline:

1. Set `fees.json` → `monitoring_alert.triggered = true` and `monitoring_alert.mismatch_detected_at = <ISO date>`.
2. Set `fees.json` → `manual_review_required = true`.
3. Do **not** update the live page automatically.
4. Report the mismatch with raw DOM cell values from both the old and new run.
5. A human must review the official Bybit fee page, confirm the change, update `fees.json` values and `last_checked`, then approve a deploy.

### Fields auto-update is allowed for

- `last_checked`
- `evidence_snapshots`
- `monitoring_report`
- `capture_attempts`

### Fields requiring manual approval before any site update

- `fees.spot.maker` / `fees.spot.taker`
- `fees.perpetual_futures.maker` / `fees.perpetual_futures.taker`
- `fees.options.maker` / `fees.options.taker`
- `page_fee_wording`
- `cta_text`
- `deployment`
- `article_content`

---

## Evidence files

| File | Description |
|---|---|
| `evidence/bybit/global-en/raw/desktop-1440/02-fees-page.png` | Full fee rate page screenshot |
| `evidence/bybit/global-en/raw/desktop-1440/02-fees-page-spot.png` | Spot tab after click |
| `evidence/bybit/global-en/raw/desktop-1440/02-fees-page-futures.png` | Perpetual & Futures tab after click |
| `evidence/bybit/global-en/raw/desktop-1440/02-fees-page-options.png` | Options tab after click |
| `evidence/bybit/global-en/raw/desktop-1440/02-fees-page.html` | Full page HTML snapshot |
| `evidence/bybit/global-en/raw/desktop-1440/02-fees-page-text.txt` | Page innerText |
| `evidence/bybit/global-en/report/fee-extraction-structured.json` | Structured extraction result with method notes |
| `data/exchanges/bybit/fees.json` | Authoritative fee record for the site |

---

## Recommended monitoring schedule

Weekly — run `parse-bybit-fee-cells.mjs` on a machine with Chrome running CDP. Compare raw cell values against the verified baseline. Alert on any difference.

Bybit fee changes are rare and typically announced in advance, but non-VIP standard rates do change during exchange-wide fee restructures.
