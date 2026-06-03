#!/usr/bin/env node
/**
 * Article Blueprint Audit
 * Scans Astro pages against blueprint requirements.
 * Warning-only: always exits 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const verbose = process.argv.includes('--verbose');

const CHECKS = [
  {
    id: 'missing_executive_summary',
    severity: 'warning',
    test: (src) => /(executive.?summary|executive_summary|id="executive|id='executive)/i.test(src),
    message: 'No executive summary section found (id="executive_summary" or "Executive Summary" heading)',
  },
  {
    id: 'missing_facts_table',
    severity: 'warning',
    test: (src) => /(key.?facts|<table|KeyFactsTable|facts.?table)/i.test(src),
    message: 'No key facts table found',
  },
  {
    id: 'missing_faq',
    severity: 'warning',
    test: (src) => /(FAQ|faq|frequently.asked|FAQPage)/i.test(src),
    message: 'No FAQ section found',
  },
  {
    id: 'missing_freshness_label',
    severity: 'warning',
    test: (src) => /(last.verified|last.updated|lastVerified|lastUpdated|verified:|updated:)/i.test(src),
    message: 'No freshness label found (Last verified / Last updated)',
  },
  {
    id: 'missing_evidence_panel',
    severity: 'warning',
    test: (src) => /(evidence|verified.bonus|bonus.verified|EvidencePanel|BonusVerified)/i.test(src),
    message: 'No evidence panel or verified bonus block found',
  },
  {
    id: 'missing_screenshots_section',
    severity: 'info',
    test: (src) => /(screenshot|Screenshot|interface.walkthrough|ScreenshotGallery|ExchangeScreenshot)/i.test(src),
    message: 'No screenshots section found',
  },
  {
    id: 'missing_methodology_link',
    severity: 'warning',
    test: (src) => /\/methodology|href.*methodology/i.test(src),
    message: 'No link to /methodology page',
  },
  {
    id: 'missing_affiliate_disclosure',
    severity: 'warning',
    test: (src) => /(affiliate.disclosure|affiliate.link|compensat|AffiliateDisclosure|partner.link)/i.test(src),
    message: 'No affiliate disclosure found',
  },
  {
    id: 'missing_internal_links',
    severity: 'info',
    test: (src) => {
      const internalLinks = (src.match(/href=["']\/[^"']+["']/g) || []).length;
      return internalLinks >= 2;
    },
    message: 'Fewer than 2 internal links found',
  },
  {
    id: 'missing_reviewer',
    severity: 'info',
    test: (src) => /(reviewed.by|Reviewed by|reviewer|author|by\s+[A-Z][a-z]+)/i.test(src),
    message: 'No reviewer name found',
  },
  {
    id: 'unsupported_superlatives',
    severity: 'warning',
    test: (src) => {
      // Pass if: no superlatives, OR superlatives are accompanied by evidence markers
      const superlatives = src.match(/\b(best|lowest|safest|biggest|cheapest|fastest)\b/gi) || [];
      if (superlatives.length === 0) return true;
      const hasEvidence = /(verified|evidence|source|\[data\]|data-verified|lastVerified)/i.test(src);
      return hasEvidence;
    },
    message: 'Unsupported superlatives found (best/lowest/safest/biggest) without evidence markers',
  },
];

function findPageFiles() {
  const exchangesDir = path.join(ROOT, 'src', 'pages', 'exchanges');
  const files = [];

  if (fs.existsSync(exchangesDir)) {
    for (const f of fs.readdirSync(exchangesDir)) {
      if (f.endsWith('.astro')) files.push(path.join(exchangesDir, f));
    }
  }

  // Also scan top-level pages that look like exchange reviews
  const pagesDir = path.join(ROOT, 'src', 'pages');
  if (fs.existsSync(pagesDir)) {
    for (const entry of fs.readdirSync(pagesDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const subDir = path.join(pagesDir, entry.name);
        for (const f of fs.readdirSync(subDir)) {
          if (f.endsWith('.astro') && f !== 'index.astro') {
            files.push(path.join(subDir, f));
          }
        }
      }
    }
  }

  return [...new Set(files)]; // deduplicate
}

function auditFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  for (const check of CHECKS) {
    const passes = check.test(src);
    if (!passes) {
      issues.push({ check: check.id, severity: check.severity, message: check.message });
    }
  }
  return issues;
}

function run() {
  console.log('\n  Article Blueprint Audit');
  console.log('  ' + '-'.repeat(60));

  const files = findPageFiles();
  const pageResults = [];
  let totalIssues = 0;
  let pagesWithIssues = 0;

  for (const f of files) {
    const issues = auditFile(f);
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    if (issues.length > 0) {
      pagesWithIssues++;
      totalIssues += issues.length;
    }
    pageResults.push({ file: rel, issues });
    if (verbose && issues.length > 0) {
      console.log(`\n  [!]  ${rel}`);
      for (const iss of issues) console.log(`     [${iss.severity}] ${iss.message}`);
    }
  }

  const summary = { pagesAudited: files.length, pagesWithIssues, totalIssues };
  console.log(`\n  Pages audited: ${summary.pagesAudited}`);
  console.log(`  Pages with issues: ${summary.pagesWithIssues}`);
  console.log(`  Total issues: ${summary.totalIssues}`);

  const result = { generatedAt: new Date().toISOString(), summary, pageResults };

  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'article-blueprint-audit.json'), JSON.stringify(result, null, 2));

  // Markdown report
  const lines = [
    '# Article Blueprint Audit',
    `**Generated:** ${result.generatedAt}`,
    '',
    '## Summary',
    `| Metric | Count |`,
    `|---|---|`,
    `| Pages audited | ${summary.pagesAudited} |`,
    `| Pages with issues | ${summary.pagesWithIssues} |`,
    `| Total issues | ${summary.totalIssues} |`,
    '',
    '## Page Results',
    '',
  ];
  for (const p of pageResults) {
    if (p.issues.length === 0) continue;
    lines.push(`### ${p.file}`);
    lines.push('| Severity | Check | Message |');
    lines.push('|---|---|---|');
    for (const iss of p.issues) {
      lines.push(`| ${iss.severity} | \`${iss.check}\` | ${iss.message} |`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(ROOT, 'reports', 'article-blueprint-audit.md'), lines.join('\n'));

  console.log('\n  Reports written:');
  console.log('      reports/article-blueprint-audit.json');
  console.log('      reports/article-blueprint-audit.md\n');

  process.exit(0); // always 0 — warning-only
}

run();
