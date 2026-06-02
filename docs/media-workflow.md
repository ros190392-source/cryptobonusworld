# Media Replacement Workflow

## The Problem

Cloudflare CDN caches static assets with `Cache-Control: public, max-age=31536000, immutable`.
Replacing a file with the **same filename** → Cloudflare keeps serving the old version for up to **1 year**.

## The Solution

**Every replaced image gets a new filename with a content hash.**

`bybit-step-05.jpg` → `bybit-step-05-a3f92b11.jpg`

New filename = new URL = Cloudflare has no cache for it = user sees new image immediately.

---

## Quick Start

### Replace a screenshot (with auto-deploy)

```bash
npm run media-update -- "C:\path\to\new-screenshot.jpg" bybit-step-05 --deploy
```

### Replace a screenshot (build manually after)

```bash
npm run media-update -- "C:\path\to\new-screenshot.jpg" bybit-step-05
npm run deploy
```

### Deploy only (no image changes)

```bash
npm run deploy
```

---

## How It Works

### `npm run media-update -- <source> <canonical-name> [--deploy]`

1. **Hashes** the source file (SHA-256, first 8 chars)
2. **Copies** to `public/media/walkthroughs/{exchange}/{canonical}-{hash}.{ext}`
3. **Updates** all references in `src/data/**/*.ts` automatically
4. **Deploys** if `--deploy` flag is passed

### `npm run deploy`

1. Deletes `dist/` and `.astro/` cache
2. Runs `astro build` from scratch
3. Packages into `dist.tar.gz`
4. Uploads to server via SCP
5. Extracts on server, removes old files

---

## Naming Convention

| Type | Canonical name | Example output |
|------|---------------|----------------|
| Account setup steps | `bybit-step-05` | `bybit-step-05-a3f92b11.jpg` |
| P2P flow | `bybit-p2p-04` | `bybit-p2p-04-c91f3a02.jpg` |
| Bank receipt | `bybit-p2p-bank` | `bybit-p2p-bank-88de01aa.jpg` |
| MEXC steps | `mexc-step-01` | `mexc-step-01-77bc4490.png` |

**Rules:**
- Canonical name = `{exchange}-{flow}-{step}` — no version numbers, no dates
- Version is always the content hash — two identical files get the same hash (deduplication)
- Extension is preserved from source (`.jpg`, `.png`, `.webp`)

---

## File Locations

All walkthrough screenshots live in:
```
public/media/walkthroughs/
  bybit/
    bybit-step-01-{hash}.jpg
    bybit-p2p-04-{hash}.jpg
    ...
  mexc/
    mexc-step-01-{hash}.jpg
  okx/
  ...
```

Data references are in:
```
src/data/exchange-walkthroughs.ts
```

---

## Cache Layers Explained

| Layer | TTL | How we bypass |
|-------|-----|---------------|
| Browser | Varies | New filename = different URL |
| Cloudflare CDN | 7 days (walkthroughs) | New filename = MISS on first request |
| Cloudflare CDN | 1 year (logos/CSS/JS) | These assets don't change |
| Nginx | Serves fresh file | Files replaced on every deploy |
| Astro build cache | Cleared on `npm run deploy` | `rm -rf dist .astro` before build |

---

## Manual Workflow (without the script)

If you add a file manually:

1. Place file in `public/media/walkthroughs/{exchange}/`
2. **Use a new name** — add `-v2`, `-v3`, or a date: `bybit-step-05-v2.jpg`
3. Update `src/data/exchange-walkthroughs.ts`: change the `src:` value
4. Run `npm run deploy`

**Never overwrite an existing filename** — Cloudflare will serve the old version.

---

## Dry Run (preview without changes)

```bash
npm run media-update -- "C:\path\to\new.jpg" bybit-step-05 --dry-run
```

Shows what would change without touching any files.

---

## Troubleshooting

### Image still shows old version

1. Check Cloudflare headers: `curl -sI https://cryptobonusworld.com/media/walkthroughs/bybit/{filename} | grep cf-cache`
2. If `cf-cache-status: HIT` → the old filename was used. Create a new name.
3. If `cf-cache-status: MISS` → image is fresh from server. Clear browser cache (`Ctrl+Shift+R`).

### Script says "No references found"

The canonical name doesn't match anything in `src/data/`. Either:
- The step uses a different canonical name (check `exchange-walkthroughs.ts`)
- It's a new step — add `src: '/media/walkthroughs/{exchange}/{new-filename}'` manually
