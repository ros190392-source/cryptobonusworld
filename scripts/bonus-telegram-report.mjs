#!/usr/bin/env node
/**
 * bonus-telegram-report.mjs — Send Bonus Verification Summary to Telegram
 * ─────────────────────────────────────────────────────────────────────────
 * Reads reports/bonus-verification-report.json and sends a concise summary.
 * Also checks proposals for pending high-priority items.
 *
 * Usage:
 *   npm run bonus:telegram-report -- --dry-run   # Print message, don't send
 *   npm run bonus:telegram-report -- --send      # Actually send to Telegram
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sendTelegramMessage, formatStatusEmoji, severityEmoji } from './lib/telegram.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const ARGV    = process.argv.slice(2);
const flag    = (n) => ARGV.includes(n);
const DRY_RUN = !flag('--send');  // default is dry-run unless --send is passed
const VERBOSE = flag('--verbose');

// ── Load data ─────────────────────────────────────────────────────────────────

function loadReport() {
  const p = join(ROOT, 'reports', 'bonus-verification-report.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

function loadProposals() {
  const p = join(ROOT, 'reports', 'bonus-update-proposals.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

// ── Format message ────────────────────────────────────────────────────────────

function buildBonusReportMessage(report, proposals) {
  const { summary, records = [] } = report;
  const generatedAt = report.generatedAt
    ? new Date(report.generatedAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
    : '—';

  // Overall severity
  const severityLevel = summary.mismatch > 0         ? 'CRITICAL'
                      : summary.needsManualReview > 0 ? 'WARNING'
                      : summary.unknown > 0            ? 'INFO'
                      : 'OK';
  const severityLine  = severityLevel === 'CRITICAL' ? '🚨 CRITICAL'
                      : severityLevel === 'WARNING'   ? '⚠️ WARNING'
                      : severityLevel === 'INFO'      ? 'ℹ️ INFO'
                      : '✅ OK';

  // Screenshot changes
  const changedScreenshots = records.filter(r => r.screenshotChanged);

  // Top 3 actions
  const actionItems = records
    .filter(r => r.matchStatus !== 'matched' && r.matchStatus !== 'matched_with_copy_difference')
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      return (order[a.mismatchSeverity] ?? 5) - (order[b.mismatchSeverity] ?? 5);
    })
    .slice(0, 3);

  // Issue count (excluding unknown/low)
  const issueCount = records.filter(r =>
    r.matchStatus === 'mismatch' || r.matchStatus === 'needs_manual_review'
  ).length;

  const lines = [
    `🎁 <b>Bonus Verification</b>`,
    `${severityLine}  |  ${generatedAt}`,
    '',
    `Checked: <b>${summary.total}</b> exchanges`,
    `✅ Matched: ${summary.matched}  |  Issues: ${issueCount}`,
    summary.mismatch          > 0 ? `🚨 Mismatch: ${summary.mismatch}` : null,
    summary.needsManualReview > 0 ? `⚠️ Needs review: ${summary.needsManualReview}` : null,
    summary.unknown           > 0 ? `❓ Unknown: ${summary.unknown}` : null,
    changedScreenshots.length > 0 ? `🔄 Screenshots changed: ${changedScreenshots.length}` : null,
  ].filter(Boolean);

  // Top 3 actions
  if (actionItems.length > 0) {
    lines.push('', '<b>Top actions:</b>');
    for (const r of actionItems) {
      const icon = r.matchStatus === 'mismatch' ? '🚨'
                 : r.matchStatus === 'needs_manual_review' ? '⚠️' : '❓';
      const det  = r.detectedBonus
        ? `${r.detectedBonus.toLocaleString()} ${r.detectedBonusCurrency} detected`
        : 'not detected';
      const exp  = r.expectedBonus ? `exp: ${r.expectedBonus.toLocaleString()}` : '';
      lines.push(`${icon} <b>${r.exchange}</b>${exp ? ` (${exp})` : ''} — ${det}`);
      if (r.recommendedAction) lines.push(`   ↳ ${r.recommendedAction.slice(0, 100)}`);
    }
  }

  // Screenshot changes
  if (changedScreenshots.length > 0) {
    lines.push('', '<b>Screenshot changes (pending approval):</b>');
    for (const r of changedScreenshots.slice(0, 3)) {
      lines.push(`🔄 <b>${r.exchange}</b>/${r.region ?? 'GLOBAL'} — hash changed`);
    }
    if (changedScreenshots.length > 3) lines.push(`   … and ${changedScreenshots.length - 3} more`);
  }

  // Pending proposals
  const pendingProps = proposals?.proposals?.filter(p => p.status === 'pending') ?? [];
  if (pendingProps.length > 0) {
    lines.push('', `<b>Pending proposals: ${pendingProps.length}</b>`);
    for (const p of pendingProps.slice(0, 3)) {
      const risk = p.riskLevel === 'high' ? '🔴' : p.riskLevel === 'medium' ? '⚠️' : '🟡';
      lines.push(`${risk} ${p.exchange} — ${p.currentValue?.toLocaleString() ?? '?'} → ${p.detectedValue?.toLocaleString() ?? '?'} USDT`);
    }
    if (pendingProps.length > 3) lines.push(`   … and ${pendingProps.length - 3} more`);
    lines.push(`<code>npm run bonus:approve -- --approve-all</code>`);
  }

  lines.push(
    '',
    `📄 <code>reports/bonus-verification-report.md</code>`,
    `<i>${generatedAt}</i>`,
  );

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const report    = loadReport();
  const proposals = loadProposals();

  if (!report) {
    console.error('  ✖ No bonus-verification-report.json found.');
    console.error('    Run: npm run bonus:verify -- --all --write');
    process.exit(1);
  }

  const message = buildBonusReportMessage(report, proposals);

  if (DRY_RUN) {
    console.log('\n[Telegram dry-run — pass --send to actually send]\n' + '─'.repeat(60));
    console.log(message.replace(/<[^>]+>/g, '')); // strip HTML for console readability
    console.log('─'.repeat(60));
    console.log('\nHTML version (as Telegram sees it):\n' + '─'.repeat(60));
    console.log(message);
    console.log('─'.repeat(60) + '\n');
    return;
  }

  try {
    await sendTelegramMessage(message, { dryRun: false });
    console.log('  ✅ Bonus report sent to Telegram');
  } catch (e) {
    console.error('  ✖ Telegram send failed:', e.message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('  ✖', e.message);
  process.exit(1);
});
