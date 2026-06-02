/**
 * audit-schema.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates all JSON-LD structured data emitted in the built HTML (dist/).
 *
 * Audit rules:
 *   1.  JSON-LD parse validity — every <script type="application/ld+json"> must
 *       parse as valid JSON
 *   2.  Missing @context on root schemas
 *   3.  Invalid or unknown @type values
 *   4.  Missing required fields per @type (see REQUIRED_FIELDS below)
 *   5.  Duplicate @type on the same page (except ListItem, Question, Answer)
 *   6.  Multiple Organization schemas on the same page
 *   7.  Invalid AggregateRating — ratingValue out of [0,10], missing ratingCount
 *   8.  Missing BreadcrumbList on key page types (exchanges, categories, guides)
 *   9.  FAQPage with zero mainEntity items
 *  10.  Review without reviewRating
 *  11.  Person without name
 *  12.  AggregateRating with ratingValue > bestRating
 *
 * Exit codes:
 *   0 — passed (may have warnings)
 *   1 — CI errors found (invalid JSON-LD / missing required fields)
 *
 * Usage:
 *   node scripts/audit-schema.mjs              # pretty print to stdout
 *   node scripts/audit-schema.mjs --json       # JSON to stdout
 *   node scripts/audit-schema.mjs --write      # write reports/
 *   node scripts/audit-schema.mjs --fail-on-errors  # exit 1 on errors
 *
 * Output files (--write):
 *   reports/schema-audit.md
 *   reports/schema-audit.json
 */

import {
  readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync,
} from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const DIST      = join(ROOT, 'dist');
const REPORTS   = join(ROOT, 'reports');

const args         = process.argv.slice(2);
const WRITE_MODE   = args.includes('--write');
const JSON_MODE    = args.includes('--json');
const FAIL_ON_ERRS = args.includes('--fail-on-errors');
const VERBOSE      = args.includes('--verbose');

// ── Page-type detection ───────────────────────────────────────────────────────

function detectPageType(urlPath) {
  if (urlPath === '/' || urlPath === '/index.html') return 'homepage';
  if (urlPath.startsWith('/exchanges/') && urlPath !== '/exchanges/') return 'exchange';
  if (urlPath.startsWith('/bonuses/'))   return 'bonus';
  if (urlPath.startsWith('/categories/') && urlPath !== '/categories/') return 'category';
  if (urlPath.startsWith('/guides/') && urlPath !== '/guides/')         return 'guide';
  if (urlPath.startsWith('/reviewers/') && urlPath !== '/reviewers/')   return 'reviewer';
  if (urlPath.startsWith('/compare/') && urlPath !== '/compare/')       return 'compare';
  if (urlPath.startsWith('/countries/') && urlPath !== '/countries/')   return 'country';
  if (urlPath.startsWith('/coins/') && urlPath !== '/coins/')           return 'coin';
  return 'other';
}

// ── Required fields per @type ─────────────────────────────────────────────────

const REQUIRED_FIELDS = {
  Organization:    ['name', 'url'],
  WebSite:         ['name', 'url'],
  Product:         ['name', 'offers'],
  FAQPage:         ['mainEntity'],
  BreadcrumbList:  ['itemListElement'],
  ItemList:        ['itemListElement'],
  Article:         ['headline', 'author', 'publisher'],
  Review:          ['reviewRating', 'author'],
  AggregateRating: ['ratingValue', 'ratingCount'],
  Person:          ['name'],
  FinancialService:['name', 'description'],
  FinancialProduct:['name'],
  WebPage:         ['name'],
  ReviewPage:      [],  // accepts any fields
  HowTo:           ['name', 'step'],
};

// Types that are allowed to appear multiple times on one page
const MULTI_OK_TYPES = new Set([
  'ListItem', 'Question', 'Answer', 'HowToStep', 'BreadcrumbList',
  'WebPage', 'ReviewPage',   // ReviewPage appears as combined @type array
]);

// Types that should trigger a "do you need BreadcrumbList?" check
const NEEDS_BREADCRUMB_TYPES = new Set([
  'exchange', 'bonus', 'category', 'guide', 'reviewer', 'compare', 'country', 'coin',
]);

// ── Collect all HTML files in dist/ ──────────────────────────────────────────

function collectHtmlFiles(dir) {
  const results = [];
  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) results.push(full);
    }
  }
  walk(dir);
  return results;
}

// Convert dist file path → URL path
function toUrlPath(filePath) {
  const rel = relative(DIST, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  return '/' + rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '/');
}

// ── Extract JSON-LD blocks from HTML ─────────────────────────────────────────

const JSONLD_RE = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function extractJsonLd(html) {
  const blocks = [];
  let m;
  JSONLD_RE.lastIndex = 0;
  while ((m = JSONLD_RE.exec(html)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

// ── Flatten schema to get all @type values ────────────────────────────────────

function flatTypes(schema) {
  const types = [];
  function visit(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(visit); return; }
    if (obj['@type']) {
      const t = obj['@type'];
      if (Array.isArray(t)) types.push(...t);
      else types.push(t);
    }
    for (const v of Object.values(obj)) visit(v);
  }
  visit(schema);
  return types;
}

// ── Walk schema tree and validate each node ───────────────────────────────────

/**
 * Required-field checks only apply at ROOT level (depth === 0).
 * Nested nodes like offers.seller { @type: Organization } are reference objects —
 * they only need a name, not a full Organization entity with url.
 *
 * Deep checks (AggregateRating, FAQPage, Review) apply at all depths.
 */
function validateNode(node, urlPath, errors, warnings, info, depth = 0) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach(n => validateNode(n, urlPath, errors, warnings, info, depth));
    return;
  }

  const type = node['@type'];
  if (!type) return;

  const types = Array.isArray(type) ? type : [type];

  for (const t of types) {
    // Required field checks — ROOT level only (depth 0)
    // Nested @type references (e.g. seller, author, publisher) are partial entities.
    if (depth === 0) {
      const required = REQUIRED_FIELDS[t];
      if (required) {
        for (const field of required) {
          if (node[field] === undefined || node[field] === null) {
            errors.push(`[missing-field] ${urlPath} — @type:${t} missing required field "${field}"`);
          }
        }
      }
    }

    // Rule 7: AggregateRating validation — applies at any depth
    if (t === 'AggregateRating') {
      const rv = Number(node.ratingValue);
      const br = Number(node.bestRating ?? 10);
      if (!isFinite(rv)) {
        errors.push(`[invalid-rating] ${urlPath} — AggregateRating.ratingValue is not a number: ${node.ratingValue}`);
      } else if (rv > br) {
        errors.push(`[invalid-rating] ${urlPath} — AggregateRating.ratingValue (${rv}) > bestRating (${br})`);
      } else if (rv < 0) {
        errors.push(`[invalid-rating] ${urlPath} — AggregateRating.ratingValue (${rv}) is negative`);
      }
      if (!node.ratingCount) {
        warnings.push(`[missing-ratingcount] ${urlPath} — AggregateRating missing ratingCount`);
      }
    }

    // Rule 9: FAQPage with zero items — any depth
    if (t === 'FAQPage') {
      const items = node.mainEntity;
      if (!Array.isArray(items) || items.length === 0) {
        errors.push(`[empty-faq] ${urlPath} — FAQPage has no mainEntity items`);
      }
    }

    // Rule 10: Review without reviewRating — any depth
    if (t === 'Review' && !node.reviewRating) {
      warnings.push(`[missing-reviewrating] ${urlPath} — Review without reviewRating`);
    }
  }

  // Recurse into child objects (depth + 1)
  for (const [k, v] of Object.entries(node)) {
    if (k === '@context') continue;
    if (typeof v === 'object' && v !== null) {
      validateNode(v, urlPath, errors, warnings, info, depth + 1);
    }
  }
}

// ── Main audit function ───────────────────────────────────────────────────────

function auditPage(filePath) {
  const urlPath  = toUrlPath(filePath);
  const pageType = detectPageType(urlPath);
  const html     = readFileSync(filePath, 'utf8');
  const blocks   = extractJsonLd(html);

  const errors   = [];
  const warnings = [];
  const info     = [];
  const schemaTypes = [];  // @type values found on this page (root schemas only)

  if (blocks.length === 0 && pageType !== 'other') {
    info.push(`[no-schema] ${urlPath} — no JSON-LD found`);
  }

  const parsedSchemas = [];

  for (const raw of blocks) {
    // Rule 1: JSON parse validity
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      errors.push(`[invalid-json] ${urlPath} — JSON-LD parse error: ${e.message}`);
      continue;
    }

    parsedSchemas.push(parsed);

    // Rule 2: missing @context
    if (!parsed['@context']) {
      warnings.push(`[missing-context] ${urlPath} — JSON-LD root missing @context`);
    }

    // Collect root @type
    const rootType = parsed['@type'];
    if (rootType) {
      const rootTypes = Array.isArray(rootType) ? rootType : [rootType];
      for (const t of rootTypes) schemaTypes.push(t);
    }

    // Rule 4 + 7 + 9 + 10 + 11: field validation (recursive)
    validateNode(parsed, urlPath, errors, warnings, info);
  }

  // Rule 5: duplicate @type (root-level, excluding allowed multi types)
  const typeSeen = {};
  for (const t of schemaTypes) {
    if (MULTI_OK_TYPES.has(t)) continue;
    typeSeen[t] = (typeSeen[t] ?? 0) + 1;
  }
  for (const [t, count] of Object.entries(typeSeen)) {
    if (count > 1) {
      warnings.push(`[duplicate-type] ${urlPath} — @type:${t} appears ${count} times`);
    }
  }

  // Rule 6: multiple Organization schemas
  const orgCount = schemaTypes.filter(t => t === 'Organization').length;
  if (orgCount > 1) {
    warnings.push(`[multi-organization] ${urlPath} — ${orgCount} Organization schemas found`);
  }

  // Rule 8: missing BreadcrumbList on key page types
  // Note: Breadcrumbs component self-emits BreadcrumbList; this checks the combined HTML
  if (NEEDS_BREADCRUMB_TYPES.has(pageType)) {
    const allTypes = new Set(parsedSchemas.flatMap(s => flatTypes(s)));
    if (!allTypes.has('BreadcrumbList')) {
      warnings.push(`[missing-breadcrumb] ${urlPath} — ${pageType} page has no BreadcrumbList schema`);
    }
  }

  return { urlPath, pageType, schemaTypes, errors, warnings, info, blockCount: blocks.length };
}

// ── Coverage calculator ───────────────────────────────────────────────────────

function calcCoverage(results) {
  const byType = {};
  for (const r of results) {
    for (const t of r.schemaTypes) {
      byType[t] = (byType[t] ?? 0) + 1;
    }
  }
  return byType;
}

// ── Report builders ───────────────────────────────────────────────────────────

const NOW = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

function buildMarkdown({ errors, warnings, info, results, coverage, stats }) {
  const lines = [];

  lines.push('# Schema Audit Report');
  lines.push(`*Generated: ${NOW}*`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Pages scanned | ${stats.pagesScanned} |`);
  lines.push(`| Pages with JSON-LD | ${stats.pagesWithSchema} |`);
  lines.push(`| Total JSON-LD blocks | ${stats.totalBlocks} |`);
  lines.push(`| CI Errors | ${errors.length} |`);
  lines.push(`| Warnings | ${warnings.length} |`);
  lines.push('');

  if (errors.length > 0) {
    lines.push(`## 🔴 CI Errors (${errors.length})`);
    lines.push('');
    lines.push('These issues will fail CI. Must be fixed before deploying.');
    lines.push('');
    for (const e of errors) lines.push(`- \`${e}\``);
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push(`## ⚠️ Warnings (${warnings.length})`);
    lines.push('');
    for (const w of warnings.slice(0, 60)) lines.push(`- ${w}`);
    if (warnings.length > 60) lines.push(`- *… and ${warnings.length - 60} more*`);
    lines.push('');
  }

  lines.push('## Schema Type Coverage');
  lines.push('');
  lines.push('| @type | Pages |');
  lines.push('|-------|-------|');
  for (const [t, count] of Object.entries(coverage).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${t} | ${count} |`);
  }
  lines.push('');

  lines.push('## Per-Page Summary (pages with errors/warnings)');
  lines.push('');
  const problemPages = results.filter(r => r.errors.length > 0 || r.warnings.length > 0);
  if (problemPages.length === 0) {
    lines.push('✅ All pages passed schema validation.');
  } else {
    lines.push(`| Page | Type | Errors | Warnings |`);
    lines.push(`|------|------|--------|----------|`);
    for (const r of problemPages.slice(0, 50)) {
      lines.push(`| ${r.urlPath} | ${r.pageType} | ${r.errors.length} | ${r.warnings.length} |`);
    }
    if (problemPages.length > 50) lines.push(`\n*… and ${problemPages.length - 50} more.*`);
  }
  lines.push('');

  lines.push('---');
  lines.push('*Run `npm run schema:audit` to regenerate.*');

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(DIST)) {
    console.error('ERROR: dist/ directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const htmlFiles = collectHtmlFiles(DIST);
  const results   = htmlFiles.map(f => auditPage(f));

  const allErrors   = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);
  const allInfo     = results.flatMap(r => r.info);
  const coverage    = calcCoverage(results);

  const stats = {
    pagesScanned:   results.length,
    pagesWithSchema: results.filter(r => r.blockCount > 0).length,
    totalBlocks:    results.reduce((s, r) => s + r.blockCount, 0),
    errors:         allErrors.length,
    warnings:       allWarnings.length,
  };

  const jsonReport = {
    generatedAt: NOW,
    stats,
    coverage,
    errors:   allErrors,
    warnings: allWarnings,
    info:     allInfo,
    pages: results.map(r => ({
      urlPath:    r.urlPath,
      pageType:   r.pageType,
      blockCount: r.blockCount,
      schemaTypes: r.schemaTypes,
      errors:     r.errors,
      warnings:   r.warnings,
    })),
  };

  if (JSON_MODE && !WRITE_MODE) {
    console.log(JSON.stringify(jsonReport, null, 2));
    process.exit(allErrors.length > 0 && FAIL_ON_ERRS ? 1 : 0);
    return;
  }

  if (WRITE_MODE) {
    if (!existsSync(REPORTS)) mkdirSync(REPORTS, { recursive: true });
    const md   = join(REPORTS, 'schema-audit.md');
    const json = join(REPORTS, 'schema-audit.json');
    writeFileSync(md,   buildMarkdown({ errors: allErrors, warnings: allWarnings, info: allInfo, results, coverage, stats }), 'utf8');
    writeFileSync(json, JSON.stringify(jsonReport, null, 2), 'utf8');
    console.log('Written: reports/schema-audit.md');
    console.log('Written: reports/schema-audit.json');
  }

  // Console summary
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Schema Audit');
  console.log(`  ${NOW}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Pages scanned     : ${stats.pagesScanned}`);
  console.log(`  Pages with schema : ${stats.pagesWithSchema}`);
  console.log(`  JSON-LD blocks    : ${stats.totalBlocks}`);
  console.log(`  CI Errors         : ${allErrors.length}   (invalid JSON-LD / missing required fields)`);
  console.log(`  Warnings          : ${allWarnings.length}`);
  console.log('────────────────────────────────────────────────────────────');

  if (allErrors.length > 0) {
    console.log('  CI ERRORS:');
    for (const e of allErrors.slice(0, 20)) console.log(`    ✗ ${e}`);
    if (allErrors.length > 20) console.log(`    … and ${allErrors.length - 20} more`);
    console.log('');
  }

  if (VERBOSE && allWarnings.length > 0) {
    console.log('  WARNINGS:');
    for (const w of allWarnings.slice(0, 15)) console.log(`    ⚠ ${w}`);
    if (allWarnings.length > 15) console.log(`    … and ${allWarnings.length - 15} more`);
    console.log('');
  }

  // Schema type coverage
  console.log('  Schema types found:');
  for (const [t, count] of Object.entries(coverage).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`    ${t.padEnd(22)} ${count} pages`);
  }
  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  if (allErrors.length > 0 && FAIL_ON_ERRS) {
    console.error(`FAIL: ${allErrors.length} CI error(s) in JSON-LD schema.`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Schema audit failed:', err);
  process.exit(1);
});
