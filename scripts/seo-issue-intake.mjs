#!/usr/bin/env node
/**
 * seo-issue-intake.mjs — SEO Control Center intake processor
 *
 * Reads all issue files from data/seo-issues/, classifies them,
 * groups duplicates, maps to code files, and outputs a prioritised
 * action queue in Markdown + JSON.
 *
 * Usage:
 *   node scripts/seo-issue-intake.mjs
 *   node scripts/seo-issue-intake.mjs --source google-search-console
 *   node scripts/seo-issue-intake.mjs --severity critical,high
 *   node scripts/seo-issue-intake.mjs --status new,classified
 *   node scripts/seo-issue-intake.mjs --format json
 *   node scripts/seo-issue-intake.mjs --format markdown --out reports/seo-issue-queue.md
 *   npm run seo:intake
 *   npm run seo:intake:gsc
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const INBOX     = resolve(ROOT, 'data', 'seo-issues');
const REPORTS   = resolve(ROOT, 'reports');

// ── ANSI colours ──────────────────────────────────────────────────────────────
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const MAGENTA= '\x1b[35m';
const BLUE   = '\x1b[34m';

// ── Source directories ────────────────────────────────────────────────────────
const SOURCES = [
  'google-search-console',
  'yandex-webmaster',
  'bing-webmaster',
  'yandex-metrika',
  'ga4',
  'clarity',
  'manual',
];

const SOURCE_LABELS = {
  'google-search-console': 'Google Search Console',
  'yandex-webmaster':      'Yandex Webmaster',
  'bing-webmaster':        'Bing Webmaster',
  'yandex-metrika':        'Yandex Metrika',
  'ga4':                   'Google Analytics 4',
  'clarity':               'Microsoft Clarity',
  'manual':                'Manual',
};

// ── Issue classifiers ─────────────────────────────────────────────────────────

/**
 * Detect known issue patterns from rawMessage text.
 * Returns a classified IssueType string or null if unknown.
 */
function classifyFromRaw(rawMessage, source) {
  const msg = (rawMessage ?? '').toLowerCase();

  // GSC structured data
  if (msg.includes('pricecurrency') && (msg.includes('iso 4217') || msg.includes('invalid value')))
    return 'schema:invalid-currency';
  if (msg.includes('brand') && (msg.includes('invalid') || msg.includes('@type')))
    return 'schema:invalid-brand-type';
  if (msg.includes('missing') && msg.includes('required'))
    return 'schema:missing-required-field';
  if (msg.includes('invalid value') && msg.includes('field'))
    return 'schema:invalid-field-value';
  if (msg.includes('merchant listing'))
    return 'schema:merchant-listing';

  // GSC indexing
  if (msg.includes('discovered') && msg.includes('not indexed'))
    return 'indexing:discovered-not-indexed';
  if (msg.includes('crawled') && msg.includes('not indexed'))
    return 'indexing:crawled-not-indexed';
  if (msg.includes('404') || msg.includes('not found'))
    return 'indexing:404';
  if (msg.includes('redirect') && msg.includes('error'))
    return 'indexing:redirect-error';
  if (msg.includes('canonical') && msg.includes('mismatch'))
    return 'indexing:canonical-mismatch';
  if (msg.includes('noindex'))
    return 'indexing:noindex-tag';
  if (msg.includes('blocked') && msg.includes('robot'))
    return 'indexing:blocked-robots';

  // GSC page experience
  if (msg.includes('lcp') || msg.includes('largest contentful'))
    return 'core-web-vitals:lcp';
  if (msg.includes('cls') || msg.includes('cumulative layout'))
    return 'core-web-vitals:cls';
  if (msg.includes('inp') || msg.includes('interaction to next'))
    return 'core-web-vitals:inp';
  if (msg.includes('mobile usability') || msg.includes('viewport'))
    return 'mobile-usability:viewport';
  if (msg.includes('text size') || msg.includes('font size'))
    return 'mobile-usability:text-size';
  if (msg.includes('tap target') || msg.includes('clickable'))
    return 'mobile-usability:tap-targets';

  // Yandex
  if (source === 'yandex-webmaster') {
    if (msg.includes('sitemap')) return 'sitemap:error';
    if (msg.includes('robots'))  return 'robots:error';
    if (msg.includes('duplicate') && msg.includes('title')) return 'content:duplicate-title';
    if (msg.includes('duplicate') && msg.includes('description')) return 'content:duplicate-description';
    if (msg.includes('excluded') || msg.includes('not indexed')) return 'indexing:excluded';
    if (msg.includes('quality')) return 'page-quality:thin-content';
  }

  // Bing
  if (source === 'bing-webmaster') {
    if (msg.includes('crawl error') || msg.includes('crawl:')) return 'crawl:error';
    if (msg.includes('sitemap')) return 'sitemap:error';
    if (msg.includes('indexnow')) return 'indexnow:failure';
    if (msg.includes('meta description') || msg.includes('missing meta')) return 'seo:missing-meta';
  }

  // Metrika
  if (source === 'yandex-metrika') {
    if (msg.includes('no data') || msg.includes('not tracking')) return 'tracking:no-data';
    if (msg.includes('goal') && msg.includes('not firing')) return 'tracking:goal-not-firing';
    if (msg.includes('bounce')) return 'ux:high-bounce';
    if (msg.includes('scroll')) return 'ux:low-scroll-depth';
    if (msg.includes('affiliate') || msg.includes('click track')) return 'conversion:broken-affiliate-click';
  }

  // GA4
  if (source === 'ga4') {
    if (msg.includes('tag not detected') || msg.includes('no tag')) return 'tracking:tag-not-detected';
    if (msg.includes('realtime') || msg.includes('real-time')) return 'tracking:no-realtime-users';
    if (msg.includes('event') && msg.includes('mismatch')) return 'tracking:event-mismatch';
    if (msg.includes('outbound')) return 'tracking:missing-outbound-events';
  }

  // Clarity
  if (source === 'clarity') {
    if (msg.includes('rage click')) return 'ux:rage-clicks';
    if (msg.includes('dead click')) return 'ux:dead-clicks';
    if (msg.includes('scroll drop') || msg.includes('scroll depth')) return 'ux:scroll-drop';
    if (msg.includes('confusion') || msg.includes('hesitation')) return 'ux:ui-confusion';
  }

  return null;
}

/**
 * Map issue type to auto-fix policy.
 * Conservative: only schema formatting bugs are safe.
 */
function getAutoFixPolicy(issueType) {
  const SAFE = new Set([
    'schema:invalid-currency',
    'schema:invalid-brand-type',
    'schema:invalid-field-value',
    'seo:missing-meta',
  ]);
  const REVIEW = new Set([
    'schema:missing-required-field',
    'schema:merchant-listing',
    'indexing:canonical-mismatch',
    'indexing:noindex-tag',
    'mobile-usability:viewport',
  ]);
  if (SAFE.has(issueType)) return 'safe';
  if (REVIEW.has(issueType)) return 'requires-review';
  return 'manual-only';
}

/**
 * Map issue type to likely source files.
 */
function mapToFiles(issueType, affectedUrls) {
  const files = [];

  if (issueType?.startsWith('schema:')) {
    files.push('src/utils/seo.ts');
    if (affectedUrls?.some(u => u.includes('/bonus-codes/')))
      files.push('src/pages/bonus-codes/[slug].astro');
    if (affectedUrls?.some(u => u.includes('/exchanges/')))
      files.push('src/pages/exchanges/[slug].astro');
    if (affectedUrls?.some(u => u.includes('/bonuses/')))
      files.push('src/pages/bonuses/[slug].astro');
  }
  if (issueType?.startsWith('indexing:')) {
    files.push('src/pages/sitemap.xml.ts', 'public/robots.txt');
  }
  if (issueType?.startsWith('core-web-vitals:') || issueType?.startsWith('mobile-usability:')) {
    files.push('src/layouts/CleanLayout.astro', 'src/styles/');
  }
  if (issueType?.startsWith('sitemap:')) {
    files.push('src/pages/sitemap.xml.ts');
  }
  if (issueType?.startsWith('tracking:') || issueType?.startsWith('conversion:')) {
    files.push('src/components/Analytics.astro', 'src/utils/analytics.ts');
  }
  if (issueType?.startsWith('ux:')) {
    files.push('src/layouts/CleanLayout.astro', 'src/styles/');
  }

  return [...new Set(files)];
}

/**
 * Suggested validation steps per issue type.
 */
function getValidationSteps(issueType) {
  const steps = {
    'schema:invalid-currency': [
      'npm run build',
      'grep -r "priceCurrency" dist/ | grep -v "USD" — should return empty',
      'Google Rich Results Test on any exchange page — no currency errors',
    ],
    'schema:invalid-brand-type': [
      'npm run build',
      'grep -r \'"@type":"Brand"\' dist/exchanges/ — should find matches',
      'grep -r \'"@type":"Organization"\' dist/exchanges/ | grep brand — should return empty',
      'Google Rich Results Test — no brand type errors',
    ],
    'schema:missing-required-field': [
      'npm run build',
      'Google Rich Results Test — confirm missing field is now present',
      'Check schema.org validator at validator.schema.org',
    ],
    'indexing:404': [
      'curl -I https://cryptobonusworld.com{url} — should return 200',
      'Check sitemap.xml for broken URL — remove if page deleted',
    ],
    'indexing:canonical-mismatch': [
      'npm run build',
      'grep canonical dist/{page}/index.html — verify canonical matches page URL',
    ],
    'tracking:goal-not-firing': [
      'Open browser devtools → Network tab',
      'Perform the goal action (e.g. click affiliate link)',
      'Verify reachGoal() / goal event fires in network requests',
    ],
    'ux:rage-clicks': [
      'Open Clarity session recordings for affected element',
      'Identify UI element causing rage clicks',
      'Verify element is functional or add visible feedback',
    ],
  };
  return steps[issueType] ?? ['Verify fix in browser', 'Re-run source tool to confirm resolved'];
}

// ── CLI flags ─────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = {
  source:   argv.includes('--source')   ? argv[argv.indexOf('--source')   + 1] : null,
  severity: argv.includes('--severity') ? argv[argv.indexOf('--severity') + 1].split(',') : null,
  status:   argv.includes('--status')   ? argv[argv.indexOf('--status')   + 1].split(',') : null,
  format:   argv.includes('--format')   ? argv[argv.indexOf('--format')   + 1] : 'table',
  out:      argv.includes('--out')      ? argv[argv.indexOf('--out')      + 1] : null,
  help:     argv.includes('--help') || argv.includes('-h'),
};

if (flags.help) {
  console.log(`
${BOLD}seo-issue-intake.mjs${RESET} — SEO Control Center

${BOLD}Usage:${RESET}
  node scripts/seo-issue-intake.mjs [options]

${BOLD}Filters:${RESET}
  --source <name>           Filter to one source (e.g. google-search-console)
  --severity critical,high  Filter by severity (comma-separated)
  --status new,classified   Filter by status (comma-separated)

${BOLD}Output:${RESET}
  --format table            ANSI table (default)
  --format markdown         Markdown report
  --format json             JSON array
  --out <path>              Write output to file

${BOLD}Sources:${RESET}
${SOURCES.map(s => '  ' + s).join('\n')}
  inbox  (email-ingested by Google Apps Script — data/seo-issues/inbox/)
`);
  process.exit(0);
}

const isJson = flags.format === 'json';

// ── Load all issue files ──────────────────────────────────────────────────────

/**
 * Parse and normalise a single issue JSON object.
 * Fills gaps: source, issueType, autoFixPolicy, relatedFiles, validationSteps.
 * Email-ingested issues use rawText; manually created issues use rawMessage.
 */
function normaliseIssue(item, fallbackSource) {
  item.source = item.source ?? fallbackSource;

  // Unify rawText (email intake) and rawMessage (manual issues)
  const rawContent = item.rawText ?? item.rawMessage ?? '';
  if (!item.rawMessage) item.rawMessage = rawContent;

  // Auto-classify if issueType missing
  if (!item.issueType && rawContent) {
    item.issueType = classifyFromRaw(rawContent, item.source) ?? 'unknown';
  }
  item.issueType = item.issueType || 'unknown';

  // detectedAt: use receivedAt from email, or detectedAt, or today
  item.detectedAt = item.detectedAt ?? item.receivedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  // Fill gaps
  if (!item.autoFixPolicy) {
    // Email-ingested issues with manualReviewRequired: true are never auto-fixed
    item.autoFixPolicy = item.manualReviewRequired ? 'manual-only' : getAutoFixPolicy(item.issueType);
  }
  if (!item.relatedFiles?.length)   item.relatedFiles   = mapToFiles(item.issueType, item.affectedUrls);
  if (!item.validationSteps?.length) item.validationSteps = getValidationSteps(item.issueType);

  // Tag email-sourced issues so the report can show provenance
  if (item.subject && !item.notes?.includes('Gmail')) {
    item._fromEmail = true;
  }

  return item;
}

function loadIssues() {
  const all = [];

  // ── 1. Named source directories (curated issues) ──────────────────────────
  for (const source of SOURCES) {
    if (flags.source && source !== flags.source) continue;
    const dir = join(INBOX, source);
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir).filter(f =>
      (f.endsWith('.json') || f.endsWith('.md') || f.endsWith('.txt')) &&
      !f.startsWith('_') && f !== '.gitkeep'
    );

    for (const file of files) {
      const fullPath = join(dir, file);
      const ext = extname(file).toLowerCase();

      try {
        if (ext === '.json') {
          const raw = JSON.parse(readFileSync(fullPath, 'utf8'));
          const items = Array.isArray(raw) ? raw : [raw];
          for (const item of items) {
            all.push(normaliseIssue(item, source));
          }
        } else {
          const content = readFileSync(fullPath, 'utf8').trim();
          if (!content) continue;
          const issueType = classifyFromRaw(content, source) ?? 'unknown';
          all.push(normaliseIssue({
            id:             `${source}:${file.replace(/\.[^.]+$/, '')}`,
            source,
            issueType,
            severity:       'medium',
            affectedUrls:   [],
            rawMessage:     content.slice(0, 500),
            status:         'new',
            recommendedFix: 'Review raw message and classify manually',
          }, source));
        }
      } catch (e) {
        if (!isJson) console.warn(`${YELLOW}⚠ Could not parse ${fullPath}: ${e.message}${RESET}`);
      }
    }
  }

  // ── 2. Email inbox (auto-ingested by Google Apps Script) ──────────────────
  // Reads data/seo-issues/inbox/*.json — these are pushed by seo-email-intake.gs
  // Each file maps to the email-sourced issue format (source, rawText, subject, etc.)
  // Never auto-fix issues flagged manualReviewRequired: true
  if (!flags.source) { // inbox always included unless filtering to a specific source
    const inboxDir = join(INBOX, 'inbox');
    if (existsSync(inboxDir)) {
      const inboxFiles = readdirSync(inboxDir).filter(f =>
        f.endsWith('.json') && !f.startsWith('.') && f !== '.gitkeep'
      );

      for (const file of inboxFiles) {
        const fullPath = join(inboxDir, file);
        try {
          const raw   = JSON.parse(readFileSync(fullPath, 'utf8'));
          const items = Array.isArray(raw) ? raw : [raw];
          for (const item of items) {
            // Detect source from filename if not set: "{source}-{timestamp}.json"
            if (!item.source) {
              const nameParts = file.split('-');
              item.source = nameParts[0] || 'manual';
            }
            all.push(normaliseIssue(item, item.source ?? 'manual'));
          }
        } catch (e) {
          if (!isJson) console.warn(`${YELLOW}⚠ Inbox parse error ${file}: ${e.message}${RESET}`);
        }
      }

      if (inboxFiles.length > 0 && !isJson) {
        console.log(`${DIM}  inbox: ${inboxFiles.length} email-sourced issue(s) loaded${RESET}`);
      }
    }
  }

  return all;
}

// ── De-duplicate ──────────────────────────────────────────────────────────────
function deduplicate(issues) {
  const seen = new Map();
  for (const issue of issues) {
    const key = `${issue.source}:${issue.issueType}`;
    if (seen.has(key)) {
      // Merge affectedUrls
      const existing = seen.get(key);
      existing.affectedUrls = [...new Set([...existing.affectedUrls, ...(issue.affectedUrls ?? [])])];
      existing._count = (existing._count ?? 1) + 1;
    } else {
      issue._count = 1;
      seen.set(key, issue);
    }
  }
  return [...seen.values()];
}

// ── Filter ────────────────────────────────────────────────────────────────────
function applyFilters(issues) {
  let out = issues;
  if (flags.severity) out = out.filter(i => flags.severity.includes(i.severity));
  if (flags.status)   out = out.filter(i => flags.status.includes(i.status));
  return out;
}

// ── Sort: severity → status → source ─────────────────────────────────────────
const SEV_RANK  = { critical: 0, high: 1, medium: 2, low: 3 };
const STAT_RANK = { new: 0, classified: 1, needs_manual_review: 2, fixed: 3, deployed: 4, ignored: 5 };

function sortIssues(issues) {
  return [...issues].sort((a, b) =>
    (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9) ||
    (STAT_RANK[a.status] ?? 9)  - (STAT_RANK[b.status] ?? 9)  ||
    a.source.localeCompare(b.source)
  );
}

// ── Summary stats ─────────────────────────────────────────────────────────────
function summarise(issues) {
  return {
    total:               issues.length,
    bySeverity: {
      critical:          issues.filter(i => i.severity === 'critical').length,
      high:              issues.filter(i => i.severity === 'high').length,
      medium:            issues.filter(i => i.severity === 'medium').length,
      low:               issues.filter(i => i.severity === 'low').length,
    },
    byStatus: {
      new:               issues.filter(i => i.status === 'new').length,
      classified:        issues.filter(i => i.status === 'classified').length,
      fixed:             issues.filter(i => i.status === 'fixed').length,
      deployed:          issues.filter(i => i.status === 'deployed').length,
      ignored:           issues.filter(i => i.status === 'ignored').length,
      needs_manual_review: issues.filter(i => i.status === 'needs_manual_review').length,
    },
    bySource: Object.fromEntries(
      SOURCES.map(s => [s, issues.filter(i => i.source === s).length])
    ),
    safeToAutofix:       issues.filter(i => i.autoFixPolicy === 'safe' && i.status === 'new').length,
    actionRequired:      issues.filter(i => ['new','classified','needs_manual_review'].includes(i.status)).length,
  };
}

// ── Severity badges ───────────────────────────────────────────────────────────
const SEV_ANSI = {
  critical: `${RED}🔴 CRITICAL${RESET}`,
  high:     `${YELLOW}🟠 HIGH${RESET}`,
  medium:   `${CYAN}🟡 MEDIUM${RESET}`,
  low:      `${DIM}⚪ LOW${RESET}`,
};
const SEV_MD = {
  critical: '🔴 Critical',
  high:     '🟠 High',
  medium:   '🟡 Medium',
  low:      '⚪ Low',
};
const STATUS_ANSI = {
  new:                 `${YELLOW}NEW${RESET}`,
  classified:          `${CYAN}CLASSIFIED${RESET}`,
  fixed:               `${GREEN}FIXED${RESET}`,
  deployed:            `${GREEN}DEPLOYED${RESET}`,
  ignored:             `${DIM}IGNORED${RESET}`,
  needs_manual_review: `${MAGENTA}NEEDS REVIEW${RESET}`,
};
const STATUS_MD = {
  new:                 '🆕 new',
  classified:          '🔵 classified',
  fixed:               '✅ fixed',
  deployed:            '🚀 deployed',
  ignored:             '💤 ignored',
  needs_manual_review: '⚠️ needs review',
};

// ── Render: ANSI table ────────────────────────────────────────────────────────
function renderTable(issues, summary) {
  const lines = [
    '',
    `${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`,
    `  ${BOLD}SEO Issue Queue — CryptoBonusWorld${RESET}`,
    `${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`,
    `  Total: ${summary.total}  |  ` +
      `${RED}Critical: ${summary.bySeverity.critical}${RESET}  |  ` +
      `${YELLOW}High: ${summary.bySeverity.high}${RESET}  |  ` +
      `${CYAN}Medium: ${summary.bySeverity.medium}${RESET}  |  ` +
      `${DIM}Low: ${summary.bySeverity.low}${RESET}`,
    `  Action required: ${summary.actionRequired}  |  ` +
      `${GREEN}Fixed: ${summary.byStatus.fixed + summary.byStatus.deployed}${RESET}  |  ` +
      `Safe to auto-fix: ${summary.safeToAutofix}`,
    `${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`,
    '',
  ];

  for (const issue of issues) {
    const sev    = SEV_ANSI[issue.severity]   ?? issue.severity;
    const stat   = STATUS_ANSI[issue.status]  ?? issue.status;
    const src    = SOURCE_LABELS[issue.source] ?? issue.source;
    const urls   = (issue.affectedUrls ?? []).length;
    const policy = issue.autoFixPolicy === 'safe'
      ? `${GREEN}auto-fix${RESET}`
      : issue.autoFixPolicy === 'requires-review'
      ? `${YELLOW}review-fix${RESET}`
      : `${DIM}manual${RESET}`;

    lines.push(`  ${sev}  ${stat}  ${DIM}[${src}]${RESET}`);
    lines.push(`  ${BOLD}${issue.issueType}${RESET}  ${DIM}${urls} URL(s)${RESET}  fix: ${policy}`);
    lines.push(`  ${DIM}${issue.recommendedFix.slice(0, 100)}${issue.recommendedFix.length > 100 ? '…' : ''}${RESET}`);
    if (issue.relatedFiles?.length) {
      lines.push(`  ${BLUE}Files: ${issue.relatedFiles.join(', ')}${RESET}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Render: Markdown ──────────────────────────────────────────────────────────
function renderMarkdown(issues, summary) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const lines = [
    '# SEO Issue Queue',
    '',
    `> Generated: ${now}  `,
    '> Source: `data/seo-issues/`  ',
    '> This file is auto-generated — add issues to the inbox, not here.',
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total issues | ${summary.total} |`,
    `| 🔴 Critical | ${summary.bySeverity.critical} |`,
    `| 🟠 High | ${summary.bySeverity.high} |`,
    `| 🟡 Medium | ${summary.bySeverity.medium} |`,
    `| ⚪ Low | ${summary.bySeverity.low} |`,
    `| Action required | **${summary.actionRequired}** |`,
    `| Fixed / Deployed | ${summary.byStatus.fixed + summary.byStatus.deployed} |`,
    `| Safe to auto-fix | ${summary.safeToAutofix} |`,
    '',
    '## By Source',
    '',
    '| Source | Issues |',
    '|--------|--------|',
    ...SOURCES.map(s => `| ${SOURCE_LABELS[s]} | ${summary.bySource[s] ?? 0} |`),
    '',
    '## Issue Queue',
    '',
  ];

  // Group by severity
  const groups = { critical: [], high: [], medium: [], low: [] };
  for (const issue of issues) {
    (groups[issue.severity] ?? groups.low).push(issue);
  }

  for (const [sev, sevIssues] of Object.entries(groups)) {
    if (!sevIssues.length) continue;
    const badge = SEV_MD[sev] ?? sev;
    lines.push(`### ${badge}`);
    lines.push('');
    lines.push('| # | Source | Type | Status | URLs | Fix Policy | Files |');
    lines.push('|---|--------|------|--------|------|------------|-------|');

    sevIssues.forEach((issue, idx) => {
      const src   = SOURCE_LABELS[issue.source] ?? issue.source;
      const stat  = STATUS_MD[issue.status] ?? issue.status;
      const urls  = (issue.affectedUrls ?? []).length;
      const files = (issue.relatedFiles ?? []).map(f => `\`${f}\``).join(', ');
      lines.push(
        `| ${idx + 1} | ${src} | \`${issue.issueType}\` | ${stat} | ${urls} | ${issue.autoFixPolicy} | ${files} |`
      );
    });
    lines.push('');

    // Detail blocks
    for (const issue of sevIssues) {
      const src = SOURCE_LABELS[issue.source] ?? issue.source;
      lines.push(`#### \`${issue.issueType}\` — ${src}`);
      lines.push('');
      lines.push(`**Status:** ${STATUS_MD[issue.status] ?? issue.status}  `);
      lines.push(`**Detected:** ${issue.detectedAt}  `);
      if (issue.fixedAt) lines.push(`**Fixed:** ${issue.fixedAt}  `);
      lines.push(`**Affected URLs:** ${(issue.affectedUrls ?? []).length} pages  `);
      if (issue.affectedUrls?.length) {
        lines.push('');
        issue.affectedUrls.slice(0, 5).forEach(u => lines.push(`- \`${u}\``));
        if (issue.affectedUrls.length > 5) lines.push(`- … and ${issue.affectedUrls.length - 5} more`);
      }
      lines.push('');
      lines.push(`**Issue:** ${issue.rawMessage}`);
      lines.push('');
      lines.push(`**Recommended fix:** ${issue.recommendedFix}`);
      if (issue.fixDescription) {
        lines.push('');
        lines.push(`**Applied fix:** ${issue.fixDescription}`);
      }
      if (issue.relatedFiles?.length) {
        lines.push('');
        lines.push(`**Related files:** ${issue.relatedFiles.map(f => `\`${f}\``).join(', ')}`);
      }
      if (issue.validationSteps?.length) {
        lines.push('');
        lines.push('**Validation steps:**');
        issue.validationSteps.forEach(s => lines.push(`1. ${s}`));
      }
      if (issue.notes) {
        lines.push('');
        lines.push(`> **Note:** ${issue.notes}`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  lines.push('## How to Add Issues');
  lines.push('');
  lines.push('1. Copy the error message from your SEO tool (GSC, Yandex Webmaster, etc.)');
  lines.push('2. Create a file in `data/seo-issues/{source}/{YYYY-MM-DD}-{slug}.json`');
  lines.push('3. Use the schema from `data/seo-issues/_schema.ts`');
  lines.push('4. Run `npm run seo:intake` to regenerate this report');
  lines.push('5. For `status: "new"` issues with `autoFixPolicy: "safe"`: apply the fix and update status to `"fixed"`');
  lines.push('');
  lines.push('---');
  lines.push('*Generated by `scripts/seo-issue-intake.mjs` — do not commit manual edits to this file.*');

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const rawIssues   = loadIssues();
const deduped     = deduplicate(rawIssues);
const filtered    = applyFilters(deduped);
const sorted      = sortIssues(filtered);
const summary     = summarise(sorted);

if (!isJson) {
  process.stdout.write(renderTable(sorted, summary) + '\n');
}

let output;
if (flags.format === 'json') {
  output = JSON.stringify(sorted, null, 2);
  process.stdout.write(output + '\n');
} else if (flags.format === 'markdown') {
  output = renderMarkdown(sorted, summary);
  process.stdout.write(output + '\n');
}

// Auto-generate reports
if (!isJson) {
  try {
    mkdirSync(REPORTS, { recursive: true });

    // Always write markdown report
    const mdPath = flags.out ? resolve(ROOT, flags.out) : join(REPORTS, 'seo-issue-queue.md');
    writeFileSync(mdPath, renderMarkdown(sorted, summary), 'utf8');

    // Always write JSON sidecar
    const jsonPath = join(REPORTS, 'seo-issue-queue.json');
    writeFileSync(jsonPath, JSON.stringify(sorted, null, 2), 'utf8');

    console.log(`\n${DIM}Reports: ${mdPath}${RESET}`);
    console.log(`${DIM}         ${jsonPath}${RESET}\n`);
  } catch (e) {
    console.warn(`Warning: could not write reports — ${e.message}`);
  }
}
