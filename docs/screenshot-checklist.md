# Screenshot Capture Checklist
**CryptoBonusWorld — Operations**
Generated: 2026-05-25 | Status: 0 / 69 captured

---

## How to Replace a Placeholder with a Real Screenshot

1. Capture screenshot at exact dimensions listed below
2. Export as `.webp` (quality 85) — fallback `.png` acceptable
3. Place in `/public/media/exchanges/{slug}/` or `/public/media/walkthroughs/{slug}/`
4. In `exchange-media-registry.ts` set `src: '/media/...'`, `capturedAt: 'YYYY-MM'`
5. In `mediaConfig.ts` set the corresponding `uiScreenshotDate`/`bonusScreenshotDate`
6. Run `npm run build` and verify image renders in the gallery
7. Tick off below

---

## PRIORITY 1 — Bybit (highest traffic, primary CTA target)

### Exchange Media Assets
| # | Type | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 1 | Trading UI | Desktop | 1280×720 | `/media/exchanges/bybit/ui-2026-05.webp` | ☐ |
| 2 | Rewards Hub | Desktop | 800×450 | `/media/exchanges/bybit/bonus-2026-05.webp` | ☐ |
| 3 | P2P Buy USDT | Mobile | 390×844 | `/media/exchanges/bybit/p2p-mobile-2026-05.webp` | ☐ |
| 4 | Futures Interface | Desktop | 1280×720 | `/media/exchanges/bybit/futures-2026-05.webp` | ☐ |

### Walkthrough — Registration (5 steps)
| # | Label | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 5 | Homepage + Sign Up button | Desktop | 1280×720 | `/media/walkthroughs/bybit/reg-01-homepage.webp` | ☐ |
| 6 | Registration form | Desktop | 1280×720 | `/media/walkthroughs/bybit/reg-02-form.webp` | ☐ |
| 7 | Email verification code | Desktop | 800×500 | `/media/walkthroughs/bybit/reg-03-verify.webp` | ☐ |
| 8 | 2FA setup screen | Desktop | 800×500 | `/media/walkthroughs/bybit/reg-04-2fa.webp` | ☐ |
| 9 | Welcome bonus claim screen | Desktop | 800×500 | `/media/walkthroughs/bybit/reg-05-bonus.webp` | ☐ |

### Walkthrough — P2P Buy (6 steps)
| # | Label | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 10 | P2P Trading menu location | Desktop | 1280×720 | `/media/walkthroughs/bybit/p2p-01-menu.webp` | ☐ |
| 11 | P2P filter panel | Desktop | 1280×720 | `/media/walkthroughs/bybit/p2p-02-filter.webp` | ☐ |
| 12 | Seller listing detail | Desktop | 800×500 | `/media/walkthroughs/bybit/p2p-03-listing.webp` | ☐ |
| 13 | Order placed with payment details | Desktop | 800×500 | `/media/walkthroughs/bybit/p2p-04-order.webp` | ☐ |
| 14 | Mobile banking payment screen | Mobile | 390×844 | `/media/walkthroughs/bybit/p2p-05-banking.webp` | ☐ |
| 15 | Confirm payment sent button | Desktop | 800×500 | `/media/walkthroughs/bybit/p2p-06-confirm.webp` | ☐ |

### Walkthrough — Deposit (4 steps)
| # | Label | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 16 | Assets and Deposit menu | Desktop | 1280×720 | `/media/walkthroughs/bybit/dep-01-menu.webp` | ☐ |
| 17 | Coin and network selection | Desktop | 800×500 | `/media/walkthroughs/bybit/dep-02-network.webp` | ☐ |
| 18 | Deposit address + copy button | Desktop | 800×500 | `/media/walkthroughs/bybit/dep-03-address.webp` | ☐ |
| 19 | Sending USDT from external wallet | Desktop | 800×500 | `/media/walkthroughs/bybit/dep-04-send.webp` | ☐ |

### Walkthrough — Futures (5 steps)
| # | Label | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 20 | Wallet transfer Spot→Futures | Desktop | 800×500 | `/media/walkthroughs/bybit/fut-01-transfer.webp` | ☐ |
| 21 | Derivatives USDT Perpetual page | Desktop | 1280×720 | `/media/walkthroughs/bybit/fut-02-market.webp` | ☐ |
| 22 | Leverage slider | Desktop | 800×500 | `/media/walkthroughs/bybit/fut-03-leverage.webp` | ☐ |
| 23 | TP/SL settings panel | Desktop | 800×500 | `/media/walkthroughs/bybit/fut-04-tpsl.webp` | ☐ |
| 24 | Order confirmation | Desktop | 800×500 | `/media/walkthroughs/bybit/fut-05-confirm.webp` | ☐ |

---

## PRIORITY 2 — Binance

### Exchange Media Assets
| # | Type | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 25 | Spot Trading | Desktop | 1280×720 | `/media/exchanges/binance/ui-2026-05.webp` | ☐ |
| 26 | P2P Marketplace | Desktop | 1280×720 | `/media/exchanges/binance/p2p-2026-05.webp` | ☐ |
| 27 | Welcome Bonus page | Desktop | 800×450 | `/media/exchanges/binance/bonus-2026-05.webp` | ☐ |

### Walkthrough — Registration (5 steps)
| # | Label | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 28 | Homepage + Register button | Desktop | 1280×720 | `/media/walkthroughs/binance/reg-01-homepage.webp` | ☐ |
| 29 | Registration form | Desktop | 1280×720 | `/media/walkthroughs/binance/reg-02-form.webp` | ☐ |
| 30 | Email verification | Desktop | 800×500 | `/media/walkthroughs/binance/reg-03-verify.webp` | ☐ |
| 31 | 2FA setup | Desktop | 800×500 | `/media/walkthroughs/binance/reg-04-2fa.webp` | ☐ |
| 32 | Anti-phishing code setup | Desktop | 800×500 | `/media/walkthroughs/binance/reg-05-antiphish.webp` | ☐ |

### Walkthrough — KYC (5 steps)
| # | Label | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 33 | Identity Verification page | Desktop | 1280×720 | `/media/walkthroughs/binance/kyc-01-landing.webp` | ☐ |
| 34 | Country + document type selection | Desktop | 800×500 | `/media/walkthroughs/binance/kyc-02-docs.webp` | ☐ |
| 35 | Document photo upload | Desktop | 800×500 | `/media/walkthroughs/binance/kyc-03-upload.webp` | ☐ |
| 36 | Facial recognition scan | Mobile | 390×844 | `/media/walkthroughs/binance/kyc-04-face.webp` | ☐ |
| 37 | KYC submitted confirmation | Desktop | 800×500 | `/media/walkthroughs/binance/kyc-05-confirm.webp` | ☐ |

### Walkthrough — P2P (5 steps)
| # | Label | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 38 | Buy Crypto → P2P dropdown | Desktop | 1280×720 | `/media/walkthroughs/binance/p2p-01-nav.webp` | ☐ |
| 39 | P2P filter options | Desktop | 1280×720 | `/media/walkthroughs/binance/p2p-02-filter.webp` | ☐ |
| 40 | P2P order form | Desktop | 800×500 | `/media/walkthroughs/binance/p2p-03-order.webp` | ☐ |
| 41 | Order with payment details | Desktop | 800×500 | `/media/walkthroughs/binance/p2p-04-details.webp` | ☐ |
| 42 | Transferred button | Desktop | 800×500 | `/media/walkthroughs/binance/p2p-05-confirm.webp` | ☐ |

---

## PRIORITY 3 — MEXC

### Exchange Media Assets
| # | Type | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 43 | Trading Interface | Desktop | 1280×720 | `/media/exchanges/mexc/ui-2026-05.webp` | ☐ |
| 44 | Bonus Page | Desktop | 800×450 | `/media/exchanges/mexc/bonus-2026-05.webp` | ☐ |
| 45 | Mobile App | Mobile | 390×844 | `/media/exchanges/mexc/app-2026-05.webp` | ☐ |

### Walkthrough — Registration + Trading (9 steps)
| # | Label | Device | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 46 | Homepage + Sign Up | Desktop | 1280×720 | `/media/walkthroughs/mexc/reg-01-homepage.webp` | ☐ |
| 47 | Registration form | Desktop | 1280×720 | `/media/walkthroughs/mexc/reg-02-form.webp` | ☐ |
| 48 | Email verification | Desktop | 800×500 | `/media/walkthroughs/mexc/reg-03-verify.webp` | ☐ |
| 49 | Account security + bonus panel | Desktop | 800×500 | `/media/walkthroughs/mexc/reg-04-bonus.webp` | ☐ |
| 50 | Spot trading interface | Desktop | 1280×720 | `/media/walkthroughs/mexc/trade-01-interface.webp` | ☐ |
| 51 | Trading pair selector | Desktop | 800×500 | `/media/walkthroughs/mexc/trade-02-pairs.webp` | ☐ |
| 52 | Order book and chart | Desktop | 1280×720 | `/media/walkthroughs/mexc/trade-03-orderbook.webp` | ☐ |
| 53 | Spot order form | Desktop | 800×500 | `/media/walkthroughs/mexc/trade-04-order.webp` | ☐ |
| 54 | Order confirmation | Desktop | 800×500 | `/media/walkthroughs/mexc/trade-05-confirm.webp` | ☐ |

---

## PRIORITY 4 — Other Exchanges (1 UI screenshot each minimum)

| # | Exchange | Type | Dimensions | File Path | Status |
|---|---|---|---|---|---|
| 55 | OKX | Spot UI | 1280×720 | `/media/exchanges/okx/ui-2026-05.webp` | ☐ |
| 56 | OKX | P2P | 1280×720 | `/media/exchanges/okx/p2p-2026-05.webp` | ☐ |
| 57 | KuCoin | Spot UI | 1280×720 | `/media/exchanges/kucoin/ui-2026-05.webp` | ☐ |
| 58 | KuCoin | Mobile App | 390×844 | `/media/exchanges/kucoin/app-2026-05.webp` | ☐ |
| 59 | Bitget | Spot UI | 1280×720 | `/media/exchanges/bitget/ui-2026-05.webp` | ☐ |
| 60 | Bitget | Futures | 1280×720 | `/media/exchanges/bitget/futures-2026-05.webp` | ☐ |
| 61 | BingX | Spot UI | 1280×720 | `/media/exchanges/bingx/ui-2026-05.webp` | ☐ |
| 62 | Gate.io | Spot UI | 1280×720 | `/media/exchanges/gate-io/ui-2026-05.webp` | ☐ |
| 63 | HTX | Spot UI | 1280×720 | `/media/exchanges/htx/ui-2026-05.webp` | ☐ |
| 64 | CoinEx | Spot UI | 1280×720 | `/media/exchanges/coinex/ui-2026-05.webp` | ☐ |
| 65 | Coinbase | Advanced Trade | 1280×720 | `/media/exchanges/coinbase/ui-2026-05.webp` | ☐ |
| 66 | Coinbase | Mobile App | 390×844 | `/media/exchanges/coinbase/app-2026-05.webp` | ☐ |
| 67 | Phemex | Futures | 1280×720 | `/media/exchanges/phemex/futures-2026-05.webp` | ☐ |
| 68 | Bitunix | Futures | 1280×720 | `/media/exchanges/bitunix/futures-2026-05.webp` | ☐ |
| 69 | LBank | Spot UI | 1280×720 | `/media/exchanges/lbank/ui-2026-05.webp` | ☐ |

---

## Technical Capture Spec

### Dimensions
| Use Case | Width | Height | Format |
|---|---|---|---|
| Exchange UI (desktop) | 1280px | 720px | `.webp` q85 |
| Exchange bonus page | 800px | 450px | `.webp` q85 |
| Mobile app / P2P mobile | 390px | 844px | `.webp` q85 |
| Walkthrough step (desktop) | 800px | 500px | `.webp` q85 |
| Futures interface | 1280px | 720px | `.webp` q85 |
| Compare visual | 1200px | 400px | `.webp` q85 |

### Browser Setup
- Browser: Chrome, 100% zoom
- Desktop viewport: 1440×900 (screenshot crops to 1280×720)
- Mobile emulation: iPhone 14 Pro (390×844)
- Dark mode: ON (site is dark — screenshots should match)
- Language: English
- Ad blocker: ON (avoid banner clutter)
- Remove: cookie banners, chat widgets, pop-ups before capture

### File Naming
```
/public/media/exchanges/{slug}/{type}-{YYYY-MM}.webp
/public/media/walkthroughs/{slug}/{flow}-{step}-{desc}.webp
```

### After Capture
1. Optimise: `cwebp -q 85 input.png -o output.webp`
2. Verify: dimensions match spec, file size < 300KB
3. Upload to `/public/media/` in the project
4. Update registry (see "How to Replace" at top of this file)

---

## CLS Verification

All placeholder slots use CSS `aspect-ratio` — layout space is reserved before image loads.
**No CLS when real images are added, provided `width` and `height` props are set.**

When wiring a real image into `WalkthroughStepImage` or `ScreenshotCard`, always include:
```
width={1280}    // or 800 / 390 per spec above
height={720}    // or 500 / 844 per spec above
```

## ImageObject Schema

Schema.org `ImageObject` JSON-LD **only emits when `src` is provided** — no invalid schema from placeholders.
When adding real screenshots, set `schema={true}` on `ScreenshotCard` to activate schema emission.
Required for schema: `src`, `alt`, `width`, `height`, `capturedAt`.

---

## Progress Tracker

| Exchange | UI | Bonus | App | Walkthrough | Total |
|---|---|---|---|---|---|
| Bybit | ☐ | ☐ | ☐ | 0/20 | 0/23 |
| Binance | ☐ | ☐ | — | 0/15 | 0/18 |
| MEXC | ☐ | ☐ | ☐ | 0/9 | 0/12 |
| OKX | ☐ | — | — | — | 0/2 |
| KuCoin | ☐ | — | ☐ | — | 0/2 |
| Bitget | ☐ | — | — | — | 0/2 |
| BingX | ☐ | — | — | — | 0/1 |
| Gate.io | ☐ | — | — | — | 0/1 |
| HTX | ☐ | — | — | — | 0/1 |
| CoinEx | ☐ | — | — | — | 0/1 |
| Coinbase | ☐ | — | ☐ | — | 0/2 |
| Phemex | ☐ | — | — | — | 0/1 |
| Bitunix | ☐ | — | — | — | 0/1 |
| LBank | ☐ | — | — | — | 0/1 |
| **TOTAL** | | | | | **0 / 69** |
