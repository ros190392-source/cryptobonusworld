# cbw-votes — exchange code voting API (runbook)

Minimal Node service powering the star-rating + "Works for me" widgets on the six
live exchange pages. Static site deploys (`npm run deploy`) never touch it.

> ⚠️ **Never reset or edit production votes (`/var/lib/cbw-votes/votes.json`)
> without explicit owner approval.** Displayed ratings must always come from
> real stored votes.

## Production layout (23.88.106.140)

| What | Where |
|---|---|
| Service code | `/opt/cbw-votes/server.mjs` (copy of `server/votes/server.mjs`) |
| Backup script | `/opt/cbw-votes/backup.sh` (copy of `server/votes/backup.sh`) |
| Data | `/var/lib/cbw-votes/votes.json` (owned by `www-data`, survives site deploys) |
| Backups | `/var/backups/cbw-votes/votes-YYYYMMDD-HHMMSS.json` (last 30 kept, daily 03:30 UTC) |
| systemd service | `/etc/systemd/system/cbw-votes.service` (`Restart=always`, hardened, `User=www-data`) |
| systemd backup | `/etc/systemd/system/cbw-votes-backup.{service,timer}` |
| nginx | `location = /api/exchange-votes` and `location = /api/exchange-votes-health` → `proxy_pass http://127.0.0.1:8787` in the cryptobonusworld server block |

**Node path gotcha:** node on this host is a snap. The unit must exec the raw
binary `/snap/node/current/bin/node` — `/snap/bin/node` goes through
snap-confine, which cannot run under the hardened unit (fails 203/EXEC).

## API

- `GET /api/exchange-votes?exchange=bybit` (optional header `X-CBW-User: <uuid>`)
- `POST /api/exchange-votes` with `{"exchange","type":"rating","rating":1..5}` or
  `{"exchange","type":"helpful","helpful":"works"|"didnt_work"}` (header `X-CBW-User` required)
- Response: `{exchange, ratingCount, averageRating, worksCount, didntWorkCount, userRating, userHelpfulVote}`
- `GET /api/exchange-votes-health` → `{"ok":true,"service":"cbw-votes","storage":"ok"}` (503 + `"storage":"error"` when the data dir is not writable)
- One vote per (user, exchange, type); re-voting overwrites, never double-counts.
- Slug whitelist: bybit, mexc, okx, bitget, kucoin, bingx. Everything else → 400.
- Rate limit: 30 req/min per IP (in-memory; IPs never persisted).

## Operations

```bash
SSH="ssh -i ~/.ssh/cryptovek_id root@23.88.106.140"

# Status / logs
$SSH "systemctl status cbw-votes --no-pager"
$SSH "journalctl -u cbw-votes -n 50 --no-pager"

# Healthcheck (public)
curl -s https://cryptobonusworld.com/api/exchange-votes-health

# Restart (votes are flushed to disk on SIGTERM — safe)
$SSH "systemctl restart cbw-votes"

# Manual backup now
$SSH "systemctl start cbw-votes-backup.service && ls -lt /var/backups/cbw-votes/ | head -3"

# Restore from a backup (STOP the service first so the file isn't overwritten)
$SSH "systemctl stop cbw-votes \
  && cp /var/backups/cbw-votes/votes-<STAMP>.json /var/lib/cbw-votes/votes.json \
  && chown www-data:www-data /var/lib/cbw-votes/votes.json \
  && systemctl start cbw-votes"
```

## Update procedure (code change)

```bash
scp -i ~/.ssh/cryptovek_id server/votes/server.mjs root@23.88.106.140:/opt/cbw-votes/server.mjs
ssh -i ~/.ssh/cryptovek_id root@23.88.106.140 "systemctl restart cbw-votes && sleep 1 && systemctl is-active cbw-votes"
curl -s https://cryptobonusworld.com/api/exchange-votes-health
```

## Deploy safety

- `npm run deploy` wipes only `/var/www/cryptobonusworld/html` — it can never
  touch `/opt/cbw-votes` or `/var/lib/cbw-votes`.
- nginx changes: always `nginx -t` before `systemctl reload nginx`; a pre-change
  backup of the site config lives at `/etc/nginx/cryptobonusworld.bak-before-votes-api-20260702`.
- `votes.json` and backup files must never be committed to the repo or exposed
  under the web root.

## Local testing

```bash
CBW_VOTES_DATA=./votes-test.json CBW_VOTES_PORT=8787 node server/votes/server.mjs
```
