# cbw-votes — exchange code voting API

Minimal Node service powering the star-rating + "Works for me" widgets on the six
live exchange pages. Static site deploys (`npm run deploy`) never touch it.

## Production layout (23.88.106.140)

| What | Where |
|---|---|
| Service code | `/opt/cbw-votes/server.mjs` (copy of `server/votes/server.mjs`) |
| Data | `/var/lib/cbw-votes/votes.json` (owned by `www-data`, survives site deploys) |
| systemd unit | `/etc/systemd/system/cbw-votes.service` (copy of `server/votes/cbw-votes.service`) |
| nginx | `location = /api/exchange-votes { proxy_pass http://127.0.0.1:8787; ... }` inside the cryptobonusworld server block |

## API

- `GET /api/exchange-votes?exchange=bybit` (optional header `X-CBW-User: <uuid>`)
- `POST /api/exchange-votes` with `{"exchange","type":"rating","rating":1..5}` or
  `{"exchange","type":"helpful","helpful":"works"|"didnt_work"}` (header `X-CBW-User` required)
- Response: `{exchange, ratingCount, averageRating, worksCount, didntWorkCount, userRating, userHelpfulVote}`
- One vote per (user, exchange, type); re-voting overwrites, never double-counts.
- Slug whitelist: bybit, mexc, okx, bitget, kucoin, bingx. Everything else → 400.
- Rate limit: 30 req/min per IP (in-memory; IPs never persisted).

## Update procedure

```bash
scp -i ~/.ssh/cryptovek_id server/votes/server.mjs root@23.88.106.140:/opt/cbw-votes/server.mjs
ssh -i ~/.ssh/cryptovek_id root@23.88.106.140 "systemctl restart cbw-votes && systemctl status cbw-votes --no-pager -l | head -5"
```

## Local testing

```bash
CBW_VOTES_DATA=./votes-test.json CBW_VOTES_PORT=8787 node server/votes/server.mjs
```
