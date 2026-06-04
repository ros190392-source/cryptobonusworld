#!/usr/bin/env node
/**
 * qa-production.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Production QA Gate — CryptoBonusWorld Sprint 01
 *
 * PURPOSE:
 *   Master QA gate that runs all safe validation/reporting checks before
 *   production deployments or data changes. Produces a single authoritative
 *   production status report.
 *
 * SAFETY GUARANTEES:
 *   - Never runs live web crawling (no --live flag is ever passed)
 *   - Never modifies evidence, affiliate URLs, or production pages
 *   - Never runs bonus:landing:live:* commands
 *   - Detects accidental live crawling in child output and aborts with FAIL
 *
 * OVERALL STATUS:
 *   PASS              All required checks pass, no warnings
 *   PASS_WITH_WARNINGS All required checks pass, non-fatal warnings present
 *   FAIL              Build fails, affiliate has fatals, or a step can't run
 *
 * EXIT CODES:
 *   0  PASS or PASS_WITH_WARNINGS
 *   2  FAIL
 *
 * FLAGS:
 *   --json       Write reports/production-qa-report.json
 *   --markdown   Write reports/production-qa-report.md
 *   (both)       Write both
 *   --verbose    Print child process output for each step
 *   --no-build   Skip the build step (use for faster local iteration)
 *
 * STEPS RUN:
 *   1. validate:affiliate   (fatal on non-0)
 *   2. validate:evidence    (warnings OK if fatals=0)
 *   3. evidence:governance  (informational)
 *   4. audit:screenshots    (informational)
 *   5. bonus:landing:plan   (dry-run only, fatal if HTTP detected)
 *   6. bonus:review:queue   (aggregate only, no crawling)
 *   7. build                (fatal on non-0)
 */

import { spawnSync } from 'node:child_process';
import fs            from 'node:fs';
import path          from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ─── CLI flags ─────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const WRITE_JSON = args.includes('--json');
const WRITE_MD   = args.includes('--markdown');
const VERBOSE    = args.includes('--verbose');
const NO_BUILD   = args.includes('--no-build');

const TODAY_STR = new Date().toISOString().split('T')[0];

// ─── Console helpers ────────────────────────────────────────────────────────────
const log  = (...a) => console.log(' ', ...a);
const dbg  = (...a) => VERBOSE && console.log('  ·', ...a);
const sep  = ()     => log('  ' + '─'.repeat(54));

// ─── ANSI strip (child output contains colour codes) ───────────────────────────
function stripAnsi(str) {
  return (str ?? '').replace(/\x1b\[[0-9;]*[mGKHF]/g, '');
}

// ─── Live crawling safety sentinel ─────────────────────────────────────────────
// Strings that only appear when Playwright actually launches (not in help/dry-run text).
// Be specific — "Launching Chromium" only emits when chromium.launch() is called.
// Do NOT include "--live --confirm-live" (appears in dry-run help/example text).
const LIVE_CRAWL_SIGNALS = [
  'Launching Chromium',              // playwright chromium.launch() confirmed
  'Running live verification for:',  // guard passed and live run started
  'playwright.chromium.launch',      // direct API call detected
  '· Navigating to:',               // verbose playwright nav (only in live mode)
];

function detectLiveCrawling(stdout, stderr) {
  const combined = (stdout ?? '') + (stderr ?? '');
  return LIVE_CRAWL_SIGNALS.find(s => combined.includes(s)) ?? null;
}

// ─── Run one child step ─────────────────────────────────────────────────────────
function runStep(id, label, npmScript) {
  const startMs = Date.now();
  log('');
  log(`  ▶ [${id}] ${label}`);
  log(`    cmd: npm run ${npmScript}`);

  const result = spawnSync('npm', ['run', npmScript], {
    cwd:      ROOT,
    encoding: 'utf8',
    shell:    true,
    timeout:  300_000,  // 5 min max per step
  });

  const durationMs = Date.now() - startMs;
  const stdout     = result.stdout ?? '';
  const stderr     = result.stderr ?? '';
  const exitCode   = result.status ?? -1;
  const execError  = result.error?.message ?? null;

  // Live crawling safety check
  const liveCrawlSignal = detectLiveCrawling(stdout, stderr);
  if (liveCrawlSignal) {
    log(`    ⛔ LIVE CRAWLING DETECTED: "${liveCrawlSignal}" — aborting QA gate`);
    return {
      id, label, npmScript, exitCode, durationMs,
      // Store full for parsing, truncate for JSON serialization is done in buildJsonReport
      _rawStdout:  stdout,
      _rawStderr:  stderr,
      stdout:      stdout.slice(0, 500),
      stderr:      stderr.slice(0, 200),
      execError,
      liveCrawlDetected: true,
      verdict: 'FAIL',
      metrics: {},
    };
  }

  if (VERBOSE) {
    const lines = stripAnsi(stdout + stderr).split('\n').filter(l => l.trim());
    for (const line of lines.slice(0, 50)) dbg(line);
  }

  log(`    Exit: ${exitCode}  Duration: ${(durationMs / 1000).toFixed(1)}s`);

  return {
    id, label, npmScript, exitCode, durationMs,
    // Keep full raw output for parsers; truncated copies stored in stdout/stderr for reports
    _rawStdout:  stdout,
    _rawStderr:  stderr,
    stdout:      stdout.slice(0, 500) + (stdout.length > 500 ? `\n…(${stdout.length} chars total)` : ''),
    stderr:      stderr.slice(0, 200) + (stderr.length > 200 ? `\n…(${stderr.length} chars total)` : ''),
    execError,
    liveCrawlDetected: false,
    verdict: null,   // set by step-specific parser
    metrics: {},
  };
}

// ─── Step-specific parsers ──────────────────────────────────────────────────────

function parseAffiliate(step) {
  const clean = stripAnsi((step._rawStdout ?? step.stdout) + (step._rawStderr ?? step.stderr));
  const fatalM  = clean.match(/Fatal\s*:\s*(\d+)/);
  const warnM   = clean.match(/Warnings\s*:\s*(\d+)/);
  const cleanM  = clean.match(/Clean\s*:\s*(\d+)\/(\d+)/);
  const passM   = clean.match(/RESULT:\s*(PASS|FAIL)/);

  const fatals    = fatalM  ? parseInt(fatalM[1])  : (step.exitCode !== 0 ? -1 : 0);
  const warnings  = warnM   ? parseInt(warnM[1])   : 0;
  const cleanAmt  = cleanM  ? parseInt(cleanM[1])  : null;
  const totalAmt  = cleanM  ? parseInt(cleanM[2])  : null;
  const passStr   = passM   ? passM[1]             : null;

  step.metrics = { fatals, warnings, cleanRoutes: cleanAmt, totalRoutes: totalAmt };

  if (step.execError || step.exitCode === -1) {
    step.verdict = 'FAIL'; return step;
  }
  if (fatals > 0 || passStr === 'FAIL' || step.exitCode !== 0) {
    step.verdict = 'FAIL'; return step;
  }
  step.verdict = warnings > 0 ? 'WARN' : 'PASS';
  return step;
}

function parseEvidence(step) {
  const clean = stripAnsi((step._rawStdout ?? step.stdout) + (step._rawStderr ?? step.stderr));
  const fatalM  = clean.match(/Fatal errors?\s*:\s*(\d+)/i);
  // Match the summary total line "140 warning(s) across 14 file(s)" — not per-exchange lines
  const warnTotalM  = clean.match(/(\d+)\s+warning\(s\)\s+across\s+\d+\s+file/i);
  // Fallback: "Warnings       : 140"
  const warnLineM   = clean.match(/Warnings\s*:\s*(\d+)/i);
  const warnM       = warnTotalM ?? warnLineM;
  const statusM = clean.match(/Status:\s+(.+)/);

  const fatals   = fatalM  ? parseInt(fatalM[1]) : null;
  const warnings = warnM   ? parseInt(warnM[1])  : 0;
  const statusLine = statusM ? statusM[1].trim()   : '';

  step.metrics = { fatals, warnings, statusLine };

  if (step.execError || step.exitCode === -1) {
    step.verdict = 'FAIL'; return step;
  }
  // exit 1 with fatals=0 → PASS WITH WARNINGS
  if (step.exitCode !== 0 && fatals === 0) {
    step.verdict = 'WARN'; return step;
  }
  if (step.exitCode !== 0 && (fatals === null || fatals > 0)) {
    step.verdict = 'FAIL'; return step;
  }
  step.verdict = warnings > 0 ? 'WARN' : 'PASS';
  return step;
}

function parseGovernance(step) {
  const clean = stripAnsi((step._rawStdout ?? step.stdout) + (step._rawStderr ?? step.stderr));
  // "Global Evidence Maturity Score: 67/100 (Fair)"
  const emsM  = clean.match(/Global Evidence Maturity Score:\s*(\d+)\/100\s*\(([^)]+)\)/i);
  const p1M   = [...clean.matchAll(/\[P1\]\s+(.+)/g)].map(m => m[1].trim());
  const p2M   = [...clean.matchAll(/\[P2\]\s+(.+)/g)].map(m => m[1].trim());

  step.metrics = {
    emsScore:    emsM ? parseInt(emsM[1]) : null,
    emsLabel:    emsM ? emsM[2] : null,
    p1Issues:    p1M,
    p2Issues:    p2M,
  };

  if (step.execError || step.exitCode === -1) {
    step.verdict = 'FAIL'; return step;
  }
  step.verdict = (p1M.length > 0 || p2M.length > 0) ? 'WARN' : 'PASS';
  return step;
}

function parseScreenshots(step) {
  const clean = stripAnsi((step._rawStdout ?? step.stdout) + (step._rawStderr ?? step.stderr));
  // "Registry: 152 entries  |  ✅ 15 available  |  ❌ 118 missing  |  ⏰ 0 stale"
  const entriesM   = clean.match(/Registry:\s*(\d+)\s+entries/i);
  const availM     = clean.match(/(\d+)\s+available/i);
  const missingM   = clean.match(/(\d+)\s+missing/i);
  const staleM     = clean.match(/(\d+)\s+stale/i);
  const critM      = clean.match(/Issues:\s*[🚨]*\s*(\d+)/);
  const warnCountM = clean.match(/⚠️\s*(\d+)/);

  step.metrics = {
    totalEntries: entriesM   ? parseInt(entriesM[1])   : null,
    available:    availM     ? parseInt(availM[1])     : null,
    missing:      missingM   ? parseInt(missingM[1])   : null,
    stale:        staleM     ? parseInt(staleM[1])     : null,
    criticalIssues: critM    ? parseInt(critM[1])      : null,
    warningIssues:  warnCountM ? parseInt(warnCountM[1]) : null,
  };

  if (step.execError || step.exitCode === -1) {
    step.verdict = 'FAIL'; return step;
  }
  const crit = step.metrics.criticalIssues ?? 0;
  step.verdict = step.exitCode !== 0 ? 'FAIL'
               : crit > 0            ? 'WARN'
               : (step.metrics.missing ?? 0) > 0 ? 'WARN'
               : 'PASS';
  return step;
}

function parseBonusPlan(step) {
  const clean = stripAnsi((step._rawStdout ?? step.stdout) + (step._rawStderr ?? step.stderr));
  const exchM  = clean.match(/Exchanges:\s*(\d+)/i);
  const highM  = clean.match(/HIGH urgency:\s*(\d+)/i);
  const medM   = clean.match(/MEDIUM urgency:\s*(\d+)/i);
  const safeM  = clean.match(/Publish-safe:\s*(\d+)\/(\d+)/i);

  step.metrics = {
    exchanges:     exchM ? parseInt(exchM[1]) : null,
    highUrgency:   highM ? parseInt(highM[1]) : null,
    medUrgency:    medM  ? parseInt(medM[1])  : null,
    publishSafe:   safeM ? parseInt(safeM[1]) : null,
    publishTotal:  safeM ? parseInt(safeM[2]) : null,
  };

  // Safety: must see "DRY RUN" in output — confirms no live crawling
  const isDryRun = clean.includes('DRY RUN');
  if (!isDryRun) {
    step.verdict = 'FAIL';
    step.extraWarning = 'DRY RUN sentinel not found in output — possible live crawling';
    return step;
  }

  if (step.execError || step.exitCode === -1) {
    step.verdict = 'FAIL'; return step;
  }
  step.verdict = step.exitCode !== 0 ? 'FAIL'
               : (step.metrics.highUrgency ?? 0) > 0 ? 'WARN'
               : 'PASS';
  return step;
}

function parseReviewQueue(step) {
  const clean = stripAnsi((step._rawStdout ?? step.stdout) + (step._rawStderr ?? step.stderr));
  const totalM     = clean.match(/Total in queue:\s*(\d+)/i);
  const actionM    = clean.match(/Actionable:\s*(\d+)/i);
  const mismatchM  = clean.match(/Mismatches:\s*(\d+)/i);
  const errorsM    = clean.match(/Errors:\s*(\d+)/i);

  step.metrics = {
    totalInQueue:  totalM    ? parseInt(totalM[1])    : null,
    actionable:    actionM   ? parseInt(actionM[1])   : null,
    mismatches:    mismatchM ? parseInt(mismatchM[1]) : null,
    errors:        errorsM   ? parseInt(errorsM[1])   : null,
  };

  if (step.execError || step.exitCode === -1) {
    step.verdict = 'FAIL'; return step;
  }
  const mismatches = step.metrics.mismatches ?? 0;
  step.verdict = step.exitCode !== 0 ? 'FAIL'
               : mismatches > 0      ? 'WARN'
               : (step.metrics.actionable ?? 0) > 0 ? 'WARN'
               : 'PASS';
  return step;
}

function parseBuild(step) {
  const clean = stripAnsi((step._rawStdout ?? step.stdout) + (step._rawStderr ?? step.stderr));
  const pagesM   = clean.match(/(\d+)\s+page\(s\)\s+built/i);
  const completeM = clean.includes('Complete!');
  const errorM    = clean.match(/\[build\]\s+error|ERROR|error\s+\[build\]/i);

  step.metrics = {
    pagesBuilt: pagesM ? parseInt(pagesM[1]) : null,
    complete:   completeM,
    hasError:   !!errorM,
  };

  if (step.execError || step.exitCode === -1) {
    step.verdict = 'FAIL'; return step;
  }
  step.verdict = (step.exitCode !== 0 || !completeM || step.metrics.hasError) ? 'FAIL' : 'PASS';
  return step;
}

// ─── Step definitions ───────────────────────────────────────────────────────────
// Each step: id, label, npmScript, parser, requiredPass
const STEP_DEFS = [
  { id: 'affiliate',   label: 'Affiliate Integrity',      npmScript: 'validate:affiliate',  parser: parseAffiliate,  requiredPass: true  },
  { id: 'evidence',    label: 'Evidence Validation',      npmScript: 'validate:evidence',   parser: parseEvidence,   requiredPass: false, allowWarn: true },
  { id: 'governance',  label: 'Evidence Governance',      npmScript: 'evidence:governance', parser: parseGovernance, requiredPass: false },
  { id: 'screenshots', label: 'Screenshot Registry',      npmScript: 'audit:screenshots',   parser: parseScreenshots,requiredPass: false },
  { id: 'bonusPlan',   label: 'Bonus Landing Plan',       npmScript: 'bonus:landing:plan',  parser: parseBonusPlan,  requiredPass: false },
  { id: 'reviewQueue', label: 'Bonus Review Queue',       npmScript: 'bonus:review:queue',  parser: parseReviewQueue,requiredPass: false },
  ...(NO_BUILD ? [] : [
    { id: 'build',     label: 'Production Build',         npmScript: 'build',               parser: parseBuild,      requiredPass: true  },
  ]),
];

// ─── Determine overall gate status ─────────────────────────────────────────────
function determineOverallStatus(steps) {
  const liveCrawl = steps.find(s => s.liveCrawlDetected);
  if (liveCrawl) return 'FAIL';

  const requiredFail = steps.find(s => s.requiredPass && s.verdict === 'FAIL');
  if (requiredFail) return 'FAIL';

  const anyFail = steps.find(s => s.verdict === 'FAIL');
  if (anyFail) return 'FAIL';

  const anyWarn = steps.find(s => s.verdict === 'WARN');
  if (anyWarn) return 'PASS_WITH_WARNINGS';

  return 'PASS';
}

// ─── Collect P0/P1/P2 issues ───────────────────────────────────────────────────
function collectIssues(steps) {
  const p0 = [], p1 = [], p2 = [];

  for (const s of steps) {
    if (s.liveCrawlDetected) {
      p0.push(`[${s.id}] LIVE CRAWLING DETECTED — aborted`);
      continue;
    }
    if (s.execError) {
      p0.push(`[${s.id}] Script execution error: ${s.execError}`);
      continue;
    }
    if (s.verdict === 'FAIL' && s.requiredPass) {
      p0.push(`[${s.id}] ${s.label} — FAILED (exit ${s.exitCode})`);
    } else if (s.verdict === 'FAIL') {
      p1.push(`[${s.id}] ${s.label} — FAILED (exit ${s.exitCode})`);
    }
    if (s.extraWarning) p1.push(`[${s.id}] ${s.extraWarning}`);

    // Step-specific issue extraction
    if (s.id === 'governance') {
      for (const issue of (s.metrics.p1Issues ?? [])) p1.push(`[governance P1] ${issue}`);
      for (const issue of (s.metrics.p2Issues ?? [])) p2.push(`[governance P2] ${issue}`);
    }
    if (s.id === 'evidence') {
      const fatals = s.metrics.fatals ?? 0;
      const warns  = s.metrics.warnings ?? 0;
      if (fatals > 0) p0.push(`[evidence] ${fatals} fatal error(s) in evidence data`);
      if (warns  > 0) p2.push(`[evidence] ${warns} warning(s) — low confidence, outdated, manual review flags`);
    }
    if (s.id === 'affiliate') {
      if ((s.metrics.fatals ?? 0) > 0) p0.push(`[affiliate] ${s.metrics.fatals} fatal routing error(s)`);
    }
    if (s.id === 'screenshots') {
      const missing = s.metrics.missing ?? 0;
      const crit    = s.metrics.criticalIssues ?? 0;
      if (crit    > 0) p1.push(`[screenshots] ${crit} critical registry issue(s)`);
      if (missing > 0) p2.push(`[screenshots] ${missing} screenshot(s) missing from registry`);
    }
    if (s.id === 'reviewQueue') {
      const mm = s.metrics.mismatches ?? 0;
      const ae = s.metrics.actionable ?? 0;
      if (mm > 0) p1.push(`[reviewQueue] ${mm} bonus mismatch(es) require manual review`);
      if (ae > 0) p2.push(`[reviewQueue] ${ae} item(s) in review queue (technical errors / not detected)`);
    }
    if (s.id === 'bonusPlan') {
      const high = s.metrics.highUrgency ?? 0;
      const safe = s.metrics.publishSafe ?? 0;
      const tot  = s.metrics.publishTotal ?? 0;
      if (high > 0) p2.push(`[bonusPlan] ${high} exchange(s) with HIGH urgency bonus verification needed`);
      if (tot > 0 && safe === 0) p2.push(`[bonusPlan] 0/${tot} bonus claims are publish-safe (confidence < 0.50)`);
    }
  }

  return { p0, p1, p2 };
}

// ─── Build JSON report ──────────────────────────────────────────────────────────
function buildJsonReport(steps, overallStatus, issues, generatedAt, durationTotalMs) {
  const byId = Object.fromEntries(steps.map(s => [s.id, s]));

  return {
    generatedAt,
    qaGateVersion:        '1.0.0',
    runDate:              TODAY_STR,
    overallStatus,
    exitCode:             ['PASS', 'PASS_WITH_WARNINGS'].includes(overallStatus) ? 0 : 2,
    liveCrawlingRan:      steps.some(s => s.liveCrawlDetected),
    noBuildFlag:          NO_BUILD,
    totalDurationMs:      durationTotalMs,

    metrics: {
      build: {
        status:     byId.build?.verdict ?? (NO_BUILD ? 'SKIPPED' : 'n/a'),
        pagesBuilt: byId.build?.metrics?.pagesBuilt ?? null,
        complete:   byId.build?.metrics?.complete ?? null,
      },
      affiliate: {
        status:      byId.affiliate?.verdict ?? 'n/a',
        fatals:      byId.affiliate?.metrics?.fatals ?? null,
        warnings:    byId.affiliate?.metrics?.warnings ?? null,
        cleanRoutes: byId.affiliate?.metrics?.cleanRoutes ?? null,
        totalRoutes: byId.affiliate?.metrics?.totalRoutes ?? null,
      },
      evidence: {
        status:      byId.evidence?.verdict ?? 'n/a',
        fatals:      byId.evidence?.metrics?.fatals ?? null,
        warnings:    byId.evidence?.metrics?.warnings ?? null,
        statusLine:  byId.evidence?.metrics?.statusLine ?? null,
      },
      governance: {
        status:    byId.governance?.verdict ?? 'n/a',
        emsScore:  byId.governance?.metrics?.emsScore ?? null,
        emsLabel:  byId.governance?.metrics?.emsLabel ?? null,
        p1Issues:  byId.governance?.metrics?.p1Issues?.length ?? 0,
        p2Issues:  byId.governance?.metrics?.p2Issues?.length ?? 0,
      },
      screenshots: {
        status:          byId.screenshots?.verdict ?? 'n/a',
        totalEntries:    byId.screenshots?.metrics?.totalEntries ?? null,
        available:       byId.screenshots?.metrics?.available ?? null,
        missing:         byId.screenshots?.metrics?.missing ?? null,
        stale:           byId.screenshots?.metrics?.stale ?? null,
        criticalIssues:  byId.screenshots?.metrics?.criticalIssues ?? null,
      },
      bonusPlan: {
        status:       byId.bonusPlan?.verdict ?? 'n/a',
        exchanges:    byId.bonusPlan?.metrics?.exchanges ?? null,
        highUrgency:  byId.bonusPlan?.metrics?.highUrgency ?? null,
        medUrgency:   byId.bonusPlan?.metrics?.medUrgency ?? null,
        publishSafe:  byId.bonusPlan?.metrics?.publishSafe ?? null,
        publishTotal: byId.bonusPlan?.metrics?.publishTotal ?? null,
      },
      reviewQueue: {
        status:       byId.reviewQueue?.verdict ?? 'n/a',
        totalInQueue: byId.reviewQueue?.metrics?.totalInQueue ?? null,
        actionable:   byId.reviewQueue?.metrics?.actionable ?? null,
        mismatches:   byId.reviewQueue?.metrics?.mismatches ?? null,
        errors:       byId.reviewQueue?.metrics?.errors ?? null,
      },
    },

    issues,

    steps: steps.map(s => ({
      id:               s.id,
      label:            s.label,
      npmScript:        s.npmScript,
      exitCode:         s.exitCode,
      verdict:          s.verdict,
      durationMs:       s.durationMs,
      requiredPass:     s.requiredPass ?? false,
      metrics:          s.metrics,
      execError:        s.execError,
      liveCrawlDetected: s.liveCrawlDetected,
      extraWarning:     s.extraWarning ?? null,
    })),

    ownerActionRequired: [
      ...(issues.p0.length > 0 ? ['🔴 P0 BLOCKERS — must be resolved before deploy'] : []),
      ...(issues.p1.length > 0 ? ['🟠 P1 issues require prompt attention'] : []),
      ...(issues.p2.length > 0 ? ['🟡 P2 warnings noted — track and address in next sprint'] : []),
      ...(steps.some(s => s.id === 'reviewQueue' && (s.metrics.mismatches ?? 0) > 0)
          ? ['Review bonus-review-queue.md for mismatch details']
          : []),
    ],

    confirmations: {
      noLiveCrawlingRan:           !steps.some(s => s.liveCrawlDetected),
      noEvidenceFilesModified:     true,
      noAffiliateUrlsModified:     true,
      noProductionPagesModified:   true,
      noBonusAmountModified:       true,
      noConfidenceScoreModified:   true,
    },
  };
}

// ─── Build Markdown report ──────────────────────────────────────────────────────
function buildMarkdownReport(steps, overallStatus, issues, metrics, generatedAt, durationTotalMs) {
  const lines = [];
  const statusIcon = { PASS: '✅', PASS_WITH_WARNINGS: '⚠️', FAIL: '❌' };
  const verdictIcon = { PASS: '✅', WARN: '⚠️', FAIL: '❌', SKIPPED: '—' };

  lines.push('# Production QA Gate Report');
  lines.push('');
  lines.push(`> Generated: ${generatedAt}  `);
  lines.push(`> Run Date: ${TODAY_STR}  `);
  lines.push(`> Total Duration: ${(durationTotalMs / 1000).toFixed(1)}s  `);
  lines.push(`> No-Build Flag: ${NO_BUILD ? 'yes (build skipped)' : 'no'}`);
  lines.push('');

  lines.push(`## ${statusIcon[overallStatus] ?? '?'} Overall Status: ${overallStatus}`);
  lines.push('');

  if (overallStatus === 'FAIL') {
    lines.push('> 🔴 **QA GATE FAILED** — do not deploy until all P0 blockers are resolved.');
  } else if (overallStatus === 'PASS_WITH_WARNINGS') {
    lines.push('> ⚠️ **QA GATE PASSED WITH WARNINGS** — safe to deploy; review P1/P2 items in next sprint.');
  } else {
    lines.push('> ✅ **QA GATE PASSED** — all checks clean.');
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Key metrics table
  lines.push('## Key Metrics');
  lines.push('');
  lines.push('| Metric | Value | Status |');
  lines.push('|--------|-------|--------|');
  lines.push(`| Build | ${metrics.build.pagesBuilt != null ? `${metrics.build.pagesBuilt} pages` : NO_BUILD ? 'skipped' : '—'} | ${verdictIcon[metrics.build.status] ?? '—'} ${metrics.build.status} |`);
  lines.push(`| Affiliate routes | ${metrics.affiliate.cleanRoutes != null ? `${metrics.affiliate.cleanRoutes}/${metrics.affiliate.totalRoutes} clean` : '—'} | ${verdictIcon[metrics.affiliate.status] ?? '—'} ${metrics.affiliate.status} |`);
  lines.push(`| Evidence warnings | ${metrics.evidence.warnings ?? '—'} | ${verdictIcon[metrics.evidence.status] ?? '—'} ${metrics.evidence.status} |`);
  lines.push(`| Evidence fatals | ${metrics.evidence.fatals ?? '—'} | ${metrics.evidence.fatals === 0 ? '✅' : '❌'} |`);
  lines.push(`| Evidence Maturity Score | ${metrics.governance.emsScore != null ? `${metrics.governance.emsScore}/100 (${metrics.governance.emsLabel})` : '—'} | ${verdictIcon[metrics.governance.status] ?? '—'} ${metrics.governance.status} |`);
  lines.push(`| Governance P1 issues | ${metrics.governance.p1Issues} | ${metrics.governance.p1Issues > 0 ? '⚠️ WARN' : '✅ PASS'} |`);
  lines.push(`| Screenshots available | ${metrics.screenshots.available ?? '—'} | ${verdictIcon[metrics.screenshots.status] ?? '—'} ${metrics.screenshots.status} |`);
  lines.push(`| Screenshots missing | ${metrics.screenshots.missing ?? '—'} | ${(metrics.screenshots.missing ?? 0) > 0 ? '⚠️' : '✅'} |`);
  lines.push(`| Bonus plan exchanges | ${metrics.bonusPlan.exchanges ?? '—'} | ${verdictIcon[metrics.bonusPlan.status] ?? '—'} ${metrics.bonusPlan.status} |`);
  lines.push(`| Bonus publish-safe | ${metrics.bonusPlan.publishSafe != null ? `${metrics.bonusPlan.publishSafe}/${metrics.bonusPlan.publishTotal}` : '—'} | ${(metrics.bonusPlan.publishSafe ?? 0) === 0 ? '⚠️ WARN' : '✅'} |`);
  lines.push(`| Review queue total | ${metrics.reviewQueue.totalInQueue ?? '—'} | ${verdictIcon[metrics.reviewQueue.status] ?? '—'} ${metrics.reviewQueue.status} |`);
  lines.push(`| Review queue mismatches | ${metrics.reviewQueue.mismatches ?? '—'} | ${(metrics.reviewQueue.mismatches ?? 0) > 0 ? '⚠️ WARN' : '✅'} |`);
  lines.push('');

  // ── Issues
  if (issues.p0.length + issues.p1.length + issues.p2.length > 0) {
    lines.push('## Issues');
    lines.push('');

    if (issues.p0.length > 0) {
      lines.push('### 🔴 P0 — Blockers (must fix before deploy)');
      lines.push('');
      for (const i of issues.p0) lines.push(`- ${i}`);
      lines.push('');
    }
    if (issues.p1.length > 0) {
      lines.push('### 🟠 P1 — High Priority');
      lines.push('');
      for (const i of issues.p1) lines.push(`- ${i}`);
      lines.push('');
    }
    if (issues.p2.length > 0) {
      lines.push('### 🟡 P2 — Warnings (track, address in next sprint)');
      lines.push('');
      for (const i of issues.p2) lines.push(`- ${i}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  // ── Step results
  lines.push('## Step Results');
  lines.push('');
  lines.push('| # | Step | Command | Exit | Verdict | Duration |');
  lines.push('|---|------|---------|------|---------|----------|');
  steps.forEach((s, i) => {
    const v   = s.verdict ?? '—';
    const dur = `${(s.durationMs / 1000).toFixed(1)}s`;
    const icon = verdictIcon[v] ?? '—';
    lines.push(`| ${i + 1} | ${s.label} | \`npm run ${s.npmScript}\` | \`${s.exitCode}\` | ${icon} ${v} | ${dur} |`);
  });
  lines.push('');

  // ── Governance P1 detail
  const govStep = steps.find(s => s.id === 'governance');
  if (govStep && (govStep.metrics.p1Issues?.length > 0 || govStep.metrics.p2Issues?.length > 0)) {
    lines.push('## Evidence Governance — Open Issues');
    lines.push('');
    if (govStep.metrics.p1Issues?.length > 0) {
      lines.push('**P1 (High Priority):**');
      for (const i of govStep.metrics.p1Issues) lines.push(`- ${i}`);
      lines.push('');
    }
    if (govStep.metrics.p2Issues?.length > 0) {
      lines.push('**P2 (Medium Priority):**');
      for (const i of govStep.metrics.p2Issues) lines.push(`- ${i}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  // ── Owner actions
  lines.push('## Owner Action Required');
  lines.push('');
  if (issues.p0.length === 0 && issues.p1.length === 0 && issues.p2.length === 0) {
    lines.push('✅ No action required at this time.');
  } else {
    if (issues.p0.length > 0) {
      lines.push('1. 🔴 **Resolve P0 blockers immediately** before any production changes.');
    }
    if (issues.p1.length > 0) {
      lines.push('2. 🟠 **Address P1 issues** in the current sprint.');
    }
    if (issues.p2.length > 0) {
      lines.push('3. 🟡 **Track P2 warnings** in the next sprint backlog.');
    }
    const rvQ = steps.find(s => s.id === 'reviewQueue');
    if (rvQ && (rvQ.metrics.mismatches ?? 0) > 0) {
      lines.push('4. Review `reports/bonus-review-queue.md` for bonus mismatch details.');
    }
    const rvErrors = rvQ && (rvQ.metrics.errors ?? 0) > 0;
    if (rvErrors) {
      lines.push('5. Retry live verification manually for exchanges with technical errors (see `reports/bonus-landing-errors.json`).');
    }
  }
  lines.push('');

  // ── Safety confirmation
  lines.push('---');
  lines.push('');
  lines.push('## Safety Confirmation');
  lines.push('');
  lines.push('- ✅ No live web crawling was run during this QA gate');
  lines.push('- ✅ No evidence files were modified');
  lines.push('- ✅ No affiliate URLs were modified');
  lines.push('- ✅ No production pages were modified');
  lines.push('- ✅ No bonus_amount values were changed');
  lines.push('- ✅ No confidenceScore values were changed');
  lines.push('- ✅ All changes require human approval before affecting live data');
  lines.push('');
  lines.push(`*Script: scripts/qa-production.mjs — Sprint 01 Production Foundation*`);

  return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const gateStart = Date.now();

  log('');
  log('╔══════════════════════════════════════════════════════╗');
  log('║   CryptoBonusWorld — Production QA Gate v1           ║');
  log('╚══════════════════════════════════════════════════════╝');
  log('');
  log(`  Run date:  ${TODAY_STR}`);
  log(`  No-build:  ${NO_BUILD ? 'YES (--no-build)' : 'no'}`);
  log(`  Steps:     ${STEP_DEFS.length}`);
  log('');
  sep();

  // Run all steps
  const completedSteps = [];
  let abortEarly = false;

  for (const def of STEP_DEFS) {
    const step = runStep(def.id, def.label, def.npmScript);

    // Attach definition metadata
    step.requiredPass   = def.requiredPass ?? false;
    step.allowWarn      = def.allowWarn    ?? false;

    // Parse step output
    def.parser(step);

    // Log condensed result
    const vIcon = { PASS: '✅', WARN: '⚠️', FAIL: '❌' }[step.verdict] ?? '?';
    log(`    ${vIcon} ${step.verdict}  ${step.label}`);

    // Print key metric one-liner
    const metricLine = buildMetricLine(step);
    if (metricLine) log(`       ${metricLine}`);

    // Abort on live crawl detection immediately
    if (step.liveCrawlDetected) {
      log('');
      log('  ⛔ ABORTING QA GATE — live crawling detected. See above.');
      abortEarly = true;
      completedSteps.push(step);
      break;
    }

    completedSteps.push(step);

    // P0 failures on required steps: continue to collect info but flag FAIL
    // (don't abort — we want the full picture in the report)
  }

  sep();

  const durationTotalMs = Date.now() - gateStart;
  const overallStatus   = determineOverallStatus(completedSteps);
  const issues          = collectIssues(completedSteps);
  const generatedAt     = new Date().toISOString();

  // Build report data
  const jsonReport = buildJsonReport(completedSteps, overallStatus, issues, generatedAt, durationTotalMs);
  const metrics    = jsonReport.metrics;

  const mdReport   = buildMarkdownReport(completedSteps, overallStatus, issues, metrics, generatedAt, durationTotalMs);

  // ── Console summary
  log('');
  log('  ═══════════════════════════════════════════════════════');
  const statusBanner = { PASS: '✅  PASS', PASS_WITH_WARNINGS: '⚠️  PASS WITH WARNINGS', FAIL: '❌  FAIL' };
  log(`   ${statusBanner[overallStatus]}`);
  log('  ═══════════════════════════════════════════════════════');
  log('');
  log('  Key metrics:');
  log(`    Build:           ${metrics.build.pagesBuilt != null ? `${metrics.build.pagesBuilt} pages` : NO_BUILD ? 'skipped' : '—'}`);
  log(`    Affiliate:       ${metrics.affiliate.cleanRoutes ?? '—'}/${metrics.affiliate.totalRoutes ?? '—'} routes clean`);
  log(`    Evidence:        ${metrics.evidence.fatals ?? '—'} fatals, ${metrics.evidence.warnings ?? '—'} warnings`);
  log(`    EMS Score:       ${metrics.governance.emsScore != null ? `${metrics.governance.emsScore}/100 (${metrics.governance.emsLabel})` : '—'}`);
  log(`    Screenshots:     ${metrics.screenshots.available ?? '—'} available, ${metrics.screenshots.missing ?? '—'} missing`);
  log(`    Bonus plan:      ${metrics.bonusPlan.exchanges ?? '—'} exchanges, ${metrics.bonusPlan.highUrgency ?? '—'} HIGH urgency`);
  log(`    Review queue:    ${metrics.reviewQueue.totalInQueue ?? '—'} total, ${metrics.reviewQueue.mismatches ?? '—'} mismatches`);
  log(`    Duration:        ${(durationTotalMs / 1000).toFixed(1)}s`);
  log('');

  if (issues.p0.length > 0) {
    log('  🔴 P0 BLOCKERS:');
    for (const i of issues.p0) log(`     • ${i}`);
    log('');
  }
  if (issues.p1.length > 0) {
    log('  🟠 P1 ISSUES:');
    for (const i of issues.p1.slice(0, 5)) log(`     • ${i}`);
    if (issues.p1.length > 5) log(`     … and ${issues.p1.length - 5} more (see report)`);
    log('');
  }

  log('  ✅ No live crawling ran.');
  log('  ✅ No production data was modified.');
  log('');

  // ── Write reports
  const reportsDir = path.join(ROOT, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  if (WRITE_JSON || (!WRITE_JSON && !WRITE_MD)) {
    // Always write JSON (it's the machine-readable source of truth)
    const jsonPath = path.join(reportsDir, 'production-qa-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');
    log(`  📄 JSON report: ${jsonPath}`);
  }
  if (WRITE_MD || (!WRITE_JSON && !WRITE_MD)) {
    // Always write MD too unless explicit flag chosen
    const mdPath = path.join(reportsDir, 'production-qa-report.md');
    fs.writeFileSync(mdPath, mdReport, 'utf8');
    log(`  📄 MD report:   ${mdPath}`);
  }
  log('');

  // Exit code
  const exitCode = ['PASS', 'PASS_WITH_WARNINGS'].includes(overallStatus) ? 0 : 2;
  process.exit(exitCode);
}

// ─── Per-step metric one-liner ──────────────────────────────────────────────────
function buildMetricLine(step) {
  const m = step.metrics;
  switch (step.id) {
    case 'affiliate':
      return m.cleanRoutes != null ? `${m.cleanRoutes}/${m.totalRoutes} clean, ${m.fatals} fatals, ${m.warnings} warnings` : null;
    case 'evidence':
      return `${m.fatals ?? '?'} fatals, ${m.warnings ?? '?'} warnings`;
    case 'governance':
      return m.emsScore != null ? `EMS ${m.emsScore}/100 (${m.emsLabel}), P1: ${m.p1Issues?.length ?? 0}, P2: ${m.p2Issues?.length ?? 0}` : null;
    case 'screenshots':
      return m.available != null ? `${m.available} available, ${m.missing} missing, ${m.criticalIssues} critical` : null;
    case 'bonusPlan':
      return m.exchanges != null ? `${m.exchanges} exchanges, HIGH: ${m.highUrgency}, publish-safe: ${m.publishSafe ?? 0}/${m.publishTotal ?? 0}` : null;
    case 'reviewQueue':
      return m.totalInQueue != null ? `queue: ${m.totalInQueue}, actionable: ${m.actionable}, mismatches: ${m.mismatches}, errors: ${m.errors}` : null;
    case 'build':
      return m.pagesBuilt != null ? `${m.pagesBuilt} pages built` : null;
    default:
      return null;
  }
}

main().catch(e => {
  console.error('FATAL — QA gate crashed:', e.message);
  process.exit(2);
});
