#!/usr/bin/env node
/**
 * CryptoBonusWorld — Evidence Update Queue
 *
 * Converts evidence-audit warnings into a prioritised editorial task queue.
 * Does NOT modify any data — output only.
 *
 * Usage:
 *   node scripts/evidence-update-queue.mjs
 *   node scripts/evidence-update-queue.mjs --exchange bybit
 *   node scripts/evidence-update-queue.mjs --priority P1
 *   node scripts/evidence-update-queue.mjs --stale-only
 *   node scripts/evidence-update-queue.mjs --format markdown
 *   node scripts/evidence-update-queue.mjs --format json
 *   node scripts/evidence-update-queue.mjs --out reports/evidence-update-queue.md
 *   node scripts/evidence-update-queue.mjs --help
 *
 * Exit codes:
 *   0 — Queue generated successfully
 *   1 — Error (bad exchange slug, unreadable files)
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT         = join(__dirname, '..');
const EVIDENCE_DIR = join(ROOT, 'src', 'data', 'evidence');
const REPORTS_DIR  = join(ROOT, 'reports');

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flags = {
  exchange:   argv.includes('--exchange')  ? argv[argv.indexOf('--exchange')  + 1] : null,
  priority:   argv.includes('--priority')  ? argv[argv.indexOf('--priority')  + 1] : null,
  format:     argv.includes('--format')    ? argv[argv.indexOf('--format')    + 1] : 'table',
  out:        argv.includes('--out')       ? argv[argv.indexOf('--out')       + 1] : null,
  staleOnly:  argv.includes('--stale-only'),
  help:       argv.includes('--help'),
};

if (flags.help) {
  console.log(`
Evidence Update Queue — CryptoBonusWorld

Usage:
  node scripts/evidence-update-queue.mjs [options]

Options:
  --exchange <slug>    Filter to one exchange
  --priority P1|P2|P3  Filter by priority level
  --stale-only         Only include facts past their max age
  --format table       ASCII table output (default)
  --format markdown    Markdown report
  --format json        JSON array
  --out <path>         Write output to file (in addition to stdout)
  --help               Show this help

Priority levels:
  P1  Bonus, fees, KYC, restricted countries — verify within 24-72h
  P2  P2P, futures, proof of reserves, app — verify within 1-2 weeks
  P3  Founded year, headquarters, licences  — verify monthly/quarterly
`);
  process.exit(0);
}

// ── CHECK_SCHEDULE (mirrors _schema.ts) ──────────────────────────────────────

const CHECK_SCHEDULE = {
  bonus_amount:             { maxAgeDays: 1   },
  bonus_currency:           { maxAgeDays: 7   },
  bonus_expiry_days:        { maxAgeDays: 1   },
  bonus_requires_kyc:       { maxAgeDays: 7   },
  bonus_requires_deposit:   { maxAgeDays: 7   },
  bonus_min_deposit:        { maxAgeDays: 7   },
  bonus_promo_code:         { maxAgeDays: 7   },
  spot_maker_fee:           { maxAgeDays: 7   },
  spot_taker_fee:           { maxAgeDays: 7   },
  futures_maker_fee:        { maxAgeDays: 7   },
  futures_taker_fee:        { maxAgeDays: 7   },
  max_futures_leverage:     { maxAgeDays: 30  },
  kyc_required:             { maxAgeDays: 7   },
  no_kyc_withdrawal_limit:  { maxAgeDays: 7   },
  kyc_levels_count:         { maxAgeDays: 30  },
  p2p_available:            { maxAgeDays: 7   },
  futures_available:        { maxAgeDays: 30  },
  copy_trading:             { maxAgeDays: 30  },
  staking_available:        { maxAgeDays: 30  },
  proof_of_reserves:        { maxAgeDays: 30  },
  licences:                 { maxAgeDays: 90  },
  headquarters:             { maxAgeDays: 90  },
  founded_year:             { maxAgeDays: 365 },
  restricted_us:            { maxAgeDays: 7   },
  restricted_eu:            { maxAgeDays: 7   },
  fiat_deposit_methods:     { maxAgeDays: 7   },
  min_deposit_usd:          { maxAgeDays: 7   },
  trading_pairs_count:      { maxAgeDays: 30  },
  mobile_app_ios:           { maxAgeDays: 30  },
  mobile_app_android:       { maxAgeDays: 30  },
};

const SOURCE_QUALITY = {
  'official-promo':     0.90,
  'official-fees':      0.95,
  'official-kyc':       0.95,
  'official-legal':     0.95,
  'official-reserves':  0.95,
  'official-p2p':       0.90,
  'official-app':       0.85,
  'official-blog':      0.85,
  'official-help':      0.90,
  'official-affiliate': 0.85,
  'official-other':     0.80,
  'secondary-news':     0.65,
  'secondary-review':   0.55,
  'secondary-reddit':   0.35,
  'internal-test':      0.80,
};

// ── Priority map ──────────────────────────────────────────────────────────────

/**
 * P1 — Direct user impact: if wrong, reader makes bad decision or misses bonus.
 *      Verify within 24-72 hours of going stale.
 * P2 — Feature flags and trust signals: important but stable.
 *      Verify within 1-2 weeks.
 * P3 — Institutional facts: rarely change.
 *      Verify monthly or quarterly.
 */
const PRIORITY_MAP = {
  // ── P1: Bonus terms ──────────────────────────────────
  bonus_amount:            'P1',
  bonus_currency:          'P1',
  bonus_expiry_days:       'P1',
  bonus_requires_kyc:      'P1',
  bonus_requires_deposit:  'P1',
  bonus_min_deposit:       'P1',
  bonus_promo_code:        'P1',
  // ── P1: Fees ─────────────────────────────────────────
  spot_maker_fee:          'P1',
  spot_taker_fee:          'P1',
  futures_maker_fee:       'P1',
  futures_taker_fee:       'P1',
  // ── P1: KYC & access ─────────────────────────────────
  kyc_required:            'P1',
  no_kyc_withdrawal_limit: 'P1',
  // ── P1: Geo restrictions ─────────────────────────────
  restricted_us:           'P1',
  restricted_eu:           'P1',
  // ── P1: Deposits / payments ──────────────────────────
  fiat_deposit_methods:    'P1',
  min_deposit_usd:         'P1',
  // ── P2: Features ─────────────────────────────────────
  p2p_available:           'P2',
  futures_available:       'P2',
  copy_trading:            'P2',
  staking_available:       'P2',
  max_futures_leverage:    'P2',
  // ── P2: Trust & app ──────────────────────────────────
  proof_of_reserves:       'P2',
  mobile_app_ios:          'P2',
  mobile_app_android:      'P2',
  trading_pairs_count:     'P2',
  // ── P3: Institutional ────────────────────────────────
  kyc_levels_count:        'P3',
  licences:                'P3',
  headquarters:            'P3',
  founded_year:            'P3',
};

const PRIORITY_WEIGHT = { P1: 3, P2: 2, P3: 1 };

// Human-readable action templates per field group
const ACTION_TEMPLATES = {
  bonus_amount:            'Re-verify welcome bonus amount on official promo page — changes with campaigns',
  bonus_currency:          'Confirm bonus currency (USDT vs USD vs native token)',
  bonus_expiry_days:       'Re-check bonus expiry window — often changes with promotions',
  bonus_requires_kyc:      'Verify whether KYC is required before bonus can be claimed',
  bonus_requires_deposit:  'Confirm deposit requirement for bonus activation',
  bonus_min_deposit:       'Check current minimum deposit threshold for bonus',
  bonus_promo_code:        'Verify promo/referral code still active and correct',
  spot_maker_fee:          'Re-check spot maker fee on official fee schedule page',
  spot_taker_fee:          'Re-check spot taker fee on official fee schedule page',
  futures_maker_fee:       'Verify futures maker fee — may differ by tier/VIP level',
  futures_taker_fee:       'Verify futures taker fee on official derivatives fee page',
  max_futures_leverage:    'Confirm max leverage — may have changed due to regulation',
  kyc_required:            'Re-verify KYC requirement — policy changes affect no-KYC claims',
  no_kyc_withdrawal_limit: 'Confirm withdrawal limit for unverified accounts',
  kyc_levels_count:        'Check number of KYC verification levels available',
  restricted_us:           'Re-verify US access status — regulatory changes are frequent',
  restricted_eu:           'Confirm EU availability / MiCA compliance status',
  fiat_deposit_methods:    'Re-check available fiat on/off ramp methods',
  min_deposit_usd:         'Confirm minimum fiat deposit threshold',
  p2p_available:           'Verify P2P marketplace availability and check official P2P page',
  futures_available:       'Confirm futures/perpetuals trading is live',
  copy_trading:            'Verify copy trading feature on official platform page',
  staking_available:       'Confirm earn/staking product is active',
  proof_of_reserves:       'Re-verify PoR status and check official reserves page for latest audit',
  mobile_app_ios:          'Check App Store listing is current and app still available',
  mobile_app_android:      'Check Google Play listing is current and app still available',
  trading_pairs_count:     'Update approximate pair count from official markets page',
  licences:                'Re-verify active licences on official legal/about page',
  headquarters:            'Confirm HQ/registered country on official about page',
  founded_year:            'Verify founding year — stable but confirm on official about page',
};

// ── Evidence loading ──────────────────────────────────────────────────────────

function loadEvidenceFiles() {
  const files = readdirSync(EVIDENCE_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'));
  return files.map(f => {
    try {
      return JSON.parse(readFileSync(join(EVIDENCE_DIR, f), 'utf8'));
    } catch (e) {
      console.error(`Failed to parse ${f}: ${e.message}`);
      return null;
    }
  }).filter(Boolean);
}

// ── Fact analysis ─────────────────────────────────────────────────────────────

function factAgeDays(fact) {
  const d = fact.lastChecked;
  const checked = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  return (Date.now() - checked.getTime()) / (1000 * 60 * 60 * 24);
}

function isStale(fact) {
  const sched = CHECK_SCHEDULE[fact.field];
  if (!sched) return false;
  return factAgeDays(fact) > sched.maxAgeDays;
}

function getSourceUrl(fact, ev) {
  if (fact.officialSourceUrl) return fact.officialSourceUrl;
  if (fact.officialSourceKey && ev.sources[fact.officialSourceKey]) {
    return ev.sources[fact.officialSourceKey].url;
  }
  return fact.secondarySourceUrl ?? null;
}

function getSourceLabel(fact, ev) {
  if (fact.officialSourceKey && ev.sources[fact.officialSourceKey]) {
    return ev.sources[fact.officialSourceKey].label ?? fact.officialSourceKey;
  }
  if (fact.officialSourceUrl) return 'Direct URL';
  if (fact.secondarySourceUrl) return 'Secondary source';
  return 'No source';
}

function calcConfidence(fact, ev) {
  let quality = 0.70;
  if (fact.officialSourceKey && ev.sources[fact.officialSourceKey]) {
    quality = SOURCE_QUALITY[ev.sources[fact.officialSourceKey].type] ?? 0.70;
  } else if (fact.officialSourceUrl) {
    quality = 0.80;
  } else if (!fact.officialSourceKey && !fact.officialSourceUrl) {
    quality = 0.35;
  }
  const secondaryBonus = fact.secondarySourceUrl ? 0.05 : 0;
  const q = Math.min(1.0, quality + secondaryBonus);

  const sched = CHECK_SCHEDULE[fact.field];
  const maxAge = sched?.maxAgeDays ?? 30;
  const age = factAgeDays(fact);
  let recency;
  if (age <= maxAge * 0.25) recency = 1.0;
  else if (age <= maxAge * 0.5)  recency = 0.95;
  else if (age <= maxAge * 0.75) recency = 0.88;
  else if (age <= maxAge * 1.0)  recency = 0.80;
  else if (age <= maxAge * 1.5)  recency = 0.65;
  else if (age <= maxAge * 3.0)  recency = 0.50;
  else recency = 0.30;

  return Math.round(q * recency * 100) / 100;
}

function resolveIssue(fact) {
  if (fact.conflictStatus === 'conflict')    return { type: 'conflict',    label: 'SOURCE CONFLICT' };
  if (fact.conflictStatus === 'unverified')  return { type: 'unverified',  label: 'UNVERIFIED'      };
  if (fact.conflictStatus === 'needs-check') return { type: 'needs-check', label: 'NEEDS CHECK'     };
  if (fact.manualReviewRequired)             return { type: 'manual',      label: 'MANUAL REVIEW'   };
  if (isStale(fact))                         return { type: 'stale',       label: 'STALE'           };
  return null;
}

/**
 * Urgency score: higher = fix sooner.
 * Combines priority weight × recency overdue ratio.
 */
function calcUrgency(fact) {
  const prio = PRIORITY_MAP[fact.field] ?? 'P3';
  const weight = PRIORITY_WEIGHT[prio];
  const sched = CHECK_SCHEDULE[fact.field];
  const maxAge = sched?.maxAgeDays ?? 30;
  const age = factAgeDays(fact);
  // ratio of how overdue we are (can exceed 1 when very stale)
  const overdueRatio = Math.min(age / maxAge, 10);
  return Math.round(weight * overdueRatio * 100) / 100;
}

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

// ── Build queue ───────────────────────────────────────────────────────────────

function buildQueue(allEvidence) {
  const items = [];

  for (const ev of allEvidence) {
    if (flags.exchange && ev.exchange !== flags.exchange) continue;

    for (const fact of ev.facts) {
      const issue = resolveIssue(fact);

      // --stale-only: skip facts with no issue
      if (flags.staleOnly && !issue) continue;

      // Facts with no issue and not flagged — skip unless verbose (default behaviour)
      // We include ALL flagged facts AND facts with low confidence
      const conf = calcConfidence(fact, ev);
      const hasIssue = !!issue || conf < 0.55;
      if (!hasIssue) continue;

      const prio = PRIORITY_MAP[fact.field] ?? 'P3';
      if (flags.priority && prio !== flags.priority) continue;

      const age = factAgeDays(fact);
      const sched = CHECK_SCHEDULE[fact.field];
      const maxAge = sched?.maxAgeDays ?? 30;
      const sourceUrl = getSourceUrl(fact, ev);
      const urgency = calcUrgency(fact);

      items.push({
        exchange:       ev.exchange,
        field:          fact.field,
        currentValue:   formatValue(fact.currentValue),
        unit:           fact.unit ?? '',
        lastChecked:    fact.lastChecked,
        ageDays:        Math.round(age),
        maxAgeDays:     maxAge,
        overdueBy:      Math.max(0, Math.round(age - maxAge)),
        priority:       prio,
        urgency,
        issue:          issue?.label ?? `LOW CONF (${Math.round(conf * 100)}%)`,
        issueType:      issue?.type ?? 'low-confidence',
        confidence:     Math.round(conf * 100),
        sourceUrl:      sourceUrl ?? '',
        sourceLabel:    getSourceLabel(fact, ev),
        suggestedAction: ACTION_TEMPLATES[fact.field] ?? 'Re-verify on official exchange page',
        notes:          fact.notes ?? '',
      });
    }
  }

  // Sort: P1 first, then by urgency descending
  items.sort((a, b) => {
    const pDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (pDiff !== 0) return pDiff;
    return b.urgency - a.urgency;
  });

  return items;
}

// ── Output formatters ─────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

function prioColor(p) {
  return p === 'P1' ? RED : p === 'P2' ? YELLOW : DIM;
}

function padR(str, len) { return String(str).padEnd(len); }
function padL(str, len) { return String(str).padStart(len); }
function trunc(str, len) {
  const s = String(str);
  return s.length > len ? s.slice(0, len - 1) + '…' : s;
}

function formatTable(items) {
  if (items.length === 0) return `${GREEN}✓ No items match the current filter.${RESET}\n`;

  const lines = [];
  const header = [
    padR('EXCHANGE',  10),
    padR('FIELD',     24),
    padR('VALUE',     14),
    padL('AGE',        5),
    padL('MAX',        4),
    padR('PRIO',       4),
    padR('ISSUE',     16),
    padR('SOURCE',    30),
  ].join('  ');

  const sep = '─'.repeat(header.length);
  lines.push(`${BOLD}${header}${RESET}`);
  lines.push(sep);

  for (const item of items) {
    const col = prioColor(item.priority);
    const ageStr = item.overdueBy > 0
      ? `${RED}${item.ageDays}d${RESET}`
      : `${item.ageDays}d`;
    lines.push([
      padR(trunc(item.exchange,   10), 10),
      padR(trunc(item.field,      24), 24),
      padR(trunc(item.currentValue + (item.unit ? ' ' + item.unit : ''), 14), 14),
      padL(ageStr,  5),
      padL(item.maxAgeDays + 'd',  4),
      `${col}${padR(item.priority, 4)}${RESET}`,
      padR(trunc(item.issue,      16), 16),
      `${CYAN}${trunc(item.sourceUrl || item.sourceLabel, 30)}${RESET}`,
    ].join('  '));
  }

  return lines.join('\n');
}

function formatMarkdown(items, allEvidence, generatedAt) {
  // Compute summary stats
  const p1  = items.filter(i => i.priority === 'P1').length;
  const p2  = items.filter(i => i.priority === 'P2').length;
  const p3  = items.filter(i => i.priority === 'P3').length;
  const top10 = items.slice(0, 10);

  // Per-exchange stats
  const byExchange = {};
  for (const item of items) {
    if (!byExchange[item.exchange]) byExchange[item.exchange] = { p1: 0, p2: 0, p3: 0, total: 0, maxUrgency: 0 };
    byExchange[item.exchange][item.priority.toLowerCase()]++;
    byExchange[item.exchange].total++;
    byExchange[item.exchange].maxUrgency = Math.max(byExchange[item.exchange].maxUrgency, item.urgency);
  }

  const worstExchange = Object.entries(byExchange)
    .sort((a, b) => b[1].maxUrgency - a[1].maxUrgency)[0];

  const lines = [];
  lines.push(`# Evidence Update Queue`);
  lines.push(`\n> Generated: ${generatedAt}  `);
  lines.push(`> Source: \`src/data/evidence/*.json\`  `);
  lines.push(`> This is a **read-only editorial checklist** — do not edit evidence files directly without verification.\n`);

  lines.push(`## Summary\n`);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Exchanges audited | ${allEvidence.length} |`);
  lines.push(`| Total flagged facts | ${items.length} |`);
  lines.push(`| 🔴 P1 Critical | ${p1} |`);
  lines.push(`| 🟡 P2 Important | ${p2} |`);
  lines.push(`| ⚪ P3 Low | ${p3} |`);
  if (worstExchange) {
    lines.push(`| Exchange with worst freshness | **${worstExchange[0]}** (urgency ${worstExchange[1].maxUrgency}) |`);
  }
  lines.push(``);

  // Top 10 most urgent
  lines.push(`## Top 10 Most Urgent\n`);
  lines.push(`| # | Exchange | Field | Value | Age | P | Issue | Action |`);
  lines.push(`|---|----------|-------|-------|-----|---|-------|--------|`);
  top10.forEach((item, i) => {
    const pIcon = item.priority === 'P1' ? '🔴' : item.priority === 'P2' ? '🟡' : '⚪';
    const ageStr = item.overdueBy > 0 ? `**${item.ageDays}d** (+${item.overdueBy}d over)` : `${item.ageDays}d`;
    const src = item.sourceUrl
      ? `[source](${item.sourceUrl})`
      : item.sourceLabel;
    lines.push(`| ${i + 1} | \`${item.exchange}\` | \`${item.field}\` | ${item.currentValue}${item.unit ? ' ' + item.unit : ''} | ${ageStr} | ${pIcon} ${item.priority} | ${item.issue} | ${item.suggestedAction} |`);
  });
  lines.push(``);

  // Per-exchange breakdown
  lines.push(`## By Exchange\n`);
  const sortedExchanges = Object.entries(byExchange)
    .sort((a, b) => (PRIORITY_WEIGHT['P1'] * b[1].p1 + PRIORITY_WEIGHT['P2'] * b[1].p2 + b[1].p3)
                  - (PRIORITY_WEIGHT['P1'] * a[1].p1 + PRIORITY_WEIGHT['P2'] * a[1].p2 + a[1].p3));

  lines.push(`| Exchange | P1 | P2 | P3 | Total | Urgency |`);
  lines.push(`|----------|----|----|-----|-------|---------|`);
  for (const [exch, stats] of sortedExchanges) {
    lines.push(`| \`${exch}\` | ${stats.p1} | ${stats.p2} | ${stats.p3} | ${stats.total} | ${stats.maxUrgency} |`);
  }
  lines.push(``);

  // Full P1 queue
  const p1Items = items.filter(i => i.priority === 'P1');
  if (p1Items.length > 0) {
    lines.push(`## 🔴 P1 — Critical (Bonus, Fees, KYC, Geo Restrictions)\n`);
    lines.push(`Verify these within **24–72 hours** of going stale.\n`);
    lines.push(`| Exchange | Field | Current Value | Age | Overdue | Issue | Source | Action |`);
    lines.push(`|----------|-------|--------------|-----|---------|-------|--------|--------|`);
    for (const item of p1Items) {
      const src = item.sourceUrl
        ? `[↗](${item.sourceUrl})`
        : '—';
      const overdueStr = item.overdueBy > 0 ? `+${item.overdueBy}d` : '—';
      lines.push(`| \`${item.exchange}\` | \`${item.field}\` | ${item.currentValue}${item.unit ? ' ' + item.unit : ''} | ${item.ageDays}d | ${overdueStr} | ${item.issue} | ${src} | ${item.suggestedAction} |`);
    }
    lines.push(``);
  }

  // P2 queue
  const p2Items = items.filter(i => i.priority === 'P2');
  if (p2Items.length > 0) {
    lines.push(`## 🟡 P2 — Important (Features, Trust, App)\n`);
    lines.push(`Verify these within **1–2 weeks**.\n`);
    lines.push(`| Exchange | Field | Current Value | Age | Issue | Source |`);
    lines.push(`|----------|-------|--------------|-----|-------|--------|`);
    for (const item of p2Items) {
      const src = item.sourceUrl ? `[↗](${item.sourceUrl})` : '—';
      lines.push(`| \`${item.exchange}\` | \`${item.field}\` | ${item.currentValue}${item.unit ? ' ' + item.unit : ''} | ${item.ageDays}d | ${item.issue} | ${src} |`);
    }
    lines.push(``);
  }

  // P3 queue
  const p3Items = items.filter(i => i.priority === 'P3');
  if (p3Items.length > 0) {
    lines.push(`## ⚪ P3 — Low Priority (Institutional Facts)\n`);
    lines.push(`Verify during monthly/quarterly editorial review.\n`);
    lines.push(`| Exchange | Field | Current Value | Age | Issue |`);
    lines.push(`|----------|-------|--------------|-----|-------|`);
    for (const item of p3Items) {
      lines.push(`| \`${item.exchange}\` | \`${item.field}\` | ${item.currentValue}${item.unit ? ' ' + item.unit : ''} | ${item.ageDays}d | ${item.issue} |`);
    }
    lines.push(``);
  }

  // Editorial workflow
  lines.push(`## Suggested Editorial Workflow\n`);
  lines.push(`### Daily (P1 — Bonus & Fees)`);
  lines.push(`1. Run \`npm run evidence:queue:p1\` each morning`);
  lines.push(`2. For each stale \`bonus_amount\` fact: open the source URL and check the current bonus`);
  lines.push(`3. Update the JSON fact: \`currentValue\`, \`lastChecked\` (today), \`confidenceScore\``);
  lines.push(`4. If bonus changed: also update \`src/data/exchanges.json\` \`bonusAmount\` field`);
  lines.push(`5. Run \`npm run deploy\` — IndexNow submission fires automatically\n`);
  lines.push(`### Weekly (P1 — Fees & KYC)`);
  lines.push(`1. Re-check official fee schedule pages for all exchanges`);
  lines.push(`2. Re-verify KYC requirements and withdrawal limits`);
  lines.push(`3. Check restricted countries list for any regulatory changes\n`);
  lines.push(`### Bi-weekly (P2 — Features & Trust)`);
  lines.push(`1. Re-verify P2P availability and check official P2P pages`);
  lines.push(`2. Update proof-of-reserves status and link to latest audit`);
  lines.push(`3. Check app store listings for update date and availability\n`);
  lines.push(`### Monthly (P3 + Full Sweep)`);
  lines.push(`1. Run \`npm run evidence:queue\` for full audit report`);
  lines.push(`2. Review licences, headquarters, and legal entity changes`);
  lines.push(`3. Update trading pairs count from official markets pages\n`);
  lines.push(`### After any exchange update`);
  lines.push(`\`\`\`bash`);
  lines.push(`# Targeted IndexNow push after updating evidence for one exchange`);
  lines.push(`node scripts/indexnow.mjs --exchange <slug>`);
  lines.push(`\`\`\`\n`);
  lines.push(`---`);
  lines.push(`*Generated by \`scripts/evidence-update-queue.mjs\` — do not commit manual edits to this file.*`);

  return lines.join('\n');
}

function formatJSON(items) {
  return JSON.stringify(items, null, 2);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const allEvidence = loadEvidenceFiles();

  if (flags.exchange && !allEvidence.find(ev => ev.exchange === flags.exchange)) {
    console.error(`Exchange not found: "${flags.exchange}"`);
    console.error(`Available: ${allEvidence.map(e => e.exchange).join(', ')}`);
    process.exit(1);
  }

  const queue    = buildQueue(allEvidence);
  const now      = new Date();
  const dateStr  = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const today    = now.toISOString().slice(0, 10);

  const isJson = flags.format === 'json';

  // ── Print summary header (non-JSON modes only) ──────────────────────────────
  const p1 = queue.filter(i => i.priority === 'P1').length;
  const p2 = queue.filter(i => i.priority === 'P2').length;
  const p3 = queue.filter(i => i.priority === 'P3').length;

  const byExch = {};
  for (const item of queue) {
    if (!byExch[item.exchange]) byExch[item.exchange] = 0;
    byExch[item.exchange]++;
  }
  const worstExchange = Object.entries(byExch).sort((a, b) => b[1] - a[1])[0];

  if (!isJson) {
    console.log(`\n${BOLD}═══════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}  Evidence Update Queue${RESET}  ${DIM}${dateStr}${RESET}`);
    console.log(`${BOLD}═══════════════════════════════════════════${RESET}`);
    console.log(`  Exchanges: ${allEvidence.length}  ·  Flagged facts: ${queue.length}`);
    console.log(`  ${RED}P1: ${p1}${RESET}  ·  ${YELLOW}P2: ${p2}${RESET}  ·  ${DIM}P3: ${p3}${RESET}`);
    if (worstExchange) {
      console.log(`  Worst freshness: ${BOLD}${worstExchange[0]}${RESET} (${worstExchange[1]} items)`);
    }
    console.log('');
  }

  // ── Format primary output ───────────────────────────────────────────────────
  let output;
  if (isJson) {
    output = formatJSON(queue);
  } else if (flags.format === 'markdown') {
    output = formatMarkdown(queue, allEvidence, dateStr);
  } else {
    output = formatTable(queue);
  }

  console.log(output);

  // ── Write to explicit --out file ────────────────────────────────────────────
  if (flags.out) {
    const outPath = join(ROOT, flags.out);
    const dirPart = outPath.substring(0, Math.max(
      outPath.lastIndexOf('/'), outPath.lastIndexOf('\\')
    ));
    if (dirPart && !existsSync(dirPart)) {
      try { mkdirSync(dirPart, { recursive: true }); } catch {}
    }
    try {
      writeFileSync(outPath, output, 'utf8');
      if (!isJson) console.log(`\n${GREEN}✓ Written to ${outPath}${RESET}`);
    } catch (e) {
      process.stderr.write(`Failed to write ${outPath}: ${e.message}\n`);
    }
    return;
  }

  // ── Auto-generate markdown report (table/markdown modes only, not JSON) ─────
  // Always write the .md report so it stays current after every queue run.
  if (!isJson) {
    const mdContent = flags.format === 'markdown'
      ? output
      : formatMarkdown(queue, allEvidence, dateStr);
    if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
    const reportPath = join(REPORTS_DIR, 'evidence-update-queue.md');
    writeFileSync(reportPath, mdContent, 'utf8');
    console.log(`\n${DIM}Report: ${reportPath}${RESET}\n`);
  }
}

main();
