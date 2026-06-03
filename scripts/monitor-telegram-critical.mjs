#!/usr/bin/env node
/**
 * monitor-telegram-critical.mjs — Critical-only alert report
 * ─────────────────────────────────────────────────────────────
 * Sends a Telegram message ONLY when CRITICAL issues are found.
 * Exits 0 silently if everything is OK or only warnings.
 * Used for urgent alerting — run on demand or from critical-alerts.yml.
 *
 * Usage:
 *   npm run monitor:telegram:critical -- --dry-run   # Print, don't send
 *   npm run monitor:telegram:critical -- --send      # Send only if CRITICAL
 *   npm run monitor:telegram:critical -- --send --force  # Send even if OK
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname }            from 'path';
import { fileURLToPath }            from 'url';
import { execSync }                 from 'child_process';
import { sendTelegramMessage }      from './lib/telegram.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const ARGV    = process.argv.slice(2);
const flag    = (n) => ARGV.includes(n);
const DRY_RUN = !flag('--send');
const FORCE   = flag('--force');

// ── Loaders ───────────────────────────────────────────────────────────────────

function load(path) {
  const p = join(ROOT, path);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

function runAuditJson(cmd) {
  try {
    return JSON.parse(execSync(cmd, { cwd: ROOT, timeout: 30000, encoding: 'utf-8' }));
  } catch { return null; }
}

// ── Critical issue collectors ─────────────────────────────────────────────────

function collectCriticalIssues() {
  const issues = [];
  const now    = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  // 1. Bonus mismatches
  const bonusReport = load('reports/bonus-verification-report.json');
  if (bonusReport?.records) {
    for (const r of bonusReport.records) {
      if (r.matchStatus === 'mismatch' && (r.mismatchSeverity === 'critical' || r.mismatchSeverity === 'high')) {
        issues.push({
          area:     'Bonus',
          exchange: r.exchange,
          region:   r.region ?? 'GLOBAL',
          message:  `Expected ${r.expectedBonus?.toLocaleString() ?? '?'} USDT, detected ${r.detectedBonus?.toLocaleString() ?? 'none'}`,
          action:   r.recommendedAction ?? 'Review bonus-verification-report.json',
        });
      }
    }
  }

  // 2. Affiliate errors
  const affiliateAudit = runAuditJson('node scripts/audit-affiliate-links.mjs --json');
  if (affiliateAudit?.issues) {
    for (const i of affiliateAudit.issues) {
      if (i.severity === 'error' || i.level === 'error') {
        issues.push({
          area:     'Affiliate',
          exchange: i.exchange ?? i.slug ?? '?',
          region:   'GLOBAL',
          message:  String(i.message ?? i.description ?? JSON.stringify(i)).slice(0, 120),
          action:   'Run: npm run affiliate:audit',
        });
      }
    }
  }

  // 3. Screenshot failures
  const screenshotAudit = load('reports/exchange-screenshot-report.json');
  if (screenshotAudit?.records) {
    for (const r of screenshotAudit.records ?? []) {
      if (r.status === 'error' || r.status === 'failed') {
        issues.push({
          area:     'Screenshot',
          exchange: r.exchange ?? '?',
          region:   'GLOBAL',
          message:  r.error ?? 'Capture failed',
          action:   `Run: npm run screenshots:harvest:${r.exchange ?? 'all'}`,
        });
      }
    }
  }

  // 4. Evidence snapshot mismatches
  const evidenceIndex = load('reports/evidence-snapshots/index.json');
  if (evidenceIndex?.snapshots) {
    for (const s of evidenceIndex.snapshots) {
      if (s.matchStatus === 'mismatch') {
        issues.push({
          area:     'Evidence',
          exchange: s.exchange,
          region:   s.region ?? 'GLOBAL',
          message:  `Bonus mismatch — expected ${s.expectedBonus ?? '?'}, detected ${s.detectedBonus ?? 'none'}`,
          action:   `Run: npm run bonus:verify -- --exchange ${s.exchange}`,
        });
      }
    }
  }

  return { issues, now };
}

// ── Build message ─────────────────────────────────────────────────────────────

function buildCriticalMessage(issues, now) {
  if (issues.length === 0) return null; // nothing to send

  const lines = [
    `🚨 <b>CryptoBonusWorld — CRITICAL ALERT</b>`,
    `${now}`,
    '',
    `<b>${issues.length} critical issue${issues.length !== 1 ? 's' : ''} detected:</b>`,
  ];

  for (const issue of issues.slice(0, 10)) {
    lines.push(
      '',
      `🚨 <b>${issue.area}: ${issue.exchange}</b> [${issue.region}]`,
      `${issue.message}`,
      `↳ ${issue.action}`,
    );
  }
  if (issues.length > 10) {
    lines.push('', `… and ${issues.length - 10} more critical issues.`);
  }

  lines.push('', `<i>Generated: ${now}</i>`);
  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { issues, now } = collectCriticalIssues();
  const message = FORCE && issues.length === 0
    ? `✅ <b>CryptoBonusWorld — No Critical Issues</b>\n<i>${now}</i>`
    : buildCriticalMessage(issues, now);

  if (!message) {
    console.log('  ✅ No critical issues found — nothing to send.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n[Telegram dry-run — pass --send to actually send]\n' + '─'.repeat(60));
    console.log(message.replace(/<[^>]+>/g, ''));
    console.log(`\nCritical issues found: ${issues.length}`);
    console.log('─'.repeat(60) + '\n');
    return;
  }

  try {
    await sendTelegramMessage(message, { dryRun: false });
    console.log(`  🚨 Critical alert sent (${issues.length} issue${issues.length !== 1 ? 's' : ''})`);
  } catch (e) {
    console.error('  ✖ Telegram send failed:', e.message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('  ✖', e.message);
  process.exit(1);
});
