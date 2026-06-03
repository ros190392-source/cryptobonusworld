# CryptoBonusWorld — AI Operating Model
**Version:** 1.0
**Effective:** 2026-06-03

---

## 1. Overview

CryptoBonusWorld operates a hybrid human+AI editorial model. AI handles monitoring, verification,
and report generation. Humans control all approval gates, publishing decisions, and affiliate changes.

---

## 2. Active Agents

| Agent Role | Primary Scripts | Trigger |
|---|---|---|
| Bonus Verifier | verify-bonus-capture.mjs | CI cron / manual |
| Affiliate Auditor | audit-affiliate-links.mjs | CI cron / manual |
| Screenshot Harvester | harvest-exchange-screenshots.mjs | Manual only |
| Screenshot Orchestrator | orchestrate-screenshot-capture.mjs | Manual only |
| Evidence Snapshot Agent | evidence-snapshot.mjs | Called by Bonus Verifier |
| Telegram Reporter | *-telegram-report.mjs | CI cron every 6h |
| Critical Alert Agent | monitor-telegram-critical.mjs | CI cron / manual |
| SEO Auditor | audit-seo-titles.mjs, audit-schema.mjs | Manual / CI |
| Article Blueprint Auditor | audit-article-blueprints.mjs | Manual / CI |
| Content Brief Generator | generate-content-brief.mjs | Manual |

---

## 3. Approval Queues

### 3.1 Bonus Update Queue
- **File:** reports/bonus-update-proposals.json
- **Populated by:** verify-bonus-capture.mjs (on detected mismatch)
- **Reviewed by:** human via `npm run bonus:proposals`
- **Applied by:** human via `npm run bonus:approve` or `npm run bonus:approve:all`

### 3.2 Screenshot Refresh Queue
- **File:** reports/screenshot-refresh-queue.json
- **Populated by:** evidence-snapshot.mjs (on screenshot hash change)
- **Reviewed by:** human
- **Actioned by:** human runs harvest script for specific exchange

### 3.3 Evidence Update Queue
- **File:** reports/evidence-update-queue.md
- **Populated by:** evidence-update-queue.mjs
- **Reviewed by:** human
- **Priority filter:** `npm run evidence:queue:p1` for P1 exchanges only

---

## 4. Monitoring Loop (every 6h)

```
telegram-reports.yml (GitHub Actions, main branch, ref: master)
    ├── npm run bonus:verify:all         → reports all exchange bonus statuses
    ├── npm run affiliate:report         → reports affiliate link health
    ├── npm run screenshots:report       → reports screenshot staleness
    ├── npm run bonus:telegram-report    → sends to Telegram
    ├── npm run affiliate:telegram-report→ sends to Telegram
    ├── npm run screenshots:telegram-report → sends to Telegram
    └── npm run monitor:telegram:summary → sends combined severity summary
```

---

## 5. Critical Alert Flow

```
critical-alerts.yml (GitHub Actions, manual dispatch)
    ├── npm run bonus:verify:all
    ├── npm run affiliate:report
    └── npm run monitor:telegram:critical  → sends ONLY if critical issues found
                                           → exits 0 silently if all OK
```

---

## 6. Screenshot Factory

```
Manual trigger → orchestrate-screenshot-capture.mjs
    ├── Loads screenshot registry (screenshot-registry.ts)
    ├── Filters: autoRefresh=true AND status=missing|outdated
    ├── For each entry:
    │   ├── Check safetyLevel (skip AUTH_SENSITIVE, MANUAL, SKIP)
    │   ├── Launch Playwright
    │   ├── Navigate to captureUrl
    │   ├── Wait for selector (if defined)
    │   ├── Capture screenshot
    │   ├── Process: resize + optimize (process-screenshot.mjs)
    │   ├── Annotate (annotate-screenshot.mjs)
    │   └── Queue for human approval
    └── Human reviews via screenshots:approve
```

---

## 7. Bonus Verification Flow

```
verify-bonus-capture.mjs --exchange X [--region GLOBAL]
    ├── Load affiliate URL from exchange data
    ├── Launch Playwright (with locale/proxy if non-GLOBAL region)
    ├── Navigate → track redirect chain
    ├── Extract bonus text from page
    ├── Take screenshot → SHA-256 hash
    ├── Compare with previous hash (evidence-snapshot.mjs)
    ├── If hash changed → addToRefreshQueue()
    ├── If bonus mismatch → add to bonus-update-proposals.json
    └── saveEvidenceSnapshot() → reports/evidence-snapshots/
```

---

## 8. Editorial Automation Roadmap

| Phase | Feature | Status |
|---|---|---|
| v1 | Article blueprints (10 types) | Done |
| v1 | Content brief generator | Done |
| v1 | Article blueprint audit | Done |
| v2 | Apply blueprints to existing pages | Pending |
| v2 | Auto-generate FAQ schema from evidence | Pending |
| v2 | Yandex Metrika event tracking (10 events) | Pending |
| v3 | Multilingual content architecture | Planned |
| v3 | Automated content freshness updates | Planned |
| v4 | AI-drafted content with human approval | Planned |

---

## 9. GitHub Actions Secrets Required

| Secret | Purpose | Required |
|---|---|---|
| TELEGRAM_BOT_TOKEN | Telegram bot auth | Yes |
| TELEGRAM_CHAT_ID | Target chat | Yes |
| PROXY_PL_URL | Poland proxy | Optional |
| PROXY_DE_URL | Germany proxy | Optional |
| PROXY_RU_URL | Russia proxy | Optional |
| PROXY_TR_URL | Turkey proxy | Optional |
| PROXY_IN_URL | India proxy | Optional |
| PROXY_NG_URL | Nigeria proxy | Optional |
