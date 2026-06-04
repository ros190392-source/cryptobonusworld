#!/usr/bin/env node
/**
 * CryptoBonusWorld — Evidence Facts Validator
 * ============================================
 *
 * Validates the facts[], screenshots{}, and sources{} sections of every
 * exchange evidence JSON in src/data/evidence/.
 *
 * Distinguishes between FATAL structural errors and WARNING data-quality issues:
 *   FATAL  — invalid JSON, missing required top-level fields, impossible values,
 *             malformed arrays/objects. These indicate a broken data file.
 *   WARNING — low confidence scores, outdated facts, manualReviewRequired flags,
 *             missing disk files for screenshots marked available.
 *             These indicate data that needs human review but won't break the build.
 *
 * Exit codes:
 *   0 — PASS  (no fatal errors, zero or more warnings)
 *   1 — PASS WITH WARNINGS (warnings only, no fatals)
 *   2 — FAIL  (one or more fatal errors) — only when --fail-on-errors is passed;
 *             otherwise fatal errors downgrade to exit 1
 *
 * Flags:
 *   --verbose          Print per-fact warning details
 *   --fail-on-errors   Exit 2 on fatal errors (CI strict mode)
 *   --exchange <slug>  Validate a single exchange only
 *   --json             Also write reports/evidence-facts-validation.json
 *   --report           Also write reports/evidence-facts-validation.md
 *
 * Usage:
 *   node scripts/validate-evidence-facts.mjs
 *   node scripts/validate-evidence-facts.mjs --verbose --exchange bybit
 *   node scripts/validate-evidence-facts.mjs --fail-on-errors --json --report
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Config ──────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

const EVIDENCE_DIR  = path.join(ROOT, 'src', 'data', 'evidence');
const PUBLIC_DIR    = path.join(ROOT, 'public');
const REPORTS_DIR   = path.join(ROOT, 'reports');

// Staleness thresholds (days)
const STALE_BONUS_DAYS   = 30;   // bonus facts older than this → WARNING
const STALE_ANY_DAYS     = 90;   // any fact older than this → WARNING

// Confidence thresholds
const CONF_LOW      = 0.5;   // below this → WARNING
const CONF_VERY_LOW = 0.3;   // below this → stronger WARNING label

// Allowed enum values (from live survey of all 14 files)
const ALLOWED_CONFLICT_STATUS = new Set(['ok', 'outdated', 'needs-check', 'unverified']);
const ALLOWED_SCREENSHOT_STATUS = new Set(['available', 'needs_manual_capture', 'not_applicable']);
const ALLOWED_SOURCE_TYPES = new Set([
  'official-affiliate', 'official-app',   'official-fees',
  'official-kyc',       'official-legal', 'official-other',
  'official-p2p',       'official-promo', 'official-reserves',
]);

// ── CLI args ─────────────────────────────────────────────────────────────────

const args          = process.argv.slice(2);
const VERBOSE       = args.includes('--verbose');
const FAIL_ON_ERR   = args.includes('--fail-on-errors') || args.includes('--ci');
const WRITE_JSON    = args.includes('--json');
const WRITE_REPORT  = args.includes('--report');
const exIdx         = args.indexOf('--exchange');
const ONLY_EXCHANGE = exIdx !== -1 ? args[exIdx + 1] : null;

// ── Helpers ──────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

/** Parse a date string (YYYY-MM-DD or YYYY-MM). Returns null if unparseable. */
function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + 'T00:00:00Z');
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}$/.test(str)) {
    const d = new Date(str + '-01T00:00:00Z');
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Days since a Date. Returns Infinity if null. */
function daysSince(d) {
  if (!d) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

// ── Result types ─────────────────────────────────────────────────────────────

/**
 * @typedef {{ level: 'FATAL'|'WARNING', code: string, message: string }} Issue
 */

/** Create a FATAL issue. */
function fatal(code, message) { return { level: 'FATAL',   code, message }; }

/** Create a WARNING issue. */
function warn(code, message)  { return { level: 'WARNING', code, message }; }

// ── Per-section validators ────────────────────────────────────────────────────

/**
 * Validate the top-level envelope of a parsed evidence object.
 * @param {*} obj     Parsed JSON object
 * @param {string} filename  File name for error messages
 * @returns {Issue[]}
 */
function validateEnvelope(obj, filename) {
  const issues = [];

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    issues.push(fatal('ENVELOPE_NOT_OBJECT', `Root value is not a JSON object`));
    return issues; // can't continue
  }

  // exchange
  if (!Object.prototype.hasOwnProperty.call(obj, 'exchange')) {
    issues.push(fatal('MISSING_EXCHANGE', `Missing required field "exchange"`));
  } else if (typeof obj.exchange !== 'string' || obj.exchange.trim() === '') {
    issues.push(fatal('INVALID_EXCHANGE', `"exchange" must be a non-empty string`));
  }

  // updatedAt
  if (!Object.prototype.hasOwnProperty.call(obj, 'updatedAt')) {
    issues.push(fatal('MISSING_UPDATED_AT', `Missing required field "updatedAt"`));
  } else if (!parseDate(obj.updatedAt)) {
    issues.push(fatal('INVALID_UPDATED_AT', `"updatedAt" is not a valid date: "${obj.updatedAt}"`));
  }

  // facts
  if (!Object.prototype.hasOwnProperty.call(obj, 'facts')) {
    issues.push(fatal('MISSING_FACTS', `Missing required field "facts"`));
  } else if (!Array.isArray(obj.facts)) {
    issues.push(fatal('FACTS_NOT_ARRAY', `"facts" must be an array, got ${typeof obj.facts}`));
  } else if (obj.facts.length === 0) {
    issues.push(warn('FACTS_EMPTY', `"facts" array is empty — no data to validate`));
  }

  // screenshots
  if (!Object.prototype.hasOwnProperty.call(obj, 'screenshots')) {
    issues.push(fatal('MISSING_SCREENSHOTS', `Missing required field "screenshots"`));
  } else if (typeof obj.screenshots !== 'object' || obj.screenshots === null || Array.isArray(obj.screenshots)) {
    issues.push(fatal('SCREENSHOTS_NOT_OBJECT', `"screenshots" must be an object`));
  }

  // sources
  if (!Object.prototype.hasOwnProperty.call(obj, 'sources')) {
    issues.push(fatal('MISSING_SOURCES', `Missing required field "sources"`));
  } else if (typeof obj.sources !== 'object' || obj.sources === null || Array.isArray(obj.sources)) {
    issues.push(fatal('SOURCES_NOT_OBJECT', `"sources" must be an object`));
  }

  return issues;
}

/**
 * Validate a single fact entry.
 * @param {*} fact
 * @param {number} idx   Index in facts array
 * @returns {Issue[]}
 */
function validateFact(fact, idx) {
  const issues = [];
  const loc = `facts[${idx}]`;

  if (typeof fact !== 'object' || fact === null || Array.isArray(fact)) {
    issues.push(fatal('FACT_NOT_OBJECT', `${loc}: fact entry is not an object`));
    return issues;
  }

  // ── Required identity fields ──────────────────────────────────────────────

  // field (required string)
  if (!Object.prototype.hasOwnProperty.call(fact, 'field')) {
    issues.push(fatal('FACT_MISSING_FIELD', `${loc}: missing required "field" property`));
  } else if (typeof fact.field !== 'string' || fact.field.trim() === '') {
    issues.push(fatal('FACT_INVALID_FIELD', `${loc}: "field" must be a non-empty string`));
  }

  const fieldName = (typeof fact.field === 'string') ? fact.field : `index_${idx}`;
  const locFull   = `facts["${fieldName}"]`;

  // currentValue (required — may be any type including null for "unknown")
  if (!Object.prototype.hasOwnProperty.call(fact, 'currentValue')) {
    issues.push(fatal('FACT_MISSING_VALUE', `${locFull}: missing required "currentValue" property`));
  }

  // ── Confidence score ──────────────────────────────────────────────────────

  if (!Object.prototype.hasOwnProperty.call(fact, 'confidenceScore')) {
    issues.push(fatal('FACT_MISSING_CONFIDENCE', `${locFull}: missing required "confidenceScore"`));
  } else {
    const cs = fact.confidenceScore;
    if (typeof cs !== 'number' || isNaN(cs)) {
      issues.push(fatal('FACT_CONFIDENCE_NOT_NUMBER', `${locFull}: "confidenceScore" must be a number, got ${JSON.stringify(cs)}`));
    } else if (cs < 0 || cs > 1) {
      issues.push(fatal('FACT_CONFIDENCE_OUT_OF_RANGE', `${locFull}: "confidenceScore" ${cs} is outside [0, 1]`));
    } else if (cs < CONF_VERY_LOW) {
      issues.push(warn('FACT_CONFIDENCE_VERY_LOW', `${locFull}: confidenceScore ${cs} is very low (<${CONF_VERY_LOW}) — needs re-verification`));
    } else if (cs < CONF_LOW) {
      issues.push(warn('FACT_CONFIDENCE_LOW', `${locFull}: confidenceScore ${cs} is low (<${CONF_LOW})`));
    }
  }

  // ── conflictStatus ────────────────────────────────────────────────────────

  if (!Object.prototype.hasOwnProperty.call(fact, 'conflictStatus')) {
    issues.push(fatal('FACT_MISSING_CONFLICT_STATUS', `${locFull}: missing required "conflictStatus"`));
  } else {
    const cs = fact.conflictStatus;
    if (typeof cs !== 'string') {
      issues.push(fatal('FACT_CONFLICT_STATUS_NOT_STRING', `${locFull}: "conflictStatus" must be a string, got ${typeof cs}`));
    } else if (!ALLOWED_CONFLICT_STATUS.has(cs)) {
      issues.push(fatal('FACT_CONFLICT_STATUS_UNKNOWN', `${locFull}: "conflictStatus" value "${cs}" is not in allowed set [${[...ALLOWED_CONFLICT_STATUS].join(', ')}]`));
    } else if (cs === 'outdated') {
      issues.push(warn('FACT_OUTDATED', `${locFull}: conflictStatus is "outdated" — data needs re-verification`));
    } else if (cs === 'needs-check') {
      issues.push(warn('FACT_NEEDS_CHECK', `${locFull}: conflictStatus is "needs-check" — manual check required`));
    } else if (cs === 'unverified') {
      issues.push(warn('FACT_UNVERIFIED', `${locFull}: conflictStatus is "unverified" — not yet verified by any source`));
    }
  }

  // ── manualReviewRequired ──────────────────────────────────────────────────

  if (!Object.prototype.hasOwnProperty.call(fact, 'manualReviewRequired')) {
    issues.push(fatal('FACT_MISSING_MANUAL_REVIEW', `${locFull}: missing required "manualReviewRequired"`));
  } else {
    const mr = fact.manualReviewRequired;
    if (typeof mr !== 'boolean') {
      issues.push(fatal('FACT_MANUAL_REVIEW_NOT_BOOL', `${locFull}: "manualReviewRequired" must be boolean, got ${typeof mr} (${JSON.stringify(mr)})`));
    } else if (mr === true) {
      issues.push(warn('FACT_MANUAL_REVIEW_REQUIRED', `${locFull}: manualReviewRequired=true — queued for human review`));
    }
  }

  // ── lastChecked ───────────────────────────────────────────────────────────

  if (!Object.prototype.hasOwnProperty.call(fact, 'lastChecked')) {
    issues.push(fatal('FACT_MISSING_LAST_CHECKED', `${locFull}: missing required "lastChecked"`));
  } else {
    const lc = fact.lastChecked;
    const lcDate = parseDate(lc);
    if (!lcDate) {
      issues.push(fatal('FACT_INVALID_DATE', `${locFull}: "lastChecked" is not a valid date: "${lc}" (expected YYYY-MM-DD or YYYY-MM)`));
    } else {
      const age = daysSince(lcDate);
      const isBonus = (typeof fact.field === 'string') && /bonus/i.test(fact.field);
      if (age > STALE_ANY_DAYS) {
        issues.push(warn('FACT_STALE_90D', `${locFull}: lastChecked "${lc}" is ${age} days ago (threshold: ${STALE_ANY_DAYS}d)`));
      } else if (isBonus && age > STALE_BONUS_DAYS) {
        issues.push(warn('FACT_BONUS_STALE_30D', `${locFull}: bonus fact lastChecked "${lc}" is ${age} days ago (threshold: ${STALE_BONUS_DAYS}d for bonus data)`));
      }
    }
  }

  // ── checkedBy ─────────────────────────────────────────────────────────────
  // Present in all current files. Warn if missing but not fatal.
  if (Object.prototype.hasOwnProperty.call(fact, 'checkedBy')) {
    if (typeof fact.checkedBy !== 'string' || fact.checkedBy.trim() === '') {
      issues.push(warn('FACT_CHECKED_BY_INVALID', `${locFull}: "checkedBy" should be a non-empty string`));
    }
  }

  // ── officialSourceUrl (optional) — check format if present ───────────────
  if (Object.prototype.hasOwnProperty.call(fact, 'officialSourceUrl') && fact.officialSourceUrl !== null) {
    const url = fact.officialSourceUrl;
    if (typeof url !== 'string') {
      issues.push(warn('FACT_SOURCE_URL_NOT_STRING', `${locFull}: "officialSourceUrl" should be a string, got ${typeof url}`));
    } else if (url !== '' && !/^https?:\/\//.test(url)) {
      issues.push(warn('FACT_SOURCE_URL_MALFORMED', `${locFull}: "officialSourceUrl" does not start with https?:// — "${url}"`));
    }
  }

  return issues;
}

/**
 * Validate the screenshots section.
 * @param {*} screenshots  Parsed screenshots object
 * @param {string} exchange
 * @returns {Issue[]}
 */
function validateScreenshots(screenshots, exchange) {
  const issues = [];

  if (typeof screenshots !== 'object' || screenshots === null) return issues;

  const categories = Object.keys(screenshots);

  for (const cat of categories) {
    const ss    = screenshots[cat];
    const loc   = `screenshots["${cat}"]`;

    if (typeof ss !== 'object' || ss === null) {
      issues.push(fatal('SS_ENTRY_NOT_OBJECT', `${loc}: screenshot entry must be an object`));
      continue;
    }

    // status (required)
    if (!Object.prototype.hasOwnProperty.call(ss, 'status')) {
      issues.push(fatal('SS_MISSING_STATUS', `${loc}: missing required "status"`));
    } else if (!ALLOWED_SCREENSHOT_STATUS.has(ss.status)) {
      issues.push(fatal('SS_INVALID_STATUS', `${loc}: "status" value "${ss.status}" is not in allowed set [${[...ALLOWED_SCREENSHOT_STATUS].join(', ')}]`));
    } else {
      // If status = available, path must be set
      if (ss.status === 'available') {
        if (!ss.path || typeof ss.path !== 'string') {
          issues.push(warn('SS_AVAILABLE_NO_PATH', `${loc}: status is "available" but "path" is missing or null`));
        } else {
          // Verify path format
          if (!ss.path.startsWith('/screenshots/')) {
            issues.push(warn('SS_PATH_BAD_PREFIX', `${loc}: path "${ss.path}" does not start with /screenshots/`));
          }
          // Verify file exists on disk
          const diskPath = path.join(PUBLIC_DIR, ss.path.replace(/^\//, ''));
          if (!fs.existsSync(diskPath)) {
            issues.push(warn('SS_FILE_MISSING', `${loc}: status is "available" but file not found on disk: ${ss.path}`));
          }
        }
      }
    }

    // geo and device (should be present strings)
    if (!ss.geo || typeof ss.geo !== 'string') {
      issues.push(warn('SS_MISSING_GEO', `${loc}: "geo" is missing or not a string`));
    }
    if (!ss.device || typeof ss.device !== 'string') {
      issues.push(warn('SS_MISSING_DEVICE', `${loc}: "device" is missing or not a string`));
    }
  }

  return issues;
}

/**
 * Validate the sources section.
 * @param {*} sources  Parsed sources object
 * @returns {Issue[]}
 */
function validateSources(sources) {
  const issues = [];

  if (typeof sources !== 'object' || sources === null) return issues;

  for (const key of Object.keys(sources)) {
    const s   = sources[key];
    const loc = `sources["${key}"]`;

    if (typeof s !== 'object' || s === null) {
      issues.push(fatal('SRC_ENTRY_NOT_OBJECT', `${loc}: source entry must be an object`));
      continue;
    }

    // url (required)
    if (!s.url || typeof s.url !== 'string') {
      issues.push(fatal('SRC_MISSING_URL', `${loc}: missing required "url" field`));
    } else if (!/^https?:\/\//.test(s.url)) {
      issues.push(warn('SRC_URL_NOT_HTTPS', `${loc}: url does not start with http(s)://: "${s.url}"`));
    }

    // label (required)
    if (!s.label || typeof s.label !== 'string' || s.label.trim() === '') {
      issues.push(fatal('SRC_MISSING_LABEL', `${loc}: missing required "label" field`));
    }

    // type (required, validated enum)
    if (!s.type || typeof s.type !== 'string') {
      issues.push(fatal('SRC_MISSING_TYPE', `${loc}: missing required "type" field`));
    } else if (!ALLOWED_SOURCE_TYPES.has(s.type)) {
      issues.push(warn('SRC_UNKNOWN_TYPE', `${loc}: "type" value "${s.type}" is not in known set — may be intentional`));
    }
  }

  return issues;
}

// ── File-level validator ──────────────────────────────────────────────────────

/**
 * Validate a single evidence JSON file.
 * @param {string} filePath   Absolute path to the .json file
 * @returns {{ exchange: string, fatalCount: number, warningCount: number, issues: Issue[], skipped: boolean }}
 */
function validateFile(filePath) {
  const filename = path.basename(filePath);
  const exchange = path.basename(filePath, '.json');
  const result   = { exchange, fatalCount: 0, warningCount: 0, issues: [], skipped: false };

  // ── Parse JSON ────────────────────────────────────────────────────────────
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    result.issues.push(fatal('FILE_READ_ERROR', `Cannot read file: ${e.message}`));
    result.fatalCount = 1;
    return result;
  }

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    result.issues.push(fatal('INVALID_JSON', `JSON parse error: ${e.message}`));
    result.fatalCount = 1;
    return result;
  }

  // ── Envelope ──────────────────────────────────────────────────────────────
  const envIssues = validateEnvelope(obj, filename);
  result.issues.push(...envIssues);

  // If envelope has fatals, skip further validation (arrays/objects may not be valid)
  const envFatals = envIssues.filter(i => i.level === 'FATAL');
  if (envFatals.length > 0) {
    result.fatalCount  = envFatals.length;
    result.warningCount = envIssues.filter(i => i.level === 'WARNING').length;
    result.skipped      = true;
    return result;
  }

  // ── facts[] ───────────────────────────────────────────────────────────────
  if (Array.isArray(obj.facts)) {
    for (let i = 0; i < obj.facts.length; i++) {
      const factIssues = validateFact(obj.facts[i], i);
      result.issues.push(...factIssues);
    }
  }

  // ── screenshots{} ─────────────────────────────────────────────────────────
  if (typeof obj.screenshots === 'object' && obj.screenshots !== null) {
    const ssIssues = validateScreenshots(obj.screenshots, exchange);
    result.issues.push(...ssIssues);
  }

  // ── sources{} ─────────────────────────────────────────────────────────────
  if (typeof obj.sources === 'object' && obj.sources !== null) {
    const srcIssues = validateSources(obj.sources);
    result.issues.push(...srcIssues);
  }

  // ── Tally ─────────────────────────────────────────────────────────────────
  result.fatalCount   = result.issues.filter(i => i.level === 'FATAL').length;
  result.warningCount = result.issues.filter(i => i.level === 'WARNING').length;

  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function run() {
  console.log('\n  ' + BOLD + '📋  Evidence Facts Validator' + RESET);
  console.log('  ' + '─'.repeat(62));

  // Discover files
  let files;
  try {
    files = fs.readdirSync(EVIDENCE_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .map(f => path.join(EVIDENCE_DIR, f));
  } catch (e) {
    console.error(`${RED}  FATAL: Cannot read evidence directory: ${e.message}${RESET}`);
    process.exit(2);
  }

  if (ONLY_EXCHANGE) {
    files = files.filter(f => path.basename(f, '.json') === ONLY_EXCHANGE);
    if (files.length === 0) {
      console.error(`${RED}  FATAL: No evidence file found for exchange "${ONLY_EXCHANGE}"${RESET}`);
      process.exit(2);
    }
  }

  // Validate each file
  const results = [];
  for (const f of files) {
    const r = validateFile(f);
    results.push(r);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const totalFiles    = results.length;
  const totalFatals   = results.reduce((s, r) => s + r.fatalCount,   0);
  const totalWarnings = results.reduce((s, r) => s + r.warningCount, 0);
  const filesWithFatal = results.filter(r => r.fatalCount > 0).length;
  const filesWithWarn  = results.filter(r => r.warningCount > 0).length;

  console.log(`\n  Files checked  : ${totalFiles}`);
  console.log(`  Fatal errors   : ${totalFatals > 0 ? RED + BOLD : GREEN}${totalFatals}${RESET}`);
  console.log(`  Warnings       : ${totalWarnings > 0 ? YELLOW : GREEN}${totalWarnings}${RESET}`);

  // ── Per-exchange breakdown ────────────────────────────────────────────────

  console.log('\n  ' + BOLD + 'Per-exchange breakdown:' + RESET);
  for (const r of results) {
    const fIcon = r.fatalCount   > 0 ? RED + '✘' + RESET : GREEN + '✔' + RESET;
    const wPart = r.warningCount > 0 ? `  ${YELLOW}${r.warningCount} warning(s)${RESET}` : `  ${DIM}0 warnings${RESET}`;
    const fPart = r.fatalCount   > 0 ? `  ${RED}${r.fatalCount} fatal(s)${RESET}` : '';
    console.log(`  ${fIcon}  ${r.exchange.padEnd(12)}${fPart}${wPart}`);

    // Verbose: print warning details per exchange
    if (VERBOSE && r.issues.length > 0) {
      for (const iss of r.issues) {
        const icon  = iss.level === 'FATAL' ? RED + '  ✗' + RESET : YELLOW + '  ⚠' + RESET;
        console.log(`${icon}  [${iss.code}] ${iss.message}`);
      }
    }
  }

  // ── Warning categories summary ────────────────────────────────────────────

  if (totalWarnings > 0) {
    console.log('\n  ' + BOLD + 'Warning categories:' + RESET);
    const warnCounts = {};
    for (const r of results) {
      for (const iss of r.issues) {
        if (iss.level === 'WARNING') {
          warnCounts[iss.code] = (warnCounts[iss.code] || 0) + 1;
        }
      }
    }
    const sortedCodes = Object.entries(warnCounts).sort((a, b) => b[1] - a[1]);
    for (const [code, count] of sortedCodes) {
      console.log(`  ${YELLOW}⚠${RESET}  ${code.padEnd(35)} ${count}`);
    }
  }

  // ── Fatal categories summary ──────────────────────────────────────────────

  if (totalFatals > 0) {
    console.log('\n  ' + BOLD + RED + 'Fatal error categories:' + RESET);
    const fatalCounts = {};
    for (const r of results) {
      for (const iss of r.issues) {
        if (iss.level === 'FATAL') {
          fatalCounts[iss.code] = (fatalCounts[iss.code] || 0) + 1;
        }
      }
    }
    for (const [code, count] of Object.entries(fatalCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${RED}✗${RESET}  ${code.padEnd(35)} ${count}`);
    }
  }

  // ── Final status ──────────────────────────────────────────────────────────

  let verdict, exitCode;
  if (totalFatals > 0) {
    verdict  = `${RED}${BOLD}FAIL${RESET} — ${totalFatals} fatal error(s) in ${filesWithFatal} file(s)`;
    exitCode = FAIL_ON_ERR ? 2 : 1;
  } else if (totalWarnings > 0) {
    verdict  = `${YELLOW}${BOLD}PASS WITH WARNINGS${RESET} — ${totalWarnings} warning(s) across ${filesWithWarn} file(s)`;
    exitCode = 1;
  } else {
    verdict  = `${GREEN}${BOLD}PASS${RESET} — all checks clean`;
    exitCode = 0;
  }

  console.log('\n  ' + '─'.repeat(62));
  console.log(`  Status: ${verdict}`);

  // ── Optional report output ────────────────────────────────────────────────

  if (WRITE_JSON || WRITE_REPORT) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  if (WRITE_JSON) {
    const payload = {
      generatedAt : new Date().toISOString(),
      summary     : { filesChecked: totalFiles, fatalErrors: totalFatals, warnings: totalWarnings },
      results     : results.map(r => ({
        exchange     : r.exchange,
        fatalCount   : r.fatalCount,
        warningCount : r.warningCount,
        issues       : r.issues,
      })),
    };
    const outPath = path.join(REPORTS_DIR, 'evidence-facts-validation.json');
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log(`\n  ${DIM}JSON report: reports/evidence-facts-validation.json${RESET}`);
  }

  if (WRITE_REPORT) {
    const lines = [
      '# Evidence Facts Validation Report',
      `**Generated:** ${new Date().toISOString()}`,
      '',
      '## Summary',
      `| Metric | Value |`,
      `|---|---|`,
      `| Files checked | ${totalFiles} |`,
      `| Fatal errors | ${totalFatals} |`,
      `| Warnings | ${totalWarnings} |`,
      `| Files with fatals | ${filesWithFatal} |`,
      `| Files with warnings | ${filesWithWarn} |`,
      '',
      '## Per-Exchange Results',
      '',
      '| Exchange | Fatals | Warnings |',
      '|---|---|---|',
    ];
    for (const r of results) {
      lines.push(`| \`${r.exchange}\` | ${r.fatalCount} | ${r.warningCount} |`);
    }
    lines.push('');
    lines.push('## Issues Detail');
    lines.push('');
    for (const r of results) {
      if (r.issues.length === 0) continue;
      lines.push(`### ${r.exchange}`);
      lines.push('');
      lines.push('| Level | Code | Message |');
      lines.push('|---|---|---|');
      for (const iss of r.issues) {
        lines.push(`| ${iss.level} | \`${iss.code}\` | ${iss.message.replace(/\|/g, '\\|')} |`);
      }
      lines.push('');
    }
    const outPath = path.join(REPORTS_DIR, 'evidence-facts-validation.md');
    fs.writeFileSync(outPath, lines.join('\n'));
    console.log(`  ${DIM}Markdown report: reports/evidence-facts-validation.md${RESET}`);
  }

  console.log('');
  process.exit(exitCode);
}

run();
