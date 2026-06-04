#!/usr/bin/env node
/**
 * evidence-governance-report.mjs
 * Evidence Governance Report — CryptoBonusWorld
 *
 * Converts raw evidence facts into an owner-readable trust, confidence,
 * and review-priority report across all 14 exchange evidence files.
 *
 * ─── SCORING MODEL (Evidence Maturity Score, EMS 0–100) ───────────────────
 *
 * EMS = sum of 6 weighted components:
 *
 *   1. Confidence Base     (0–35): avgConfidenceScore × 35
 *      Most important dimension — overall data quality.
 *
 *   2. Bonus Trust         (0–20): bonusAvgConfidence × 20
 *      Affiliate-specific trust in bonus claim fields.
 *      Low bonus trust = bonus pages should show caveats.
 *
 *   3. Freshness           (0–15):
 *      1.00 × 15 if updatedAt ≤ 30 days ago
 *      0.50 × 15 if updatedAt 31–90 days ago
 *      0.00 × 15 if updatedAt > 90 days ago
 *
 *   4. Screenshot Coverage (0–10): (availableScreenshots / totalScreenshots) × 10
 *      Visual evidence for claims.
 *
 *   5. Source Coverage     (0–10): Math.min(sourceCount / 8, 1.0) × 10
 *      Capped at 8 sources — more than 8 is good but not scored higher.
 *
 *   6. Clean Status        (0–10): starts at 10, reduced by issues:
 *      -0.50 per outdated fact      (max -5)
 *      -0.30 per unverified fact    (max -6)
 *      -0.30 per needs-check fact   (max -3)
 *      -0.20 per manualReviewReq'd  (max -4)
 *      Floor at 0.
 *
 * Maximum theoretical score: 35 + 20 + 15 + 10 + 10 + 10 = 100
 * Score clamped to [0, 100] and rounded to integer.
 *
 * ─── PUBLISH-SAFE CRITERIA (Bonus Claims) ─────────────────────────────────
 *
 * An exchange is NOT publish-safe for bonus claims if ANY of:
 *   a. bonusAvgConfidence < 0.50
 *   b. Any bonus fact has manualReviewRequired = true
 *   c. The bonus_amount fact (if present) has conflictStatus = 'outdated'
 *
 * ─── FLAGS ────────────────────────────────────────────────────────────────
 *   --json        Write reports/evidence-governance-report.json
 *   --markdown    Write reports/evidence-governance-report.md
 *   (both flags active simultaneously is allowed)
 *   --exchange    Filter to a single exchange slug
 *   --verbose     Print per-exchange detail to console
 *
 * ─── EXIT CODES ───────────────────────────────────────────────────────────
 *   0   Success (reports generated)
 *   1   Could not read one or more evidence files (non-fatal — continues)
 *   2   Fatal: could not read evidence directory or write reports
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── CLI flags ─────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const WRITE_JSON = args.includes('--json');
const WRITE_MD   = args.includes('--markdown');
const VERBOSE    = args.includes('--verbose');
const filterIdx  = args.indexOf('--exchange');
const FILTER     = filterIdx !== -1 ? args[filterIdx + 1] : null;

// If neither flag passed, print summary to console
const CONSOLE_OUT = !WRITE_JSON && !WRITE_MD;

// ─── Constants ─────────────────────────────────────────────────────────────
const TODAY           = new Date('2026-06-03');   // project canonical date
const BONUS_FIELDS_RE = /bonus/i;
const PUBLISH_SAFE_MIN_BONUS_CONF = 0.50;

// EMS weight constants
const W_CONFIDENCE  = 35;
const W_BONUS_TRUST = 20;
const W_FRESHNESS   = 15;
const W_SCREENSHOTS = 10;
const W_SOURCES     = 10;
const W_CLEAN       = 10;

// Clean status penalty rates (per occurrence)
const PENALTY_OUTDATED    = 0.50;
const PENALTY_UNVERIFIED  = 0.30;
const PENALTY_NEEDS_CHECK = 0.30;
const PENALTY_MANUAL      = 0.20;

// ─── Load evidence files ────────────────────────────────────────────────────
const evidenceDir = path.join(ROOT, 'src', 'data', 'evidence');
let evidenceFiles;
try {
  evidenceFiles = fs.readdirSync(evidenceDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(evidenceDir, f));
} catch (err) {
  console.error(`FATAL: Cannot read evidence directory: ${err.message}`);
  process.exit(2);
}

if (evidenceFiles.length === 0) {
  console.error('FATAL: No evidence JSON files found in src/data/evidence/');
  process.exit(2);
}

// ─── Helper functions ───────────────────────────────────────────────────────
function daysSince(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 9999;
  return Math.floor((TODAY - d) / (1000 * 60 * 60 * 24));
}

function freshnessScore(dateStr) {
  const days = daysSince(dateStr);
  if (days <= 30)  return 1.00;
  if (days <= 90)  return 0.50;
  return 0.00;
}

function round2(n) { return Math.round(n * 100) / 100; }
function round0(n) { return Math.round(n); }

function calcEMS(data) {
  const {
    avgConf, bonusAvgConf, updatedAt,
    availableScreenshots, totalScreenshots, sourceCount,
    outdatedCount, unverifiedCount, needsCheckCount, manualCount,
  } = data;

  const comp1 = avgConf * W_CONFIDENCE;
  const comp2 = bonusAvgConf * W_BONUS_TRUST;
  const comp3 = freshnessScore(updatedAt) * W_FRESHNESS;
  const comp4 = totalScreenshots > 0
    ? (availableScreenshots / totalScreenshots) * W_SCREENSHOTS
    : 0;
  const comp5 = Math.min(sourceCount / 8, 1.0) * W_SOURCES;

  // Clean status: start at W_CLEAN, subtract penalties
  const penalty =
    Math.min(outdatedCount   * PENALTY_OUTDATED,    5) +
    Math.min(unverifiedCount * PENALTY_UNVERIFIED,  6) +
    Math.min(needsCheckCount * PENALTY_NEEDS_CHECK, 3) +
    Math.min(manualCount     * PENALTY_MANUAL,      4);
  const comp6 = Math.max(0, W_CLEAN - penalty);

  const raw = comp1 + comp2 + comp3 + comp4 + comp5 + comp6;
  return {
    ems:   Math.min(100, Math.max(0, round0(raw))),
    comps: {
      confidence:  round2(comp1),
      bonusTrust:  round2(comp2),
      freshness:   round2(comp3),
      screenshots: round2(comp4),
      sources:     round2(comp5),
      cleanStatus: round2(comp6),
    },
  };
}

// ─── Process each exchange ──────────────────────────────────────────────────
const exchangeReports = [];
let readErrors = 0;

for (const filePath of evidenceFiles) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`WARNING: Cannot parse ${path.basename(filePath)}: ${err.message}`);
    readErrors++;
    continue;
  }

  const slug = raw.exchange;
  if (FILTER && slug !== FILTER) continue;

  const facts       = Array.isArray(raw.facts)    ? raw.facts    : [];
  const screenshots = raw.screenshots && typeof raw.screenshots === 'object'
    ? raw.screenshots : {};
  const sources     = raw.sources && typeof raw.sources === 'object'
    ? raw.sources : {};
  const updatedAt   = raw.updatedAt || '2000-01-01';

  // ── Fact metrics ──────────────────────────────────────────────────────────
  const scores       = facts.map(f => typeof f.confidenceScore === 'number' ? f.confidenceScore : 0);
  const avgConf      = scores.length > 0
    ? round2(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const outdatedCount   = facts.filter(f => f.conflictStatus === 'outdated').length;
  const unverifiedCount = facts.filter(f => f.conflictStatus === 'unverified').length;
  const needsCheckCount = facts.filter(f => f.conflictStatus === 'needs-check').length;
  const manualCount     = facts.filter(f => f.manualReviewRequired === true).length;
  const veryLowCount    = facts.filter(f => typeof f.confidenceScore === 'number' && f.confidenceScore < 0.30).length;
  const lowCount        = facts.filter(f => typeof f.confidenceScore === 'number' && f.confidenceScore >= 0.30 && f.confidenceScore < 0.50).length;
  const highCount       = facts.filter(f => typeof f.confidenceScore === 'number' && f.confidenceScore >= 0.80).length;

  // ── Bonus-specific metrics ────────────────────────────────────────────────
  const bonusFacts  = facts.filter(f => BONUS_FIELDS_RE.test(f.field));
  const bonusScores = bonusFacts.map(f => typeof f.confidenceScore === 'number' ? f.confidenceScore : 0);
  const bonusAvgConf = bonusScores.length > 0
    ? round2(bonusScores.reduce((a, b) => a + b, 0) / bonusScores.length)
    : 0;
  const bonusOutdatedCount = bonusFacts.filter(f => f.conflictStatus === 'outdated').length;
  const bonusManualCount   = bonusFacts.filter(f => f.manualReviewRequired === true).length;
  const bonusAmountFact    = bonusFacts.find(f => f.field === 'bonus_amount');
  const bonusFields        = bonusFacts.map(f => ({
    field:           f.field,
    value:           f.currentValue,
    unit:            f.unit || null,
    confidence:      f.confidenceScore,
    conflictStatus:  f.conflictStatus,
    manualRequired:  f.manualReviewRequired,
    lastChecked:     f.lastChecked,
    notes:           f.notes || null,
  }));

  // ── Screenshot metrics ────────────────────────────────────────────────────
  const screenshotKeys    = Object.keys(screenshots);
  const totalScreenshots  = screenshotKeys.length;
  const availableScreenshots = screenshotKeys
    .filter(k => screenshots[k]?.status === 'available').length;
  const needsCaptureScreenshots = screenshotKeys
    .filter(k => screenshots[k]?.status === 'needs_manual_capture').length;

  // ── Source metrics ────────────────────────────────────────────────────────
  const sourceKeys  = Object.keys(sources);
  const sourceCount = sourceKeys.length;
  const sourceTypes = [...new Set(sourceKeys.map(k => sources[k]?.type).filter(Boolean))];

  // ── EMS calculation ───────────────────────────────────────────────────────
  const { ems, comps } = calcEMS({
    avgConf, bonusAvgConf, updatedAt,
    availableScreenshots, totalScreenshots, sourceCount,
    outdatedCount, unverifiedCount, needsCheckCount, manualCount,
  });

  // ── Publish-safe assessment ───────────────────────────────────────────────
  const publishSafeReasons = [];
  const notPublishSafeReasons = [];

  if (bonusAvgConf < PUBLISH_SAFE_MIN_BONUS_CONF) {
    notPublishSafeReasons.push(
      `Bonus avg confidence ${bonusAvgConf} < ${PUBLISH_SAFE_MIN_BONUS_CONF} threshold`
    );
  }
  if (bonusManualCount > 0) {
    notPublishSafeReasons.push(
      `${bonusManualCount} bonus fact(s) require manual review`
    );
  }
  if (bonusAmountFact && bonusAmountFact.conflictStatus === 'outdated') {
    notPublishSafeReasons.push(
      `bonus_amount has conflictStatus=outdated (value: ${bonusAmountFact.currentValue} ${bonusAmountFact.unit || ''})`
    );
  }

  if (notPublishSafeReasons.length === 0) {
    publishSafeReasons.push('Bonus avg confidence ≥ 0.50');
    publishSafeReasons.push('No bonus facts require manual review');
    if (!bonusAmountFact || bonusAmountFact.conflictStatus !== 'outdated') {
      publishSafeReasons.push('bonus_amount is current (not outdated)');
    }
  }

  const isPublishSafe = notPublishSafeReasons.length === 0;

  // ── Review urgency score (0–10, higher = more urgent) ────────────────────
  // Used to rank exchanges by how urgently they need attention
  const urgency = round2(
    (veryLowCount  * 0.5) +
    (manualCount   * 0.4) +
    (unverifiedCount * 0.3) +
    (outdatedCount * 0.2) +
    (needsCheckCount * 0.2)
  );

  // ── Staleness ─────────────────────────────────────────────────────────────
  const staleDays  = daysSince(updatedAt);
  const staleLevel = staleDays > 90 ? 'stale' : staleDays > 30 ? 'aging' : 'fresh';

  exchangeReports.push({
    slug,
    ems,
    emsComponents: comps,
    updatedAt,
    staleDays,
    staleLevel,
    isPublishSafe,
    publishSafeReasons,
    notPublishSafeReasons,
    urgency,
    facts: {
      total:      facts.length,
      avgConf,
      highConf:   highCount,
      lowConf:    lowCount,
      veryLowConf: veryLowCount,
      outdated:    outdatedCount,
      unverified:  unverifiedCount,
      needsCheck:  needsCheckCount,
      manualReviewRequired: manualCount,
    },
    bonus: {
      factCount:    bonusFacts.length,
      avgConf:      bonusAvgConf,
      outdatedCount: bonusOutdatedCount,
      manualCount:   bonusManualCount,
      fields:        bonusFields,
    },
    screenshots: {
      total:          totalScreenshots,
      available:       availableScreenshots,
      needsCapture:    needsCaptureScreenshots,
      coveragePct:     totalScreenshots > 0
        ? round2((availableScreenshots / totalScreenshots) * 100) : 0,
    },
    sources: {
      count: sourceCount,
      types: sourceTypes,
    },
  });
}

// ─── Sort helpers ────────────────────────────────────────────────────────────
const byEMSDesc      = (a, b) => b.ems - a.ems;
const byUrgencyDesc  = (a, b) => b.urgency - a.urgency;

const rankedByEMS     = [...exchangeReports].sort(byEMSDesc);
const rankedByUrgency = [...exchangeReports].sort(byUrgencyDesc);

// ─── Global metrics ──────────────────────────────────────────────────────────
const totalExchanges = exchangeReports.length;
const globalEMS = totalExchanges > 0
  ? round0(exchangeReports.reduce((s, r) => s + r.ems, 0) / totalExchanges)
  : 0;
const globalAvgConf = totalExchanges > 0
  ? round2(exchangeReports.reduce((s, r) => s + r.facts.avgConf, 0) / totalExchanges)
  : 0;
const globalBonusAvgConf = totalExchanges > 0
  ? round2(exchangeReports.reduce((s, r) => s + r.bonus.avgConf, 0) / totalExchanges)
  : 0;
const totalFacts = exchangeReports.reduce((s, r) => s + r.facts.total, 0);
const totalOutdated   = exchangeReports.reduce((s, r) => s + r.facts.outdated, 0);
const totalUnverified = exchangeReports.reduce((s, r) => s + r.facts.unverified, 0);
const totalManual     = exchangeReports.reduce((s, r) => s + r.facts.manualReviewRequired, 0);
const totalVeryLow    = exchangeReports.reduce((s, r) => s + r.facts.veryLowConf, 0);
const publishSafeList = exchangeReports.filter(r => r.isPublishSafe).map(r => r.slug);
const notPublishSafeList = exchangeReports.filter(r => !r.isPublishSafe).map(r => r.slug);

// Critical issues: EMS < 60 or urgency ≥ 3.0 or unverified ≥ 5 or stale
const criticalIssues = [];
for (const r of exchangeReports) {
  if (r.ems < 55) criticalIssues.push({ slug: r.slug, issue: `EMS ${r.ems} is below 55 (low maturity)` });
  if (r.facts.unverified >= 5) criticalIssues.push({ slug: r.slug, issue: `${r.facts.unverified} unverified facts` });
  if (r.facts.manualReviewRequired >= 5) criticalIssues.push({ slug: r.slug, issue: `${r.facts.manualReviewRequired} facts require manual review` });
  if (r.staleLevel === 'stale') criticalIssues.push({ slug: r.slug, issue: `Evidence is stale (${r.staleDays} days old)` });
}

// Bonus verification queue: exchanges with low bonus trust or outdated bonus facts
const bonusQueue = exchangeReports
  .filter(r => r.bonus.avgConf < 0.50 || r.bonus.outdatedCount > 0 || r.bonus.manualCount > 0)
  .sort((a, b) => a.bonus.avgConf - b.bonus.avgConf)
  .map(r => ({
    slug:          r.slug,
    bonusAvgConf:  r.bonus.avgConf,
    outdated:      r.bonus.outdatedCount,
    manualRequired: r.bonus.manualCount,
    priority:      r.bonus.avgConf < 0.35 ? 'P1' : r.bonus.avgConf < 0.45 ? 'P2' : 'P3',
  }));

// Manual review queue: exchanges with manualReviewRequired facts
const manualQueue = exchangeReports
  .filter(r => r.facts.manualReviewRequired > 0)
  .sort((a, b) => b.facts.manualReviewRequired - a.facts.manualReviewRequired)
  .map(r => ({
    slug:          r.slug,
    manualCount:   r.facts.manualReviewRequired,
    urgency:       r.urgency,
  }));

// Fields causing most warnings (aggregated across all exchanges)
const fieldWarningMap = {};
for (const r of exchangeReports) {
  const allFacts = [];
  try {
    const raw = JSON.parse(fs.readFileSync(
      path.join(evidenceDir, `${r.slug}.json`), 'utf8'
    ));
    allFacts.push(...(raw.facts || []));
  } catch { /* skip */ }

  for (const f of allFacts) {
    const isWarning =
      (f.conflictStatus && f.conflictStatus !== 'ok') ||
      f.manualReviewRequired === true ||
      (typeof f.confidenceScore === 'number' && f.confidenceScore < 0.50);

    if (isWarning) {
      if (!fieldWarningMap[f.field]) fieldWarningMap[f.field] = 0;
      fieldWarningMap[f.field]++;
    }
  }
}
const topWarningFields = Object.entries(fieldWarningMap)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([field, count]) => ({ field, warningCount: count }));

// ─── Recommended next actions ─────────────────────────────────────────────
const recommendations = [];

if (totalVeryLow > 10) {
  recommendations.push({
    priority: 'P1',
    action:   'Re-verify all bonus_amount facts across P1 exchanges (binance, okx, mexc, bitget)',
    reason:   `${totalVeryLow} very-low-confidence facts globally (< 0.30)`,
  });
}
if (globalBonusAvgConf < 0.50) {
  recommendations.push({
    priority: 'P1',
    action:   'Bonus confidence below publish threshold — add official source verification for bonus_amount, bonus_expiry_days, bonus_requires_deposit',
    reason:   `Global bonus avg confidence = ${globalBonusAvgConf} (threshold: 0.50)`,
  });
}
const noScreenshotExchanges = exchangeReports.filter(r => r.screenshots.available === 0);
if (noScreenshotExchanges.length > 0) {
  recommendations.push({
    priority: 'P2',
    action:   `Capture screenshots for ${noScreenshotExchanges.length} exchanges — use npm run screenshots:harvest:{slug}`,
    reason:   `${noScreenshotExchanges.length} exchanges have 0 available screenshots`,
  });
}
const bitunixReport = exchangeReports.find(r => r.slug === 'bitunix');
if (bitunixReport && bitunixReport.facts.unverified >= 5) {
  recommendations.push({
    priority: 'P1',
    action:   'Resolve unverified facts in bitunix evidence — highest unverified count in dataset',
    reason:   `bitunix has ${bitunixReport.facts.unverified} unverified facts and ${bitunixReport.facts.manualReviewRequired} manual review flags`,
  });
}
recommendations.push({
  priority: 'P2',
  action:   'Set up bonus:verify:all to auto-propose fresh bonus values from live exchanges',
  reason:   'Automated bonus re-verification would improve confidence scores for all bonus fields',
});
if (notPublishSafeList.length > 0) {
  recommendations.push({
    priority: 'P2',
    action:   `Review and update bonus pages for: ${notPublishSafeList.slice(0, 5).join(', ')}`,
    reason:   `${notPublishSafeList.length} exchanges are not publish-safe for bonus claims`,
  });
}

// ─── EMS maturity label ──────────────────────────────────────────────────────
function emsLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

// ─── Console output ───────────────────────────────────────────────────────────
const BOLD  = '\x1b[1m';
const RED   = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN  = '\x1b[36m';
const DIM   = '\x1b[2m';
const RESET = '\x1b[0m';

function emsColor(score) {
  if (score >= 70) return GREEN + BOLD;
  if (score >= 55) return YELLOW;
  return RED + BOLD;
}

if (CONSOLE_OUT || VERBOSE) {
  console.log('');
  console.log(`${BOLD}══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Evidence Governance Report — CryptoBonusWorld${RESET}`);
  console.log(`${BOLD}══════════════════════════════════════════════════════════${RESET}`);
  console.log(`  Generated: ${TODAY.toISOString().split('T')[0]}`);
  console.log(`  Exchanges: ${totalExchanges}  |  Total Facts: ${totalFacts}`);
  console.log('');
  console.log(`  ${BOLD}Global Evidence Maturity Score:${RESET} ${emsColor(globalEMS)}${globalEMS}/100 (${emsLabel(globalEMS)})${RESET}`);
  console.log(`  Avg Confidence: ${globalAvgConf}  |  Bonus Avg: ${globalBonusAvgConf}`);
  console.log(`  Outdated facts: ${totalOutdated}  |  Unverified: ${totalUnverified}  |  Manual: ${totalManual}`);
  console.log('');

  // Ranking
  console.log(`${BOLD}  Exchange Ranking by EMS:${RESET}`);
  for (let i = 0; i < rankedByEMS.length; i++) {
    const r = rankedByEMS[i];
    const badge = r.isPublishSafe ? `${GREEN}[SAFE]${RESET}` : `${YELLOW}[REVIEW]${RESET}`;
    const screenshots = r.screenshots.available > 0 ? `📷${r.screenshots.available}` : '';
    console.log(
      `  ${String(i + 1).padStart(2)}. ${r.slug.padEnd(10)} ${emsColor(r.ems)}${String(r.ems).padStart(3)}${RESET}` +
      ` ${emsLabel(r.ems).padEnd(10)} conf:${r.facts.avgConf} ${badge} ${screenshots}`
    );
  }
  console.log('');

  // Critical issues
  if (criticalIssues.length > 0) {
    console.log(`${RED}${BOLD}  Critical Issues:${RESET}`);
    for (const ci of criticalIssues) {
      console.log(`  ${RED}✗${RESET} ${ci.slug}: ${ci.issue}`);
    }
    console.log('');
  }

  // Publish safety
  console.log(`${BOLD}  Publish-Safe (Bonus Claims):${RESET}`);
  if (publishSafeList.length > 0) {
    console.log(`  ${GREEN}✓${RESET} ${publishSafeList.join(', ')}`);
  } else {
    console.log(`  ${YELLOW}(none)${RESET}`);
  }
  console.log(`\n${BOLD}  Not Publish-Safe:${RESET}`);
  if (notPublishSafeList.length > 0) {
    console.log(`  ${YELLOW}⚠${RESET} ${notPublishSafeList.join(', ')}`);
  } else {
    console.log(`  ${GREEN}(all publish-safe)${RESET}`);
  }
  console.log('');

  // Top warning fields
  console.log(`${BOLD}  Top Fields with Warnings:${RESET}`);
  for (const wf of topWarningFields.slice(0, 5)) {
    console.log(`  ${DIM}•${RESET} ${wf.field.padEnd(28)} ${wf.warningCount} exchange(s)`);
  }
  console.log('');

  // Recommendations
  console.log(`${BOLD}  Recommended Next Actions:${RESET}`);
  for (const rec of recommendations) {
    const color = rec.priority === 'P1' ? RED : YELLOW;
    console.log(`  ${color}[${rec.priority}]${RESET} ${rec.action}`);
  }
  console.log('');
}

// ─── Build report objects ─────────────────────────────────────────────────────
const reportJson = {
  generatedAt: new Date().toISOString(),
  scoringModel: {
    description: 'Evidence Maturity Score (EMS) 0–100',
    components: {
      confidence:       `${W_CONFIDENCE} pts × avgConfidenceScore`,
      bonusTrust:       `${W_BONUS_TRUST} pts × bonusAvgConfidenceScore`,
      freshness:        `${W_FRESHNESS} pts × (1.0 if ≤30d, 0.5 if 31-90d, 0.0 if >90d)`,
      screenshots:      `${W_SCREENSHOTS} pts × (available/total screenshots)`,
      sources:          `${W_SOURCES} pts × min(sourceCount/8, 1.0)`,
      cleanStatus:      `${W_CLEAN} pts, -${PENALTY_OUTDATED}/outdated, -${PENALTY_UNVERIFIED}/unverified, -${PENALTY_NEEDS_CHECK}/needs-check, -${PENALTY_MANUAL}/manualReq`,
    },
    publishSafeCriteria: {
      bonusAvgConfidenceMin:         PUBLISH_SAFE_MIN_BONUS_CONF,
      noBonusManualReviewRequired:   true,
      bonusAmountNotOutdated:        true,
    },
  },
  global: {
    totalExchanges,
    totalFacts,
    globalEMS,
    globalEMSLabel:      emsLabel(globalEMS),
    globalAvgConf,
    globalBonusAvgConf,
    totalOutdated,
    totalUnverified,
    totalManual,
    totalVeryLow,
    publishSafeCount:    publishSafeList.length,
    notPublishSafeCount: notPublishSafeList.length,
  },
  rankings: {
    byEMS:     rankedByEMS.map(r => ({ slug: r.slug, ems: r.ems, label: emsLabel(r.ems) })),
    byUrgency: rankedByUrgency.map(r => ({ slug: r.slug, urgency: r.urgency })),
  },
  criticalIssues,
  bonusVerificationQueue: bonusQueue,
  manualReviewQueue:      manualQueue,
  publishSafe:            publishSafeList,
  notPublishSafe:         notPublishSafeList,
  topWarningFields,
  recommendations,
  exchanges:              exchangeReports,
};

// ─── Write JSON ──────────────────────────────────────────────────────────────
const reportsDir = path.join(ROOT, 'reports');

if (WRITE_JSON || WRITE_MD) {
  try {
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  } catch (err) {
    console.error(`FATAL: Cannot create reports directory: ${err.message}`);
    process.exit(2);
  }
}

if (WRITE_JSON) {
  const jsonPath = path.join(reportsDir, 'evidence-governance-report.json');
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(reportJson, null, 2), 'utf8');
    console.log(`  JSON report written: ${jsonPath}`);
  } catch (err) {
    console.error(`FATAL: Cannot write JSON report: ${err.message}`);
    process.exit(2);
  }
}

// ─── Write Markdown ───────────────────────────────────────────────────────────
if (WRITE_MD) {
  const nowStr  = TODAY.toISOString().split('T')[0];
  const bar     = (score) => {
    const filled = Math.round(score / 5);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
  };
  const emsRow  = (r, i) =>
    `| ${i + 1} | ${r.slug} | ${r.ems} | ${emsLabel(r.ems)} | ${r.facts.avgConf} | ${r.bonus.avgConf} | ${r.screenshots.available}/${r.screenshots.total} | ${r.isPublishSafe ? '✅' : '⚠️'} |`;

  const lines = [];
  lines.push(`# Evidence Governance Report`);
  lines.push(`> CryptoBonusWorld — Generated ${nowStr}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Executive Summary ───────────────────────────────────────────────────
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`The evidence layer covers **${totalExchanges} exchanges** with **${totalFacts} facts** total.`);
  lines.push(`The global Evidence Maturity Score is **${globalEMS}/100** (${emsLabel(globalEMS)}).`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Global EMS | **${globalEMS}/100** (${emsLabel(globalEMS)}) |`);
  lines.push(`| Avg Confidence | ${globalAvgConf} |`);
  lines.push(`| Bonus Avg Confidence | ${globalBonusAvgConf} |`);
  lines.push(`| Total Facts | ${totalFacts} |`);
  lines.push(`| Outdated Facts | ${totalOutdated} |`);
  lines.push(`| Unverified Facts | ${totalUnverified} |`);
  lines.push(`| Requires Manual Review | ${totalManual} |`);
  lines.push(`| Very-Low Confidence (< 0.30) | ${totalVeryLow} |`);
  lines.push(`| Publish-Safe (Bonus) | ${publishSafeList.length}/${totalExchanges} |`);
  lines.push('');

  // ── Scoring Model ────────────────────────────────────────────────────────
  lines.push('## Scoring Model');
  lines.push('');
  lines.push('The Evidence Maturity Score (EMS) is calculated per exchange and averaged globally.');
  lines.push('');
  lines.push('| Component | Weight | Formula |');
  lines.push('|-----------|--------|---------|');
  lines.push(`| Confidence Base | ${W_CONFIDENCE} pts | avgConfidenceScore × ${W_CONFIDENCE} |`);
  lines.push(`| Bonus Trust | ${W_BONUS_TRUST} pts | bonusAvgConfidence × ${W_BONUS_TRUST} |`);
  lines.push(`| Freshness | ${W_FRESHNESS} pts | 15 if ≤30d, 7 if 31-90d, 0 if >90d |`);
  lines.push(`| Screenshot Coverage | ${W_SCREENSHOTS} pts | (available/total) × ${W_SCREENSHOTS} |`);
  lines.push(`| Source Coverage | ${W_SOURCES} pts | min(sourceCount/8, 1) × ${W_SOURCES} |`);
  lines.push(`| Clean Status | ${W_CLEAN} pts | Starts at 10; −0.5/outdated, −0.3/unverified, −0.3/needs-check, −0.2/manual |`);
  lines.push('');
  lines.push('**Publish-Safe Criteria (Bonus Claims):**');
  lines.push(`- Bonus average confidence ≥ ${PUBLISH_SAFE_MIN_BONUS_CONF}`);
  lines.push('- Zero bonus facts with `manualReviewRequired: true`');
  lines.push('- `bonus_amount` fact (if present) must not have `conflictStatus: outdated`');
  lines.push('');
  lines.push('> **Limitations:** Score reflects data quality metadata only. It does not verify');
  lines.push('> correctness of fact values. A high EMS means facts are well-documented;');
  lines.push('> it does not guarantee they are accurate at the time of reading.');
  lines.push('');

  // ── Global EMS Bar ────────────────────────────────────────────────────────
  lines.push('## Global Evidence Maturity Score');
  lines.push('');
  lines.push(`**${globalEMS}/100** — ${emsLabel(globalEMS)}`);
  lines.push('');
  lines.push('```');
  lines.push(`${bar(globalEMS)} ${globalEMS}%`);
  lines.push('```');
  lines.push('');

  // ── Exchange Ranking by EMS ───────────────────────────────────────────────
  lines.push('## Exchange Ranking by Evidence Confidence (EMS)');
  lines.push('');
  lines.push('| # | Exchange | EMS | Maturity | Avg Conf | Bonus Conf | Screenshots | Bonus Safe |');
  lines.push('|---|----------|-----|----------|----------|------------|-------------|------------|');
  rankedByEMS.forEach((r, i) => lines.push(emsRow(r, i)));
  lines.push('');

  // ── Exchange Ranking by Review Urgency ────────────────────────────────────
  lines.push('## Exchange Ranking by Review Urgency (highest first)');
  lines.push('');
  lines.push('| # | Exchange | Urgency | Manual | Unverified | Outdated | Very-Low Conf |');
  lines.push('|---|----------|---------|--------|------------|----------|---------------|');
  rankedByUrgency.forEach((r, i) => {
    lines.push(
      `| ${i + 1} | ${r.slug} | ${r.urgency} | ${r.facts.manualReviewRequired} | ${r.facts.unverified} | ${r.facts.outdated} | ${r.facts.veryLowConf} |`
    );
  });
  lines.push('');

  // ── Critical Issues ───────────────────────────────────────────────────────
  lines.push('## Critical Issues');
  lines.push('');
  if (criticalIssues.length === 0) {
    lines.push('✅ No critical issues detected.');
  } else {
    for (const ci of criticalIssues) {
      lines.push(`- ❌ **${ci.slug}**: ${ci.issue}`);
    }
  }
  lines.push('');

  // ── Bonus Verification Queue ──────────────────────────────────────────────
  lines.push('## Bonus Verification Queue');
  lines.push('');
  lines.push('Exchanges requiring bonus fact re-verification (sorted by lowest bonus confidence first):');
  lines.push('');
  if (bonusQueue.length === 0) {
    lines.push('✅ All exchanges have satisfactory bonus confidence.');
  } else {
    lines.push('| Priority | Exchange | Bonus Avg Conf | Outdated | Manual Required |');
    lines.push('|----------|----------|---------------|----------|-----------------|');
    for (const q of bonusQueue) {
      lines.push(`| ${q.priority} | ${q.slug} | ${q.bonusAvgConf} | ${q.outdated} | ${q.manualRequired} |`);
    }
  }
  lines.push('');

  // ── Manual Review Queue ───────────────────────────────────────────────────
  lines.push('## Manual Review Queue');
  lines.push('');
  if (manualQueue.length === 0) {
    lines.push('✅ No facts currently flagged for manual review.');
  } else {
    lines.push('| Exchange | Manual Count | Urgency Score |');
    lines.push('|----------|-------------|----------------|');
    for (const m of manualQueue) {
      lines.push(`| ${m.slug} | ${m.manualCount} | ${m.urgency} |`);
    }
  }
  lines.push('');

  // ── Publish Safety ────────────────────────────────────────────────────────
  lines.push('## Publish-Safe Exchanges (Bonus Claims)');
  lines.push('');
  if (publishSafeList.length === 0) {
    lines.push('⚠️ **No exchanges currently meet all publish-safe criteria for bonus claims.**');
  } else {
    for (const slug of publishSafeList) {
      const r = exchangeReports.find(x => x.slug === slug);
      lines.push(`- ✅ **${slug}** (EMS: ${r.ems}, bonus conf: ${r.bonus.avgConf})`);
      for (const reason of r.publishSafeReasons) {
        lines.push(`  - ${reason}`);
      }
    }
  }
  lines.push('');

  lines.push('## Not Publish-Safe for Bonus Claims');
  lines.push('');
  if (notPublishSafeList.length === 0) {
    lines.push('✅ All exchanges are publish-safe.');
  } else {
    for (const slug of notPublishSafeList) {
      const r = exchangeReports.find(x => x.slug === slug);
      lines.push(`- ⚠️ **${slug}** (EMS: ${r.ems}, bonus conf: ${r.bonus.avgConf})`);
      for (const reason of r.notPublishSafeReasons) {
        lines.push(`  - ${reason}`);
      }
    }
  }
  lines.push('');

  // ── Fields causing warnings ───────────────────────────────────────────────
  lines.push('## Fields Causing the Most Warnings');
  lines.push('');
  lines.push('Fields with the most instances of: low confidence, outdated, unverified, or manual review flags across all exchanges.');
  lines.push('');
  lines.push('| # | Field | Warning Count (exchanges) |');
  lines.push('|---|-------|--------------------------|');
  topWarningFields.forEach((wf, i) => {
    lines.push(`| ${i + 1} | \`${wf.field}\` | ${wf.warningCount} |`);
  });
  lines.push('');

  // ── Recommended Next Actions ──────────────────────────────────────────────
  lines.push('## Recommended Next Actions');
  lines.push('');
  for (const rec of recommendations) {
    lines.push(`### [${rec.priority}] ${rec.action}`);
    lines.push(`> ${rec.reason}`);
    lines.push('');
  }

  // ── Per-Exchange Detail ───────────────────────────────────────────────────
  lines.push('## Per-Exchange Evidence Detail');
  lines.push('');
  for (const r of rankedByEMS) {
    lines.push(`### ${r.slug}`);
    lines.push('');
    lines.push(`| Property | Value |`);
    lines.push(`|----------|-------|`);
    lines.push(`| EMS | **${r.ems}/100** (${emsLabel(r.ems)}) |`);
    lines.push(`| Avg Confidence | ${r.facts.avgConf} |`);
    lines.push(`| Bonus Avg Confidence | ${r.bonus.avgConf} |`);
    lines.push(`| Updated At | ${r.updatedAt} (${r.staleDays}d ago — ${r.staleLevel}) |`);
    lines.push(`| Total Facts | ${r.facts.total} |`);
    lines.push(`| High Confidence (≥0.80) | ${r.facts.highConf} |`);
    lines.push(`| Very-Low Confidence (<0.30) | ${r.facts.veryLowConf} |`);
    lines.push(`| Outdated | ${r.facts.outdated} |`);
    lines.push(`| Unverified | ${r.facts.unverified} |`);
    lines.push(`| Needs-Check | ${r.facts.needsCheck} |`);
    lines.push(`| Manual Review Required | ${r.facts.manualReviewRequired} |`);
    lines.push(`| Screenshots Available | ${r.screenshots.available}/${r.screenshots.total} |`);
    lines.push(`| Sources | ${r.sources.count} |`);
    lines.push(`| Bonus Publish-Safe | ${r.isPublishSafe ? '✅ Yes' : '⚠️ No'} |`);
    lines.push('');

    if (r.bonus.fields.length > 0) {
      lines.push('**Bonus Facts:**');
      lines.push('');
      lines.push('| Field | Value | Conf | Status | Manual |');
      lines.push('|-------|-------|------|--------|--------|');
      for (const bf of r.bonus.fields) {
        const val = bf.unit ? `${bf.value} ${bf.unit}` : String(bf.value);
        lines.push(
          `| ${bf.field} | ${val} | ${bf.confidence} | ${bf.conflictStatus} | ${bf.manualRequired ? '⚠️' : '✅'} |`
        );
      }
      lines.push('');
    }

    if (r.notPublishSafeReasons.length > 0) {
      lines.push('**Not Publish-Safe Reasons:**');
      for (const reason of r.notPublishSafeReasons) {
        lines.push(`- ${reason}`);
      }
      lines.push('');
    }

    lines.push('**EMS Components:**');
    lines.push('');
    lines.push('| Component | Score |');
    lines.push('|-----------|-------|');
    for (const [k, v] of Object.entries(r.emsComponents)) {
      lines.push(`| ${k} | ${v} |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const mdContent = lines.join('\n');
  const mdPath = path.join(reportsDir, 'evidence-governance-report.md');
  try {
    fs.writeFileSync(mdPath, mdContent, 'utf8');
    console.log(`  Markdown report written: ${mdPath}`);
  } catch (err) {
    console.error(`FATAL: Cannot write Markdown report: ${err.message}`);
    process.exit(2);
  }
}

process.exit(readErrors > 0 ? 1 : 0);
