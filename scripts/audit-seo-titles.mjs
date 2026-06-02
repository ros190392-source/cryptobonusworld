/**
 * audit-seo-titles.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans the built dist/ directory for every HTML file, extracts <title> tags,
 * measures character length, and flags issues:
 *
 *   WARNING  > 60 chars  (ideal target ceiling)
 *   ERROR    > 70 chars  (hard limit)
 *   CI FAIL  > 80 chars  (use --fail-on-error to trigger exit 1)
 *
 * Also detects Cloudflare Email Protection links in built HTML:
 *   /cdn-cgi/l/email-protection  →  email obfuscation leak
 *
 * Usage:
 *   node scripts/audit-seo-titles.mjs              # pretty-print report
 *   node scripts/audit-seo-titles.mjs --json        # JSON to stdout
 *   node scripts/audit-seo-titles.mjs --write       # write reports/seo-title-audit.*
 *   node scripts/audit-seo-titles.mjs --fail-on-error  # exit 1 if any ERROR (>70)
 *   node scripts/audit-seo-titles.mjs --fail-on-ci     # exit 1 if any >80 (CI mode)
 *
 * Output files (with --write):
 *   reports/seo-title-audit.md
 *   reports/seo-title-audit.json
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT      = resolve(__dirname, '..');
const DIST_DIR  = join(ROOT, 'dist');
const REPORTS   = join(ROOT, 'reports');

const WARN_THRESHOLD  = 60;
const ERROR_THRESHOLD = 70;
const CI_THRESHOLD    = 80;

const args         = process.argv.slice(2);
const JSON_MODE    = args.includes('--json');
const WRITE_MODE   = args.includes('--write');
const FAIL_ERROR   = args.includes('--fail-on-error');   // exit 1 if any >70
const FAIL_CI      = args.includes('--fail-on-ci');      // exit 1 if any >80

// ── Collect HTML files ────────────────────────────────────────────────────────

function walkHtml(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st   = statSync(full);
    if (st.isDirectory()) {
      walkHtml(full, files);
    } else if (name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

if (!existsSync(DIST_DIR)) {
  console.error('ERROR: dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

const htmlFiles = walkHtml(DIST_DIR);

// ── Extract <title> and check for /cdn-cgi/ links ────────────────────────────

const TITLE_RE      = /<title>([^<]*)<\/title>/i;
const CDN_CGI_RE    = /\/cdn-cgi\/l\/email-protection/g;

const pages = [];

for (const file of htmlFiles) {
  const src     = readFileSync(file, 'utf8');
  const rel     = '/' + relative(DIST_DIR, file).replace(/\\/g, '/');
  const urlPath = rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '/');

  const titleMatch = TITLE_RE.exec(src);
  const title      = titleMatch ? titleMatch[1].trim() : null;
  const len        = title ? title.length : 0;

  const cgnCount   = (src.match(CDN_CGI_RE) || []).length;

  let severity = 'ok';
  if (len > CI_THRESHOLD)    severity = 'ci';
  else if (len > ERROR_THRESHOLD) severity = 'error';
  else if (len > WARN_THRESHOLD)  severity = 'warning';

  pages.push({
    url:       urlPath,
    file:      rel,
    title:     title ?? '(missing)',
    length:    len,
    severity,
    cdnCgiCount: cgnCount,
  });
}

// Sort: worst first, then by length desc
const ORDER = { ci: 0, error: 1, warning: 2, ok: 3 };
pages.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || b.length - a.length);

// ── Summaries ─────────────────────────────────────────────────────────────────

const stats = {
  total:    pages.length,
  ok:       pages.filter(p => p.severity === 'ok').length,
  warnings: pages.filter(p => p.severity === 'warning').length,
  errors:   pages.filter(p => p.severity === 'error').length,
  ci:       pages.filter(p => p.severity === 'ci').length,
  cdnCgi:   pages.filter(p => p.cdnCgiCount > 0).length,
};

const NOW = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

// ── JSON output ───────────────────────────────────────────────────────────────

const jsonReport = {
  generatedAt:  NOW,
  thresholds: { warning: WARN_THRESHOLD, error: ERROR_THRESHOLD, ciFail: CI_THRESHOLD },
  stats,
  pages,
};

// ── Markdown report ───────────────────────────────────────────────────────────

function severityIcon(s) {
  if (s === 'ci')      return '🔴';
  if (s === 'error')   return '🟠';
  if (s === 'warning') return '🟡';
  return '✅';
}

function buildMarkdown() {
  const lines = [];
  lines.push(`# SEO Title Audit`);
  lines.push(`*Generated: ${NOW}*`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total pages | ${stats.total} |`);
  lines.push(`| ✅ OK (≤${WARN_THRESHOLD} chars) | ${stats.ok} |`);
  lines.push(`| 🟡 Warning (${WARN_THRESHOLD+1}–${ERROR_THRESHOLD} chars) | ${stats.warnings} |`);
  lines.push(`| 🟠 Error (${ERROR_THRESHOLD+1}–${CI_THRESHOLD} chars) | ${stats.errors} |`);
  lines.push(`| 🔴 CI Fail (>${CI_THRESHOLD} chars) | ${stats.ci} |`);
  lines.push(`| /cdn-cgi/ leaks | ${stats.cdnCgi} |`);
  lines.push('');

  if (stats.cdnCgi > 0) {
    lines.push(`## ⚠️ Cloudflare Email-Protection Leaks`);
    lines.push('');
    lines.push('These pages contain `/cdn-cgi/l/email-protection` links — Cloudflare is obfuscating');
    lines.push('an email address found in the HTML. Fix by removing email-pattern text from source.');
    lines.push('');
    for (const p of pages.filter(pg => pg.cdnCgiCount > 0)) {
      lines.push(`- \`${p.url}\` — ${p.cdnCgiCount} occurrence(s)`);
    }
    lines.push('');
  }

  const issues = pages.filter(p => p.severity !== 'ok');
  if (issues.length > 0) {
    lines.push(`## Issues (${issues.length} pages)`);
    lines.push('');
    lines.push(`| Icon | URL | Length | Title |`);
    lines.push(`|------|-----|--------|-------|`);
    for (const p of issues) {
      const icon  = severityIcon(p.severity);
      const title = p.title.replace(/\|/g, '\\|');
      lines.push(`| ${icon} | \`${p.url}\` | ${p.length} | ${title} |`);
    }
    lines.push('');
  }

  lines.push(`## All Pages`);
  lines.push('');
  lines.push(`| Icon | URL | Length | Title |`);
  lines.push(`|------|-----|--------|-------|`);
  for (const p of pages) {
    const icon  = severityIcon(p.severity);
    const title = p.title.replace(/\|/g, '\\|');
    lines.push(`| ${icon} | \`${p.url}\` | ${p.length} | ${title} |`);
  }

  return lines.join('\n');
}

// ── Output ────────────────────────────────────────────────────────────────────

if (JSON_MODE && !WRITE_MODE) {
  console.log(JSON.stringify(jsonReport, null, 2));
} else if (!WRITE_MODE) {
  // Pretty console output
  const issues = pages.filter(p => p.severity !== 'ok' || p.cdnCgiCount > 0);

  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  SEO Title Audit');
  console.log(`  ${NOW}`);
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Pages scanned : ${stats.total}`);
  console.log(`  OK (≤${WARN_THRESHOLD})      : ${stats.ok}`);
  console.log(`  Warnings      : ${stats.warnings}  (${WARN_THRESHOLD+1}–${ERROR_THRESHOLD} chars)`);
  console.log(`  Errors        : ${stats.errors}  (${ERROR_THRESHOLD+1}–${CI_THRESHOLD} chars)`);
  console.log(`  CI Fail       : ${stats.ci}  (>${CI_THRESHOLD} chars)`);
  console.log(`  /cdn-cgi/     : ${stats.cdnCgi}  pages with email-protection links`);
  console.log('──────────────────────────────────────────────────────────');

  if (issues.length === 0) {
    console.log('  All titles within acceptable length. No /cdn-cgi/ leaks.');
  } else {
    const maxLen = Math.max(...issues.map(p => p.url.length), 6);
    console.log(`  ${'URL'.padEnd(maxLen)}  ${'Len'.padStart(3)}  Title`);
    console.log(`  ${'─'.repeat(maxLen)}  ───  ─────────────────────────────────────`);
    for (const p of issues) {
      const icon   = severityIcon(p.severity);
      const cgi    = p.cdnCgiCount > 0 ? ` [/cdn-cgi/ ×${p.cdnCgiCount}]` : '';
      const title  = p.title.length > 60 ? p.title.slice(0, 57) + '…' : p.title;
      console.log(`  ${p.url.padEnd(maxLen)}  ${String(p.length).padStart(3)}  ${icon} ${title}${cgi}`);
    }
  }
  console.log('══════════════════════════════════════════════════════════');
  console.log('');
}

if (WRITE_MODE) {
  if (!existsSync(REPORTS)) mkdirSync(REPORTS, { recursive: true });

  const mdPath   = join(REPORTS, 'seo-title-audit.md');
  const jsonPath = join(REPORTS, 'seo-title-audit.json');

  writeFileSync(mdPath,   buildMarkdown(),                  'utf8');
  writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');

  console.log(`Written: reports/seo-title-audit.md`);
  console.log(`Written: reports/seo-title-audit.json`);
  console.log(`Pages: ${stats.total} | Warnings: ${stats.warnings} | Errors: ${stats.errors} | CI Fail: ${stats.ci} | /cdn-cgi/: ${stats.cdnCgi}`);
}

// ── Exit code ─────────────────────────────────────────────────────────────────

if (FAIL_CI && stats.ci > 0) {
  console.error(`\nCI FAIL: ${stats.ci} page(s) have titles longer than ${CI_THRESHOLD} characters.`);
  process.exit(1);
}

if (FAIL_ERROR && stats.errors > 0) {
  console.error(`\nFAIL: ${stats.errors} page(s) have titles longer than ${ERROR_THRESHOLD} characters.`);
  process.exit(1);
}

if (FAIL_CI && stats.cdnCgi > 0) {
  console.error(`\nCI FAIL: ${stats.cdnCgi} page(s) contain /cdn-cgi/l/email-protection links.`);
  process.exit(1);
}
