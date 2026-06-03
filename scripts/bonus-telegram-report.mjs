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
  const severity = summary.mismatch > 0                ? '🚨 CRITICAL'
                 : summary.needsManualReview > 0        ? '⚠️ WARNING'
                 : summary.unknown > 0                  ? 'ℹ️ INFO'
                 : '✅ OK';

  const lines = [
    `🎁 <b>CryptoBonusWorld — Bonus Verification Report</b>`,
    `${severity}`,
    '',
    `<b>Summary</b>`,
    `Checked: ${summary.total} exchanges`,
    `✅ Matched: ${summary.matched}`,
    summary.mismatch         > 0 ? `🚨 Mismatch: ${summary.mismatch}` : null,
    summary.needsManualReview > 0 ? `⚠️ Needs review: ${summary.needsManualReview}` : null,
    summary.unknown          > 0 ? `❓ Unknown: ${summary.unknown}` : null,
  ].filter(Boolean);

  // Top issues (mismatches + needs_manual_review first)
  const issues = records
    .filter(r => r.matchStatus !== 'matched' && r.matchStatus !== 'matched_with_copy_difference')
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      return (order[a.mismatchSeverity] ?? 5) - (order[b.mismatchSeverity] ?? 5);
    });

  if (issues.length > 0) {
    lines.push('', '<b>Issues requiring attention:</b>');
    for (const r of issues.slice(0, 5)) { // max 5 issues
      const icon = r.matchStatus === 'mismatch' ? '🚨'
                 : r.matchStatus === 'needs_manual_review' ? '⚠️'
                 : '❓';
      const det  = r.detectedBonus
        ? `detected: ${r.detectedBonus.toLocaleString()} ${r.detectedBonusCurrency}`
        : 'not detected';
      const exp  = r.expectedBonus
        ? `expected: ${r.expectedBonus.toLocaleString()} ${r.expectedBonusCurrency}`
        : '';
      lines.push(`${icon} <b>${r.exchange}</b> — ${exp}${exp ? ', ' : ''}${det}`);
      if (r.recommendedAction) {
        lines.push(`   → ${r.recommendedAction}`);
      }
    }
    if (issues.length > 5) {
      lines.push(`   … and ${issues.length - 5} more (see report)`);
    }
  }

  // Pending proposals
  const pendingProps = proposals?.proposals?.filter(p => p.status === 'pending') ?? [];
  if (pendingProps.length > 0) {
    lines.push('', '<b>Pending update proposals:</b>');
    for (const p of pendingProps.slice(0, 3)) {
      const risk = p.riskLevel === 'high' ? '🔴' : p.riskLevel === 'medium' ? '⚠️' : '🟡';
      lines.push(`${risk} ${p.exchange} — ${p.currentValue?.toLocaleString() ?? '?'} → ${p.detectedValue?.toLocaleString() ?? '?'} USDT`);
    }
    lines.push(`To apply: <code>npm run bonus:approve -- --approve-all</code>`);
  }

  // Footer
  lines.push(
    '',
    `📄 <b>Reports:</b>`,
    `<code>reports/bonus-verification-report.md</code>`,
    `<code>reports/bonus-update-proposals.md</code>`,
    ``,
    `<i>Generated: ${generatedAt}</i>`,
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
