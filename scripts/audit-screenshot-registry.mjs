#!/usr/bin/env node
/**
 * audit-screenshot-registry.mjs — Screenshot Registry Audit
 * ──────────────────────────────────────────────────────────
 * Validates the screenshot registry against live filesystem, evidence JSONs,
 * and cross-references all components for consistency.
 *
 * Checks performed:
 *   1. Duplicate IDs in registry
 *   2. Missing output files (outputPath exists in registry but not on disk)
 *   3. Broken output paths (path in evidence JSON but file not on disk)
 *   4. Stale screenshots (file exists but capturedAt > 90 days ago)
 *   5. Missing captureUrl for PUBLIC/AFFILIATE_PUBLIC entries
 *   6. Missing selector for auto-capture entries (non-SKIP/MANUAL)
 *   7. Registry entries not referenced in evidence JSONs
 *   8. Evidence screenshots not in registry (orphan evidence entries)
 *   9. Orphan screenshot files on disk (file exists, no registry entry)
 *  10. Required field validation (id, exchange, category, safetyLevel)
 *
 * Outputs:
 *   reports/screenshot-registry-audit.json
 *   reports/screenshot-registry-audit.md
 *
 * Usage:
 *   npm run screenshots:registry:audit            # audit + report
 *   npm run screenshots:registry:audit -- --verbose
 *   npm run screenshots:registry:check            # exit 1 if errors
 *   npm run screenshots:registry:report           # audit + pretty print
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath }           from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const ARGV        = process.argv.slice(2);
const flag        = (n) => ARGV.includes(n);
const VERBOSE     = flag('--verbose');
const FAIL_ON_ERR = flag('--fail-on-errors') || flag('--ci');
const REPORT_ONLY = flag('--report');
const JSON_OUT    = flag('--json');

const log  = (...a) => !JSON_OUT && console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && !JSON_OUT && console.log('  ·', ...a);
const warn = (...a) => !JSON_OUT && console.warn('  ⚠', ...a);

// ── Load registry via TS stripping ────────────────────────────────────────────

async function loadRegistry() {
  const tsPath = join(ROOT, 'src', 'data', 'screenshot-registry.ts');
  if (!existsSync(tsPath)) {
    throw new Error('screenshot-registry.ts not found at src/data/screenshot-registry.ts');
  }

  let src = readFileSync(tsPath, 'utf-8');

  // Strip TS-only syntax
  src = src.replace(/^import type[^\n]+\n/gm, '');
  // Strip interface/type declarations
  src = src.replace(/^export interface\s+\w[^{]*\{[^}]*\}/gms, '');
  src = src.replace(/^interface\s+\w[^{]*\{[^}]*\}/gms, '');
  src = src.replace(/^export type\s+\w+\s*=\s*[^;]+;/gm, '');
  src = src.replace(/^type\s+\w+\s*=\s*[^;]+;/gm, '');
  // Strip TS type annotations from function signatures and variables
  src = src.replace(/:\s*(string|number|boolean|null|undefined)(\[\])?(\s*\|[^,=);\n]+)?/g, '');
  src = src.replace(/:\s*\w+(<[^>]*>)?(\[\])?/g, '');
  src = src.replace(/<[A-Z]\w*>/g, '');
  src = src.replace(/as\s+\w+(\[\])?/g, '');
  // Fix import paths for evidence
  src = src.replace(/from ['"]\.\/evidence\/index\.js['"]/g, `from 'data:text/javascript,${encodeURIComponent(await buildEvidenceShim())}'`);
  src = src.replace(/from ['"]\.\/evidence\/_schema\.js['"]/g, "from 'node:events'"); // unused after type removal

  try {
    const dataUri = `data:text/javascript;charset=utf-8,${encodeURIComponent(src)}`;
    const mod     = await import(dataUri);
    return mod.SCREENSHOT_REGISTRY ?? [];
  } catch (e) {
    // Fallback: build registry directly from evidence JSONs
    dbg('Registry TS load failed, building from evidence JSONs:', e.message.slice(0, 120));
    return buildRegistryFromEvidence();
  }
}

// Build an inline shim for evidence/index that returns data from JSON files
async function buildEvidenceShim() {
  const evidenceDir = join(ROOT, 'src', 'data', 'evidence');
  const jsonFiles   = readdirSync(evidenceDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const imports     = jsonFiles.map(f => {
    const slug = f.replace('.json', '');
    const data = JSON.parse(readFileSync(join(evidenceDir, f), 'utf-8'));
    return `  ${JSON.stringify(slug)}: ${JSON.stringify(data)}`;
  });
  return `
const _reg = {\n${imports.join(',\n')}\n};
export function getExchangeEvidence(s) { return _reg[s]; }
export function getAllEvidenceSlugs()   { return Object.keys(_reg); }
export function getEvidenceRegistry()  { return _reg; }
`;
}

// ── Fallback registry builder (from evidence JSONs + known metadata) ──────────

const STANDARD_CATEGORIES = [
  'registration','kyc','bonus','deposit','p2p',
  'spot','futures','fees','mobile_app','proof_of_reserves',
];

const CATEGORY_SAFETY = {
  registration: 'PUBLIC', bonus: 'PUBLIC', fees: 'PUBLIC',
  spot: 'PUBLIC', futures: 'PUBLIC', p2p: 'PUBLIC',
  proof_of_reserves: 'PUBLIC', mobile_app: 'PUBLIC',
  kyc: 'SKIP', deposit: 'AUTHED',
  bonus_referral_landing: 'AFFILIATE_PUBLIC', registration_mobile: 'PUBLIC',
  kyc_status_safe: 'AUTH_SAFE', kyc_info: 'PUBLIC',
};

const CAPTURE_URLS_INLINE = {
  binance:  { registration:'https://accounts.binance.com/en/register', bonus:'https://www.binance.com/en/activity/referral-entry', fees:'https://www.binance.com/en/fee/schedule', spot:'https://www.binance.com/en/trade/BTC_USDT', futures:'https://www.binance.com/en/futures/BTCUSDT', p2p:'https://p2p.binance.com/en/trade/all-payments/USDT', proof_of_reserves:'https://www.binance.com/en/proof-of-reserves', mobile_app:'https://apps.apple.com/us/app/binance-buy-bitcoin-crypto/id1436799971', kyc:null, deposit:'https://www.binance.com/en/my/wallet/account/main/deposit/crypto/BTC', bonus_referral_landing:'https://www.binance.com/join?ref=CRYPTOBONUSW', registration_mobile:'https://accounts.binance.com/en/register', kyc_status_safe:'https://www.binance.com/en/my/settings/profile', kyc_info:'https://www.binance.com/en/support/faq/how-to-complete-identity-verification-360027287111' },
  okx:      { registration:'https://www.okx.com/join', bonus:'https://www.okx.com/campaigns/new-user', fees:'https://www.okx.com/fees', spot:'https://www.okx.com/trade-spot/btc-usdt', futures:'https://www.okx.com/trade-futures/btc-usdt-swap', p2p:null, proof_of_reserves:'https://www.okx.com/proof-of-reserves', mobile_app:'https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470', kyc:null, deposit:'https://www.okx.com/balance/recharge', bonus_referral_landing:'https://okx.com/join/CRYPTOBONUSW', registration_mobile:'https://www.okx.com/join', kyc_status_safe:'https://www.okx.com/account/identity-verification', kyc_info:'https://www.okx.com/help/section/faq-kyc' },
  mexc:     { registration:'https://www.mexc.com/register', bonus:'https://www.mexc.com/en-US/activity', fees:'https://www.mexc.com/fee', spot:'https://www.mexc.com/exchange/BTC_USDT', futures:'https://futures.mexc.com/exchange/BTC_USDT', p2p:'https://www.mexc.com/p2p', proof_of_reserves:null, mobile_app:'https://apps.apple.com/us/app/mexc-buy-sell-crypto-bitcoin/id1581119500', kyc:null, deposit:'https://www.mexc.com/assets/deposit', bonus_referral_landing:'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus', registration_mobile:'https://www.mexc.com/register', kyc_status_safe:null, kyc_info:'https://www.mexc.com/support/articles/20244' },
};

function buildRegistryFromEvidence() {
  const evidenceDir = join(ROOT, 'src', 'data', 'evidence');
  const entries = [];
  const jsonFiles = readdirSync(evidenceDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const EXTENDED_EXCHANGES = new Set(['binance', 'okx', 'mexc']);
  const EXTENDED_CATS = ['bonus_referral_landing','registration_mobile','kyc_status_safe','kyc_info'];

  for (const f of jsonFiles) {
    const slug = f.replace('.json', '');
    const data = JSON.parse(readFileSync(join(evidenceDir, f), 'utf-8'));
    const cats = [...STANDARD_CATEGORIES, ...(EXTENDED_EXCHANGES.has(slug) ? EXTENDED_CATS : [])];

    for (const cat of cats) {
      const ev         = data.screenshots?.[cat];
      const safety     = CATEGORY_SAFETY[cat] ?? 'PUBLIC';
      const requiresAuth = safety === 'AUTHED' || safety === 'AUTH_SAFE';
      const capturedAt = ev?.capturedAt ?? null;
      const status     = ev?.status ?? (safety === 'SKIP' ? 'not_applicable' : 'missing');
      const device     = cat === 'mobile_app' ? 'mobile-app' : cat === 'registration_mobile' ? 'mobile-web' : 'desktop';
      const deviceTag  = device === 'desktop' ? 'desktop' : 'mobile';
      const outputPath = capturedAt
        ? `/screenshots/${slug}/${cat}/global-${deviceTag}-${capturedAt.slice(0,7)}.webp`
        : (ev?.path ?? null);

      entries.push({
        id:           `${slug}-${cat}-global-${device}`.replace(/_/g, '-'),
        exchange:     slug,
        category:     cat,
        region:       'GLOBAL',
        locale:       'en-US',
        device,
        captureUrl:   CAPTURE_URLS_INLINE[slug]?.[cat] ?? null,
        requiresAuth,
        safetyLevel:  safety,
        selector:     null,
        annotationPreset: null,
        outputPath,
        status,
        priority:     1,
        seoImportance:'medium',
        autoRefresh:  cat === 'bonus' || cat === 'bonus_referral_landing',
        lastCapturedAt:   capturedAt,
        lastApprovedAt:   null,
        lastApprovedHash: null,
        evidencePath: `src/data/evidence/${slug}.json`,
        notes:        ev?.notes ?? '',
      });
    }
  }
  return entries;
}

// ── Evidence JSON loader ──────────────────────────────────────────────────────

function loadAllEvidence() {
  const dir = join(ROOT, 'src', 'data', 'evidence');
  const result = {};
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'))) {
    try { result[f.replace('.json', '')] = JSON.parse(readFileSync(join(dir, f), 'utf-8')); }
    catch { /* skip malformed */ }
  }
  return result;
}

// ── Filesystem scanner ────────────────────────────────────────────────────────

function scanScreenshotFiles() {
  const screenshotDir = join(ROOT, 'public', 'screenshots');
  const files = new Set();
  if (!existsSync(screenshotDir)) return files;

  function scan(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== '_archive') {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.webp')) {
        // Store as /screenshots/... path (relative to /public)
        const rel = '/' + relative(join(ROOT, 'public'), fullPath).replace(/\\/g, '/');
        files.add(rel);
      }
    }
  }

  scan(screenshotDir);
  return files;
}

// ── Staleness check ───────────────────────────────────────────────────────────

const STALE_DAYS = 90;

function isStale(capturedAt) {
  if (!capturedAt) return false;
  const dateStr = capturedAt.length === 7 ? capturedAt + '-01' : capturedAt;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const ageDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > STALE_DAYS;
}

function ageDays(capturedAt) {
  if (!capturedAt) return null;
  const dateStr = capturedAt.length === 7 ? capturedAt + '-01' : capturedAt;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Audit engine ──────────────────────────────────────────────────────────────

async function runAudit() {
  log('');
  log('📋  Screenshot Registry Audit');
  log('─'.repeat(60));
  log('');

  const registry  = await loadRegistry();
  const evidence  = loadAllEvidence();
  const diskFiles = scanScreenshotFiles();

  const issues = [];
  const addIssue = (type, severity, exchange, category, message, action = '') => {
    issues.push({ type, severity, exchange: exchange ?? '—', category: category ?? '—', message, action });
  };

  // ── 1. Duplicate IDs ──────────────────────────────────────────────────────
  const idCounts = {};
  for (const entry of registry) {
    idCounts[entry.id] = (idCounts[entry.id] ?? 0) + 1;
  }
  for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) {
      const ex = id.split('-')[0];
      addIssue('duplicate_id', 'error', ex, null,
        `Duplicate registry ID: "${id}" appears ${count} times`,
        'Fix screenshot-registry.ts — IDs must be unique');
    }
  }
  dbg(`Checked ${registry.length} registry entries for duplicates`);

  // ── 2. Required fields ────────────────────────────────────────────────────
  for (const entry of registry) {
    if (!entry.id)        addIssue('missing_field', 'error', entry.exchange, entry.category, 'Missing required field: id');
    if (!entry.exchange)  addIssue('missing_field', 'error', entry.exchange, entry.category, 'Missing required field: exchange');
    if (!entry.category)  addIssue('missing_field', 'error', entry.exchange, entry.category, 'Missing required field: category');
    if (!entry.safetyLevel) addIssue('missing_field', 'error', entry.exchange, entry.category, 'Missing required field: safetyLevel');
  }

  // ── 3. Missing captureUrl for public/auto-capture entries ────────────────
  const automatable = ['PUBLIC', 'AFFILIATE_PUBLIC', 'AUTH_SAFE', 'AUTHED'];
  for (const entry of registry) {
    if (automatable.includes(entry.safetyLevel) && !entry.captureUrl) {
      addIssue('missing_capture_url', 'warning', entry.exchange, entry.category,
        `No captureUrl for ${entry.safetyLevel} entry`,
        `Add captureUrl to REGISTRY_CAPTURE_URLS['${entry.exchange}']['${entry.category}']`);
    }
  }

  // ── 4. Missing selector for auto-capture entries ──────────────────────────
  const nonSelectorSafety = ['SKIP', 'MANUAL', 'AUTH_SENSITIVE'];
  for (const entry of registry) {
    if (!nonSelectorSafety.includes(entry.safetyLevel) && entry.captureUrl && !entry.selector) {
      addIssue('missing_selector', 'warning', entry.exchange, entry.category,
        `No CSS selector for automatable entry (${entry.safetyLevel})`,
        'Add waitForSelector to CATEGORY_META or route config');
    }
  }

  // ── 5. Missing files (outputPath defined but file not on disk) ────────────
  let missingCount = 0;
  for (const entry of registry) {
    if (entry.outputPath && !diskFiles.has(entry.outputPath)) {
      missingCount++;
      const sev = entry.priority === 1 ? 'error' : entry.priority === 2 ? 'warning' : 'info';
      addIssue('missing_file', sev, entry.exchange, entry.category,
        `File not on disk: ${entry.outputPath}  [P${entry.priority}]`,
        `Run: npm run screenshots:harvest:${entry.exchange}`);
    }
  }
  dbg(`Missing files: ${missingCount}`);

  // ── 6. Broken paths in evidence JSONs ─────────────────────────────────────
  for (const [slug, ev] of Object.entries(evidence)) {
    for (const [cat, shot] of Object.entries(ev.screenshots ?? {})) {
      if (shot.path && !diskFiles.has(shot.path)) {
        addIssue('broken_evidence_path', 'warning', slug, cat,
          `Evidence JSON has path "${shot.path}" but file not found on disk`,
          `Re-capture or update src/data/evidence/${slug}.json`);
      }
    }
  }

  // ── 7. Stale screenshots ──────────────────────────────────────────────────
  let staleCount = 0;
  for (const entry of registry) {
    if (entry.lastCapturedAt && isStale(entry.lastCapturedAt)) {
      staleCount++;
      const days = ageDays(entry.lastCapturedAt);
      addIssue('stale', 'warning', entry.exchange, entry.category,
        `Screenshot stale: ${days}d old (max ${STALE_DAYS}d), captured ${entry.lastCapturedAt}`,
        `Run: npm run screenshots:harvest:${entry.exchange}`);
    }
  }
  dbg(`Stale screenshots: ${staleCount}`);

  // ── 8. Registry entries not in evidence JSONs ─────────────────────────────
  const evidenceCategories = new Set(
    Object.entries(evidence).flatMap(([slug, ev]) =>
      Object.keys(ev.screenshots ?? {}).map(cat => `${slug}:${cat}`)
    )
  );
  for (const entry of registry) {
    const key = `${entry.exchange}:${entry.category}`;
    if (!evidenceCategories.has(key)) {
      // Extended categories for exchanges without route maps may not be in evidence — that's OK
      const isExtended = ['bonus_referral_landing','registration_mobile','kyc_status_safe','kyc_info'].includes(entry.category);
      if (!isExtended) {
        addIssue('not_in_evidence', 'info', entry.exchange, entry.category,
          `Registry entry has no matching screenshot slot in evidence JSON`,
          `Add screenshots.${entry.category} to src/data/evidence/${entry.exchange}.json`);
      }
    }
  }

  // ── 9. Orphan evidence screenshots (in evidence but not in registry) ──────
  const registryKeys = new Set(registry.map(e => `${e.exchange}:${e.category}`));
  let orphanEvidenceCount = 0;
  for (const [slug, ev] of Object.entries(evidence)) {
    for (const cat of Object.keys(ev.screenshots ?? {})) {
      const key = `${slug}:${cat}`;
      if (!registryKeys.has(key)) {
        orphanEvidenceCount++;
        addIssue('orphan_evidence', 'info', slug, cat,
          `Evidence JSON has category "${cat}" not in registry`,
          `Add entry to screenshot-registry.ts or remove from evidence JSON`);
      }
    }
  }

  // ── 10. Orphan disk files (file exists, no registry entry) ───────────────
  const registryPaths = new Set(registry.map(e => e.outputPath).filter(Boolean));
  let orphanDiskCount = 0;
  for (const diskFile of diskFiles) {
    if (!registryPaths.has(diskFile)) {
      orphanDiskCount++;
      // Extract exchange/category from path for context
      const parts = diskFile.split('/'); // [, 'screenshots', exchange, category, filename]
      const ex  = parts[2] ?? '?';
      const cat = parts[3] ?? '?';
      addIssue('orphan_disk_file', 'info', ex, cat,
        `File on disk not matched by any registry entry: ${diskFile}`,
        'Move to _archive/ or add registry entry');
    }
  }

  // ── Build summary ─────────────────────────────────────────────────────────
  const errors   = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos    = issues.filter(i => i.severity === 'info').length;

  const available = registry.filter(e => e.status === 'available').length;
  const missing   = registry.filter(e => e.status === 'missing' || e.status === 'needs_manual_capture').length;
  const outdated  = registry.filter(e => e.status === 'outdated').length;
  const skipped   = registry.filter(e => e.status === 'not_applicable').length;

  const result = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalEntries:         registry.length,
      available,
      missing,
      outdated,
      skipped,
      stale:                staleCount,
      filesOnDisk:          diskFiles.size,
      missingFiles:         missingCount,
      orphanDiskFiles:      orphanDiskCount,
      orphanEvidenceEntries:orphanEvidenceCount,
      errors,
      warnings,
      infos,
    },
    issues,
    registry: registry.map(e => ({
      id:            e.id,
      exchange:      e.exchange,
      category:      e.category,
      region:        e.region,
      device:        e.device,
      status:        e.status,
      priority:      e.priority,
      safetyLevel:   e.safetyLevel,
      seoImportance: e.seoImportance,
      autoRefresh:   e.autoRefresh,
      outputPath:    e.outputPath,
      captureUrl:    e.captureUrl ?? null,
      lastCapturedAt:e.lastCapturedAt,
    })),
  };

  return result;
}

// ── Report writers ────────────────────────────────────────────────────────────

function writeReports(result) {
  const reportsDir = join(ROOT, 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  // JSON
  writeFileSync(
    join(reportsDir, 'screenshot-registry-audit.json'),
    JSON.stringify(result, null, 2),
    'utf8'
  );

  // Markdown
  const now = result.generatedAt.slice(0, 19) + 'Z';
  const s   = result.summary;

  const severityIcon = (sev) => sev === 'error' ? '🚨' : sev === 'warning' ? '⚠️' : 'ℹ️';

  // Group issues by type
  const grouped = {};
  for (const issue of result.issues) {
    if (!grouped[issue.type]) grouped[issue.type] = [];
    grouped[issue.type].push(issue);
  }

  const issueGroups = Object.entries(grouped).map(([type, items]) => {
    const rows = items.slice(0, 20).map(i =>
      `| ${severityIcon(i.severity)} | \`${i.exchange}\` | \`${i.category}\` | ${i.message} |`
    ).join('\n');
    const more = items.length > 20 ? `\n\n_… and ${items.length - 20} more_` : '';
    return `### ${type.replace(/_/g, ' ')} (${items.length})\n\n| | Exchange | Category | Message |\n|---|---|---|---|\n${rows}${more}`;
  }).join('\n\n---\n\n');

  // Registry table (available entries only, max 50)
  const availableEntries = result.registry.filter(e => e.status === 'available').slice(0, 50);
  const regRows = availableEntries.map(e =>
    `| \`${e.id}\` | \`${e.category}\` | ${e.status} | P${e.priority} | \`${e.outputPath ?? '—'}\` |`
  ).join('\n');

  const md = `# Screenshot Registry Audit
**Generated:** ${now}

## Summary

| Metric | Count |
|---|---|
| Total registry entries | ${s.totalEntries} |
| ✅ Available | ${s.available} |
| ❌ Missing | ${s.missing} |
| ⏰ Outdated (stale >90d) | ${s.stale} |
| — Not applicable | ${s.skipped} |
| 🗄 Files on disk | ${s.filesOnDisk} |
| 📁 Missing files | ${s.missingFiles} |
| 👻 Orphan disk files | ${s.orphanDiskFiles} |
| 🔗 Orphan evidence entries | ${s.orphanEvidenceEntries} |

## Issues

| Severity | Count |
|---|---|
| 🚨 Errors | ${s.errors} |
| ⚠️ Warnings | ${s.warnings} |
| ℹ️ Info | ${s.infos} |

${issueGroups || '_No issues found._'}

---

## Available Screenshots (top 50)

| ID | Category | Status | Priority | Output Path |
|---|---|---|---|---|
${regRows || '_None available yet._'}

---

## How to fix
\`\`\`bash
# Capture missing screenshots
npm run screenshots:harvest:binance
npm run screenshots:orchestrate:all

# Re-run audit after capture
npm run screenshots:registry:audit
\`\`\`

*Audit report: \`reports/screenshot-registry-audit.json\`*
`;

  writeFileSync(join(reportsDir, 'screenshot-registry-audit.md'), md, 'utf8');
}

// ── Console output ────────────────────────────────────────────────────────────

function printResults(result) {
  const s = result.summary;
  const overallIcon = s.errors > 0 ? '🚨' : s.warnings > 0 ? '⚠️' : '✅';

  log(`${overallIcon}  Registry: ${s.totalEntries} entries  |  ✅ ${s.available} available  |  ❌ ${s.missing} missing  |  ⏰ ${s.stale} stale`);
  log(`   Files: ${s.filesOnDisk} on disk  |  Missing: ${s.missingFiles}  |  Orphans: ${s.orphanDiskFiles}`);
  log(`   Issues: 🚨 ${s.errors}  ⚠️ ${s.warnings}  ℹ️ ${s.infos}`);
  log('');

  if (VERBOSE || REPORT_ONLY) {
    const errors   = result.issues.filter(i => i.severity === 'error');
    const warnings = result.issues.filter(i => i.severity === 'warning');

    if (errors.length > 0) {
      log('🚨  Errors:');
      for (const i of errors) log(`    ${i.exchange}/${i.category}: ${i.message}`);
      log('');
    }
    if (warnings.length > 0) {
      log('⚠️  Warnings:');
      for (const w of warnings.slice(0, 20)) log(`    ${w.exchange}/${w.category}: ${w.message}`);
      if (warnings.length > 20) log(`    … and ${warnings.length - 20} more`);
      log('');
    }
  }

  log(`📄  Reports written:`);
  log(`    reports/screenshot-registry-audit.json`);
  log(`    reports/screenshot-registry-audit.md`);
  log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  try {
    const result = await runAudit();

    if (JSON_OUT) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    writeReports(result);
    printResults(result);

    if (FAIL_ON_ERR && result.summary.errors > 0) {
      console.error(`  ✖ Audit failed: ${result.summary.errors} error(s)`);
      process.exit(1);
    }
  } catch (e) {
    console.error('  ✖ Audit script error:', e.message);
    if (VERBOSE) console.error(e.stack);
    process.exit(1);
  }
}

main();
