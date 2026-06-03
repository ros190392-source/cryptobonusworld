#!/usr/bin/env node
/**
 * monitor-telegram-summary.mjs — Daily/weekly combined summary report
 * ────────────────────────────────────────────────────────────────────
 * Reads all three report JSONs (bonus, affiliate, screenshots) and sends
 * a single consolidated Telegram message with OK/WARNING/CRITICAL counts.
 *
 * Usage:
 *   npm run monitor:telegram:summary -- --dry-run   # Print, don't send
 *   npm run monitor:telegram:summary -- --send      # Send to Telegram
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

// ── Severity helpers ──────────────────────────────────────────────────────────

function bonusSeverity(summary) {
  if (!summary) return 'UNKNOWN';
  if ((summary.mismatch ?? 0) > 0)          return 'CRITICAL';
  if ((summary.needsManualReview ?? 0) > 0) return 'WARNING';
  if ((summary.unknown ?? 0) > 0)           return 'INFO';
  return 'OK';
}

function affiliateSeverity(audit) {
  if (!audit) return 'UNKNOWN';
  if ((audit.summary?.errors   ?? 0) > 0)   return 'CRITICAL';
  if ((audit.summary?.warnings ?? 0) > 0)   return 'WARNING';
  return 'OK';
}

function screenshotSeverity(audit) {
  if (!audit) return 'UNKNOWN';
  if ((audit.summary?.failed   ?? 0) > 0)   return 'CRITICAL';
  if ((audit.summary?.missing  ?? 0) > 0)   return 'WARNING';
  if ((audit.summary?.outdated ?? 0) > 0)   return 'WARNING';
  return 'OK';
}

function evidenceSeverity(index) {
  if (!index) return 'UNKNOWN';
  if ((index.summary?.mismatch ?? 0) > 0)          return 'CRITICAL';
  if ((index.summary?.needsManualReview ?? 0) > 0) return 'WARNING';
  return 'OK';
}

function severityIcon(s) {
  return s === 'CRITICAL' ? '🚨' : s === 'WARNING' ? '⚠️' : s === 'INFO' ? 'ℹ️' : s === 'OK' ? '✅' : '❓';
}

function overallSeverity(...levels) {
  if (levels.includes('CRITICAL')) return 'CRITICAL';
  if (levels.includes('WARNING'))  return 'WARNING';
  if (levels.includes('INFO'))     return 'INFO';
  return 'OK';
}

// ── Build message ─────────────────────────────────────────────────────────────

function buildSummaryMessage() {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  const bonusReport   = load('reports/bonus-verification-report.json');
  const affiliateAudit = runAuditJson('node scripts/audit-affiliate-links.mjs --json');
  const screenshotAudit = load('reports/exchange-screenshot-report.json');
  const evidenceIndex  = load('reports/evidence-snapshots/index.json');

  const bSev = bonusSeverity(bonusReport?.summary);
  const aSev = affiliateSeverity(affiliateAudit);
  const sSev = screenshotSeverity(screenshotAudit);
  const eSev = evidenceSeverity(evidenceIndex);
  const overall = overallSeverity(bSev, aSev, sSev, eSev);

  const lines = [
    `🌐 <b>CryptoBonusWorld — Intelligence Monitor</b>`,
    `${severityIcon(overall)} <b>${overall}</b>  |  ${now}`,
    '',
    '<b>Component Status</b>',
    `${severityIcon(bSev)} Bonus verification: <b>${bSev}</b>`,
    `${severityIcon(aSev)} Affiliate links:    <b>${aSev}</b>`,
    `${severityIcon(sSev)} Screenshots:        <b>${sSev}</b>`,
    `${severityIcon(eSev)} Evidence snapshots: <b>${eSev}</b>`,
  ];

  // Bonus detail
  if (bonusReport?.summary) {
    const s = bonusReport.summary;
    const changed = bonusReport.records?.filter(r => r.screenshotChanged).length ?? 0;
    lines.push(
      '',
      `<b>Bonus Verification</b> (${s.total} exchanges)`,
      `✅ ${s.matched}  🚨 ${s.mismatch ?? 0}  ⚠️ ${s.needsManualReview ?? 0}  ❓ ${s.unknown ?? 0}`,
      changed > 0 ? `🔄 Screenshot changes: ${changed}` : null,
    );
  }

  // Affiliate detail
  if (affiliateAudit?.summary) {
    const s = affiliateAudit.summary;
    lines.push(
      '',
      `<b>Affiliate Links</b> (${s.total} exchanges)`,
      `✅ ${s.ok ?? 0}  🚨 ${s.errors ?? 0}  ⚠️ ${s.warnings ?? 0}`,
    );
  }

  // Screenshot detail
  if (screenshotAudit?.summary) {
    const s = screenshotAudit.summary;
    lines.push(
      '',
      `<b>Screenshots</b>`,
      `Present: ${s.present ?? 0}  Missing: ${s.missing ?? 0}  Outdated: ${s.outdated ?? 0}`,
    );
  }

  // Evidence snapshot detail
  if (evidenceIndex?.summary) {
    const s = evidenceIndex.summary;
    lines.push(
      '',
      `<b>Evidence Snapshots</b> (${s.total} exchange/regions)`,
      `✅ ${s.matched}  🚨 ${s.mismatch}  ❓ ${s.unknown}  🔄 ${s.screenshotChanged} changed`,
    );
  }

  // Counts summary
  const critCount = [bSev, aSev, sSev, eSev].filter(s => s === 'CRITICAL').length;
  const warnCount = [bSev, aSev, sSev, eSev].filter(s => s === 'WARNING').length;
  const okCount   = [bSev, aSev, sSev, eSev].filter(s => s === 'OK').length;

  lines.push(
    '',
    `<b>Summary:</b> ${okCount} OK  ${warnCount} WARNING  ${critCount} CRITICAL`,
    `<i>${now}</i>`,
  );

  return lines.filter(l => l !== null).join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const message = buildSummaryMessage();

  if (DRY_RUN) {
    console.log('\n[Telegram dry-run — pass --send to actually send]\n' + '─'.repeat(60));
    console.log(message.replace(/<[^>]+>/g, ''));
    console.log('─'.repeat(60) + '\n');
    return;
  }

  try {
    await sendTelegramMessage(message, { dryRun: false });
    console.log('  ✅ Summary report sent to Telegram');
  } catch (e) {
    console.error('  ✖ Telegram send failed:', e.message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('  ✖', e.message);
  process.exit(1);
});
