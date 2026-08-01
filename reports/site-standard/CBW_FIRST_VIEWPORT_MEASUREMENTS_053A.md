# CBW First-Viewport Measurements — 053A

Generated: 2026-08-01T21:37:31.922Z

Authoritative workflow:
- run `30719436985`;
- artifact `8824403620`;
- digest `sha256:eacb4fda3883599eb8d0db94e043d84b340c06d26358cf6ed6b647cd377e5cc9`.

## Summary

- Measurements: 54
- First-screen passes: 48
- First-screen failures: 6
- Overflow failures: 0
- Measurements with unexpected errors: 0

## Homepage — P0 failure

- desktop-1440x900: **FAIL**; rankingTop=909.75; fullRows=0; rowsBegun=0; blankBeforeRanking=836.75
- tablet-768x1024: **FAIL**; rankingTop=1139.5; fullRows=0; rowsBegun=0; blankBeforeRanking=1074.5
- mobile-390x844: **FAIL**; rankingTop=1637.8; fullRows=0; rowsBegun=0; blankBeforeRanking=1572.8

The homepage currently renders an oversized hero plus the three-card pathway section before the canonical Top-10. The ranking is outside all three target first viewports.

## Other first-screen failures

The following routes are redirect/retired stubs whose meta-refresh reaches the homepage composition. They fail the family first-screen contract on mobile and require governed redirect/template ownership rather than visual patching:

- `/guides/` at mobile-390x844: usefulTop=1135.72
- `/guides/how-crypto-bonuses-work/` at mobile-390x844: usefulTop=1135.72
- `/countries/` at mobile-390x844: usefulTop=1135.72

## Representative measurements

| Route | Family | Viewport | First screen | Useful top | Widest container | Overflow |
| --- | --- | --- | --- | ---: | ---: | ---: |
| / | homepage | desktop-1440x900 | FAIL | 909.75 | 1160 | 0 |
| / | homepage | tablet-768x1024 | FAIL | 1139.5 | 768 | 0 |
| / | homepage | mobile-390x844 | FAIL | 1637.8 | 390 | 0 |
| /bybit/ | exchange-review | desktop-1440x900 | PASS | 561.44 | 760 | 0 |
| /bybit/ | exchange-review | tablet-768x1024 | PASS | 550.78 | 760 | 0 |
| /bybit/ | exchange-review | mobile-390x844 | PASS | 515.09 | 390 | 0 |
| /mexc/ | exchange-review | desktop-1440x900 | PASS | 561.44 | 760 | 0 |
| /mexc/ | exchange-review | mobile-390x844 | PASS | 515.09 | 390 | 0 |
| /okx/ | exchange-review | desktop-1440x900 | PASS | 561.44 | 760 | 0 |
| /okx/ | exchange-review | mobile-390x844 | PASS | 515.09 | 390 | 0 |
| /exchanges/ | exchange-directory | desktop-1440x900 | PASS | 572.27 | 1180 | 0 |
| /exchanges/ | exchange-directory | mobile-390x844 | PASS | 514.88 | 390 | 0 |
| /promo-codes/ | promo-directory | desktop-1440x900 | PASS | 659.11 | 1180 | 0 |
| /promo-codes/ | promo-directory | mobile-390x844 | PASS | 665.81 | 390 | 0 |
| /methodology/ | methodology-trust | desktop-1440x900 | PASS | 711.14 | 1180 | 0 |
| /methodology/ | methodology-trust | mobile-390x844 | PASS | 750.69 | 390 | 0 |
| /faq/ | faq | desktop-1440x900 | PASS | 542.72 | 840 | 0 |
| /faq/ | faq | mobile-390x844 | PASS | 525.69 | 390 | 0 |
| /about/ | methodology-trust | desktop-1440x900 | PASS | 315.42 | 860 | 0 |
| /affiliate-disclosure/ | legal-contact | desktop-1440x900 | PASS | 427.05 | 860 | 0 |
| /contact/ | legal-contact | mobile-390x844 | PASS | 301.81 | 390 | 0 |

## Width divergence confirmed

The measured public families currently use at least these effective desktop widths:

- homepage shell: 1160px;
- wide directory/table routes: 1180px;
- exchange article routes: 760px;
- FAQ: 840px;
- trust/legal/contact: 860px;
- tablet/mobile routes frequently expand to the full viewport.

These widths must be mapped to the frozen Wide / Standard / Prose / Narrow roles rather than remain page-local values.

## Completion boundary

This report is a baseline only. It does not authorize ranking, offer, affiliate, GEO, locale, merge or deployment changes.
