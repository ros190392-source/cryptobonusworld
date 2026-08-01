# CBW Site Shell v2 and Exchange CTA Normalization — 052G

## Product objective

Create one coherent visual shell across CryptoBonusWorld while preserving all governed ranking, offer, affiliate and route data.

## Global shell

- navy evidence-led header aligned with Homepage v2;
- desktop navigation: Top 10, Exchanges, Promo Codes, How We Verify;
- compact Global / EN context display without activating country or locale routes;
- mobile menu with the same information architecture;
- primary header CTA points to the existing `/#exchanges` Top-10, never the removed `/#finder` anchor;
- footer uses the same brand, borders, spacing, typography and evidence language;
- no links to uncreated `/countries/` or locale routes.

## Exchange CTA pattern

- CTA stays inside the readable content container;
- mobile width is constrained by page padding, never viewport-edge to viewport-edge;
- target height 48–52 px mobile and 52–56 px desktop;
- radius, type weight, focus state and disclosure spacing are shared;
- affiliate labels and destination URLs are unchanged;
- Bybit is the first repaired implementation;
- subsequent exchange pages must consume the same component or token contract.

## Safety boundaries

- no ranking/order/status changes;
- no offer, promo code or affiliate destination changes;
- no public country or locale activation;
- no merge or deploy without CI, independent diff review and Chromium desktop/tablet/mobile QA.
